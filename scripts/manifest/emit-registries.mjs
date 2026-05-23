#!/usr/bin/env node
/**
 * Emit canonical governance registries.
 *
 * Wraps `manifest emit registries` and writes to the single canonical
 * location: manifest/governance/{commands,entities}.json.
 *
 * See manifest/governance/README.md and docs/audits/manifest-artifact-layout-adr.md.
 */

import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

const REPO_ROOT = resolve(process.cwd());
const IR_PATH = "packages/manifest-ir/ir/kitchen/kitchen.ir.json";
const OUT_DIR = "manifest/governance";

const result = spawnSync(
  "pnpm",
  [
    "exec",
    "manifest",
    "emit",
    "registries",
    "--ir",
    IR_PATH,
    "--out",
    OUT_DIR,
  ],
  { cwd: REPO_ROOT, stdio: "inherit", shell: true },
);

process.exit(result.status ?? 1);
