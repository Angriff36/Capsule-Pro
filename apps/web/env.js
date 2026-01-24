Object.defineProperty(exports, "__esModule", { value: true });
exports.env = void 0;
const keys_1 = require("@repo/cms/keys");
const keys_2 = require("@repo/email/keys");
const keys_3 = require("@repo/feature-flags/keys");
const keys_4 = require("@repo/next-config/keys");
const keys_5 = require("@repo/observability/keys");
const keys_6 = require("@repo/rate-limit/keys");
const keys_7 = require("@repo/security/keys");
const env_nextjs_1 = require("@t3-oss/env-nextjs");
exports.env = (0, env_nextjs_1.createEnv)({
  extends: [
    (0, keys_1.keys)(),
    (0, keys_4.keys)(),
    (0, keys_2.keys)(),
    (0, keys_5.keys)(),
    (0, keys_3.keys)(),
    (0, keys_7.keys)(),
    (0, keys_6.keys)(),
  ],
  server: {},
  client: {},
  runtimeEnv: {},
});
