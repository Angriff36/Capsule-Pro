var __importDefault =
  (this && this.__importDefault) ||
  ((mod) => (mod && mod.__esModule ? mod : { default: mod }));
Object.defineProperty(exports, "__esModule", { value: true });
exports.withAnalyzer = exports.config = void 0;
const bundle_analyzer_1 = __importDefault(require("@next/bundle-analyzer"));
const path_1 = __importDefault(require("path"));
exports.config = {
  turbopack: {
    root: path_1.default.resolve(process.cwd(), "..", ".."),
  },
  serverExternalPackages: ["ably"],
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "img.clerk.com",
      },
    ],
  },
  // biome-ignore lint/suspicious/useAwait: rewrites is async
  async rewrites() {
    return [
      {
        source: "/ingest/static/:path*",
        destination: "https://us-assets.i.posthog.com/static/:path*",
      },
      {
        source: "/ingest/:path*",
        destination: "https://us.i.posthog.com/:path*",
      },
      {
        source: "/ingest/decide",
        destination: "https://us.i.posthog.com/decide",
      },
    ];
  },
  // This is required to support PostHog trailing slash API requests
  skipTrailingSlashRedirect: true,
};
const withAnalyzer = (sourceConfig) =>
  (0, bundle_analyzer_1.default)()(sourceConfig);
exports.withAnalyzer = withAnalyzer;
