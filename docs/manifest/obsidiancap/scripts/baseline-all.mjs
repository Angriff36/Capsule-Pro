#!/usr/bin/env node
import fs from "node:fs";
import { execSync } from "node:child_process";

const migrationsDir = "prisma/migrations";
const dirs = fs
  .readdirSync(migrationsDir)
  .filter((d) => {
    if (d.includes("lock")) return false;
    return fs.statSync(`${migrationsDir}/${d}`).isDirectory();
  })
  .sort();

console.log(`Resolving ${dirs.length} migrations as applied...`);

let ok = 0;
let fail = 0;
for (const name of dirs) {
  try {
    execSync(`pnpm exec prisma migrate resolve --applied ${name}`, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    console.log(`  OK: ${name}`);
    ok++;
  } catch (e) {
    const msg = (e.stderr || e.message || "").trim().split("\n").pop();
    console.log(`  FAIL: ${name} — ${msg}`);
    fail++;
  }
}

console.log(`\nDone: ${ok} resolved, ${fail} failed.`);
if (fail > 0) process.exit(1);
