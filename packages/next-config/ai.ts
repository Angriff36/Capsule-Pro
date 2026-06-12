import type { NextConfig } from "next";
import type { SizeLimit } from "next/dist/types";

/**
 * AI-tuned Next.js config helper.
 *
 * Transport-layer concerns only — body size, headers, image domains, external
 * package list. Aligned with the constitution: AI route handlers are transport
 * surfaces (receive requests, parse input, invoke Manifest runtime). They must
 * never own governed domain behavior, perform direct governed writes, or
 * synthesize semantic events. See constitution.md §4, §9, §11.
 *
 * Compose with the base config:
 *   import { config } from "@repo/next-config";
 *   import { withAI } from "@repo/next-config/ai";
 *   export default withAI({ ...config, ...appOverrides });
 *
 * Or alongside other wrappers (order matters for header merging):
 *   export default withSentry(withLogging(withAI({ ...config })));
 */

/**
 * Hostnames serving images produced or hosted by AI providers.
 * Allow next/image to load them without extra remotePatterns per app.
 */
const AI_PROVIDER_IMAGE_HOSTNAMES = [
  // OpenAI DALL-E / image edits
  "oaidalleapiprodscus.blob.core.windows.net",
  "cdn.openai.com",
  // Anthropic (file API previews)
  "files.anthropic.com",
  // Replicate
  "replicate.delivery",
  "pbxt.replicate.delivery",
  // fal.ai
  "fal.media",
  "v3.fal.media",
  // Google Gemini
  "generativelanguage.googleapis.com",
] as const;

/**
 * AI SDK packages that misbehave when bundled by Next. Marking them external
 * keeps them resolved at runtime via Node's module resolution, which avoids
 * tokenizer/wasm bundling issues and reduces bundle size.
 */
const AI_SDK_EXTERNAL_PACKAGES = [
  "ai",
  "@ai-sdk/openai",
  "@ai-sdk/anthropic",
  "@ai-sdk/google",
  "@ai-sdk/google-vertex",
  "@ai-sdk/mistral",
  "@ai-sdk/cohere",
  "@ai-sdk/groq",
  "@ai-sdk/azure",
  "@openai/agents",
  "tiktoken",
  "@dqbd/tiktoken",
] as const;

/**
 * Route patterns that serve streaming AI responses (SSE / chunked).
 * Apply no-cache + buffering-off headers so proxies and CDNs don't break
 * the stream. Apps can extend this list via `withAI(config, { streamingRoutes })`.
 */
const DEFAULT_STREAMING_ROUTE_PATTERN = "/api/(chat|agents|ai|stream)/:path*";

export interface WithAIOptions {
  /**
   * Additional hostnames for AI-produced or AI-hosted images. Merged with
   * the built-in provider list.
   */
  additionalImageHostnames?: string[];
  /**
   * Override the Server Actions body size limit. Defaults to "10mb" to fit
   * vision-model image inputs. Pass `null` to skip changing it.
   */
  bodySizeLimit?: SizeLimit | null;
  /**
   * Additional source patterns (Next.js path syntax) that should receive
   * streaming-friendly headers. Merged with the default
   * `/api/(chat|agents|ai|stream)/:path*` pattern.
   */
  streamingRoutes?: string[];
}

const STREAMING_HEADERS = [
  // Disable any cache layer between Next and the client.
  { key: "Cache-Control", value: "no-store, no-transform" },
  // Tell nginx-style proxies not to buffer the SSE stream.
  { key: "X-Accel-Buffering", value: "no" },
  // Prevent compression middleware from chunking the stream incorrectly.
  { key: "Content-Encoding", value: "identity" },
];

export const withAI = (
  sourceConfig: NextConfig,
  options: WithAIOptions = {}
): NextConfig => {
  const {
    streamingRoutes = [],
    bodySizeLimit = "10mb",
    additionalImageHostnames = [],
  } = options;

  const existingImages = sourceConfig.images ?? {};
  const existingRemotePatterns = existingImages.remotePatterns ?? [];
  const existingExternal = sourceConfig.serverExternalPackages ?? [];
  const existingExperimental = sourceConfig.experimental ?? {};
  const existingServerActions =
    (existingExperimental as { serverActions?: Record<string, unknown> })
      .serverActions ?? {};

  const allImageHostnames = [
    ...AI_PROVIDER_IMAGE_HOSTNAMES,
    ...additionalImageHostnames,
  ];
  const newRemotePatterns = allImageHostnames.map((hostname) => ({
    protocol: "https" as const,
    hostname,
  }));

  const streamingPatterns = [
    DEFAULT_STREAMING_ROUTE_PATTERN,
    ...streamingRoutes,
  ];

  const originalHeaders = sourceConfig.headers;

  return {
    ...sourceConfig,
    serverExternalPackages: Array.from(
      new Set([...existingExternal, ...AI_SDK_EXTERNAL_PACKAGES])
    ),
    images: {
      ...existingImages,
      remotePatterns: [...existingRemotePatterns, ...newRemotePatterns],
    },
    experimental: {
      ...existingExperimental,
      serverActions: {
        ...existingServerActions,
        ...(bodySizeLimit ? { bodySizeLimit } : {}),
      },
    },
    headers: async () => {
      const inheritedHeaders =
        typeof originalHeaders === "function" ? await originalHeaders() : [];
      const streamingHeaderEntries = streamingPatterns.map((source) => ({
        source,
        headers: STREAMING_HEADERS,
      }));
      return [...inheritedHeaders, ...streamingHeaderEntries];
    },
  };
};
