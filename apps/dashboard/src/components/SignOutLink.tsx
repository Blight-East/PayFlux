"use client";

import { SignOutButton } from "@clerk/nextjs";

export default function SignOutLink() {
    return (
        <SignOutButton>
            <button
                type="button"
                className="text-sm font-medium text-slate-400 hover:text-slate-600 transition-colors bg-transparent border-none cursor-pointer"
            >
                Sign out
            </button>
        </SignOutButton>
    );
}
