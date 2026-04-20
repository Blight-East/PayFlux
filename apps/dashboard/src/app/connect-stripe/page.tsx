import { auth, clerkClient } from '@clerk/nextjs/server';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import PayFluxLogo from '@/components/PayFluxLogo';
import { resolveOrCreateActiveWorkspace } from '@/lib/active-workspace';
import { getAccountStatus } from '@/lib/stripe/getAccountStatus';

const ERROR_MESSAGES: Record<string, string> = {
    stripe_connect_failed: 'Stripe connection failed. Please try again.',
    invalid_state: 'Security check failed. Please retry the connection.',
    clerk_not_configured: 'Clerk is not configured. Contact admin.',
};

type PageProps = {
    searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function readString(value: unknown): string | null {
    return typeof value === 'string' && value.length > 0 ? value : null;
}

function readBoolean(value: unknown): boolean {
    return value === true;
}

export default async function ConnectStripePage({ searchParams }: PageProps) {
    const { userId, orgId } = await auth();
    if (!userId) {
        redirect('/sign-in');
    }

    const workspace = await resolveOrCreateActiveWorkspace(userId, orgId ?? null);
    if (workspace.role !== 'admin') {
        redirect('/dashboard');
    }
    const client = await clerkClient();

    const metadata = workspace.organization?.publicMetadata ?? {};
    const stripeAccountId = readString(metadata.stripeAccountId);
    let onboardingComplete = readBoolean(metadata.stripeOnboardingComplete);
    let chargesEnabled = readBoolean(metadata.stripeChargesEnabled);
    let payoutsEnabled = readBoolean(metadata.stripePayoutsEnabled);

    if (typeof stripeAccountId === 'string' && stripeAccountId.length > 0) {
        try {
            const status = await getAccountStatus(stripeAccountId);
            onboardingComplete = status.onboardingComplete;
            chargesEnabled = status.chargesEnabled;
            payoutsEnabled = status.payoutsEnabled;

            await client.organizations.updateOrganizationMetadata(workspace.workspaceId, {
                publicMetadata: {
                    stripeAccountId,
                    stripeOnboardingComplete: onboardingComplete,
                    stripeChargesEnabled: chargesEnabled,
                    stripePayoutsEnabled: payoutsEnabled,
                    stripeConnectionStatus: onboardingComplete ? 'CONNECTED' : 'PENDING_ONBOARDING',
                },
            });
        } catch (error) {
            console.error('Failed to refresh Stripe account status', error);
        }
    }

    const params = (await searchParams) ?? {};
    const errRaw = params.err;
    const err = Array.isArray(errRaw) ? errRaw[0] : errRaw;
    const errorMessage = err ? ERROR_MESSAGES[err] : null;

    return (
        <div className="pf-shell flex min-h-screen items-center justify-center px-6 py-10">
            <div className="w-full max-w-6xl">
                <div className="grid gap-6 lg:grid-cols-[1.08fr_0.92fr]">
                    <div className="pf-panel-strong rounded-[2.25rem] p-8 md:p-12">
                        <div className="payflux-mark mb-8">
                            <PayFluxLogo height={36} />
                        </div>

                        <div className="pf-kicker mb-5">optional payout setup</div>
                        <h1 className="pf-editorial text-5xl leading-[0.96] text-[var(--pf-paper)] md:text-[4.45rem]">
                            {stripeAccountId ? 'Finish your Stripe payout setup.' : 'Connect Stripe if you need payouts.'}
                        </h1>
                        <p className="mt-6 max-w-xl text-base leading-7 text-[var(--pf-text-soft)] md:text-lg md:leading-8">
                            This is only for merchants who want a Stripe Connect payout account. It is not required to subscribe to PayFlux or use the rest of the dashboard.
                        </p>

                        <div className="mt-10 grid gap-4 sm:grid-cols-3">
                            <div className="rounded-[1.5rem] border border-white/8 bg-black/18 p-5">
                                <div className="pf-kicker mb-2">charges</div>
                                <div className="text-lg font-semibold text-[var(--pf-paper)]">
                                    {chargesEnabled ? 'Enabled' : 'Pending'}
                                </div>
                                <p className="mt-2 text-sm leading-6 text-[var(--pf-text-soft)]">
                                    Whether Stripe is ready to accept live charges on the connected account.
                                </p>
                            </div>

                            <div className="rounded-[1.5rem] border border-white/8 bg-black/18 p-5">
                                <div className="pf-kicker mb-2">payouts</div>
                                <div className="text-lg font-semibold text-[var(--pf-paper)]">
                                    {payoutsEnabled ? 'Enabled' : 'Pending'}
                                </div>
                                <p className="mt-2 text-sm leading-6 text-[var(--pf-text-soft)]">
                                    Whether Stripe is ready to send funds out from the connected account.
                                </p>
                            </div>

                            <div className="rounded-[1.5rem] border border-white/8 bg-black/18 p-5">
                                <div className="pf-kicker mb-2">setup status</div>
                                <div className="text-lg font-semibold text-[var(--pf-paper)]">
                                    {onboardingComplete ? 'Complete' : stripeAccountId ? 'In progress' : 'Not started'}
                                </div>
                                <p className="mt-2 text-sm leading-6 text-[var(--pf-text-soft)]">
                                    A simple read on whether this optional Stripe step is finished.
                                </p>
                            </div>
                        </div>

                        {stripeAccountId && (
                            <div className="mt-8 rounded-[1.75rem] border border-white/8 bg-black/18 p-6">
                                <div className="pf-kicker mb-2">connected account</div>
                                <div className="font-mono text-sm text-[var(--pf-paper)]">{stripeAccountId}</div>
                                <p className="mt-3 text-sm leading-6 text-[var(--pf-text-soft)]">
                                    If you need to finish onboarding, Stripe will take you back into the same connected account.
                                </p>
                            </div>
                        )}
                    </div>

                    <div className="pf-panel rounded-[2.25rem] p-6 md:p-7">
                        <div className="pf-kicker mb-4">next step</div>
                        <h2 className="text-2xl font-semibold tracking-tight text-[var(--pf-paper)]">
                            {stripeAccountId ? 'Continue with Stripe Connect' : 'Start Stripe Connect'}
                        </h2>
                        <p className="mt-3 text-sm leading-6 text-[var(--pf-text-soft)]">
                            PayFlux will hand you over to Stripe to complete the setup. When Stripe is done, you will come back here.
                        </p>

                        {errorMessage && (
                            <div className="mt-6 rounded-[1.25rem] border border-red-500/25 bg-red-500/10 p-4 text-sm leading-6 text-red-100/85">
                                {errorMessage}
                            </div>
                        )}

                        <div className="mt-6 space-y-4">
                            <a
                                href="/api/stripe/authorize"
                                className="inline-flex w-full items-center justify-center rounded-full bg-[var(--pf-accent)] px-6 py-4 text-base font-semibold text-[var(--pf-ink)] transition-transform hover:-translate-y-0.5"
                            >
                                {stripeAccountId ? 'Continue Stripe Setup' : 'Connect with Stripe'}
                            </a>

                            <Link
                                href="/dashboard"
                                className="inline-flex w-full items-center justify-center rounded-full border border-white/10 bg-white/5 px-6 py-4 text-base font-semibold text-[var(--pf-paper)] transition-colors hover:bg-white/10"
                            >
                                Back to Dashboard
                            </Link>
                        </div>

                        <div className="mt-8 rounded-[1.5rem] border border-white/8 bg-black/18 p-5">
                            <div className="pf-kicker mb-3">before you click</div>
                            <div className="space-y-3 text-sm leading-6 text-[var(--pf-text-soft)]">
                                <p>Use this only if you want PayFlux connected to a Stripe payout account.</p>
                                <p>PayFlux billing and dashboard access do not depend on finishing this step.</p>
                                <p>Stripe controls the onboarding forms, verification checks, and final account status.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
