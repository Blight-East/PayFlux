import { Area, AreaChart, ResponsiveContainer } from 'recharts';

function KpiCard({ title, value, subtext, data, color, isCurrency }) {
    return (
        <div className="bg-panel border border-white/10 rounded-sm p-4 flex flex-col justify-between h-full hover:border-white/20 transition-colors">
            <div className="z-10">
                <h3 className="text-muted text-[10px] font-medium uppercase tracking-wider">{title}</h3>
                <div className="mt-1 flex items-baseline gap-2">
                    <span className="text-2xl font-semibold tracking-tight text-white font-mono">
                        {value}
                    </span>
                </div>
                <p className="text-subtle text-[10px] mt-1 font-mono">{subtext}</p>
            </div>

            <div className="h-8 w-full mt-3 -mx-1 opacity-40 grayscale hover:grayscale-0 transition-all">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data.map(v => ({ v }))}>
                        <Area
                            type="monotone"
                            dataKey="v"
                            stroke={color}
                            strokeWidth={1.5}
                            fill="transparent"
                            isAnimationActive={false}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}

export function SystemHealth() {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 h-full">
            <KpiCard
                title="Volume at Risk"
                value="$0.00"
                subtext="Last 24h: $0.00"
                data={[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]}
                color="#10B981" // Safe 
                isCurrency
            />
            <KpiCard
                title="Approval Rate"
                value="--"
                subtext="Awaiting signal..."
                data={[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]}
                color="#3B82F6"
            />
        </div>
    );
}
