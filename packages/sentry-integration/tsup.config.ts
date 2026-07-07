import { defineConfig } from "tsup";

export default defineConfig({
  entry: [
    "src/index.ts",
    "src/keys.ts",
    "src/webhook.ts",
    "src/queue.ts",
    "src/runner.ts",
    "src/slack.ts",
    "src/prisma-store.ts",
    "src/fixer.ts",
    "src/pipeline-correlation.ts",
  ],
  outDir: "dist",
  sourcemap: true,
  minify: false,
  esbuildOptions(options) {
    options.legalComments = "none";
    options.minifyWhitespace = true;
  },
  dts: true,
  format: ["esm"],
  clean: true,
  external: [
    "@repo/database",
    "@repo/observability",
    "@ai-sdk/openai",
    "@slack/web-api",
    "@t3-oss/env-nextjs",
    "ai",
    "zod",
  ],
});
