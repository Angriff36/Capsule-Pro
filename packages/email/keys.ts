import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const keys = () =>
  createEnv({
    server: {
      RESEND_FROM: process.env.SKIP_ENV_VALIDATION
        ? z.string().optional()
        : z.string().email(),
      RESEND_TOKEN: process.env.SKIP_ENV_VALIDATION
        ? z.string().optional()
        : z.string().startsWith("re_"),
    },
    runtimeEnv: {
      RESEND_FROM: process.env.RESEND_FROM,
      RESEND_TOKEN: process.env.RESEND_TOKEN,
    },
  });
