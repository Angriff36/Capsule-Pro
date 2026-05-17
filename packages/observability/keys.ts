import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const keys = () =>
  createEnv({
    skipValidation: !!process.env.SKIP_ENV_VALIDATION,
    server: {
      BETTERSTACK_API_KEY: z.string().optional(),
      BETTERSTACK_URL: z.url().optional(),
      BETTER_STACK_SOURCE_TOKEN: z.string().optional(),
      BETTER_STACK_INGESTING_URL: z.string().optional(),
      LOGTAIL_SOURCE_TOKEN: z.string().optional(),
      LOGTAIL_URL: z.string().optional(),

      // Added by Sentry Integration, Vercel Marketplace
      SENTRY_ORG: z.string().optional(),
      SENTRY_PROJECT: z.string().optional(),
      SENTRY_AUTH_TOKEN: z.string().optional(),
      SENTRY_ENVIRONMENT: z.string().optional(),

      VERCEL_ENV: z.enum(["development", "preview", "production"]).optional(),
    },
    client: {
      // Added by Sentry Integration, Vercel Marketplace
      NEXT_PUBLIC_SENTRY_DSN: z.url().optional(),
      NEXT_PUBLIC_SENTRY_ENVIRONMENT: z.string().optional(),
      NEXT_PUBLIC_BETTER_STACK_SOURCE_TOKEN: z.string().optional(),
      NEXT_PUBLIC_BETTER_STACK_INGESTING_URL: z.string().optional(),
      NEXT_PUBLIC_LOGTAIL_SOURCE_TOKEN: z.string().optional(),
      NEXT_PUBLIC_LOGTAIL_URL: z.string().optional(),

      NEXT_PUBLIC_VERCEL_ENV: z
        .enum(["development", "preview", "production"])
        .optional(),
    },
    runtimeEnv: {
      BETTERSTACK_API_KEY: process.env.BETTERSTACK_API_KEY,
      BETTERSTACK_URL: process.env.BETTERSTACK_URL,
      BETTER_STACK_SOURCE_TOKEN: process.env.BETTER_STACK_SOURCE_TOKEN,
      BETTER_STACK_INGESTING_URL: process.env.BETTER_STACK_INGESTING_URL,
      LOGTAIL_SOURCE_TOKEN: process.env.LOGTAIL_SOURCE_TOKEN,
      LOGTAIL_URL: process.env.LOGTAIL_URL,
      SENTRY_ORG: process.env.SENTRY_ORG,
      SENTRY_PROJECT: process.env.SENTRY_PROJECT,
      SENTRY_AUTH_TOKEN: process.env.SENTRY_AUTH_TOKEN,
      SENTRY_ENVIRONMENT: process.env.SENTRY_ENVIRONMENT,
      VERCEL_ENV: process.env.VERCEL_ENV,
      NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN,
      NEXT_PUBLIC_SENTRY_ENVIRONMENT:
        process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT,
      NEXT_PUBLIC_BETTER_STACK_SOURCE_TOKEN:
        process.env.NEXT_PUBLIC_BETTER_STACK_SOURCE_TOKEN,
      NEXT_PUBLIC_BETTER_STACK_INGESTING_URL:
        process.env.NEXT_PUBLIC_BETTER_STACK_INGESTING_URL,
      NEXT_PUBLIC_LOGTAIL_SOURCE_TOKEN:
        process.env.NEXT_PUBLIC_LOGTAIL_SOURCE_TOKEN,
      NEXT_PUBLIC_LOGTAIL_URL: process.env.NEXT_PUBLIC_LOGTAIL_URL,
      NEXT_PUBLIC_VERCEL_ENV: process.env.NEXT_PUBLIC_VERCEL_ENV,
    },
  });
