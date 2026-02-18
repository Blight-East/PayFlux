import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function getBearer(req: Request): string | null {
    const h = req.headers.get("authorization") || req.headers.get("Authorization");
    if (!h) return null;
    const m = h.match(/^Bearer\s+(.+)$/i);
    return m?.[1]?.trim() ?? null;
}

function withProvenanceHeaders(res: NextResponse) {
    // These should be injected at build/deploy time (Netlify/CI), not computed at runtime.
    const sha = process.env.PAYFLUX_GIT_SHA || process.env.GIT_SHA || "unknown";
    const builtAt = process.env.PAYFLUX_BUILD_TIME || process.env.BUILD_TIME || "unknown";

    // Low-risk, non-secret provenance. Use short SHA for readability if desired.
    res.headers.set("x-payflux-build-sha", sha);
    res.headers.set("x-payflux-built-at", builtAt);

    // Keep it non-cacheable everywhere.
    res.headers.set("cache-control", "no-store, max-age=0");
    res.headers.set("pragma", "no-cache");

    return res;
}

export async function GET(req: Request) {
    if (process.env.NODE_ENV !== 'development') {
        return new NextResponse('Not Found', { status: 404 });
    }

    const token = getBearer(req);
    const expected = process.env.PAYFLUX_API_KEY || process.env.PAYFLUX_AUTH_TOKEN;

    // Always return provenance headers even when unauthorized.
    if (!expected || !token || token !== expected) {
        const res = NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        return withProvenanceHeaders(res);
    }

    const sha = process.env.PAYFLUX_GIT_SHA || process.env.GIT_SHA || "unknown";
    const builtAt = process.env.PAYFLUX_BUILD_TIME || process.env.BUILD_TIME || "unknown";

    const res = NextResponse.json(
        {
            gitSha: sha,
            builtAt,
            // Optional: include runtime hints that aren’t secrets
            nodeEnv: process.env.NODE_ENV ?? "unknown",
            payfluxEnv: process.env.PAYFLUX_ENV ?? "unknown",
        },
        { status: 200 }
    );

    return withProvenanceHeaders(res);
}
