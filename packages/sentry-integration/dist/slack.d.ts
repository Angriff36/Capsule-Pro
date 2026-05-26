/**
 * Slack notification configuration
 */
interface SlackConfig {
    /** Bot token (xoxb-...) for Web API */
    botToken?: string;
    /** Webhook URL for incoming webhooks */
    webhookUrl?: string;
    /** Channel ID to post to (e.g., C1234567890) */
    channelId?: string;
}
/**
 * PR notification payload
 */
interface PRNotificationPayload {
    prUrl: string;
    prNumber: number;
    issueTitle: string;
    issueUrl: string;
    branchName: string;
    environment?: string | null;
}
/**
 * Error notification payload
 */
interface ErrorNotificationPayload {
    issueTitle: string;
    issueUrl: string;
    errorMessage: string;
    retryCount: number;
    maxRetries: number;
}
/**
 * Slack notifier for Sentry fixer pipeline
 */
declare class SlackNotifier {
    private readonly client;
    private readonly config;
    constructor(config: SlackConfig);
    /**
     * Send a notification about a new PR
     */
    notifyPRCreated(payload: PRNotificationPayload): Promise<boolean>;
    /**
     * Send a notification about a failed fix
     */
    notifyFixFailed(payload: ErrorNotificationPayload): Promise<boolean>;
    /**
     * Format a PR notification message
     */
    private formatPRMessage;
    /**
     * Format an error notification message
     */
    private formatErrorMessage;
    /**
     * Send a message to Slack
     */
    private sendMessage;
    /**
     * Send message via incoming webhook
     */
    private sendViaWebhook;
    /**
     * Send message via Web API
     */
    private sendViaWebAPI;
    /**
     * Escape special characters for Markdown
     */
    private escapeMarkdown;
}
/**
 * Create a Slack notifier
 */
declare const createSlackNotifier: (config: SlackConfig) => SlackNotifier;

export { type ErrorNotificationPayload, type PRNotificationPayload, type SlackConfig, SlackNotifier, createSlackNotifier };
