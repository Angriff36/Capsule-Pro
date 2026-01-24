Object.defineProperty(exports, "__esModule", { value: true });
exports.env = void 0;
const keys_1 = require("@repo/analytics/keys");
const keys_2 = require("@repo/auth/keys");
const keys_3 = require("@repo/database/keys");
const keys_4 = require("@repo/email/keys");
const keys_5 = require("@repo/next-config/keys");
const keys_6 = require("@repo/observability/keys");
const keys_7 = require("@repo/payments/keys");
const env_nextjs_1 = require("@t3-oss/env-nextjs");
const zod_1 = require("zod");
exports.env = (0, env_nextjs_1.createEnv)({
  extends: [
    (0, keys_2.keys)(),
    (0, keys_1.keys)(),
    (0, keys_5.keys)(),
    (0, keys_3.keys)(),
    (0, keys_4.keys)(),
    (0, keys_6.keys)(),
    (0, keys_7.keys)(),
  ],
  server: {
    ABLY_API_KEY: zod_1.z.string().min(1),
    ABLY_AUTH_CORS_ORIGINS: zod_1.z.string().optional(),
    OUTBOX_PUBLISH_TOKEN: zod_1.z.string().min(1),
  },
  client: {},
  runtimeEnv: {
    ABLY_API_KEY: process.env.ABLY_API_KEY,
    ABLY_AUTH_CORS_ORIGINS: process.env.ABLY_AUTH_CORS_ORIGINS,
    OUTBOX_PUBLISH_TOKEN: process.env.OUTBOX_PUBLISH_TOKEN,
  },
});
