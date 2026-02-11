#!/usr/bin/env node

import { spawnSync } from "node:child_process";

const userArgs = process.argv.slice(2);
const defaultArgs = [
  "exec",
  "manifest",
  "generate",
  "packages/manifest-ir/ir/kitchen/kitchen.ir.json",
  "--projection",
  "nextjs",
  "--surface",
  "route",
  "--output",
  "apps/api/app/api/kitchen",
];

const args =
  userArgs.length > 0
    ? ["exec", "manifest", "generate", ...userArgs]
    : defaultArgs;
const bin = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
const result = spawnSync(bin, args, {
  stdio: "inherit",
  shell: process.platform === "win32",
});

if (result.status !== 0) {
  console.error(
    "[manifest/generate] Generation failed. Ensure @manifest/runtime has built dist projection artifacts."
  );
}

process.exit(result.status ?? 1);
