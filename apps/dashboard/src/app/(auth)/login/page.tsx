import { SignIn } from '@clerk/nextjs';

export default function LoginPage() {
    return (
        <div className="flex min-h-screen bg-slate-950 items-center justify-center p-4">
            <SignIn
                appearance={{
                    elements: {
                        rootBox: "w-full max-w-sm",
                        card: "bg-slate-950 border border-slate-900 rounded-lg shadow-none",
                        headerTitle: "text-white font-bold",
                        headerSubtitle: "text-slate-500",
                        socialButtonsBlockButton: "bg-slate-900 border-slate-800 text-white hover:bg-slate-800",
                        formButtonPrimary: "bg-white text-black hover:bg-slate-200",
                        formFieldLabel: "text-slate-400",
                        formFieldInput: "bg-slate-950 border-slate-800 text-white focus:border-blue-500",
                        footerActionText: "text-slate-500",
                        footerActionLink: "text-[#0A64BC] hover:text-[#0856a3]"
                    }
                }}
            />
        </div>
    );
}
