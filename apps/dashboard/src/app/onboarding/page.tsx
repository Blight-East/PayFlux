import { redirect } from "next/navigation";

type PageProps = {
    searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function OnboardingPage({ searchParams }: PageProps) {
    const resolvedSearchParams = (await searchParams) ?? {};
    const errRaw = resolvedSearchParams.err;
    const err = Array.isArray(errRaw) ? errRaw[0] : errRaw;
    if (err) {
        redirect(`/connect?err=${encodeURIComponent(err)}`);
    }

    redirect('/start');
}
