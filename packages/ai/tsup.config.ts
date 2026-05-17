import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  outDir: "dist",
  sourcemap: true,
  minify: false,
  dts: true,
  format: ["esm"],
  clean: true,
  external: [
    // peer deps
    "react",
    "react-dom",
    // runtime SDK deps
    "ai",
    "@ai-sdk/openai",
    "@t3-oss/env-nextjs",
    "uuid",
    "zod",
    // other runtime deps (not imported in src but declared in package.json)
    "streamdown",
    "tailwind-merge",
  ],
});
