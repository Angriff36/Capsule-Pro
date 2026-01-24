Object.defineProperty(exports, "__esModule", { value: true });
exports.keys = void 0;
const env_nextjs_1 = require("@t3-oss/env-nextjs");
const zod_1 = require("zod");
const keys = () =>
  (0, env_nextjs_1.createEnv)({
    server: {
      FLAGS_SECRET: zod_1.z.string().optional(),
    },
    runtimeEnv: {
      FLAGS_SECRET: process.env.FLAGS_SECRET,
    },
  });
exports.keys = keys;
