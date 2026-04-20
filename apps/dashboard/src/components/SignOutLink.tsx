"use client";

import { SignOutButton } from "@clerk/nextjs";

export default function SignOutLink() {
    return (
        <SignOutButton>
            <button
                type="button"
                className="bg-transparent border-none cursor-pointer text-sm font-medium text-[var(--pf-text-soft)] hover:text-[var(--pf-paper)] transition-colors"
            >
                Sign out
            </button>
        </SignOutButton>
    );
}
