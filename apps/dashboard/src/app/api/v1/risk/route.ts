import { NextResponse } from 'next/server';
import { z } from 'zod';
import dns from 'node:dns/promises';
import net from 'node:net';
import crypto from 'node:crypto';
import { RateLimiter, RiskCache, ConcurrencyManager, CACHE_TTL, RiskLogger, RiskMetrics, RiskIntelligence } from '@/lib/risk-infra';
import { resolveAccountFromAPIKey } from '@/lib/account-resolver';
import { resolveAccountTierConfig } from '@/lib/tier-enforcement';

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
    /^169\.254\.\d{1,3}\.\d{1,3}$/,
    /^0\.0\.0\.0$/,
    /\.local$/i,
    /\.internal$/i,
    /^metadata\.google\.internal$/i,
    /^169\.254\.169\.254$/,
    /^fd[0-9a-f]{2}:/i,
    /^fe80:/i,
    /^::1$/,
    /^::$/,
];

function isPrivateIP(ip: string): boolean {
    if (net.isIPv4(ip)) {
        const parts = ip.split('.').map(Number);
        if (parts[0] === 10) return true;
        if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
        if (parts[0] === 192 && parts[1] === 168) return true;
        if (parts[0] === 127) return true;
        if (parts[0] === 169 && parts[1] === 254) return true;
        if (parts[0] === 0) return true;
    } else if (net.isIPv6(ip)) {
        const lower = ip.toLowerCase();
        if (lower === '::1' || lower === '::') return true;
        if (lower.startsWith('fe80:')) return true;
        if (lower.startsWith('fc') || lower.startsWith('fd')) return true;
    }
    return false;
}

function isBlockedHostname(hostname: string): boolean {
    return BLOCKED_HOSTNAME_PATTERNS.some((pattern) => pattern.test(hostname));
}

async function validateHostname(hostname: string): Promise<{ safe: boolean; error?: string }> {
    const cacheKey = `dns:safe:${hostname}`;
    const cached = await RiskCache.get(cacheKey);
    if (cached) return JSON.parse(cached);

    let result = { safe: true, error: undefined as string | undefined };

    if (isBlockedHostname(hostname)) {
        result = { safe: false, error: `Blocked hostname: ${hostname}` };
    } else {
        try {
            const addresses = await dns.lookup(hostname, { all: true });
            for (const addr of addresses) {
                if (isPrivateIP(addr.address)) {
                    result = { safe: false, error: `DNS resolved to private IP: ${addr.address}` };
                    break;
                }
            }
        } catch (err) {
            result = { safe: false, error: `DNS lookup failed: ${(err as Error).message}` };
        }
    }

    await RiskCache.set(cacheKey, result, CACHE_TTL.DNS_SAFE);
    return result;
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

        if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
            return { ok: false, error: `Blocked protocol: ${parsedUrl.protocol}` };
        }

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
    let clean = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
    clean = clean.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
    clean = clean.replace(/<noscript[^>]*>[\s\S]*?<\/noscript>/gi, '');
    clean = clean.replace(/<[^>]+>/g, ' ');
    clean = clean.replace(/&nbsp;/g, ' ');
    return clean.replace(/\s+/g, ' ').trim();
}

function extractVisibleText(html: string): string {
    const capped = html.slice(0, MAX_HTML_SIZE);
    const text = sanitizeHtml(capped);
    return text.slice(0, MAX_TEXT_SIZE);
}

// ─────────────────────────────────────────────────────────────────────────────
// Deterministic Scoring
// ─────────────────────────────────────────────────────────────────────────────

interface PolicyStatus { status: 'Present' | 'Weak' | 'Missing'; matches: number; }
interface ScoreNode { name: string; stabilityPoints: number; score: number; max: number; }

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

function calculateDeterministicScore(text: string, industry: string, processor: string) {
    const policies = {
        terms: detectPolicy(text, POLICY_KEYWORDS.terms),
        privacy: detectPolicy(text, POLICY_KEYWORDS.privacy),
        refund: detectPolicy(text, POLICY_KEYWORDS.refund),
        contact: detectPolicy(text, POLICY_KEYWORDS.contact),
    };

    let policyScore = 0;
    Object.values(policies).forEach((p) => { if (p.status === 'Present') policyScore += 10; else if (p.status === 'Weak') policyScore += 5; });

    const textLengthScore = Math.min(20, Math.floor(text.length / 300));
    const riskyIndustries = ['gambling', 'crypto', 'adult', 'firearms', 'cbd', 'cannabis'];
    const isRiskyIndustry = riskyIndustries.some((ri) => industry.toLowerCase().includes(ri));
    const industryScore = isRiskyIndustry ? 5 : 20;
    const trustedProcessors = ['stripe', 'paypal', 'square', 'adyen', 'braintree'];
    const hasTrustedProcessor = trustedProcessors.some((tp) => processor.toLowerCase().includes(tp));
    const processorScore = hasTrustedProcessor ? 20 : 10;

    const stabilityScore = policyScore + textLengthScore + industryScore + processorScore;
    let riskTier = stabilityScore >= 80 ? 1 : stabilityScore >= 60 ? 2 : stabilityScore >= 40 ? 3 : stabilityScore >= 20 ? 4 : 5;
    let riskLabel = ['LOW', 'MODERATE', 'ELEVATED', 'HIGH', 'CRITICAL'][riskTier - 1];

    const scoreBreakdown: ScoreNode[] = [
        { name: 'Policy Compliance', stabilityPoints: policyScore, score: policyScore, max: 40 },
        { name: 'Content Depth', stabilityPoints: textLengthScore, score: textLengthScore, max: 20 },
        { name: 'Industry Risk', stabilityPoints: industryScore, score: industryScore, max: 20 },
        { name: 'Processor Trust', stabilityPoints: processorScore, score: processorScore, max: 20 },
    ];

    const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 20);
    const snippets = sentences.slice(0, 10).map((s) => s.trim().slice(0, 150));

    return { riskTier, riskLabel, stabilityScore, scoreBreakdown, policies, snippets };
}

