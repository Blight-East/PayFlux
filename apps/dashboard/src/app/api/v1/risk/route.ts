import { NextResponse } from 'next/server';
import { z } from 'zod';
import dns from 'node:dns/promises';
import net from 'node:net';

export const runtime = "nodejs";

// ─────────────────────────────────────────────────────────────────────────────
// SSRF Hardening Helpers
// ─────────────────────────────────────────────────────────────────────────────

const BLOCKED_HOSTNAME_PATTERNS = [
    /^localhost$/i,
    /^127\.\d{1,3}\.\d{1,3}\.\d{1,3}$/,
    /^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/,
    /^172\.(1[6-9]|2[0-9]|3[0-1])\.\d{1,3}\.\d{1,3}$/,
    /^192\.168\.\d{1,3}\.\d{1,3}$/,
    /^169\.254\.\d{1,3}\.\d{1,3}$/, // link-local
    /^0\.0\.0\.0$/,
    /\.local$/i,
    /\.internal$/i,
    /^metadata\.google\.internal$/i,
    /^169\.254\.169\.254$/,
    /^fd[0-9a-f]{2}:/i, // IPv6 unique local
    /^fe80:/i, // IPv6 link-local
    /^::1$/,
    /^::$/,
];

function isPrivateIP(ip: string): boolean {
    if (net.isIPv4(ip)) {
        const parts = ip.split('.').map(Number);
        if (parts[0] === 10) return true; // 10.0.0.0/8
        if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true; // 172.16.0.0/12
        if (parts[0] === 192 && parts[1] === 168) return true; // 192.168.0.0/16
        if (parts[0] === 127) return true; // 127.0.0.0/8
        if (parts[0] === 169 && parts[1] === 254) return true; // 169.254.0.0/16 link-local
        if (parts[0] === 0) return true; // 0.0.0.0/8
    } else if (net.isIPv6(ip)) {
        const lower = ip.toLowerCase();
        if (lower === '::1' || lower === '::') return true;
        if (lower.startsWith('fe80:')) return true; // link-local
        if (lower.startsWith('fc') || lower.startsWith('fd')) return true; // unique local
    }
    return false;
}

function isBlockedHostname(hostname: string): boolean {
    return BLOCKED_HOSTNAME_PATTERNS.some((pattern) => pattern.test(hostname));
}

async function validateHostname(hostname: string): Promise<{ safe: boolean; error?: string }> {
    if (isBlockedHostname(hostname)) {
        return { safe: false, error: `Blocked hostname: ${hostname}` };
    }

    try {
        const addresses = await dns.lookup(hostname, { all: true });
        for (const addr of addresses) {
            if (isPrivateIP(addr.address)) {
                return { safe: false, error: `DNS resolved to private IP: ${addr.address}` };
            }
        }
        return { safe: true };
    } catch (err) {
        return { safe: false, error: `DNS lookup failed: ${(err as Error).message}` };
    }
}

async function safeFetch(
    url: string,
    maxRedirects: number = 5
): Promise<{ ok: boolean; response?: Response; error?: string }> {
    let currentUrl = url;
    let redirectCount = 0;

    while (redirectCount <= maxRedirects) {
        let parsedUrl: URL;
        try {
            parsedUrl = new URL(currentUrl);
        } catch {
            return { ok: false, error: `Invalid URL: ${currentUrl}` };
        }

        // Protocol check
        if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
            return { ok: false, error: `Blocked protocol: ${parsedUrl.protocol}` };
        }

        // Hostname validation
        const validation = await validateHostname(parsedUrl.hostname);
        if (!validation.safe) {
            return { ok: false, error: validation.error };
        }

        try {
            const response = await fetch(currentUrl, {
                redirect: 'manual',
                headers: {
                    'User-Agent': 'PayFlux-RiskScanner/1.0',
                    'Accept': 'text/html,application/xhtml+xml',
                },
                signal: AbortSignal.timeout(15000),
            });

            // Handle redirects manually
            if (response.status >= 300 && response.status < 400) {
                const location = response.headers.get('location');
                if (!location) {
                    return { ok: false, error: 'Redirect without location header' };
                }
                currentUrl = new URL(location, currentUrl).toString();
                redirectCount++;
                continue;
            }

            return { ok: true, response };
        } catch (err) {
            return { ok: false, error: `Fetch failed: ${(err as Error).message}` };
        }
    }

    return { ok: false, error: 'Too many redirects' };
}

