Object.defineProperty(exports, "__esModule", { value: true });
exports.keys = void 0;
const env_nextjs_1 = require("@t3-oss/env-nextjs");
const zod_1 = require("zod");
const keys = () =>
  (0, env_nextjs_1.createEnv)({
    server: {
      CLERK_SECRET_KEY: zod_1.z.string().startsWith("sk_").optional(),
      CLERK_WEBHOOK_SECRET: zod_1.z.string().startsWith("whsec_").optional(),
    },
    client: {
      NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: zod_1.z
        .string()
        .startsWith("pk_")
        .optional(),
      NEXT_PUBLIC_CLERK_SIGN_IN_URL: zod_1.z.string().startsWith("/"),
      NEXT_PUBLIC_CLERK_SIGN_UP_URL: zod_1.z.string().startsWith("/"),
      NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL: zod_1.z.string().startsWith("/"),
      NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL: zod_1.z.string().startsWith("/"),
    },
    runtimeEnv: {
      CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY,
      CLERK_WEBHOOK_SECRET: process.env.CLERK_WEBHOOK_SECRET,
      NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY:
        process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
      NEXT_PUBLIC_CLERK_SIGN_IN_URL: process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL,
      NEXT_PUBLIC_CLERK_SIGN_UP_URL: process.env.NEXT_PUBLIC_CLERK_SIGN_UP_URL,
      NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL:
        process.env.NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL,
      NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL:
        process.env.NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL,
    },
  });
exports.keys = keys;