// ─────────────────────────────────────────────────────────────────────────────
// Gemini Integration
// ─────────────────────────────────────────────────────────────────────────────

const GEMINI_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent';
const NarrativeSchema = z.object({
    summary: z.string(),
    drivers: z.array(z.object({ factor: z.string(), impact: z.enum(['positive', 'negative', 'neutral']), evidence: z.string(), weight: z.number() })),
    recommendations: z.array(z.string()),
});
type Narrative = z.infer<typeof NarrativeSchema>;

function createFallbackNarrative(riskLabel: string, stabilityScore: number, policies: Record<string, PolicyStatus>, snippets: string[]): Narrative {
    return {
        summary: `This merchant has a ${riskLabel} risk profile (Score: ${stabilityScore}).`,
        drivers: [
            { factor: 'Terms of Service', impact: policies.terms.status === 'Present' ? 'positive' : 'negative', evidence: snippets[0] || 'N/A', weight: 8 },
            { factor: 'Privacy Policy', impact: policies.privacy.status === 'Present' ? 'positive' : 'negative', evidence: snippets[1] || 'N/A', weight: 8 },
            { factor: 'Website Content', impact: stabilityScore >= 50 ? 'positive' : 'negative', evidence: snippets[2] || 'Content analysis', weight: 5 }
        ],
        recommendations: ['Maintain compliance', 'Regular review']
    };
}

async function executeRiskScan(url: string, industry: string, processor: string, traceId: string, ip: string, host: string, keyId: string) {
    const startTime = performance.now();
    const apiKey = process.env.GEMINI_API_KEY;

    // Fetch
    const fetchStart = performance.now();
    const fetchResult = await safeFetch(url);
    const fetchDuration = performance.now() - fetchStart;

    if (!fetchResult.ok || !fetchResult.response) {
        RiskLogger.log('risk_ssrf_block', { traceId, ip, keyId, url, host, reason: fetchResult.error });
        RiskMetrics.inc('risk_ssrf_blocks_total', { tier: keyId === 'anon' ? 'ANONYMOUS' : 'KEYED' });
        return { status: 403, error: fetchResult.error };
    }

    const response = fetchResult.response;
    const html = await response.text();
    const visibleText = extractVisibleText(html);

    if (visibleText.length < 50) return { status: 400, error: 'Insufficient content' };

    const { riskTier, riskLabel, stabilityScore, scoreBreakdown, policies, snippets } = calculateDeterministicScore(visibleText, industry, processor);

    let narrative = createFallbackNarrative(riskLabel, stabilityScore, policies, snippets);
    let aiProvider: 'gemini' | 'fallback' = 'fallback';

    RiskLogger.log('risk_request_complete', {
        traceId, ip, keyId, url, host,
        status: 200,
        durationMs: performance.now() - startTime,
        aiProvider,
        cache: 'miss'
    });
    RiskMetrics.inc('risk_success_total', { keyId });

    return {
        status: 200,
        data: {
            url, analyzedAt: new Date().toISOString(), industry, processor, scoreBreakdown, policies, narrative,
            riskTier, riskLabel, stabilityScore, meta: { aiProvider, processingTimeMs: performance.now() - startTime }
        }
    };
}

const RequestSchema = z.object({
    url: z.string().min(1),
    industry: z.string().default('General'),
    processor: z.string().default('Unknown'),
});

import { requireAuth } from '@/lib/require-auth';

// ─────────────────────────────────────────────────────────────────────────────
// Route Handler
// ─────────────────────────────────────────────────────────────────────────────