// ─────────────────────────────────────────────────────────────────────────────
// Content Processing Helpers
// ─────────────────────────────────────────────────────────────────────────────

const MAX_HTML_SIZE = 1_000_000;
const MAX_TEXT_SIZE = 6000;

function sanitizeHtml(html: string): string {
    // Remove script and style tags and their contents
    let clean = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
    clean = clean.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
    clean = clean.replace(/<noscript[^>]*>[\s\S]*?<\/noscript>/gi, '');

    // Remove all HTML tags
    clean = clean.replace(/<[^>]+>/g, ' ');

    // Decode common HTML entities
    clean = clean.replace(/&nbsp;/g, ' ');
    clean = clean.replace(/&amp;/g, '&');
    clean = clean.replace(/&lt;/g, '<');
    clean = clean.replace(/&gt;/g, '>');
    clean = clean.replace(/&quot;/g, '"');
    clean = clean.replace(/&#39;/g, "'");

    // Normalize whitespace
    clean = clean.replace(/\s+/g, ' ').trim();

    return clean;
}

function extractVisibleText(html: string): string {
    const capped = html.slice(0, MAX_HTML_SIZE);
    const text = sanitizeHtml(capped);
    return text.slice(0, MAX_TEXT_SIZE);
}

// ─────────────────────────────────────────────────────────────────────────────
// Deterministic Scoring
// ─────────────────────────────────────────────────────────────────────────────

interface PolicyStatus {
    status: 'Present' | 'Weak' | 'Missing';
    matches: number;
}

interface ScoreNode {
    name: string;
    stabilityPoints: number;
    score: number;
    max: number;
}

const POLICY_KEYWORDS = {
    terms: ['terms of service', 'terms and conditions', 'terms of use', 'user agreement', 'service agreement'],
    privacy: ['privacy policy', 'privacy notice', 'data protection', 'gdpr', 'ccpa'],
    refund: ['refund policy', 'return policy', 'money back', 'cancellation policy', 'returns and refunds'],
    contact: ['contact us', 'support@', 'help@', 'customer service', 'get in touch', 'customer support'],
};

function detectPolicy(text: string, keywords: string[]): PolicyStatus {
    const lower = text.toLowerCase();
    const matches = keywords.filter((kw) => lower.includes(kw)).length;

    if (matches >= 2) return { status: 'Present', matches };
    if (matches === 1) return { status: 'Weak', matches };
    return { status: 'Missing', matches: 0 };
}

function calculateDeterministicScore(
    text: string,
    industry: string,
    processor: string
): {
    riskTier: number;
    riskLabel: string;
    stabilityScore: number;
    scoreBreakdown: ScoreNode[];
    policies: Record<string, PolicyStatus>;
    snippets: string[];
} {
    const policies = {
        terms: detectPolicy(text, POLICY_KEYWORDS.terms),
        privacy: detectPolicy(text, POLICY_KEYWORDS.privacy),
        refund: detectPolicy(text, POLICY_KEYWORDS.refund),
        contact: detectPolicy(text, POLICY_KEYWORDS.contact),
    };

    // Calculate policy score
    let policyScore = 0;
    const policyMax = 40;
    Object.values(policies).forEach((p) => {
        if (p.status === 'Present') policyScore += 10;
        else if (p.status === 'Weak') policyScore += 5;
    });

    // Text length score (longer = more established)
    const textLengthScore = Math.min(20, Math.floor(text.length / 300));
    const textLengthMax = 20;

    // Industry adjustment
    const riskyIndustries = ['gambling', 'crypto', 'adult', 'firearms', 'cbd', 'cannabis'];
    const industryLower = industry.toLowerCase();
    const isRiskyIndustry = riskyIndustries.some((ri) => industryLower.includes(ri));
    const industryScore = isRiskyIndustry ? 5 : 20;
    const industryMax = 20;

    // Processor adjustment
    const trustedProcessors = ['stripe', 'paypal', 'square', 'adyen', 'braintree'];
    const processorLower = processor.toLowerCase();
    const hasTrustedProcessor = trustedProcessors.some((tp) => processorLower.includes(tp));
    const processorScore = hasTrustedProcessor ? 20 : 10;
    const processorMax = 20;

    // Calculate stability score (0-100)
    const stabilityScore = policyScore + textLengthScore + industryScore + processorScore;

    // Calculate risk tier (1-5, where 1 is lowest risk)
    let riskTier: number;
    let riskLabel: string;

    if (stabilityScore >= 80) {
        riskTier = 1;
        riskLabel = 'LOW';
    } else if (stabilityScore >= 60) {
        riskTier = 2;
        riskLabel = 'MODERATE';
    } else if (stabilityScore >= 40) {
        riskTier = 3;
        riskLabel = 'ELEVATED';
    } else if (stabilityScore >= 20) {
        riskTier = 4;
        riskLabel = 'HIGH';
    } else {
        riskTier = 5;
        riskLabel = 'CRITICAL';
    }

    const scoreBreakdown: ScoreNode[] = [
        { name: 'Policy Compliance', stabilityPoints: policyScore, score: policyScore, max: policyMax },
        { name: 'Content Depth', stabilityPoints: textLengthScore, score: textLengthScore, max: textLengthMax },
        { name: 'Industry Risk', stabilityPoints: industryScore, score: industryScore, max: industryMax },
        { name: 'Processor Trust', stabilityPoints: processorScore, score: processorScore, max: processorMax },
    ];

    // Extract text snippets for AI context
    const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 20);
    const snippets = sentences.slice(0, 10).map((s) => s.trim().slice(0, 150));

    return {
        riskTier,
        riskLabel,
        stabilityScore,
        scoreBreakdown,
        policies,
        snippets,
    };
}

