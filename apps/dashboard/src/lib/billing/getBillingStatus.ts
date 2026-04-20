import { getSubscriptionByUserId, getSubscriptionByWorkspaceId } from './store';

export type ResolvedBillingStatus = 'none' | 'active' | 'past_due' | 'inactive';

type WorkspaceLike = {
    tier?: string | null;
    organization?: {
        publicMetadata?: Record<string, unknown> | null;
    } | null;
};

// In-memory billing status cache (30s TTL)
// Reduces Neon DB hits on every dashboard page load in serverless
const CACHE_TTL_MS = 30_000;
const billingCache = new Map<string, { status: ResolvedBillingStatus; expiresAt: number }>();

export function invalidateBillingStatusCache(
    workspaceId?: string | null,
    userId?: string | null
) {
    for (const key of billingCache.keys()) {
        const [cachedWorkspaceId, cachedUserId = ''] = key.split(':');
        if (
            (workspaceId && cachedWorkspaceId === workspaceId) ||
            (userId && cachedUserId === userId)
        ) {
            billingCache.delete(key);
        }
    }
}

export function getBillingStatusFromWorkspaceMetadata(
    workspace: WorkspaceLike | null | undefined
): ResolvedBillingStatus {
    if (!workspace) return 'none';

    const metadata = workspace.organization?.publicMetadata ?? {};
    const rawStatus = String(
        metadata.billingStatus ?? metadata.paymentStatus ?? ''
    ).toLowerCase();

    if (rawStatus === 'active' || rawStatus === 'trialing') {
        return 'active';
    }

    if (rawStatus === 'past_due') {
        return 'past_due';
    }

    if (rawStatus === 'inactive' || rawStatus === 'canceled' || rawStatus === 'unpaid') {
        return 'inactive';
    }

    return 'none';
}

export async function getBillingStatus(
    workspaceId: string,
    userId?: string
): Promise<ResolvedBillingStatus> {
    const cacheKey = `${workspaceId}:${userId ?? ''}`;
    const cached = billingCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
        return cached.status;
    }

    try {
        const workspaceSubscription = await getSubscriptionByWorkspaceId(workspaceId);
        const subscription =
            workspaceSubscription ?? (userId ? await getSubscriptionByUserId(userId) : null);

        let status: ResolvedBillingStatus;

        if (!subscription) {
            status = 'none';
        } else if (subscription.status === 'active' || subscription.status === 'trialing') {
            status = 'active';
        } else if (subscription.status === 'past_due') {
            status = 'past_due';
        } else {
            status = 'inactive';
        }

        billingCache.set(cacheKey, { status, expiresAt: Date.now() + CACHE_TTL_MS });
        return status;
    } catch (error) {
        console.error('getBillingStatus failed:', (error as Error).message);
        return 'none';
    }
}
