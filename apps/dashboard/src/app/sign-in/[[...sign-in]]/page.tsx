import { SignIn } from "@clerk/nextjs";
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
        redirect(`/sign-in?next=${encodeURIComponent(legacyRedirectTarget)}`);
    }

    const redirectTarget = nextRedirectTarget ?? legacyRedirectTarget ?? '/start';

    return (
        <AuthStoryShell
            title="Sign in to see whether your processor risk is rising."
            body="PayFlux turns processor behavior into plain operator language: what may happen next, why it matters to cash flow, and what to do before payouts are hit."
            secondaryCtaLabel="Need a first check? Start here"
            secondaryCtaHref="/scan"
        >
            <SignIn forceRedirectUrl={redirectTarget} />
        </AuthStoryShell>
    );
}
