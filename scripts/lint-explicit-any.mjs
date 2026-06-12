#!/usr/bin/env node
import { spawnSync } from "node:child_process";
/**
 * Enforces Biome noExplicitAny on apps/app, apps/api, apps/web.
 *
 * - Production app code: noExplicitAny is "error" (biome.jsonc).
 * - packages and test files: warn in biome.jsonc (legacy debt; fix over time).
 *
 * CI uses a ratchet baseline so merges are not blocked by existing violations,
 * but new explicit `any` in the three apps cannot increase the error count.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  ".."
);
const baselinePath = path.join(
  repoRoot,
  "scripts",
  "lint-explicit-any-baseline.txt"
);
const targets = ["apps/app", "apps/api", "apps/web"];

const baseline = Number.parseInt(readFileSync(baselinePath, "utf8").trim(), 10);

const result = spawnSync(
  "pnpm",
  ["exec", "biome", "lint", "--only=suspicious/noExplicitAny", ...targets],
  { encoding: "utf8", shell: true, cwd: repoRoot }
);

if (result.stdout) {
  process.stdout.write(result.stdout);
}
if (result.stderr) {
  process.stderr.write(result.stderr);
}

const match = `${result.stdout ?? ""}\n${result.stderr ?? ""}`.match(
  /Found (\d+) errors/
);
const errors = match ? Number.parseInt(match[1], 10) : null;

if (errors === null) {
  console.error("lint-explicit-any: could not parse Biome error count");
  process.exit(result.status === 0 ? 0 : (result.status ?? 1));
}

console.log(
  `lint-explicit-any: ${errors} error(s) in ${targets.join(", ")} (baseline ${baseline})`
);

if (errors > baseline) {
  console.error(
    `lint-explicit-any: FAILED — explicit any count regressed (${errors} > ${baseline}). ` +
      "Remove `any` or add a justified biome-ignore with a comment."
  );
  process.exit(1);
}

if (errors < baseline) {
  console.log(
    `lint-explicit-any: count improved (${errors} < ${baseline}). ` +
      `Update ${path.relative(repoRoot, baselinePath)} to lock in the win.`
  );
}

process.exit(0);
