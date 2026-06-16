#!/usr/bin/env node
/**
 * Manifest build — compile IR + emit Convex projection (compile-to-Convex path).
 * Does NOT generate Next.js/Prisma routes or store metadata.
 */
import { spawnSync } from "node:child_process";

const bin = process.platform === "win32" ? "pnpm.cmd" : "pnpm";

function run(label, args) {
  console.log(`[manifest/build] ${label}`);
  const result = spawnSync(bin, args, {
    stdio: "inherit",
    shell: process.platform === "win32",
  });
  if (result.status !== 0) {
    console.error(`[manifest/build] Failed: ${label}`);
    process.exit(1);
  }
}

run("Step 1: Compile .manifest → IR", ["run", "manifest:compile"]);
run("Step 2: Generate Convex projection", ["run", "manifest:generate-convex"]);
run("Step 3: Emit governance registries", ["run", "manifest:registries"]);
run("Step 4: Generate Convex frontend client", ["run", "manifest:client"]);
console.log("[manifest/build] Complete.");
