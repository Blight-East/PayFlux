import { SignUp } from "@clerk/nextjs";
import { redirect } from 'next/navigation';
import AuthStoryShell from '@/components/AuthStoryShell';
import SignupViewedEvent from '@/components/SignupViewedEvent';

type PageProps = {
    searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function firstValue(value: string | string[] | undefined) {
    return Array.isArray(value) ? value[0] : value;
}

function sanitizeRedirect(input?: string | null): string {
    if (!input) return '/connect';

    // reject absolute URLs and protocol-relative URLs
    if (
        input.includes('://') ||
        input.startsWith('//')
    ) {
        return '/connect';
    }

    // only allow internal paths
    if (!input.startsWith('/')) {
        return '/connect';
    }

    return input;
}

export default async function Page({ searchParams }: PageProps) {
    const resolvedSearchParams = searchParams ? await searchParams : undefined;
    const legacyRedirectTarget = sanitizeRedirect(firstValue(resolvedSearchParams?.redirect_url));
    const nextRedirectTarget = sanitizeRedirect(firstValue(resolvedSearchParams?.next));

    if (legacyRedirectTarget && nextRedirectTarget !== legacyRedirectTarget && firstValue(resolvedSearchParams?.redirect_url)) {
        redirect(`/sign-up?next=${encodeURIComponent(legacyRedirectTarget)}`);
    }

    const redirectTarget = nextRedirectTarget ?? legacyRedirectTarget ?? '/start';

    return (
        <>
            <SignupViewedEvent />
            <AuthStoryShell
                title="Create an account before payout risk becomes a cash-flow problem."
                body="PayFlux shows merchants when their payment processor may start holding back money, slowing payouts, or escalating account risk — and tells them what to do before it happens."
                secondaryCtaLabel="Run a quick site check first"
                secondaryCtaHref="/scan"
            >
                <SignUp forceRedirectUrl={redirectTarget} />
            </AuthStoryShell>
        </>
    );
}
