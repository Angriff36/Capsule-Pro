#!/usr/bin/env node
import { execSync } from "node:child_process";

function sh(cmd) {
  return execSync(cmd, { stdio: ["ignore", "pipe", "pipe"], encoding: "utf8" }).trim();
}

// Adjust if your schema path differs
const SCHEMA_PATH = "packages/database/prisma/schema.prisma";
const MIGRATIONS_DIR = "packages/database/prisma/migrations";

const mode = process.argv[2] ?? "staged"; // "staged" (pre-commit) or "ci"

const ALLOWED_MODIFIED_MIGRATIONS = new Set([
  "packages/database/prisma/migrations/20260201010000_add_recipe_version_instructions/migration.sql",
  "packages/database/prisma/migrations/20260202000000_add_recipe_version_instructions/migration.sql",
]);

let changedFiles = [];
let changedEntries = [];
if (mode === "ci") {
  // Compare against merge-base with origin/main if available
  // In CI you can set BASE_SHA/HEAD_SHA for precision, but this works for most PR workflows.
  const base = process.env.BASE_SHA;
  const head = process.env.HEAD_SHA;

  if (base && head) {
    changedEntries = sh(`git diff --name-status ${base} ${head}`).split("\n").filter(Boolean);
    changedFiles = sh(`git diff --name-only ${base} ${head}`).split("\n").filter(Boolean);
  } else {
    // fallback: compare to origin/main
    sh("git fetch --quiet origin main || true");
    const mergeBase = sh("git merge-base HEAD origin/main");
    changedEntries = sh(`git diff --name-status ${mergeBase} HEAD`).split("\n").filter(Boolean);
    changedFiles = sh(`git diff --name-only ${mergeBase} HEAD`).split("\n").filter(Boolean);
  }
} else {
  // pre-commit: staged files only
  changedEntries = sh("git diff --cached --name-status").split("\n").filter(Boolean);
  changedFiles = sh("git diff --cached --name-only").split("\n").filter(Boolean);
}

const schemaChanged = changedFiles.includes(SCHEMA_PATH);
const migrationsTouched = changedFiles.some(
  (f) => f.startsWith(`${MIGRATIONS_DIR}/`) && f.endsWith("/migration.sql") || f.includes(`${MIGRATIONS_DIR}/`)
);

const disallowedMigrationEdits = changedEntries
  .map((line) => line.split(/\s+/))
  .filter(([status, file]) => file && file.startsWith(`${MIGRATIONS_DIR}/`))
  .filter(([status, file]) => status !== "A" && !ALLOWED_MODIFIED_MIGRATIONS.has(file));

if (disallowedMigrationEdits.length > 0) {
  console.error("");
  console.error("❌ Prisma safety guard tripped:");
  console.error("Existing migration files were modified or deleted.");
  for (const [status, file] of disallowedMigrationEdits) {
    console.error(`- ${status} ${file}`);
  }
  console.error("");
  console.error("Fix: never edit applied migrations. Create a new migration instead.");
  console.error("If you truly need to edit history, update the allowlist in scripts/guard-prisma-migrationss.mjs with a reason.");
  console.error("");
  process.exit(1);
}

// If schema changed but migrations not touched, fail hard.
if (schemaChanged && !migrationsTouched) {
  console.error("");
  console.error("❌ Prisma safety guard tripped:");
  console.error(`- You changed ${SCHEMA_PATH}`);
  console.error(`- But did NOT add/update anything under ${MIGRATIONS_DIR}/`);
  console.error("");
  console.error("Fix: generate a migration and commit it alongside the schema change.");
  console.error("Do NOT use `prisma db push` as a shortcut (especially not --accept-data-loss).");
  console.error("");
  process.exit(1);
}

process.exit(0);
