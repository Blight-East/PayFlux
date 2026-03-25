import { SignIn } from "@clerk/nextjs";
import AuthStoryShell from '@/components/AuthStoryShell';

export default function Page() {
    return (
        <AuthStoryShell
            title="Sign in to see whether your processor risk is rising."
            body="PayFlux turns processor behavior into plain operator language: what may happen next, why it matters to cash flow, and what to do before payouts are hit."
            secondaryCtaLabel="Need a first check? Start here"
            secondaryCtaHref="/scan"
        >
            <SignIn fallbackRedirectUrl="/start" />
        </AuthStoryShell>
    );
}
