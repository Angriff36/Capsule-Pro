#!/usr/bin/env node
/**
 * Preinstall guard: fail unless pnpm is used.
 * Uses npm_config_user_agent (set by npm, pnpm, yarn, bun during install).
 */
const ua = process.env.npm_config_user_agent || "";

if (!ua.startsWith("pnpm/")) {
  console.error("");
  console.error("  This monorepo requires pnpm.");
  console.error("  Use: pnpm install");
  console.error("");
  process.exit(1);
}
