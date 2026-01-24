Object.defineProperty(exports, "__esModule", { value: true });
exports.keys = void 0;
const env_nextjs_1 = require("@t3-oss/env-nextjs");
const zod_1 = require("zod");
const keys = () =>
  (0, env_nextjs_1.createEnv)({
    client: {
      NEXT_PUBLIC_POSTHOG_KEY: zod_1.z.string().startsWith("phc_"),
      NEXT_PUBLIC_POSTHOG_HOST: zod_1.z.url(),
      NEXT_PUBLIC_GA_MEASUREMENT_ID: zod_1.z
        .string()
        .startsWith("G-")
        .optional(),
    },
    runtimeEnv: {
      NEXT_PUBLIC_POSTHOG_KEY: process.env.NEXT_PUBLIC_POSTHOG_KEY,
      NEXT_PUBLIC_POSTHOG_HOST: process.env.NEXT_PUBLIC_POSTHOG_HOST,
      NEXT_PUBLIC_GA_MEASUREMENT_ID: process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID,
    },
  });
exports.keys = keys;
