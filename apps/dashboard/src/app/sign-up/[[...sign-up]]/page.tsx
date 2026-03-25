import { SignUp } from "@clerk/nextjs";
import { redirect } from 'next/navigation';
import AuthStoryShell from '@/components/AuthStoryShell';

type PageProps = {
    searchParams?: Record<string, string | string[] | undefined>;
};

function firstValue(value: string | string[] | undefined) {
    return Array.isArray(value) ? value[0] : value;
}

export default function Page({ searchParams }: PageProps) {
    const legacyRedirectTarget = firstValue(searchParams?.redirect_url);
    const nextRedirectTarget = firstValue(searchParams?.next);

    if (legacyRedirectTarget && nextRedirectTarget !== legacyRedirectTarget) {
        redirect(`/sign-up?next=${encodeURIComponent(legacyRedirectTarget)}`);
    }

    const redirectTarget = nextRedirectTarget ?? legacyRedirectTarget ?? '/start';

    return (
        <AuthStoryShell
            title="Create an account before payout risk becomes a cash-flow problem."
            body="PayFlux shows merchants when their payment processor may start holding back money, slowing payouts, or escalating account risk — and tells them what to do before it happens."
            secondaryCtaLabel="Run a quick site check first"
            secondaryCtaHref="/scan"
        >
            <SignUp forceRedirectUrl={redirectTarget} />
        </AuthStoryShell>
    );
}
