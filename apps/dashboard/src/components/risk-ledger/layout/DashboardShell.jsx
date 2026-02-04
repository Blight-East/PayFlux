export function DashboardShell({ children }) {
    return (
        <div className="min-h-screen bg-mid text-gray-200 selection:bg-info/30 overflow-hidden font-sans">
            <div className="pt-16 pb-24 px-6 max-w-[1920px] mx-auto h-screen flex flex-col gap-6">
                {children}
            </div>
        </div>
    );
}
