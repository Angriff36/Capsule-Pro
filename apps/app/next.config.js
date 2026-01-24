Object.defineProperty(exports, "__esModule", { value: true });
const toolbar_1 = require("@repo/feature-flags/lib/toolbar");
const next_config_1 = require("@repo/next-config");
const next_config_2 = require("@repo/observability/next-config");
const env_1 = require("@/env");
let nextConfig = (0, toolbar_1.withToolbar)(
  (0, next_config_2.withLogging)(next_config_1.config)
);
if (env_1.env.VERCEL) {
  nextConfig = (0, next_config_2.withSentry)(nextConfig);
}
if (env_1.env.ANALYZE === "true") {
  nextConfig = (0, next_config_1.withAnalyzer)(nextConfig);
}
exports.default = nextConfig;
