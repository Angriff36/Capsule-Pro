#!/usr/bin/env node

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const args = new Set(process.argv.slice(2));
const withCli = args.has("--with-cli");

const requiredPaths = [
  "packages/manifest-adapters/manifests",
  "packages/manifest-ir/ir/kitchen/kitchen.ir.json",
  "packages/manifest-ir/ir/kitchen/kitchen.provenance.json",
  "packages/manifest-ir/src/index.ts",
  "apps/api/lib/manifest-runtime.ts",
  "apps/api/lib/manifest-response.ts",
  "manifest.config.yaml",
  "scripts/manifest/compile.mjs",
  "scripts/manifest/generate.mjs",
  "scripts/manifest/build.mjs",
  "scripts/manifest/check.mjs",
];

let ok = true;

for (const p of requiredPaths) {
  if (!existsSync(p)) {
    console.error(`[manifest/check] Missing required path: ${p}`);
    ok = false;
  }
}

if (existsSync("packages/manifest-adapters/manifests")) {
  const manifestFiles = listFiles("packages/manifest-adapters/manifests").filter((f) =>
    f.endsWith(".manifest")
  );
  if (manifestFiles.length === 0) {
    console.error("[manifest/check] No .manifest files found under packages/manifest-adapters/manifests.");
    ok = false;
  } else {
    console.log(`[manifest/check] Found ${manifestFiles.length} manifest file(s)`);
  }
}

const irPath = "packages/manifest-ir/ir/kitchen/kitchen.ir.json";
if (!existsSync(irPath)) {
  console.error(`[manifest/check] Missing compiled IR artifact: ${irPath}`);
  ok = false;
} else if (statSync(irPath).isDirectory()) {
  console.error(`[manifest/check] Expected ${irPath} to be a file, but found a directory.`);
  ok = false;
} else {
  try {
    const raw = readFileSync(irPath, "utf-8");
    const ir = JSON.parse(raw);
    console.log(`[manifest/check] IR contains ${ir.entities.length} entities: ${ir.entities.map((e) => e.name).join(", ")}`);
  } catch {
    console.error(`[manifest/check] ${irPath} is not valid JSON.`);
    ok = false;
  }
}

if (withCli) {
  const bin = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
  const result = spawnSync(bin, ["exec", "manifest", "--help"], {
    stdio: "inherit",
    shell: process.platform === "win32",
  });
  if (result.status !== 0) {
    console.error("[manifest/check] Manifest CLI is unavailable in this environment.");
    ok = false;
  }
}

if (ok) {
  console.log("[manifest/check] All checks passed!");
}

process.exit(ok ? 0 : 1);

function listFiles(root) {
  const out = [];
  const entries = readdirSync(root, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = join(root, entry.name);
    if (entry.isDirectory()) {
      out.push(...listFiles(fullPath));
      continue;
    }
    if (entry.isFile || statSync(fullPath).isFile()) {
      out.push(fullPath);
    }
  }
  return out;
}
