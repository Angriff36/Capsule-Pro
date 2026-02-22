import { WebClient } from "@slack/web-api";

/**
 * Slack notification configuration
 */
export interface SlackConfig {
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
export interface PRNotificationPayload {
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
export interface ErrorNotificationPayload {
  issueTitle: string;
  issueUrl: string;
  errorMessage: string;
  retryCount: number;
  maxRetries: number;
}

/**
 * Slack notifier for Sentry fixer pipeline
 */
export class SlackNotifier {
  private readonly client: WebClient | null = null;
  private readonly config: SlackConfig;

  constructor(config: SlackConfig) {
    this.config = config;
    if (config.botToken) {
      this.client = new WebClient(config.botToken);
    }
  }

  /**
   * Send a notification about a new PR
   */
  async notifyPRCreated(payload: PRNotificationPayload): Promise<boolean> {
    const message = this.formatPRMessage(payload);
    return this.sendMessage(message);
  }

  /**
   * Send a notification about a failed fix
   */
  async notifyFixFailed(payload: ErrorNotificationPayload): Promise<boolean> {
    const message = this.formatErrorMessage(payload);
    return this.sendMessage(message);
  }

  /**
   * Format a PR notification message
   */
  private formatPRMessage(payload: PRNotificationPayload): object {
    return {
      blocks: [
        {
          type: "header",
          text: {
            type: "plain_text",
            text: "🤖 Sentry Auto-Fix PR Created",
            emoji: true,
          },
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `*${this.escapeMarkdown(payload.issueTitle)}*`,
          },
        },
        {
          type: "section",
          fields: [
            {
              type: "mrkdwn",
              text: `*Pull Request:*\n<${payload.prUrl}|#${payload.prNumber}>`,
            },
            {
              type: "mrkdwn",
              text: `*Environment:*\n${payload.environment ?? "Unknown"}`,
            },
            {
              type: "mrkdwn",
              text: `*Sentry Issue:*\n<${payload.issueUrl}|View Issue>`,
            },
            {
              type: "mrkdwn",
              text: `*Branch:*\n\`${payload.branchName}\``,
            },
          ],
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: "⚠️ _Please review carefully before merging. This PR should **never** be auto-merged._",
          },
        },
        {
          type: "actions",
          elements: [
            {
              type: "button",
              text: {
                type: "plain_text",
                text: "View PR",
                emoji: true,
              },
              url: payload.prUrl,
            },
            {
              type: "button",
              text: {
                type: "plain_text",
                text: "View Sentry Issue",
                emoji: true,
              },
              url: payload.issueUrl,
            },
          ],
        },
        {
          type: "divider",
        },
        {
          type: "context",
          elements: [
            {
              type: "mrkdwn",
              text: "Sent by Sentry-to-PR Pipeline • Just now",
            },
          ],
        },
      ],
    };
  }

  /**
   * Format an error notification message
   */
  private formatErrorMessage(payload: ErrorNotificationPayload): object {
    const isFinalFailure = payload.retryCount >= payload.maxRetries;
    const emoji = isFinalFailure ? ":x:" : ":warning:";
    const title = isFinalFailure
      ? "Sentry Auto-Fix Failed"
      : "Sentry Auto-Fix Retry";

    return {
      blocks: [
        {
          type: "header",
          text: {
            type: "plain_text",
            text: `${emoji} ${title}`,
            emoji: true,
          },
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `*${this.escapeMarkdown(payload.issueTitle)}*`,
          },
        },
        {
          type: "section",
          fields: [
            {
              type: "mrkdwn",
              text: `*Sentry Issue:*\n<${payload.issueUrl}|View Issue>`,
            },
            {
              type: "mrkdwn",
              text: `*Retry:*\n${payload.retryCount} / ${payload.maxRetries}`,
            },
          ],
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `*Error:*\n\`\`\`${this.escapeMarkdown(payload.errorMessage.slice(0, 500))}\`\`\``,
          },
        },
        {
          type: "actions",
          elements: [
            {
              type: "button",
              text: {
                type: "plain_text",
                text: "View Sentry Issue",
                emoji: true,
              },
              url: payload.issueUrl,
            },
          ],
        },
      ],
    };
  }

  /**
   * Send a message to Slack
   */
  private async sendMessage(message: object): Promise<boolean> {
    // Try webhook first (simpler setup)
    if (this.config.webhookUrl) {
      return this.sendViaWebhook(message);
    }

    // Fall back to Web API
    if (this.client && this.config.channelId) {
      return this.sendViaWebAPI(message);
    }

    console.warn("[SlackNotifier] No webhook URL or bot token configured");
    return false;
  }

  /**
   * Send message via incoming webhook
   */
  private async sendViaWebhook(message: object): Promise<boolean> {
    try {
      const response = await fetch(this.config.webhookUrl!, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(message),
      });

      if (!response.ok) {
        console.error("[SlackNotifier] Webhook failed:", await response.text());
        return false;
      }

      return true;
    } catch (error) {
      console.error("[SlackNotifier] Webhook error:", error);
      return false;
    }
  }

  /**
   * Send message via Web API
   */
  private async sendViaWebAPI(message: object): Promise<boolean> {
    if (!(this.client && this.config.channelId)) {
      return false;
    }

    try {
      await this.client.chat.postMessage({
        channel: this.config.channelId,
        ...message,
        unfurl_links: false,
        unfurl_media: false,
      } as Parameters<typeof this.client.chat.postMessage>[0]);
      return true;
    } catch (error) {
      console.error("[SlackNotifier] Web API error:", error);
      return false;
    }
  }

  /**
   * Escape special characters for Markdown
   */
  private escapeMarkdown(text: string): string {
    return text.replace(/[*_`~><&]/g, (char) => `\\${char}`);
  }
}

/**
 * Create a Slack notifier
 */
export const createSlackNotifier = (config: SlackConfig): SlackNotifier => {
  return new SlackNotifier(config);
};
