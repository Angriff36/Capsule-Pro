Object.defineProperty(exports, "__esModule", { value: true });
exports.keys = void 0;
const env_nextjs_1 = require("@t3-oss/env-nextjs");
const zod_1 = require("zod");
const keys = () =>
  (0, env_nextjs_1.createEnv)({
    server: {
      SVIX_TOKEN: zod_1.z
        .union([
          zod_1.z.string().startsWith("sk_"),
          zod_1.z.string().startsWith("testsk_"),
        ])
        .optional(),
    },
    runtimeEnv: {
      SVIX_TOKEN: process.env.SVIX_TOKEN,
    },
  });
exports.keys = keys;
