import { auth, clerkClient } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import SignOutLink from '@/components/SignOutLink';
import ConnectStripeCTA from '@/components/ConnectStripeCTA';
import { logOnboardingEvent } from '@/lib/onboarding-events-server';

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
    if (!userId) redirect('/sign-in?redirect_url=%2Fconnect');

    const client = await clerkClient();
    const activeOrgId = await resolveActiveOrgId(client, userId, orgId ?? null);
    const organization = await client.organizations.getOrganization({ organizationId: activeOrgId });

    const stripeAccountId = organization?.publicMetadata?.stripeAccountId;
    const isConnected = typeof stripeAccountId === 'string' && stripeAccountId.length > 0;

    if (isConnected) {
        redirect('/dashboard');
    }

    logOnboardingEvent('connect_viewed', { userId, workspaceId: activeOrgId });

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
                            Connect Stripe so PayFlux can watch payout risk live.
                        </h1>
                        <p className="text-sm text-slate-400 leading-relaxed">
                            PayFlux uses live processor data to catch held funds, slower payouts, and rising account pressure before they turn into a cash-flow surprise.
                        </p>
                    </div>

                    <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 space-y-3">
                        <p className="text-[10px] text-slate-500 uppercase tracking-[0.2em] font-bold">What changes the moment you connect</p>
                        <div className="grid gap-3 sm:grid-cols-2">
                            <div className="rounded-lg border border-slate-800/60 bg-slate-950/40 p-3">
                                <p className="text-[11px] font-semibold text-white">Without a connection</p>
                                <p className="mt-1.5 text-[10px] leading-relaxed text-slate-500">
                                    You only have a one-time site snapshot. Useful, but blind to what your processor is doing right now.
                                </p>
                            </div>
                            <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3">
                                <p className="text-[11px] font-semibold text-white">With live processor data</p>
                                <p className="mt-1.5 text-[10px] leading-relaxed text-slate-400">
                                    PayFlux can watch payout behavior, rising pressure, and money that may get held back before you feel it in cash flow.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-3">
                        <div className="rounded-lg border border-slate-800/60 bg-slate-900/40 p-3">
                            <p className="text-[11px] font-semibold text-white">What is happening?</p>
                            <p className="mt-1.5 text-[10px] leading-relaxed text-slate-500">
                                A site scan gives you a snapshot. A processor connection lets PayFlux watch the real payout and account signals behind it.
                            </p>
                        </div>
                        <div className="rounded-lg border border-slate-800/60 bg-slate-900/40 p-3">
                            <p className="text-[11px] font-semibold text-white">Why does it matter?</p>
                            <p className="mt-1.5 text-[10px] leading-relaxed text-slate-500">
                                Processors can change reserve behavior or payout timing fast. Live monitoring helps you see it before cash flow gets squeezed.
                            </p>
                        </div>
                        <div className="rounded-lg border border-slate-800/60 bg-slate-900/40 p-3">
                            <p className="text-[11px] font-semibold text-white">What should you do next?</p>
                            <p className="mt-1.5 text-[10px] leading-relaxed text-slate-500">
                                Connect Stripe read-only, then use PayFlux to see what may change next and what to fix first.
                            </p>
                        </div>
                    </div>

                    {/* What we monitor */}
                    <div className="space-y-3">
                        <h2 className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">What PayFlux starts watching</h2>
                        <ul className="space-y-2">
                            <li className="flex items-start space-x-3">
                                <div className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 flex-shrink-0" />
                                <span className="text-sm text-slate-300">Money your processor starts holding back</span>
                            </li>
                            <li className="flex items-start space-x-3">
                                <div className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 flex-shrink-0" />
                                <span className="text-sm text-slate-300">Payouts getting slower or less predictable</span>
                            </li>
                            <li className="flex items-start space-x-3">
                                <div className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 flex-shrink-0" />
                                <span className="text-sm text-slate-300">Account warnings that suggest processor concern is rising</span>
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
                    <ConnectStripeCTA />

                    {/* Secondary: Skip */}
                    <Link
                        href="/dashboard"
                        className="flex items-center justify-center w-full px-4 py-2 text-sm text-slate-500 hover:text-slate-400 transition-colors no-underline"
                    >
                        Stay on the one-time snapshot for now
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
