import { SignUp } from "@clerk/nextjs";
import AuthStoryShell from '@/components/AuthStoryShell';

export default function Page() {
    return (
        <AuthStoryShell
            title="Create an account before payout risk becomes a cash-flow problem."
            body="PayFlux shows merchants when their payment processor may start holding back money, slowing payouts, or escalating account risk — and tells them what to do before it happens."
            secondaryCtaLabel="Run a quick site check first"
            secondaryCtaHref="/scan"
        >
            <SignUp fallbackRedirectUrl="/start" />
        </AuthStoryShell>
    );
}
