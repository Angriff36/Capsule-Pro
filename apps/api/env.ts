import { keys as analytics } from "@repo/analytics/keys";
import { keys as auth } from "@repo/auth/keys";
import { keys as database } from "@repo/database/keys";
import { keys as email } from "@repo/email/keys";
import { keys as core } from "@repo/next-config/keys";
import { keys as observability } from "@repo/observability/keys";
import { keys as payments } from "@repo/payments/keys";
import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

const skip = !!process.env.SKIP_ENV_VALIDATION;

export const env = createEnv({
  skipValidation: skip,
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
    /**
     * Comma-separated list of origins allowed to call apps/api with
     * credentials (used by the shared `corsHeaders` helper). When unset,
     * a baked-in localhost dev whitelist applies. Previously named
     * `ABLY_AUTH_CORS_ORIGINS`; the value semantics are unchanged.
     */
    REALTIME_CORS_ORIGINS: z.string().optional(),
    OUTBOX_PUBLISH_TOKEN: z.string().min(1),
    CRON_SECRET: z.string().min(1).optional(),

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
    SENTRY_FIXER_AI_MODEL: z.string().optional(),
    SENTRY_FIXER_MAX_EXECUTION_MS: z.string().optional(),

    // OpenAI
    OPENAI_API_KEY: z.string().min(1).optional(),

    // GitHub for PR creation
    GITHUB_TOKEN: z.string().min(1).optional(),
    GITHUB_REPO_OWNER: z.string().min(1).optional(),
    GITHUB_REPO_NAME: z.string().min(1).optional(),
    GITHUB_BASE_BRANCH: z.string().optional(),

    // Slack notifications
    SLACK_BOT_TOKEN: z.string().min(1).optional(),
    SLACK_WEBHOOK_URL: z.url().optional(),
    SLACK_CHANNEL_ID: z.string().min(1).optional(),

    // OAuth / Calendar sync
    GOOGLE_CLIENT_ID: z.string().optional(),
    GOOGLE_CLIENT_SECRET: z.string().optional(),
    MICROSOFT_CLIENT_ID: z.string().optional(),
    MICROSOFT_CLIENT_SECRET: z.string().optional(),
    OAUTH_REDIRECT_URI: z.string().optional(),
    CALENDAR_SYNC_SECRET: z.string().optional(),

    // Resend webhook
    RESEND_WEBHOOK_SECRET: z.string().optional(),

    // Sentry canary
    CAPSULE_SENTRY_CANARY_SECRET: z.string().optional(),
  },
  client: {},
  // When skipValidation is true, t3-env returns runtimeEnv directly without
  // merging extends presets. Pass process.env so all vars are still accessible.
  runtimeEnv: skip
    ? (process.env as Record<string, string | undefined>)
    : {
        REALTIME_CORS_ORIGINS:
          process.env.REALTIME_CORS_ORIGINS ??
          process.env.ABLY_AUTH_CORS_ORIGINS,
        OUTBOX_PUBLISH_TOKEN: process.env.OUTBOX_PUBLISH_TOKEN,
        CRON_SECRET: process.env.CRON_SECRET,

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

        // OAuth / Calendar sync
        GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
        GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
        MICROSOFT_CLIENT_ID: process.env.MICROSOFT_CLIENT_ID,
        MICROSOFT_CLIENT_SECRET: process.env.MICROSOFT_CLIENT_SECRET,
        OAUTH_REDIRECT_URI: process.env.OAUTH_REDIRECT_URI,
        CALENDAR_SYNC_SECRET: process.env.CALENDAR_SYNC_SECRET,

        // Resend webhook
        RESEND_WEBHOOK_SECRET: process.env.RESEND_WEBHOOK_SECRET,

        // Sentry canary
        CAPSULE_SENTRY_CANARY_SECRET: process.env.CAPSULE_SENTRY_CANARY_SECRET,
      },
});
