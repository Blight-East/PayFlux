'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const menuItems = [
    { name: 'Onboarding', href: '/onboarding' },
    { name: 'Dashboard', href: '/dashboard' },
    { name: 'API Keys', href: '/api-keys' },
    { name: 'Connectors', href: '/connectors' },
    { name: 'Settings', href: '/settings' },
];

export default function Sidebar() {
    const pathname = usePathname();

    return (
        <div className="w-64 bg-black border-r border-zinc-800 h-screen flex flex-col">
            <div className="p-6 border-b border-zinc-800">
                <h1 className="text-xl font-bold text-white tracking-tight">PayFlux <span className="text-zinc-500 text-sm font-normal">app</span></h1>
            </div>
            <nav className="flex-1 p-4 space-y-2">
                {menuItems.map((item) => {
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
                            {item.name}
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
