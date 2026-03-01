import { auth, clerkClient } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import SignOutLink from "@/components/SignOutLink";

const ERROR_MESSAGES: Record<string, string> = {
    stripe_connect_failed: "Stripe connection failed. Please try again.",
    invalid_state: "Security check failed. Please retry the connection.",
    clerk_not_configured: "Clerk is not configured. Contact admin.",
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
        name: "Default Payflux Org",
        createdBy: userId,
    });

    return org.id;
}

export default async function OnboardingPage({ searchParams }: PageProps) {
    const { userId, orgId } = await auth();
    if (!userId) redirect("/sign-in");

    const client = await clerkClient();

    const activeOrgId = await resolveActiveOrgId(client, userId, orgId ?? null);
    const organization = await client.organizations.getOrganization({
        organizationId: activeOrgId,
    });

    const stripeAccountId = organization?.publicMetadata?.stripeAccountId;
    const isConnected = typeof stripeAccountId === "string" && stripeAccountId.length > 0;

    if (isConnected) {
        redirect("/dashboard");
    }

    const errRaw = searchParams?.err;
    const err = Array.isArray(errRaw) ? errRaw[0] : errRaw;
    const errorMessage = err ? ERROR_MESSAGES[err] : null;

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 font-sans">
            <div className="max-w-md w-full space-y-4">
                {errorMessage && (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start space-x-3 transition-all">
                        <svg className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <p className="text-sm font-medium text-red-800">{errorMessage}</p>
                    </div>
                )}

                <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-8">
                    <div className="mb-6 flex items-center justify-center w-14 h-14 bg-indigo-100 rounded-2xl mx-auto">
                        <svg
                            className="w-8 h-8 text-indigo-600"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            xmlns="http://www.w3.org/2000/svg"
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                    </div>

                    <h1 className="text-2xl font-bold text-slate-900 text-center mb-3">
                        Connect your Stripe account
                    </h1>

                    <p className="text-slate-600 text-center mb-2 text-sm leading-relaxed">
                        Connect your processor to model reserve exposure and measure projection accuracy.
                    </p>
                    <p className="text-slate-400 text-center mb-8 text-xs leading-relaxed">
                        PayFlux observes signals. It does not modify payment flow.
                    </p>

                    <div className="space-y-4">
                        <a
                            href="/api/stripe/authorize"
                            className="flex items-center justify-center w-full px-4 py-3 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 transition-all shadow-md active:scale-[0.98] no-underline"
                        >
                            Connect Stripe
                        </a>

                        <div className="text-center pt-2">
                            <SignOutLink />
                        </div>
                    </div>
                </div>

                <p className="text-center text-xs text-slate-400 font-medium tracking-wide uppercase">
                    Powered by Stripe Connect
                </p>
            </div>
        </div>
    );
}
