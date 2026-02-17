import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

/**
 * Environment keys for Sentry integration
 */
export const keys = () =>
  createEnv({
    server: {
      // Sentry Internal Integration credentials
      SENTRY_WEBHOOK_SECRET: z.string().min(1),
      SENTRY_CLIENT_SECRET: z.string().min(1).optional(),

      // Slack integration for notifications
      SLACK_BOT_TOKEN: z.string().min(1).optional(),
      SLACK_WEBHOOK_URL: z.string().url().optional(),
      SLACK_CHANNEL_ID: z.string().min(1).optional(),

      // Job runner configuration
      SENTRY_FIXER_ENABLED: z
        .string()
        .default("false")
        .transform((val) => val === "true"),
      SENTRY_FIXER_MAX_RETRIES: z
        .string()
        .default("3")
        .transform((val) => Number.parseInt(val, 10)),
      SENTRY_FIXER_RATE_LIMIT_MINUTES: z
        .string()
        .default("60")
        .transform((val) => Number.parseInt(val, 10)),
      SENTRY_FIXER_DEDUP_MINUTES: z
        .string()
        .default("30")
        .transform((val) => Number.parseInt(val, 10)),

      // GitHub configuration for PR creation
      GITHUB_TOKEN: z.string().min(1).optional(),
      GITHUB_REPO_OWNER: z.string().min(1).optional(),
      GITHUB_REPO_NAME: z.string().min(1).optional(),

      // Blocked paths for auto-fix (comma-separated)
      SENTRY_FIXER_BLOCKED_PATHS: z.string().default("migrations,auth,billing"),
    },
    client: {},
    runtimeEnv: {
      SENTRY_WEBHOOK_SECRET: process.env.SENTRY_WEBHOOK_SECRET,
      SENTRY_CLIENT_SECRET: process.env.SENTRY_CLIENT_SECRET,
      SLACK_BOT_TOKEN: process.env.SLACK_BOT_TOKEN,
      SLACK_WEBHOOK_URL: process.env.SLACK_WEBHOOK_URL,
      SLACK_CHANNEL_ID: process.env.SLACK_CHANNEL_ID,
      SENTRY_FIXER_ENABLED: process.env.SENTRY_FIXER_ENABLED,
      SENTRY_FIXER_MAX_RETRIES: process.env.SENTRY_FIXER_MAX_RETRIES,
      SENTRY_FIXER_RATE_LIMIT_MINUTES:
        process.env.SENTRY_FIXER_RATE_LIMIT_MINUTES,
      SENTRY_FIXER_DEDUP_MINUTES: process.env.SENTRY_FIXER_DEDUP_MINUTES,
      GITHUB_TOKEN: process.env.GITHUB_TOKEN,
      GITHUB_REPO_OWNER: process.env.GITHUB_REPO_OWNER,
      GITHUB_REPO_NAME: process.env.GITHUB_REPO_NAME,
      SENTRY_FIXER_BLOCKED_PATHS: process.env.SENTRY_FIXER_BLOCKED_PATHS,
    },
  });

export type SentryEnv = ReturnType<typeof keys>;
