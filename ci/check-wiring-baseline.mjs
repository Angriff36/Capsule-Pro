#!/usr/bin/env node
// Wiring-contract gate with a committed baseline. Runs the wiring-inspect
// wrapper (which caught 218 real runtime 400s in 2026-07) and counts ✗
// findings. The upstream CLI currently exits 0 even when it prints
// "inspect failed gate" (not exit-code-correct as of @angriff36/manifest
// 3.4.24), so the count comparison here IS the gate.
// Baseline = known product-fork residue (autofill tool + dispatch vehicleId).
// Only allowed direction: DOWN. Lower ci/wiring-baseline.json to lock in wins.
// Requires wiring artifacts: run `pnpm manifest:build` first.
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";

const baseline = JSON.parse(
  readFileSync(new URL("./wiring-baseline.json", import.meta.url), "utf8")
);

const result = spawnSync(
  process.execPath,
  ["manifest/scripts/wiring-inspect.mjs"],
  { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 }
);

const out = `${result.stdout ?? ""}\n${result.stderr ?? ""}`;
if (result.status !== 0 && !out.includes("inspect")) {
  console.error("check-wiring-baseline: wiring-inspect failed to run:");
  console.error(out.split("\n").slice(-20).join("\n"));
  process.exit(1);
}

const findings = (out.match(/✗ \[/g) ?? []).length;
console.log(
  `wiring-inspect: ${findings} findings (baseline ${baseline.findings})`
);

if (findings > baseline.findings) {
  console.error(
    "::error::New wiring contract findings above the committed baseline. Run `node manifest/scripts/wiring-inspect.mjs` locally and fix the new mismatches — do not raise ci/wiring-baseline.json."
  );
  const fresh = out
    .split("\n")
    .filter((l) => l.includes("✗ ["))
    .slice(0, 40);
  console.error(fresh.join("\n"));
  process.exit(1);
}

if (findings < baseline.findings) {
  console.log(
    `::notice::Wiring findings dropped — lower ci/wiring-baseline.json to {"findings": ${findings}}.`
  );
}