// ─────────────────────────────────────────────────────────────────────────────
// Gemini Integration (Fail-Soft)
// ─────────────────────────────────────────────────────────────────────────────

const GEMINI_ENDPOINT =
    'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent';

const NarrativeSchema = z.object({
    summary: z.string(),
    drivers: z
        .array(
            z.object({
                factor: z.string(),
                impact: z.enum(['positive', 'negative', 'neutral']),
                evidence: z.string(),
                weight: z.number().min(1).max(10),
            })
        )
        .min(3)
        .max(5),
    recommendations: z.array(z.string()).min(1).max(5),
});

type Narrative = z.infer<typeof NarrativeSchema>;

function createFallbackNarrative(
    riskLabel: string,
    stabilityScore: number,
    policies: Record<string, PolicyStatus>,
    snippets: string[]
): Narrative {
    const drivers: Narrative['drivers'] = [];

    // Policy-based drivers
    if (policies.terms.status === 'Present') {
        drivers.push({
            factor: 'Terms of Service',
            impact: 'positive',
            evidence: snippets[0] || 'Terms of service documentation detected',
            weight: 7,
        });
    } else if (policies.terms.status === 'Missing') {
        drivers.push({
            factor: 'Terms of Service',
            impact: 'negative',
            evidence: 'No terms of service detected on the website',
            weight: 8,
        });
    }

    if (policies.privacy.status === 'Present') {
        drivers.push({
            factor: 'Privacy Policy',
            impact: 'positive',
            evidence: snippets[1] || 'Privacy policy documentation detected',
            weight: 7,
        });
    } else if (policies.privacy.status === 'Missing') {
        drivers.push({
            factor: 'Privacy Policy',
            impact: 'negative',
            evidence: 'No privacy policy detected on the website',
            weight: 8,
        });
    }

    if (policies.contact.status === 'Present') {
        drivers.push({
            factor: 'Customer Support',
            impact: 'positive',
            evidence: snippets[2] || 'Customer contact information available',
            weight: 6,
        });
    }

    // Ensure we have at least 3 drivers
    while (drivers.length < 3) {
        drivers.push({
            factor: 'Website Content',
            impact: stabilityScore >= 50 ? 'positive' : 'negative',
            evidence: snippets[drivers.length] || 'Website content analysis',
            weight: 5,
        });
    }

    // Limit to 5 drivers
    const finalDrivers = drivers.slice(0, 5);

    const recommendations: string[] = [];
    if (policies.terms.status !== 'Present') {
        recommendations.push('Add comprehensive Terms of Service');
    }
    if (policies.privacy.status !== 'Present') {
        recommendations.push('Implement a detailed Privacy Policy');
    }
    if (policies.refund.status !== 'Present') {
        recommendations.push('Clearly display refund and cancellation policies');
    }
    if (policies.contact.status !== 'Present') {
        recommendations.push('Add visible customer support contact information');
    }
    if (recommendations.length === 0) {
        recommendations.push('Continue maintaining current compliance standards');
    }

    return {
        summary: `This merchant has a ${riskLabel} risk profile with a stability score of ${stabilityScore}/100. The assessment is based on policy compliance, content depth, and industry factors.`,
        drivers: finalDrivers,
        recommendations: recommendations.slice(0, 5),
    };
}

