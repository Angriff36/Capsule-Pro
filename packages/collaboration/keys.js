Object.defineProperty(exports, "__esModule", { value: true });
exports.keys = void 0;
const env_nextjs_1 = require("@t3-oss/env-nextjs");
const zod_1 = require("zod");
const keys = () =>
  (0, env_nextjs_1.createEnv)({
    server: {
      LIVEBLOCKS_SECRET: zod_1.z.string().startsWith("sk_").optional(),
    },
    runtimeEnv: {
      LIVEBLOCKS_SECRET: process.env.LIVEBLOCKS_SECRET,
    },
  });
exports.keys = keys;
