import crypto from 'crypto';

export function generateWorkspaceApiKey(): string {
    return `pf_live_${crypto.randomBytes(24).toString('hex')}`;
}

export function workspaceApiKeyPrefix(apiKey: string): string {
    return apiKey.slice(0, 16);
}

export function hashWorkspaceApiKey(apiKey: string): string {
    return crypto.createHash('sha256').update(apiKey).digest('hex');
}
