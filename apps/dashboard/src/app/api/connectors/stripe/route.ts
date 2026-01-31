import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

const CONFIG_PATH = path.join(process.cwd(), 'data', 'config.json');

// Only allow persistence if explicitly enabled
function isPersistenceEnabled(): boolean {
    return process.env.DASHBOARD_PERSIST_CONFIG === 'true';
}

// Non-sensitive fields that can be persisted
const SAFE_FIELDS = ['label', 'lastUpdated'];

function sanitizeForPersistence(data: any): any {
    const sanitized: any = {};
    for (const key of SAFE_FIELDS) {
        if (data[key] !== undefined) {
            sanitized[key] = data[key];
        }
    }
    return sanitized;
}

async function getConfig() {
    if (!isPersistenceEnabled()) {
        return {};
    }
    try {
        const data = await fs.readFile(CONFIG_PATH, 'utf-8');
        return JSON.parse(data);
    } catch (err) {
        console.error('Failed to read config file', err);
        return {};
    }
}

async function saveConfig(config: any) {
    if (!isPersistenceEnabled()) {
        return; // Silent no-op if persistence disabled
    }
    await fs.mkdir(path.dirname(CONFIG_PATH), { recursive: true });
    await fs.writeFile(CONFIG_PATH, JSON.stringify(config, null, 2));
}

export async function GET() {
    const config = await getConfig();
    // Return non-sensitive config + connection status
    return NextResponse.json({
        label: config.stripe?.label || 'Default',
        configured: !!process.env.STRIPE_WEBHOOK_SECRET,
        persistenceEnabled: isPersistenceEnabled(),
    });
}

export async function POST(request: Request) {
    const body = await request.json();

    // Only persist non-sensitive fields
    const config = await getConfig();
    config.stripe = {
        ...config.stripe,
        ...sanitizeForPersistence(body),
        lastUpdated: new Date().toISOString(),
    };
    await saveConfig(config);

    // Note: signingSecret from body is NOT persisted. 
    // It must be set via STRIPE_WEBHOOK_SECRET env var.
    if (body.signingSecret) {
        console.warn('connector_config: signingSecret received but NOT persisted. Set STRIPE_WEBHOOK_SECRET env var.');
    }

    return NextResponse.json({
        success: true,
        message: 'Config saved. Note: Secrets must be set via environment variables.',
    });
}