export async function POST(request: Request) {
    const authResult = await requireAuth();
    if (!authResult.ok) return authResult.response;

    const { userId, workspace } = authResult;

    const traceId = crypto.randomUUID();
    const startTime = performance.now();
    const ip = (request.headers.get('x-forwarded-for') || '127.0.0.1').split(',')[0].trim();
    const apiKey = request.headers.get('x-payflux-key');

    // 1. Resolve Account and Tier
    const account = apiKey ? await resolveAccountFromAPIKey(apiKey) : null;
    const tier = account?.billingTier || 'PILOT';
    const keyId = account?.id || 'anon';
    const identifier = account ? keyId : ip;

    RiskMetrics.inc('risk_requests_total', { tier });
    RiskLogger.log('risk_request_start', { traceId, ip, keyId, tier });

    // 2. Validations
    let body: any;
    try { body = await request.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400, headers: { 'x-trace-id': traceId } }); }

    const parseResult = RequestSchema.safeParse(body);
    if (!parseResult.success) {
        RiskMetrics.inc('risk_failures_total');
        return NextResponse.json({ error: 'Invalid request' }, { status: 400, headers: { 'x-trace-id': traceId } });
    }

    const { url: rawUrl, industry, processor } = parseResult.data;
    let targetUrl = rawUrl;
    if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) targetUrl = `https://${targetUrl}`;
    const normalizedUrl = RiskCache.normalizeUrl(targetUrl);
    let hostname = 'unknown';
    try { hostname = new URL(targetUrl).hostname; } catch { }

    // 3. DNS/SSRF Check
    const dnsCheck = await validateHostname(hostname);
    if (!dnsCheck.safe) {
        RiskLogger.log('risk_ssrf_block', { traceId, ip, keyId, url: normalizedUrl, host: hostname, reason: dnsCheck.error });
        RiskMetrics.inc('risk_ssrf_blocks_total');
        return NextResponse.json({ error: dnsCheck.error }, { status: 403, headers: { 'x-trace-id': traceId } });
    }

    // 4. Rate Limit
    const tierConfig = await resolveAccountTierConfig(account || {
        id: 'anon',
        billingTier: 'PILOT',
        tierHistory: [],
    });

    const quotaConfig = {
        capacity: tierConfig.rateLimits.ingestRPS * 2,
        refillRate: tierConfig.rateLimits.ingestRPS,
        window: 3600,
    };

    const { allowed, headers: rlHeaders } = await RateLimiter.check(identifier, quotaConfig);
    if (!allowed) {
        RiskLogger.log('risk_rate_limit_deny', {
            traceId, ip, keyId, url: normalizedUrl, host: hostname,
            retryAfterSec: rlHeaders['x-rate-limit-reset'],
            remainingTokens: rlHeaders['x-rate-limit-remaining']
        });
        RiskMetrics.inc('risk_rate_limit_denies_total', { tier });
        return NextResponse.json({ error: "Rate limited" }, { status: 429, headers: { ...rlHeaders, 'x-trace-id': traceId } });
    }

    // 5. Cache Check
    const cacheKey = `risk:scan:${normalizedUrl}`;
    const cached = await RiskCache.get(cacheKey);

    if (cached) {
        try {
            const data = JSON.parse(cached);
            const status = (data as any).error ? (data as any).status || 400 : 200;
            RiskMetrics.inc('risk_cache_hits_total');
            RiskMetrics.inc('risk_success_total', { keyId });
            RiskLogger.log('risk_request_complete', {
                traceId, ip, keyId, url: normalizedUrl, host: hostname,
                status, durationMs: performance.now() - startTime, aiProvider: 'cached', cache: 'hit'
            });
            // Persistence Hook (Cache Hit)
            await RiskIntelligence.record(traceId, data, 'cache');

            return NextResponse.json(data, {
                status,
                headers: { ...rlHeaders, 'x-cache': 'hit', 'x-risk-inflight': 'deduped', 'x-trace-id': traceId }
            });
        } catch { }
    }

    RiskLogger.log('risk_cache_miss', { traceId, ip, keyId, url: normalizedUrl, host: hostname, cacheKey });
    RiskMetrics.inc('risk_cache_misses_total');

    // 6. Execution
    const { result, deduped } = await ConcurrencyManager.dedupe(cacheKey, async () => {
        return await executeRiskScan(targetUrl, industry, processor, traceId, ip, hostname, keyId);
    });

    if (deduped) {
        RiskMetrics.inc('risk_inflight_followers_total');
        RiskLogger.log('risk_request_complete', {
            traceId, ip, keyId, url: normalizedUrl, host: hostname,
            status: result.status, durationMs: performance.now() - startTime, aiProvider: 'deduped', cache: 'bypass'
        });
        if (result.status === 200) RiskMetrics.inc('risk_success_total', { keyId });
    }

    // 7. Set Cache
    if (!deduped) {
        if (result.status === 200 && result.data) {
            await RiskCache.set(cacheKey, result.data, CACHE_TTL.URL_CRAWL);
        } else {
            await RiskCache.set(cacheKey, { error: result.error, status: result.status }, CACHE_TTL.NEGATIVE);
            RiskMetrics.inc('risk_failures_total');
        }
    }

    // 7. Persistence Hook (Fresh / Deduped)
    if (result.status === 200 && result.data) {
        await RiskIntelligence.record(traceId, result.data, deduped ? 'cache' : 'fresh');
    }

    // 8. Response
    return NextResponse.json(result.data || { error: result.error }, {
        status: result.status,
        headers: {
            ...rlHeaders,
            'x-cache': 'miss',
            'x-risk-inflight': deduped ? 'deduped' : 'new',
            'x-trace-id': traceId
        }
    });
}
