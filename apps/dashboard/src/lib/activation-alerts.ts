/**
 * Activation Alerts
 *
 * Thin Telegram alert helper for revenue-critical activation events.
 *
 * Fail-open by design: if TELEGRAM_BOT_TOKEN / TELEGRAM_ALERT_CHAT_ID are
 * unset, alerts are no-ops (logged, not thrown). Activation flow continues
 * regardless. The alert is operator visibility, not a hard dependency.
 */

const TELEGRAM_API_BASE = 'https://api.telegram.org';
const ALERT_TIMEOUT_MS = 3000;

export type ActivationAlertKind =
    | 'user_paid'
    | 'stripe_connected'
    | 'activation_completed'
    | 'activation_failed'
    | 'activation_stalled'
    | 'activation_overridden';

export interface ActivationAlertContext {
    kind: ActivationAlertKind;
    workspaceId: string;
    workspaceName?: string;
    userId?: string;
    state?: string;
    failureCode?: string;
    failureDetail?: string;
    stuckMinutes?: number;
    extra?: Record<string, string | number | undefined>;
}

const KIND_TITLES: Record<ActivationAlertKind, string> = {
    user_paid: '💳 New paid workspace',
    stripe_connected: '🔌 Stripe connected',
    activation_completed: '✅ Activation completed',
    activation_failed: '❌ Activation failed',
    activation_stalled: '🚨 Activation stalled',
    activation_overridden: '🛠 Activation manually overridden',
};

function escapeMarkdown(value: string): string {
    return value.replace(/[_*[\]()~`>#+=|{}.!-]/g, '\\$&');
}

function formatLine(label: string, value: string | number | undefined): string | null {
    if (value === undefined || value === null || value === '') return null;
    return `*${escapeMarkdown(label)}:* ${escapeMarkdown(String(value))}`;
}

function buildMessage(ctx: ActivationAlertContext): string {
    const lines: string[] = [`*${escapeMarkdown(KIND_TITLES[ctx.kind])}*`];
    const fields: Array<[string, string | number | undefined]> = [
        ['Workspace', ctx.workspaceName ?? ctx.workspaceId],
        ['Workspace ID', ctx.workspaceId],
        ['User', ctx.userId],
        ['State', ctx.state],
        ['Failure code', ctx.failureCode],
        ['Failure detail', ctx.failureDetail],
        ['Stuck (min)', ctx.stuckMinutes],
    ];
    for (const [label, value] of fields) {
        const line = formatLine(label, value);
        if (line) lines.push(line);
    }
    if (ctx.extra) {
        for (const [k, v] of Object.entries(ctx.extra)) {
            const line = formatLine(k, v);
            if (line) lines.push(line);
        }
    }
    return lines.join('\n');
}

/**
 * Fire-and-forget Telegram alert. Returns true on send success.
 * Never throws — caller does not need a try/catch.
 */
export async function sendActivationAlert(ctx: ActivationAlertContext): Promise<boolean> {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_ALERT_CHAT_ID;

    if (!token || !chatId) {
        console.log('activation_alert_unconfigured', { kind: ctx.kind, workspaceId: ctx.workspaceId });
        return false;
    }

    const text = buildMessage(ctx);

    try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), ALERT_TIMEOUT_MS);
        const response = await fetch(`${TELEGRAM_API_BASE}/bot${token}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: chatId,
                text,
                parse_mode: 'MarkdownV2',
                disable_web_page_preview: true,
            }),
            signal: controller.signal,
        });
        clearTimeout(timer);

        if (!response.ok) {
            const body = await response.text().catch(() => '');
            console.error('activation_alert_http_error', {
                kind: ctx.kind,
                workspaceId: ctx.workspaceId,
                status: response.status,
                body: body.slice(0, 200),
            });
            return false;
        }
        return true;
    } catch (error) {
        const message = error instanceof Error ? error.message : 'unknown';
        console.error('activation_alert_send_failed', {
            kind: ctx.kind,
            workspaceId: ctx.workspaceId,
            error: message,
        });
        return false;
    }
}