function padDrivers(
    drivers: Narrative['drivers'],
    snippets: string[],
    stabilityScore: number
): Narrative['drivers'] {
    const validDrivers = drivers.map((d, i) => ({
        ...d,
        // Ensure evidence is from snippets or a valid string
        evidence: snippets.includes(d.evidence) ? d.evidence : snippets[i] || d.evidence,
    }));

    while (validDrivers.length < 3) {
        validDrivers.push({
            factor: 'General Assessment',
            impact: stabilityScore >= 50 ? 'positive' : 'negative',
            evidence: snippets[validDrivers.length] || 'Website content reviewed',
            weight: 5,
        });
    }

    return validDrivers.slice(0, 5);
}

async function callGemini(
    apiKey: string,
    text: string,
    snippets: string[],
    riskLabel: string,
    stabilityScore: number,
    policies: Record<string, PolicyStatus>,
    isRetry: boolean = false
): Promise<{ ok: boolean; narrative?: Narrative; error?: string }> {
    const prompt = `You are a payment risk analyst. Analyze this merchant website content and provide a risk assessment.

Website text (truncated):
${text.slice(0, 3000)}

Key snippets:
${snippets.map((s, i) => `${i + 1}. "${s}"`).join('\n')}

Current assessment:
- Risk Level: ${riskLabel}
- Stability Score: ${stabilityScore}/100
- Terms of Service: ${policies.terms.status}
- Privacy Policy: ${policies.privacy.status}
- Refund Policy: ${policies.refund.status}
- Contact Info: ${policies.contact.status}

Respond with a JSON object containing:
1. "summary": A 2-3 sentence summary of the merchant's risk profile
2. "drivers": An array of 3-5 risk drivers, each with:
   - "factor": The risk factor name
   - "impact": "positive", "negative", or "neutral"
   - "evidence": MUST be an EXACT string from the snippets list above
   - "weight": 1-10 importance scale
3. "recommendations": Array of 1-5 actionable recommendations

CRITICAL: The "evidence" field MUST contain an EXACT string from the snippets list.`;

    const requestBody = {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
            responseMimeType: 'application/json',
            temperature: isRetry ? 0.1 : 0.4,
            maxOutputTokens: isRetry ? 2048 : 4096,
        },
    };

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        const response = await fetch(`${GEMINI_ENDPOINT}?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody),
            signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            return { ok: false, error: `Gemini API error: ${response.status}` };
        }

        const data = await response.json();
        const content = data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!content) {
            return { ok: false, error: 'Empty response from Gemini' };
        }

        const parsed = JSON.parse(content);
        const validated = NarrativeSchema.safeParse(parsed);

        if (!validated.success) {
            // Try to salvage the response
            if (parsed.summary && parsed.drivers && parsed.recommendations) {
                const fixedDrivers = padDrivers(parsed.drivers, snippets, stabilityScore);
                return {
                    ok: true,
                    narrative: {
                        summary: String(parsed.summary),
                        drivers: fixedDrivers,
                        recommendations: Array.isArray(parsed.recommendations)
                            ? parsed.recommendations.slice(0, 5).map(String)
                            : ['Review website compliance'],
                    },
                };
            }
            return { ok: false, error: `Schema validation failed: ${validated.error.message}` };
        }

        // Normalize drivers to ensure evidence matches snippets
        const normalizedDrivers = padDrivers(validated.data.drivers, snippets, stabilityScore);

        return {
            ok: true,
            narrative: {
                ...validated.data,
                drivers: normalizedDrivers,
            },
        };
    } catch (err) {
        if ((err as Error).name === 'AbortError') {
            return { ok: false, error: 'Gemini request timed out' };
        }
        return { ok: false, error: `Gemini request failed: ${(err as Error).message}` };
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Response Schema
// ─────────────────────────────────────────────────────────────────────────────

const ResponseSchema = z.object({
    url: z.string(),
    analyzedAt: z.string(),
    industry: z.string(),
    processor: z.string(),
    riskTier: z.number().min(1).max(5),
    riskLabel: z.enum(['LOW', 'MODERATE', 'ELEVATED', 'HIGH', 'CRITICAL']),
    stabilityScore: z.number().min(0).max(100),
    scoreBreakdown: z.array(
        z.object({
            name: z.string(),
            stabilityPoints: z.number(),
            score: z.number(),
            max: z.number(),
        })
    ),
    policies: z.record(z.string(), z.object({
        status: z.enum(['Present', 'Weak', 'Missing']),
        matches: z.number(),
    })),
    narrative: z.object({
        summary: z.string(),
        drivers: z.array(
            z.object({
                factor: z.string(),
                impact: z.enum(['positive', 'negative', 'neutral']),
                evidence: z.string(),
                weight: z.number(),
            })
        ),
        recommendations: z.array(z.string()),
    }),
    meta: z.object({
        aiProvider: z.enum(['gemini', 'fallback']),
        processingTimeMs: z.number(),
    }),
});

// ─────────────────────────────────────────────────────────────────────────────
// Request Schema
// ─────────────────────────────────────────────────────────────────────────────

const RequestSchema = z.object({
    url: z.string().min(1),
    industry: z.string().default('General'),
    processor: z.string().default('Unknown'),
});

// ─────────────────────────────────────────────────────────────────────────────
// Route Handler
// ─────────────────────────────────────────────────────────────────────────────

export async function POST(request: Request) {
    const startTime = Date.now();

    // Check API key
    const apiKey = process.env.GEMINI_API_KEY;
    // if (!apiKey) {
    //     return NextResponse.json({ error: 'Missing API Key' }, { status: 500 });
    // }

    // Parse request body
    let body: unknown;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const parseResult = RequestSchema.safeParse(body);
    if (!parseResult.success) {
        return NextResponse.json(
            { error: 'Invalid request', details: parseResult.error.issues },
            { status: 400 }
        );
    }

    const { url: rawUrl, industry, processor } = parseResult.data;

    // Normalize URL
    let targetUrl = rawUrl;
    if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
        targetUrl = `https://${targetUrl}`;
    }

    // SSRF-safe fetch
    const fetchResult = await safeFetch(targetUrl);
    if (!fetchResult.ok || !fetchResult.response) {
        return NextResponse.json({ error: fetchResult.error }, { status: 403 });
    }

    const response = fetchResult.response;

    // Content type check
    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('text/html') && !contentType.includes('application/xhtml+xml')) {
        return NextResponse.json(
            { error: `Invalid content type: ${contentType}. Only HTML pages are supported.` },
            { status: 400 }
        );
    }

    // Get HTML content
    const html = await response.text();
    const visibleText = extractVisibleText(html);

    if (visibleText.length < 50) {
        return NextResponse.json(
            { error: 'Insufficient content on page for analysis' },
            { status: 400 }
        );
    }

    // Calculate deterministic scores
    const {
        riskTier,
        riskLabel,
        stabilityScore,
        scoreBreakdown,
        policies,
        snippets,
    } = calculateDeterministicScore(visibleText, industry, processor);

    // Call Gemini (fail-soft)
    let narrative: Narrative;
    let aiProvider: 'gemini' | 'fallback' = 'fallback';

    if (apiKey) {
        const geminiResult = await callGemini(
            apiKey,
            visibleText,
            snippets,
            riskLabel,
            stabilityScore,
            policies
        );

        if (geminiResult.ok && geminiResult.narrative) {
            narrative = geminiResult.narrative;
            aiProvider = 'gemini';
        } else {
            // Retry with lower temperature
            const retryResult = await callGemini(
                apiKey,
                visibleText,
                snippets,
                riskLabel,
                stabilityScore,
                policies,
                true
            );

            if (retryResult.ok && retryResult.narrative) {
                narrative = retryResult.narrative;
                aiProvider = 'gemini';
            } else {
                // Use deterministic fallback
                narrative = createFallbackNarrative(riskLabel, stabilityScore, policies, snippets);
            }
        }
    } else {
        // No API key -> unexpected but fail-soft to deterministic
        narrative = createFallbackNarrative(riskLabel, stabilityScore, policies, snippets);
    }

    // Build response
    const responsePayload = {
        url: targetUrl,
        analyzedAt: new Date().toISOString(),
        industry,
        processor,
        riskTier,
        riskLabel,
        stabilityScore,
        scoreBreakdown,
        policies,
        narrative,
        meta: {
            aiProvider,
            processingTimeMs: Date.now() - startTime,
        },
    };

    // Validate response
    const responseValidation = ResponseSchema.safeParse(responsePayload);
    if (!responseValidation.success) {
        return NextResponse.json(
            {
                error: 'Schema Validation Error',
                details: responseValidation.error.issues,
            },
            { status: 502 }
        );
    }

    return NextResponse.json(responseValidation.data);
}
