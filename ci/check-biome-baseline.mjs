#!/usr/bin/env node
// Biome/ultracite ratchet: full `pnpm lint` runs in CI with a committed
// baseline. New violations fail; improvements should lower the baseline
// (edit ci/biome-baseline.json) to lock in wins. Same pattern as lint:any.
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";

const baseline = JSON.parse(
  readFileSync(new URL("./biome-baseline.json", import.meta.url), "utf8")
);

const bin = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
const result = spawnSync(bin, ["exec", "ultracite", "check"], {
  encoding: "utf8",
  shell: process.platform === "win32",
  maxBuffer: 256 * 1024 * 1024,
});

const out = `${result.stdout ?? ""}\n${result.stderr ?? ""}`;
const errors = Number(out.match(/Found (\d+) errors?\./)?.[1] ?? Number.NaN);
const warnings = Number(
  out.match(/Found (\d+) warnings?\./)?.[1] ?? Number.NaN
);

if (Number.isNaN(errors) || Number.isNaN(warnings)) {
  console.error(
    "check-biome-baseline: could not parse ultracite output. Last 20 lines:"
  );
  console.error(out.split("\n").slice(-20).join("\n"));
  process.exit(1);
}

console.log(
  `biome: ${errors} errors / ${warnings} warnings (baseline ${baseline.errors} / ${baseline.warnings})`
);

if (errors > baseline.errors || warnings > baseline.warnings) {
  console.error(
    "::error::Biome violations increased over the committed baseline. Fix the new violations (pnpm lint locally) — do not raise ci/biome-baseline.json."
  );
  process.exit(1);
}

if (errors < baseline.errors || warnings < baseline.warnings) {
  console.log(
    `::notice::Biome count dropped — lock it in by lowering ci/biome-baseline.json to {"errors": ${errors}, "warnings": ${warnings}}.`
  );
}
