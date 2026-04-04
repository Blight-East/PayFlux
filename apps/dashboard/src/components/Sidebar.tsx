'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import PayFluxLogo from './PayFluxLogo';
import type { WorkspaceContext, WorkspaceRole } from '@/lib/resolve-workspace';
import type { Feature } from '@/lib/tier/features';
import { canAccess } from '@/lib/tier/resolver';
import { Lock } from 'lucide-react';
import { logOnboardingEventClient } from '@/lib/onboarding-events';

/**
 * Sidebar Config Model
 */
type SidebarItem = {
    label: string;
    href: string;
    minRole?: WorkspaceRole;
    requiredFeature?: Feature;
};

const PRIMARY_ITEMS: SidebarItem[] = [
    {
        label: 'Dashboard',
        href: '/dashboard',
    },
    {
        label: 'Connectors',
        href: '/connectors',
        minRole: 'admin',
    },
    {
        label: 'API Keys',
        href: '/api-keys',
        minRole: 'admin',
    },
    {
        label: 'Settings',
        href: '/settings',
        minRole: 'admin',
    },
];

const TECHNICAL_ITEMS: SidebarItem[] = [
    {
        label: 'Forecast Confidence',
        href: '/dashboard/governance',
    },
    {
        label: 'Check Export',
        href: '/dashboard/verify',
    },
];

/**
 * Gating Logic
 */
function roleAllowed(
    userRole: WorkspaceRole,
    minRole?: WorkspaceRole
) {
    if (!minRole) return true;
    if (minRole === 'viewer') return true;
    return userRole === 'admin';
}

export default function Sidebar({ workspace }: { workspace: WorkspaceContext }) {
    const pathname = usePathname();

    const visiblePrimaryItems = PRIMARY_ITEMS.filter(item =>
        roleAllowed(workspace.role, item.minRole) &&
        (!item.requiredFeature || canAccess(workspace.tier, item.requiredFeature))
    );

    const visibleTechnicalItems = TECHNICAL_ITEMS.filter(item =>
        roleAllowed(workspace.role, item.minRole) &&
        (!item.requiredFeature || canAccess(workspace.tier, item.requiredFeature))
    );

    const lockedItems = [...PRIMARY_ITEMS, ...TECHNICAL_ITEMS].filter(
        item => !visiblePrimaryItems.includes(item) && !visibleTechnicalItems.includes(item)
    );

    return (
        <div className="flex h-screen w-64 flex-col bg-[#0F172A] text-slate-200">
            {/* Logo */}
            <div className="border-b border-slate-800 px-6 py-6">
                <div className="payflux-mark">
                    <PayFluxLogo height={32} />
                </div>
            </div>

            {/* Navigation */}
            <div className="flex-1 overflow-y-auto">
                <div className="px-4 pt-4">
                    <p className="px-4 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Workspace</p>
                </div>
                <nav className="space-y-1 p-4">
                    {visiblePrimaryItems.map((item) => {
                        const isActive = pathname === item.href || (item.href === '/dashboard' && pathname === '/dashboard');
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`block rounded-lg px-4 py-2.5 no-underline transition-colors text-sm font-medium ${isActive
                                    ? 'bg-[#0A64BC]/15 text-white ring-1 ring-[#0A64BC]/30'
                                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'}`}
                            >
                                {item.label}
                            </Link>
                        );
                    })}
                </nav>

                {visibleTechnicalItems.length > 0 && (
                    <>
                        <div className="px-4 pt-2">
                            <p className="px-4 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Technical</p>
                        </div>
                        <nav className="space-y-1 p-4 pt-2">
                            {visibleTechnicalItems.map((item) => {
                                const isActive = pathname === item.href;
                                return (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        className={`block rounded-lg px-4 py-2.5 no-underline transition-colors text-xs ${isActive
                                            ? 'bg-[#0A64BC]/15 text-[#8EC5FF]'
                                            : 'text-slate-500 hover:bg-slate-800 hover:text-slate-300'}`}
                                    >
                                        {item.label}
                                    </Link>
                                );
                            })}
                        </nav>
                    </>
                )}

                {lockedItems.length > 0 && (
                    <div className="mt-6 px-4">
                        <h3 className="mb-2 px-4 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
                            Locked Features
                        </h3>
                        <div className="space-y-1">
                            {lockedItems.map((item) => (
                                <div
                                    key={item.href}
                                    className="group flex cursor-not-allowed items-center justify-between rounded-lg px-4 py-2.5 text-sm font-medium text-slate-600"
                                >
                                    <span>{item.label}</span>
                                    <div className="flex items-center space-x-2">
                                        {item.requiredFeature && !canAccess(workspace.tier, item.requiredFeature) && (
                                            <span className="rounded border border-[#0A64BC]/10 bg-[#0A64BC]/5 px-1.5 py-0.5 text-[9px] uppercase text-[#0A64BC]/40">
                                                PRO
                                            </span>
                                        )}
                                        <Lock size={12} className="text-slate-700 transition-colors group-hover:text-slate-600" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Plan badge + upgrade for free tier */}
            <div className="px-4 pb-2">
                {workspace.tier === 'free' ? (
                    <Link
                        href="/upgrade"
                        onClick={() => logOnboardingEventClient('upgrade_cta_clicked', { source: 'sidebar_upgrade' })}
                        className="block rounded-xl border border-[#0A64BC]/20 bg-[#0A64BC]/10 px-4 py-3 text-center no-underline transition-colors hover:bg-[#0A64BC]/15"
                    >
                        <p className="text-[10px] font-bold uppercase tracking-wider text-[#0A64BC]">Upgrade to Pro</p>
                        <p className="mt-0.5 text-[10px] leading-relaxed text-slate-400">Live monitoring and deeper visibility</p>
                    </Link>
                ) : null}
            </div>

            {/* Workspace tier badge */}
            <div className="border-t border-slate-800 p-4">
                <div className="rounded-lg bg-slate-800/70 px-4 py-3">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        {workspace.tier === 'enterprise' ? 'Enterprise' : workspace.tier === 'pro' ? 'Pro' : 'Free'} plan
                    </p>
                </div>
            </div>
        </div>
    );
}
