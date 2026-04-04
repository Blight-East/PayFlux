import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';

export default function LegacySetupLayout({
    children,
}: {
    children: ReactNode;
}) {
    void children;
    redirect('/dashboard');
}
