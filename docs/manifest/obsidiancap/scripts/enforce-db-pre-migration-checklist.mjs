#!/usr/bin/env node
import { execSync } from "node:child_process";

function sh(cmd) {
  return execSync(cmd, { stdio: ["ignore", "pipe", "pipe"], encoding: "utf8" }).trim();
}

// Adjust if your schema path differs
const SCHEMA_PATH = "packages/database/prisma/schema.prisma";
const MIGRATIONS_DIR = "packages/database/prisma/migrations";
const CHECKLIST_PATH = "packages/database/DATABASE_PRE_MIGRATION_CHECKLIST.md";
const REGISTRY_PATH = "packages/database/schema-registry-v2.txt";

const mode = process.argv[2] ?? "staged"; // "staged" (pre-commit) or "ci"

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
const checklistChanged = changedFiles.includes(CHECKLIST_PATH);
const registryChanged = changedFiles.includes(REGISTRY_PATH);

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

// If migrations touched but checklist not updated, fail hard.
if (migrationsTouched && !checklistChanged) {
  console.error("");
  console.error("❌ DB checklist guard tripped:");
  console.error(`- You modified files under ${MIGRATIONS_DIR}/`);
  console.error(`- But did NOT update ${CHECKLIST_PATH}`);
  console.error("");
  console.error("Fix: append a checked entry to the checklist for the migration.");
  console.error("");
  process.exit(1);
}

// If schema changed but registry not updated, fail hard.
if (schemaChanged && !registryChanged) {
  console.error("");
  console.error("❌ Schema registry guard tripped:");
  console.error(`- You changed ${SCHEMA_PATH}`);
  console.error(`- But did NOT update ${REGISTRY_PATH}`);
  console.error("");
  console.error("Fix: update the Schema Registry entry for the affected tables.");
  console.error("");
  process.exit(1);
}

process.exit(0);

