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
  },
});
