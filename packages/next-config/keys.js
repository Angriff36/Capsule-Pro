Object.defineProperty(exports, "__esModule", { value: true });
exports.keys = void 0;
const env_nextjs_1 = require("@t3-oss/env-nextjs");
const zod_1 = require("zod");
const keys = () =>
  (0, env_nextjs_1.createEnv)({
    server: {
      ANALYZE: zod_1.z.string().optional(),
      // Added by Vercel
      NEXT_RUNTIME: zod_1.z.enum(["nodejs", "edge"]).optional(),
      // Vercel environment variables
      VERCEL: zod_1.z.string().optional(),
      VERCEL_ENV: zod_1.z
        .enum(["development", "preview", "production"])
        .optional(),
      VERCEL_URL: zod_1.z.string().optional(),
      VERCEL_REGION: zod_1.z.string().optional(),
      VERCEL_PROJECT_PRODUCTION_URL: zod_1.z.string().optional(),
    },
    client: {
      NEXT_PUBLIC_APP_URL: zod_1.z.url(),
      NEXT_PUBLIC_WEB_URL: zod_1.z.url(),
      NEXT_PUBLIC_API_URL: zod_1.z.url().optional(),
      NEXT_PUBLIC_DOCS_URL: zod_1.z.url().optional(),
    },
    runtimeEnv: {
      ANALYZE: process.env.ANALYZE,
      NEXT_RUNTIME: process.env.NEXT_RUNTIME,
      VERCEL: process.env.VERCEL,
      VERCEL_ENV: process.env.VERCEL_ENV,
      VERCEL_URL: process.env.VERCEL_URL,
      VERCEL_REGION: process.env.VERCEL_REGION,
      VERCEL_PROJECT_PRODUCTION_URL: process.env.VERCEL_PROJECT_PRODUCTION_URL,
      NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
      NEXT_PUBLIC_WEB_URL: process.env.NEXT_PUBLIC_WEB_URL,
      NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
      NEXT_PUBLIC_DOCS_URL: process.env.NEXT_PUBLIC_DOCS_URL,
    },
  });
exports.keys = keys;
