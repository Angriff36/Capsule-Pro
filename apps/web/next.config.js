Object.defineProperty(exports, "__esModule", { value: true });
const next_config_1 = require("@repo/cms/next-config");
const toolbar_1 = require("@repo/feature-flags/lib/toolbar");
const next_config_2 = require("@repo/next-config");
const next_config_3 = require("@repo/observability/next-config");
const env_1 = require("@/env");
let nextConfig = (0, toolbar_1.withToolbar)(
  (0, next_config_3.withLogging)(next_config_2.config)
);
nextConfig.images?.remotePatterns?.push({
  protocol: "https",
  hostname: "assets.basehub.com",
});
if (process.env.NODE_ENV === "production") {
  const redirects = async () => [
    {
      source: "/legal",
      destination: "/legal/privacy",
      statusCode: 301,
    },
  ];
  nextConfig.redirects = redirects;
}
if (env_1.env.VERCEL) {
  nextConfig = (0, next_config_3.withSentry)(nextConfig);
}
if (env_1.env.ANALYZE === "true") {
  nextConfig = (0, next_config_2.withAnalyzer)(nextConfig);
}
exports.default = (0, next_config_1.withCMS)(nextConfig);
