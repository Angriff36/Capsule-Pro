import { keys as analytics } from "@repo/analytics/keys";
import { keys as auth } from "@repo/auth/keys";
import { keys as collaboration } from "@repo/collaboration/keys";
import { keys as database } from "@repo/database/keys";
import { keys as email } from "@repo/email/keys";
import { keys as flags } from "@repo/feature-flags/keys";
import { keys as core } from "@repo/next-config/keys";
import { keys as notifications } from "@repo/notifications/keys";
import { keys as observability } from "@repo/observability/keys";
import { keys as security } from "@repo/security/keys";
import { keys as webhooks } from "@repo/webhooks/keys";
import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

const skip = !!process.env.SKIP_ENV_VALIDATION;

export const env = createEnv({
  skipValidation: skip,
  extends: [
    auth(),
    analytics(),
    collaboration(),
    core(),
    database(),
    email(),
    flags(),
    notifications(),
    observability(),
    security(),
    webhooks(),
  ],
  server: {
    ABLY_API_KEY: z.string().optional(),
    OPENAI_API_KEY: z.string().optional(),
    COMMAND_BOARD_AI_MODEL: z.string().optional(),
    PLASMIC_PROJECT_ID: z.string().optional(),
    PLASMIC_API_TOKEN: z.string().optional(),
  },
  client: {},
  // When skipValidation is true, t3-env returns runtimeEnv directly without
  // merging extends presets. Pass process.env so all vars are still accessible.
  runtimeEnv: skip
    ? {
        ...process.env,
        ABLY_API_KEY: process.env.ABLY_API_KEY,
        OPENAI_API_KEY: process.env.OPENAI_API_KEY,
        COMMAND_BOARD_AI_MODEL: process.env.COMMAND_BOARD_AI_MODEL,
        PLASMIC_PROJECT_ID: process.env.PLASMIC_PROJECT_ID,
        PLASMIC_API_TOKEN: process.env.PLASMIC_API_TOKEN,
      }
    : {
        ABLY_API_KEY: process.env.ABLY_API_KEY,
        OPENAI_API_KEY: process.env.OPENAI_API_KEY,
        COMMAND_BOARD_AI_MODEL: process.env.COMMAND_BOARD_AI_MODEL,
        PLASMIC_PROJECT_ID: process.env.PLASMIC_PROJECT_ID,
        PLASMIC_API_TOKEN: process.env.PLASMIC_API_TOKEN,
      },
});
