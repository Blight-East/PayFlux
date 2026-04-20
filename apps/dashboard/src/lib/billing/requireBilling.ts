import { getBillingStatus } from './getBillingStatus';

export async function requireBilling(workspaceId: string, userId?: string) {
    const status = await getBillingStatus(workspaceId, userId);

    if (status !== 'active') {
        throw new Error('Billing required');
    }

    return status;
}
