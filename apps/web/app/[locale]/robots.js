Object.defineProperty(exports, "__esModule", { value: true });
exports.default = robots;
const env_1 = require("@/env");
const protocol = env_1.env.VERCEL_PROJECT_PRODUCTION_URL?.startsWith("https")
  ? "https"
  : "http";
const url = new URL(`${protocol}://${env_1.env.VERCEL_PROJECT_PRODUCTION_URL}`);
function robots() {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
    },
    sitemap: new URL("/sitemap.xml", url.href).href,
  };
}
