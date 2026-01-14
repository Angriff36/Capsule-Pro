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
    OUTBOX_PUBLISH_TOKEN: z.string().min(1),
  },
  client: {},
  runtimeEnv: {
    ABLY_API_KEY: process.env.ABLY_API_KEY,
    OUTBOX_PUBLISH_TOKEN: process.env.OUTBOX_PUBLISH_TOKEN,
  },
});
