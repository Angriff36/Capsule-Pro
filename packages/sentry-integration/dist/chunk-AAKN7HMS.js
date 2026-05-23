// src/slack.ts
import { WebClient } from "@slack/web-api";
var SlackNotifier = class {
  client = null;
  config;
  constructor(config) {
    this.config = config;
    if (config.botToken) {
      this.client = new WebClient(config.botToken);
    }
  }
  /**
   * Send a notification about a new PR
   */
  async notifyPRCreated(payload) {
    const message = this.formatPRMessage(payload);
    return this.sendMessage(message);
  }
  /**
   * Send a notification about a failed fix
   */
  async notifyFixFailed(payload) {
    const message = this.formatErrorMessage(payload);
    return this.sendMessage(message);
  }
  /**
   * Format a PR notification message
   */
  formatPRMessage(payload) {
    return {
      blocks: [
        {
          type: "header",
          text: {
            type: "plain_text",
            text: "\u{1F916} Sentry Auto-Fix PR Created",
            emoji: true
          }
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `*${this.escapeMarkdown(payload.issueTitle)}*`
          }
        },
        {
          type: "section",
          fields: [
            {
              type: "mrkdwn",
              text: `*Pull Request:*
<${payload.prUrl}|#${payload.prNumber}>`
            },
            {
              type: "mrkdwn",
              text: `*Environment:*
${payload.environment ?? "Unknown"}`
            },
            {
              type: "mrkdwn",
              text: `*Sentry Issue:*
<${payload.issueUrl}|View Issue>`
            },
            {
              type: "mrkdwn",
              text: `*Branch:*
\`${payload.branchName}\``
            }
          ]
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: "\u26A0\uFE0F _Please review carefully before merging. This PR should **never** be auto-merged._"
          }
        },
        {
          type: "actions",
          elements: [
            {
              type: "button",
              text: {
                type: "plain_text",
                text: "View PR",
                emoji: true
              },
              url: payload.prUrl
            },
            {
              type: "button",
              text: {
                type: "plain_text",
                text: "View Sentry Issue",
                emoji: true
              },
              url: payload.issueUrl
            }
          ]
        },
        {
          type: "divider"
        },
        {
          type: "context",
          elements: [
            {
              type: "mrkdwn",
              text: "Sent by Sentry-to-PR Pipeline \u2022 Just now"
            }
          ]
        }
      ]
    };
  }
  /**
   * Format an error notification message
   */
  formatErrorMessage(payload) {
    const isFinalFailure = payload.retryCount >= payload.maxRetries;
    const emoji = isFinalFailure ? ":x:" : ":warning:";
    const title = isFinalFailure ? "Sentry Auto-Fix Failed" : "Sentry Auto-Fix Retry";
    return {
      blocks: [
        {
          type: "header",
          text: {
            type: "plain_text",
            text: `${emoji} ${title}`,
            emoji: true
          }
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `*${this.escapeMarkdown(payload.issueTitle)}*`
          }
        },
        {
          type: "section",
          fields: [
            {
              type: "mrkdwn",
              text: `*Sentry Issue:*
<${payload.issueUrl}|View Issue>`
            },
            {
              type: "mrkdwn",
              text: `*Retry:*
${payload.retryCount} / ${payload.maxRetries}`
            }
          ]
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `*Error:*
\`\`\`${this.escapeMarkdown(payload.errorMessage.slice(0, 500))}\`\`\``
          }
        },
        {
          type: "actions",
          elements: [
            {
              type: "button",
              text: {
                type: "plain_text",
                text: "View Sentry Issue",
                emoji: true
              },
              url: payload.issueUrl
            }
          ]
        }
      ]
    };
  }
  /**
   * Send a message to Slack
   */
  async sendMessage(message) {
    if (this.config.webhookUrl) {
      return this.sendViaWebhook(message);
    }
    if (this.client && this.config.channelId) {
      return this.sendViaWebAPI(message);
    }
    console.warn("[SlackNotifier] No webhook URL or bot token configured");
    return false;
  }
  /**
   * Send message via incoming webhook
   */
  async sendViaWebhook(message) {
    try {
      const response = await fetch(this.config.webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(message)
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
  async sendViaWebAPI(message) {
    if (!(this.client && this.config.channelId)) {
      return false;
    }
    try {
      await this.client.chat.postMessage({
        channel: this.config.channelId,
        ...message,
        unfurl_links: false,
        unfurl_media: false
      });
      return true;
    } catch (error) {
      console.error("[SlackNotifier] Web API error:", error);
      return false;
    }
  }
  /**
   * Escape special characters for Markdown
   */
  escapeMarkdown(text) {
    return text.replace(/[*_`~><&]/g, (char) => `\\${char}`);
  }
};
var createSlackNotifier = (config) => {
  return new SlackNotifier(config);
};

export {
  SlackNotifier,
  createSlackNotifier
};
//# sourceMappingURL=chunk-AAKN7HMS.js.map