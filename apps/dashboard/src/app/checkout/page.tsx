import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { resolveWorkspace } from '@/lib/resolve-workspace';
import CheckoutClient from './CheckoutClient';

export const runtime = 'nodejs';

export default async function CheckoutPage() {
    const { userId } = await auth();

    if (!userId) {
        redirect('/sign-in');
    }

    const workspace = await resolveWorkspace(userId);

    if (!workspace) {
        redirect('/onboarding');
    }

    // Already paid — send to dashboard
    if (workspace.tier === 'pro' || workspace.tier === 'enterprise') {
        redirect('/dashboard');
    }

    return (
        <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center px-6">
            <div className="max-w-md w-full space-y-8">
                <div className="text-center space-y-4">
                    <div className="w-10 h-10 bg-white rounded-lg mx-auto relative overflow-hidden">
                        <div className="absolute inset-0 bg-slate-900 translate-y-2 translate-x-2 rounded-tl-[4px]" />
                    </div>
                    <h1 className="text-3xl font-semibold tracking-tight">
                        Upgrade to Pro
                    </h1>
                    <p className="text-slate-400 text-lg leading-relaxed">
                        Access the full projection engine, intervention modeling, signed ledger exports, and board reporting.
                    </p>
                </div>

                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-8 space-y-6">
                    <div className="flex items-baseline justify-between">
                        <span className="text-xl font-semibold">Pro</span>
                        <div className="text-right">
                            <span className="text-3xl font-light tracking-tight">$499</span>
                            <span className="text-slate-500 text-sm ml-1">/ month</span>
                        </div>
                    </div>

                    <ul className="space-y-3 text-sm text-slate-300">
                        <li className="flex items-center gap-2">
                            <span className="text-emerald-500">&#10003;</span>
                            Full projection engine (T+30 / T+60 / T+90)
                        </li>
                        <li className="flex items-center gap-2">
                            <span className="text-emerald-500">&#10003;</span>
                            Intervention modeling with simulation
                        </li>
                        <li className="flex items-center gap-2">
                            <span className="text-emerald-500">&#10003;</span>
                            Signed projection ledger (append-only)
                        </li>
                        <li className="flex items-center gap-2">
                            <span className="text-emerald-500">&#10003;</span>
                            Board reserve report export
                        </li>
                        <li className="flex items-center gap-2">
                            <span className="text-emerald-500">&#10003;</span>
                            Rolling model accuracy metrics
                        </li>
                    </ul>

                    <CheckoutClient workspaceId={workspace.workspaceId} />
                </div>

                <p className="text-center text-xs text-slate-600">
                    Secure checkout powered by Stripe. Cancel anytime.
                </p>
            </div>
        </div>
    );
}
