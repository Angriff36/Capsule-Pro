#!/usr/bin/env node
/**
 * adopt-timestamps.mjs
 * Migrates .manifest source files from hand-declared createdAt/updatedAt
 * to the `timestamps` entity modifier.
 *
 * Usage: node manifest/scripts/adopt-timestamps.mjs [--dry-run]
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const sourceDir = path.resolve(__dirname, "..", "source");
const dryRun = process.argv.includes("--dry-run");

const CREATED_AT_PROP =
  /^\s*property\s+(required\s+)?createdAt:\s*datetime\s*=\s*now\(\)\s*$/;
const UPDATED_AT_PROP =
  /^\s*property\s+(required\s+)?updatedAt:\s*datetime\s*=\s*now\(\)\s*$/;
const MUTATE_CREATED_AT = /^\s*mutate\s+createdAt\s*=\s*now\(\)\s*$/;
const MUTATE_UPDATED_AT = /^\s*mutate\s+updatedAt\s*=\s*now\(\)\s*$/;

const files = fs.readdirSync(sourceDir).filter((f) => f.endsWith(".manifest"));
files.sort();

const stats = {
  filesProcessed: 0,
  entitiesModified: 0,
  propsRemoved: 0,
  mutationsRemoved: 0,
  timestampsAdded: 0,
};

for (const file of files) {
  const filePath = path.join(sourceDir, file);
  const content = fs.readFileSync(filePath, "utf8");
  const lines = content.split("\n");
  const newLines = [];
  let fileChanged = false;
  let timestampsAddedInCurrentEntity = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (/^entity\s+\w+/.test(trimmed)) {
      timestampsAddedInCurrentEntity = false;
    }

    if (CREATED_AT_PROP.test(line)) {
      stats.propsRemoved++;
      fileChanged = true;
      if (!timestampsAddedInCurrentEntity) {
        const indent = line.match(/^(\s*)/)[1];
        newLines.push(indent + "timestamps");
        timestampsAddedInCurrentEntity = true;
        stats.timestampsAdded++;
        stats.entitiesModified++;
      }
      continue;
    }

    if (UPDATED_AT_PROP.test(line)) {
      stats.propsRemoved++;
      fileChanged = true;
      if (!timestampsAddedInCurrentEntity) {
        const indent = line.match(/^(\s*)/)[1];
        newLines.push(indent + "timestamps");
        timestampsAddedInCurrentEntity = true;
        stats.timestampsAdded++;
        stats.entitiesModified++;
      }
      continue;
    }

    if (MUTATE_CREATED_AT.test(line)) {
      stats.mutationsRemoved++;
      fileChanged = true;
      continue;
    }

    if (MUTATE_UPDATED_AT.test(line)) {
      stats.mutationsRemoved++;
      fileChanged = true;
      continue;
    }

    newLines.push(line);
  }

  if (fileChanged) {
    stats.filesProcessed++;
    const newContent = newLines.join("\n");
    if (dryRun) {
      console.log(`[DRY RUN] ${file}: would modify`);
    } else {
      fs.writeFileSync(filePath, newContent, "utf8");
      console.log(`✓ ${file}`);
    }
  } else {
    console.log(`  ${file}: no changes needed`);
  }
}

console.log("\n--- Migration Summary ---");
console.log(`Files processed: ${stats.filesProcessed}`);
console.log(`Entities modified: ${stats.entitiesModified}`);
console.log(`Property declarations removed: ${stats.propsRemoved}`);
console.log(`Mutate lines removed: ${stats.mutationsRemoved}`);
console.log(`timestamps keywords added: ${stats.timestampsAdded}`);
console.log(
  `Total lines removed: ${stats.propsRemoved + stats.mutationsRemoved}`
);
if (dryRun) {
  console.log("\n[DRY RUN - no files were modified]");
}
