#!/usr/bin/env node

/**
 * Capsule-Pro wiring-inspect wrapper.
 *
 * Uses the contract from normal `pnpm manifest:build` — no manual contract
 * generation. Roots: apps/app + apps/api (full product surface).
 */

import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { getConfigPaths, readConfig } from "./read-config.mjs";

const { repoRoot } = getConfigPaths();
const wiringCfg = readConfig().projections?.wiring ?? {};
const outputRel = wiringCfg.output || "manifest/generated/wiring";
const contractHint =
  wiringCfg.options?.contractPathHint ||
  "src/generated/manifest-wiring-contract.json";
const contractPath = resolve(repoRoot, outputRel, contractHint);

if (!existsSync(contractPath)) {
  console.error(
    `[manifest/wiring] Contract missing: ${contractPath}\n` +
      "Run `pnpm manifest:build` (or `pnpm manifest:build`) first — " +
      "wiring artifacts are produced by the normal generation path."
  );
  process.exit(1);
}

const passthrough = process.argv.slice(2);
const args = [
  "exec",
  "manifest",
  "wiring-inspect",
  "--contract",
  contractPath,
  "--root",
  "apps/app",
  "--root",
  "apps/api",
  ...passthrough,
];

const bin = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
const result = spawnSync(bin, args, {
  stdio: "inherit",
  shell: process.platform === "win32",
  cwd: repoRoot,
});

process.exit(result.status ?? 1);
