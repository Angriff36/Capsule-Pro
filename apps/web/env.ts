import { keys as cms } from "@repo/cms/keys";
import { keys as email } from "@repo/email/keys";
import { keys as flags } from "@repo/feature-flags/keys";
import { keys as core } from "@repo/next-config/keys";
import { keys as observability } from "@repo/observability/keys";
import { keys as rateLimit } from "@repo/rate-limit/keys";
import { keys as security } from "@repo/security/keys";
import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

const skip = !!process.env.SKIP_ENV_VALIDATION;

export const env = createEnv({
  skipValidation: skip,
  extends: [
    cms(),
    core(),
    email(),
    observability(),
    flags(),
    security(),
    rateLimit(),
  ],
  server: {
    REVALIDATION_SECRET: z.string().optional(),
  },
  client: {},
  // When skipValidation is true, t3-env returns runtimeEnv directly without
  // merging extends presets. Pass process.env so all vars are still accessible.
  runtimeEnv: skip
    ? { ...process.env, REVALIDATION_SECRET: process.env.REVALIDATION_SECRET }
    : { REVALIDATION_SECRET: process.env.REVALIDATION_SECRET },
});
