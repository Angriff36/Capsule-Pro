#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

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
  const manifestFiles = listFiles(
    "packages/manifest-adapters/manifests"
  ).filter((f) => f.endsWith(".manifest"));
  if (manifestFiles.length === 0) {
    console.error(
      "[manifest/check] No .manifest files found under packages/manifest-adapters/manifests."
    );
    ok = false;
  } else {
    console.log(
      `[manifest/check] Found ${manifestFiles.length} manifest file(s)`
    );
  }
}

const irPath = "packages/manifest-ir/ir/kitchen/kitchen.ir.json";
if (!existsSync(irPath)) {
  console.error(`[manifest/check] Missing compiled IR artifact: ${irPath}`);
  ok = false;
} else if (statSync(irPath).isDirectory()) {
  console.error(
    `[manifest/check] Expected ${irPath} to be a file, but found a directory.`
  );
  ok = false;
} else {
  try {
    const raw = readFileSync(irPath, "utf-8");
    const ir = JSON.parse(raw);

    // Check for duplicate names
    const duplicates = checkForDuplicates(ir);
    if (duplicates.length > 0) {
      console.error("[manifest/check] Duplicate names found in IR:");
      for (const dup of duplicates) {
        console.error(`  ${dup}`);
      }
      ok = false;
    } else {
      console.log(
        `[manifest/check] IR contains ${ir.entities.length} entities: ${ir.entities.map((e) => e.name).join(", ")}`
      );
    }
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
    console.error(
      "[manifest/check] Manifest CLI is unavailable in this environment."
    );
    ok = false;
  }
}

if (ok) {
  console.log("[manifest/check] All checks passed!");
}

process.exit(ok ? 0 : 1);

function checkForDuplicates(ir) {
  const duplicates = [];

  // Identity rules:
  // - Entities: globally unique by name
  // - Commands: unique by (entity, name) tuple
  // - Events: unique by channel (not name)
  // - Policies: globally unique by name

  // Check entities (globally unique by name)
  const entityNames = new Map();
  for (const entity of ir.entities || []) {
    if (!entityNames.has(entity.name)) {
      entityNames.set(entity.name, 0);
    }
    entityNames.set(entity.name, entityNames.get(entity.name) + 1);
  }

  for (const [name, count] of entityNames) {
    if (count > 1) {
      duplicates.push(`Duplicate entity: "${name}" (${count} occurrences)`);
    }
  }

  // Check commands (unique by (entity, name) tuple)
  const commandKeys = new Map();
  for (const command of ir.commands || []) {
    const key = `${command.entity}.${command.name}`;
    if (!commandKeys.has(key)) {
      commandKeys.set(key, 0);
    }
    commandKeys.set(key, commandKeys.get(key) + 1);
  }

  for (const [key, count] of commandKeys) {
    if (count > 1) {
      duplicates.push(`Duplicate command: "${key}" (${count} occurrences)`);
    }
  }

  // Check events (unique by channel, not name)
  const eventChannels = new Map();
  for (const event of ir.events || []) {
    if (!eventChannels.has(event.channel)) {
      eventChannels.set(event.channel, 0);
    }
    eventChannels.set(event.channel, eventChannels.get(event.channel) + 1);
  }

  for (const [channel, count] of eventChannels) {
    if (count > 1) {
      duplicates.push(
        `Duplicate event channel: "${channel}" (${count} occurrences)`
      );
    }
  }

  // Check policies (globally unique by name)
  const policyNames = new Map();
  for (const policy of ir.policies || []) {
    if (!policyNames.has(policy.name)) {
      policyNames.set(policy.name, 0);
    }
    policyNames.set(policy.name, policyNames.get(policy.name) + 1);
  }

  for (const [name, count] of policyNames) {
    if (count > 1) {
      duplicates.push(`Duplicate policy: "${name}" (${count} occurrences)`);
    }
  }

  return duplicates;
}

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
