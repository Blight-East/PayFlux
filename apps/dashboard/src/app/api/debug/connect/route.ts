import { NextResponse } from "next/server";

export async function GET() {
    if (process.env.NODE_ENV !== 'development' || process.env.DASHBOARD_DEBUG_ROUTES !== 'true') {
        return new NextResponse('Not Found', { status: 404 });
    }

    return NextResponse.json({
        status: 'debug_route_enabled',
        message: 'Debug connect route is available in development only.',
    });
}
