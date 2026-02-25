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
        label: 'Risk',
        href: '/risk',
    },
    {
        label: 'Evidence',
        href: '/evidence',
        requiredFeature: 'evidence_export',
    },
    {
        label: 'Export',
        href: '/evidence/export',
        minRole: 'admin',
        requiredFeature: 'bulk_export',
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

    return (
        <div className="w-64 bg-black border-r border-zinc-800 h-screen flex flex-col">
            <div className="p-6 border-b border-zinc-800">
                <div className="payflux-mark">
                    <PayFluxLogo height={32} />
                </div>
            </div>

            <div className="flex-1 overflow-y-auto">
                <nav className="p-4 space-y-2">
                    {visibleItems.map((item) => {
                        const isActive = pathname === item.href;
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`block px-4 py-2 rounded-md text-sm font-medium transition-colors ${isActive
                                    ? 'bg-zinc-800 text-white'
                                    : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
                                    }`}
                            >
                                {item.label}
                            </Link>
                        );
                    })}
                </nav>

                {lockedItems.length > 0 && (
                    <div className="mt-8 px-4">
                        <h3 className="px-4 text-[10px] uppercase tracking-widest text-zinc-600 font-bold mb-2">
                            Locked Features
                        </h3>
                        <div className="space-y-1">
                            {lockedItems.map((item) => (
                                <div
                                    key={item.href}
                                    className="group flex items-center justify-between px-4 py-2 rounded-md text-sm font-medium text-zinc-700 cursor-not-allowed"
                                >
                                    <span>{item.label}</span>
                                    <div className="flex items-center space-x-2">
                                        {item.requiredFeature && !canAccess(workspace.tier, item.requiredFeature) && (
                                            <span className="text-[9px] bg-blue-500/5 text-blue-500/40 border border-blue-500/10 px-1.5 py-0.5 rounded uppercase">
                                                PRO
                                            </span>
                                        )}
                                        <Lock size={12} className="text-zinc-800 group-hover:text-zinc-700 transition-colors" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            <div className="p-4 border-t border-zinc-800">
                <div className="flex items-center space-x-2 px-4 py-2">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                    <span className="text-xs text-zinc-400">System Online</span>
                </div>
            </div>
        </div>
    );
}
