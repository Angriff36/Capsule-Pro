import { keys as analytics } from "@repo/analytics/keys";
import { keys as auth } from "@repo/auth/keys";
import { keys as database } from "@repo/database/keys";
import { keys as email } from "@repo/email/keys";
import { keys as core } from "@repo/next-config/keys";
import { keys as observability } from "@repo/observability/keys";
import { keys as payments } from "@repo/payments/keys";
import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  extends: [
    auth(),
    analytics(),
    core(),
    database(),
    email(),
    observability(),
    payments(),
  ],
  server: {
    ABLY_API_KEY: z.string().min(1),
    ABLY_AUTH_CORS_ORIGINS: z.string().optional(),
    OUTBOX_PUBLISH_TOKEN: z.string().min(1),

    // Sentry integration
    SENTRY_WEBHOOK_SECRET: z.string().min(1).optional(),
    SENTRY_FIXER_ENABLED: z
      .string()
      .transform((val) => val === "true")
      .optional(),
    SENTRY_FIXER_RATE_LIMIT_MINUTES: z.string().optional(),
    SENTRY_FIXER_DEDUP_MINUTES: z.string().optional(),
    SENTRY_FIXER_MAX_RETRIES: z.string().optional(),
    SENTRY_FIXER_RUN_TESTS: z.string().optional(),
    SENTRY_FIXER_TEST_COMMAND: z.string().optional(),

    // GitHub for PR creation
    GITHUB_TOKEN: z.string().min(1).optional(),
    GITHUB_REPO_OWNER: z.string().min(1).optional(),
    GITHUB_REPO_NAME: z.string().min(1).optional(),
    GITHUB_BASE_BRANCH: z.string().optional(),

    // Slack notifications
    SLACK_BOT_TOKEN: z.string().min(1).optional(),
    SLACK_WEBHOOK_URL: z.string().url().optional(),
    SLACK_CHANNEL_ID: z.string().min(1).optional(),
  },
  client: {},
  runtimeEnv: {
    ABLY_API_KEY: process.env.ABLY_API_KEY,
    ABLY_AUTH_CORS_ORIGINS: process.env.ABLY_AUTH_CORS_ORIGINS,
    OUTBOX_PUBLISH_TOKEN: process.env.OUTBOX_PUBLISH_TOKEN,

    // Sentry integration
    SENTRY_WEBHOOK_SECRET: process.env.SENTRY_WEBHOOK_SECRET,
    SENTRY_FIXER_ENABLED: process.env.SENTRY_FIXER_ENABLED,
    SENTRY_FIXER_RATE_LIMIT_MINUTES:
      process.env.SENTRY_FIXER_RATE_LIMIT_MINUTES,
    SENTRY_FIXER_DEDUP_MINUTES: process.env.SENTRY_FIXER_DEDUP_MINUTES,
    SENTRY_FIXER_MAX_RETRIES: process.env.SENTRY_FIXER_MAX_RETRIES,
    SENTRY_FIXER_RUN_TESTS: process.env.SENTRY_FIXER_RUN_TESTS,
    SENTRY_FIXER_TEST_COMMAND: process.env.SENTRY_FIXER_TEST_COMMAND,

    // GitHub
    GITHUB_TOKEN: process.env.GITHUB_TOKEN,
    GITHUB_REPO_OWNER: process.env.GITHUB_REPO_OWNER,
    GITHUB_REPO_NAME: process.env.GITHUB_REPO_NAME,
    GITHUB_BASE_BRANCH: process.env.GITHUB_BASE_BRANCH,

    // Slack
    SLACK_BOT_TOKEN: process.env.SLACK_BOT_TOKEN,
    SLACK_WEBHOOK_URL: process.env.SLACK_WEBHOOK_URL,
    SLACK_CHANNEL_ID: process.env.SLACK_CHANNEL_ID,
  },
});
