Object.defineProperty(exports, "__esModule", { value: true });
exports.keys = void 0;
const env_nextjs_1 = require("@t3-oss/env-nextjs");
const zod_1 = require("zod");
const keys = () =>
  (0, env_nextjs_1.createEnv)({
    server: {
      BETTERSTACK_API_KEY: zod_1.z.string().optional(),
      BETTERSTACK_URL: zod_1.z.url().optional(),
      // Added by Sentry Integration, Vercel Marketplace
      SENTRY_ORG: zod_1.z.string().optional(),
      SENTRY_PROJECT: zod_1.z.string().optional(),
    },
    client: {
      // Added by Sentry Integration, Vercel Marketplace
      NEXT_PUBLIC_SENTRY_DSN: zod_1.z.url().optional(),
    },
    runtimeEnv: {
      BETTERSTACK_API_KEY: process.env.BETTERSTACK_API_KEY,
      BETTERSTACK_URL: process.env.BETTERSTACK_URL,
      SENTRY_ORG: process.env.SENTRY_ORG,
      SENTRY_PROJECT: process.env.SENTRY_PROJECT,
      NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN,
    },
  });
exports.keys = keys;
