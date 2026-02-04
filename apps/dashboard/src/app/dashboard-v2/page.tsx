import { notFound } from "next/navigation";
import RiskSnapshotPage from "../risk/page";

export const dynamic = 'force-dynamic';

export default function DashboardV2Page() {
    // Server-side Gate
    if (process.env.DASHBOARD_V2_ENABLED !== 'true') {
        notFound();
    }
    return <RiskSnapshotPage />;
}
