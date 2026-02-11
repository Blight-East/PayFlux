'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import PayFluxLogo from './PayFluxLogo';
import type { WorkspaceContext, WorkspaceRole, WorkspaceTier } from '@/lib/resolve-workspace';

/**
 * Sidebar Config Model
 */
type SidebarItem = {
    label: string;
    href: string;
    minRole?: WorkspaceRole;
    minTier?: WorkspaceTier;
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
        minTier: 'pro',
    },
    {
        label: 'Export',
        href: '/evidence/export',
        minRole: 'admin',
        minTier: 'pro',
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

function tierAllowed(
    userTier: WorkspaceTier,
    minTier?: WorkspaceTier
) {
    if (!minTier) return true;
    const order: WorkspaceTier[] = ['free', 'pro', 'enterprise'];
    return order.indexOf(userTier) >= order.indexOf(minTier);
}

export default function Sidebar({ workspace }: { workspace: WorkspaceContext }) {
    const pathname = usePathname();

    const visibleItems = SIDEBAR_ITEMS.filter(item =>
        roleAllowed(workspace.role, item.minRole) &&
        tierAllowed(workspace.tier, item.minTier)
    );

    return (
        <div className="w-64 bg-black border-r border-zinc-800 h-screen flex flex-col">
            <div className="p-6 border-b border-zinc-800">
                <div className="payflux-mark">
                    <PayFluxLogo height={32} />
                </div>
            </div>
            <nav className="flex-1 p-4 space-y-2">
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
            <div className="p-4 border-t border-zinc-800">
                <div className="flex items-center space-x-2 px-4 py-2">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                    <span className="text-xs text-zinc-400">System Online</span>
                </div>
            </div>
        </div>
    );
}
