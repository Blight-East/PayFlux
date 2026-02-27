import Link from 'next/link';

export default function SetupPage() {
    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
            <div className="max-w-md w-full space-y-8">
                {/* Header */}
                <div className="text-center">
                    <h1 className="text-4xl font-bold text-slate-900 mb-2">
                        Let's check your risk.
                    </h1>
                    <p className="text-slate-600">
                        Get started in under 3 minutes
                    </p>
                </div>

                {/* Primary CTA */}
                <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-8">
                    <Link
                        href="/setup/scan"
                        className="flex items-center justify-center w-full px-6 py-4 bg-indigo-600 text-white font-semibold text-lg rounded-xl hover:bg-indigo-700 transition-all shadow-md active:scale-[0.98] no-underline"
                    >
                        Scan my website
                    </Link>
                </div>
            </div>
        </div>
    );
}
