import { SignIn } from '@clerk/nextjs';

export default function LoginPage() {
    return (
        <div className="flex min-h-screen bg-black items-center justify-center p-4">
            <SignIn
                appearance={{
                    elements: {
                        rootBox: "w-full max-w-sm",
                        card: "bg-zinc-950 border border-zinc-900 rounded-lg shadow-none",
                        headerTitle: "text-white font-bold",
                        headerSubtitle: "text-zinc-500",
                        socialButtonsBlockButton: "bg-zinc-900 border-zinc-800 text-white hover:bg-zinc-800",
                        formButtonPrimary: "bg-white text-black hover:bg-zinc-200",
                        formFieldLabel: "text-zinc-400",
                        formFieldInput: "bg-black border-zinc-800 text-white focus:border-blue-500",
                        footerActionText: "text-zinc-500",
                        footerActionLink: "text-blue-400 hover:text-blue-300"
                    }
                }}
            />
        </div>
    );
}
