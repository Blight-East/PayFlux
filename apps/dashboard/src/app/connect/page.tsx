import { auth, clerkClient } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import SignOutLink from '@/components/SignOutLink';
import { logOnboardingEvent } from '@/lib/onboarding-events';

export const runtime = 'nodejs';

const ERROR_MESSAGES: Record<string, string> = {
    stripe_connect_failed: 'Stripe connection failed. Try again.',
    invalid_state: 'Security validation failed. Try again.',
    clerk_not_configured: 'Clerk is not configured. Contact admin.',
};

type PageProps = {
    searchParams?: Record<string, string | string[] | undefined>;
};

async function resolveActiveOrgId(client: any, userId: string, orgId: string | null) {
    if (orgId) return orgId;
    const memberships = await client.users.getOrganizationMembershipList({ userId });
    if (memberships?.data?.length > 0) {
        return memberships.data[0].organization.id;
    }
    const org = await client.organizations.createOrganization({
        name: 'Default Payflux Org',
        createdBy: userId,
    });
    return org.id;
}

export default async function ConnectPage({ searchParams }: PageProps) {
    const { userId, orgId } = await auth();
    if (!userId) redirect('/sign-in');

    const client = await clerkClient();
    const activeOrgId = await resolveActiveOrgId(client, userId, orgId ?? null);
    const organization = await client.organizations.getOrganization({ organizationId: activeOrgId });

    const stripeAccountId = organization?.publicMetadata?.stripeAccountId;
    const isConnected = typeof stripeAccountId === 'string' && stripeAccountId.length > 0;

    if (isConnected) {
        redirect('/dashboard');
    }

    logOnboardingEvent('connect_started', { userId, workspaceId: activeOrgId });

    const errRaw = searchParams?.err;
    const err = Array.isArray(errRaw) ? errRaw[0] : errRaw;
    const errorMessage = err ? ERROR_MESSAGES[err] : null;

    return (
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6">
            <div className="max-w-md w-full space-y-6">
                {/* Error */}
                {errorMessage && (
                    <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-start space-x-3">
                        <svg className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <p className="text-sm text-red-400">{errorMessage}</p>
                    </div>
                )}

                {/* Main card */}
                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-8 space-y-6">
                    <div className="text-center space-y-3">
                        <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-500/10 border border-blue-500/20 rounded-xl mx-auto">
                            <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                        </div>
                        <h1 className="text-xl font-semibold text-white">
                            Connect your processor
                        </h1>
                        <p className="text-sm text-slate-400 leading-relaxed">
                            We'll monitor your payment events for risk signals and alert you before they escalate.
                        </p>
                    </div>

                    {/* What we monitor */}
                    <div className="space-y-3">
                        <h2 className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">What we monitor</h2>
                        <ul className="space-y-2">
                            <li className="flex items-start space-x-3">
                                <div className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 flex-shrink-0" />
                                <span className="text-sm text-slate-300">Reserve holds and payout timing shifts</span>
                            </li>
                            <li className="flex items-start space-x-3">
                                <div className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 flex-shrink-0" />
                                <span className="text-sm text-slate-300">Dispute rate trajectory and threshold proximity</span>
                            </li>
                            <li className="flex items-start space-x-3">
                                <div className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 flex-shrink-0" />
                                <span className="text-sm text-slate-300">Account health signals from your processor</span>
                            </li>
                        </ul>
                    </div>

                    {/* Trust line */}
                    <div className="bg-slate-800/50 rounded-lg px-4 py-3">
                        <p className="text-xs text-slate-400 leading-relaxed">
                            Read-only connection via Stripe Connect. No access to modify payments, issue refunds, or change your configuration.
                        </p>
                    </div>

                    {/* Primary CTA */}
                    <a
                        href="/api/stripe/authorize"
                        className="flex items-center justify-center w-full px-4 py-3 bg-amber-500 text-slate-950 font-semibold rounded-lg hover:bg-amber-400 transition-all active:scale-[0.98] no-underline"
                    >
                        Connect Stripe
                    </a>

                    {/* Secondary: Skip */}
                    <Link
                        href="/dashboard"
                        className="flex items-center justify-center w-full px-4 py-2 text-sm text-slate-500 hover:text-slate-400 transition-colors no-underline"
                    >
                        Skip for now — go to dashboard preview
                    </Link>

                    <div className="text-center pt-2">
                        <SignOutLink />
                    </div>
                </div>

                <p className="text-center text-[10px] text-slate-600 uppercase tracking-wide">
                    Powered by Stripe Connect
                </p>
            </div>
        </div>
    );
}
