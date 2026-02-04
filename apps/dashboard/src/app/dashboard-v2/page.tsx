import { notFound } from 'next/navigation';
import DashboardV2 from './DashboardV2';

// Server Component Gate
export const dynamic = 'force-dynamic'; // Force runtime evaluation of env var

export default function Page() {
    if (process.env.DASHBOARD_V2_ENABLED !== 'true') {
        notFound();
    }

    return (
        <>
            <div data-fingerprint="dashboard-v2" style={{ display: 'none' }}>ROUTE_FINGERPRINT: DASHBOARD_V2</div>
            <DashboardV2 />
        </>
    );
}
