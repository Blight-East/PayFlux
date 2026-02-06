import { notFound } from 'next/navigation';
import TrustDashboardPlayground from './components/TrustDashboardPlayground';

// DEMO ONLY — DELETE BEFORE PROD
// Hard production block: This route is NOT accessible in production

export default function TrustDashboardPlaygroundPage() {
    // Hard PROD block: Return 404 in production
    if (process.env.NODE_ENV === 'production') {
        notFound();
    }

    return <TrustDashboardPlayground />;
}
