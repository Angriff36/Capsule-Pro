#!/usr/bin/env node

/**
 * Capsule-Pro one-command wiring remediation wrapper.
 *
 * Uses the contract produced by normal `pnpm manifest:generate` (no ad-hoc
 * contract path). Default mode is one-defect: inspect → select highest-
 * confidence auto-fixable finding → apply exactly one repair → verify.
 *
 * Usage:
 *   pnpm manifest:wiring:remediate              # one-defect (default)
 *   pnpm manifest:wiring:remediate -- --mode plan
 *   pnpm manifest:wiring:remediate -- --mode dry-run
 *   pnpm manifest:wiring:inspect                # inspect only (sibling script)
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
      "Run `pnpm manifest:generate` (or `pnpm manifest:build`) first — " +
      "wiring artifacts are produced by the normal generation path."
  );
  process.exit(1);
}

const passthrough = process.argv.slice(2);
const hasMode = passthrough.some((a) => a === "--mode" || a.startsWith("--mode="));
const modeArgs = hasMode ? [] : ["--mode", "one-defect"];

const args = [
  "exec",
  "manifest",
  "wiring-remediate",
  "--contract",
  contractPath,
  "--root",
  "apps/app",
  "--root",
  "apps/api",
  ...modeArgs,
  ...passthrough,
];

const bin = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
const result = spawnSync(bin, args, {
  stdio: "inherit",
  shell: process.platform === "win32",
  cwd: repoRoot,
});

process.exit(result.status ?? 1);
