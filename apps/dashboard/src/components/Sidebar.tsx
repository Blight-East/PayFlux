'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import PayFluxLogo from './PayFluxLogo';
import type { WorkspaceContext, WorkspaceRole } from '@/lib/resolve-workspace';
import type { Feature } from '@/lib/tier/features';
import { canAccess } from '@/lib/tier/resolver';
import { Lock } from 'lucide-react';

/**
 * Sidebar Config Model
 */
type SidebarItem = {
    label: string;
    href: string;
    minRole?: WorkspaceRole;
    requiredFeature?: Feature;
};

const SIDEBAR_ITEMS: SidebarItem[] = [
    {
        label: 'Dashboard',
        href: '/dashboard',
    },
    {
        label: 'System Status',
        href: '/dashboard/diagnostics',
    },
    {
        label: 'Forecast Confidence',
        href: '/dashboard/governance',
    },
    {
        label: 'Check Export',
        href: '/dashboard/verify',
    },
    {
        label: 'Connectors',
        href: '/connectors',
        minRole: 'admin',
    },
    {
        label: 'Settings',
        href: '/settings',
        minRole: 'admin',
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

    const visibleItems = SIDEBAR_ITEMS.filter(item =>
        roleAllowed(workspace.role, item.minRole) &&
        (!item.requiredFeature || canAccess(workspace.tier, item.requiredFeature))
    );

    const lockedItems = SIDEBAR_ITEMS.filter(item => !visibleItems.includes(item));

    const tierLabel = workspace.tier === 'free' ? 'Free Plan' : workspace.tier === 'pro' ? 'Pro' : 'Enterprise';
    const tierColor = workspace.tier === 'free' ? 'text-slate-400 bg-slate-800' : 'text-[#0A64BC] bg-[#0A64BC]/10';

    return (
        <div className="flex h-screen w-64 flex-col bg-[#0F172A]">
            {/* Logo */}
            <div className="border-b border-slate-800 p-6">
                <div className="payflux-mark">
                    <PayFluxLogo height={32} />
                </div>
            </div>

            {/* Navigation */}
            <div className="flex-1 overflow-y-auto">
                <nav className="space-y-0.5 p-4">
                    {visibleItems.map((item) => {
                        const isActive = pathname === item.href || (item.href === '/dashboard' && pathname === '/dashboard');
                        const isSubordinate = item.href === '/dashboard/diagnostics' || item.href === '/dashboard/governance' || item.href === '/dashboard/verify';
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`block rounded-md px-4 py-2 no-underline transition-colors ${isSubordinate
                                    ? `text-xs ${isActive
                                        ? 'border-l-[3px] border-[#0A64BC] bg-[#1E293B] text-slate-300'
                                        : 'text-slate-500 hover:bg-[#1E293B] hover:text-slate-400'}`
                                    : `text-sm font-medium ${isActive
                                        ? 'border-l-[3px] border-[#0A64BC] bg-[#1E293B] text-white'
                                        : 'text-slate-400 hover:bg-[#1E293B] hover:text-white'}`
                                    }`}
                            >
                                {item.label}
                            </Link>
                        );
                    })}
                </nav>

                {lockedItems.length > 0 && (
                    <div className="mt-6 px-4">
                        <h3 className="mb-2 px-4 text-[10px] font-bold uppercase tracking-widest text-slate-600">
                            Locked Features
                        </h3>
                        <div className="space-y-0.5">
                            {lockedItems.map((item) => (
                                <div
                                    key={item.href}
                                    className="group flex cursor-not-allowed items-center justify-between rounded-md px-4 py-2 text-sm font-medium text-slate-600"
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
                        className="block rounded-lg border border-[#0A64BC]/20 bg-[#0A64BC]/5 px-4 py-3 text-center no-underline transition-colors hover:bg-[#0A64BC]/10"
                    >
                        <p className="text-[10px] font-bold uppercase tracking-wider text-[#0A64BC]">Upgrade to Pro</p>
                        <p className="mt-0.5 text-[10px] leading-relaxed text-slate-500">Live monitoring &amp; deeper visibility</p>
                    </Link>
                ) : (
                    <div className="px-4 py-2">
                        <span className={`inline-block rounded px-2 py-0.5 text-[10px] font-bold uppercase ${tierColor}`}>
                            {tierLabel}
                        </span>
                    </div>
                )}
            </div>

            {/* Status + user */}
            <div className="border-t border-slate-800 p-4">
                <div className="flex items-center space-x-2 px-4 py-2">
                    <div className="h-2 w-2 rounded-full bg-emerald-500"></div>
                    <span className="text-xs text-slate-400">System Online</span>
                </div>
            </div>
        </div>
    );
}
