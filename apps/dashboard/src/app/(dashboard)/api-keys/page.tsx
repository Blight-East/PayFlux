export default function ApiKeysPage() {
    return (
        <div className="p-8 max-w-4xl">
            <div className="mb-8">
                <h2 className="text-2xl font-bold text-gray-900 tracking-tight">API Keys</h2>
                <p className="text-gray-500 text-sm mt-1">Programmatic access to your PayFlux workspace.</p>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-8">
                <div className="text-center space-y-4">
                    <div className="inline-flex items-center justify-center w-12 h-12 bg-slate-100 rounded-xl">
                        <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
                        </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900">Not yet available</h3>
                    <p className="text-sm text-gray-500 max-w-sm mx-auto leading-relaxed">
                        API key management is not available yet. When it launches, you will be able to generate keys for programmatic access to your workspace data.
                    </p>
                    <p className="text-[10px] text-gray-400 uppercase tracking-wider font-bold">Coming soon</p>
                </div>
            </div>
        </div>
    );
}
