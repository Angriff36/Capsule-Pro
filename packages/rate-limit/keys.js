Object.defineProperty(exports, "__esModule", { value: true });
exports.keys = void 0;
const env_nextjs_1 = require("@t3-oss/env-nextjs");
const zod_1 = require("zod");
const keys = () =>
  (0, env_nextjs_1.createEnv)({
    server: {
      UPSTASH_REDIS_REST_URL: zod_1.z.url().optional(),
      UPSTASH_REDIS_REST_TOKEN: zod_1.z.string().optional(),
    },
    runtimeEnv: {
      UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
      UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN,
    },
  });
exports.keys = keys;
