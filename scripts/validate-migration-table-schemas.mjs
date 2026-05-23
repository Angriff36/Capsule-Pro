#!/usr/bin/env node

/**
 * Validate Migration Table Schemas
 *
 * Checks the Prisma migration directory for structural integrity:
 *  - Every migration directory contains a non-empty migration.sql
 *  - Migration directory names follow the timestamp naming convention
 *  - No duplicate migration timestamps
 *  - migration_lock.toml exists
 *
 * Usage:
 *   node scripts/validate-migration-table-schemas.mjs
 *
 * Exit codes:
 *   0 - All validations passed
 *   1 - One or more validations failed
 */

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, "..");
const MIGRATIONS_DIR = join(
  REPO_ROOT,
  "packages",
  "database",
  "prisma",
  "migrations"
);

const MIGRATION_SQL = "migration.sql";
const LOCK_FILE = "migration_lock.toml";

const TIMESTAMP_RE = /^\d{14}_/;
const INIT_DIR = "0_init";

let errors = 0;
let warnings = 0;

function err(msg) {
  console.error(`  ✗ ${msg}`);
  errors++;
}

function warn(msg) {
  console.warn(`  ⚠ ${msg}`);
  warnings++;
}

function ok(msg) {
  console.log(`  ✓ ${msg}`);
}

function main() {
  console.log("\nMigration Table Schema Validation");
  console.log("==================================\n");

  // 1. Check migrations directory exists
  if (!existsSync(MIGRATIONS_DIR)) {
    err(`Migrations directory not found: ${MIGRATIONS_DIR}`);
    process.exit(1);
  }
  ok(`Migrations directory exists`);

  const entries = readdirSync(MIGRATIONS_DIR, { withFileTypes: true });
  const dirs = entries
    .filter((e) => e.isDirectory() && e.name !== "migration_lock.toml")
    .map((e) => e.name);

  // 2. Check migration_lock.toml
  const lockPath = join(MIGRATIONS_DIR, LOCK_FILE);
  if (!existsSync(lockPath)) {
    err(`${LOCK_FILE} is missing`);
  } else {
    const lockContent = readFileSync(lockPath, "utf8");
    if (!lockContent.includes("postgresql")) {
      err(`${LOCK_FILE} does not specify postgresql provider`);
    } else {
      ok(`${LOCK_FILE} exists and specifies postgresql`);
    }
  }

  // 3. Validate each migration directory
  console.log(`\nValidating ${dirs.length} migration directories...\n`);

  const timestamps = new Map(); // timestamp prefix → directory name

  for (const dirName of dirs) {
    const dirPath = join(MIGRATIONS_DIR, dirName);
    const sqlPath = join(dirPath, MIGRATION_SQL);

    // Check naming convention
    if (dirName !== INIT_DIR && !TIMESTAMP_RE.test(dirName)) {
      warn(
        `Unexpected migration directory name: ${dirName} (expected ${INIT_DIR} or <14-digit-timestamp>_description)`
      );
    }

    // Check for duplicate timestamps
    if (dirName !== INIT_DIR && TIMESTAMP_RE.test(dirName)) {
      const ts = dirName.slice(0, 14);
      if (timestamps.has(ts)) {
        err(
          `Duplicate timestamp ${ts}: "${timestamps.get(ts)}" and "${dirName}"`
        );
      } else {
        timestamps.set(ts, dirName);
      }
    }

    // Check migration.sql exists
    if (!existsSync(sqlPath)) {
      err(`${dirName}: missing ${MIGRATION_SQL}`);
      continue;
    }

    // Check migration.sql is non-empty
    const sqlContent = readFileSync(sqlPath, "utf8").trim();
    if (sqlContent.length === 0) {
      warn(`${dirName}: ${MIGRATION_SQL} is empty`);
    }
  }

  // Summary
  console.log("\nSummary");
  console.log("-------");
  ok(`${dirs.length} migration directories checked`);

  if (errors > 0) {
    console.error(`\n  ${errors} error(s) found`);
  }
  if (warnings > 0) {
    console.warn(`  ${warnings} warning(s) found`);
  }

  if (errors > 0) {
    console.error("\nValidation FAILED");
    process.exit(1);
  }

  console.log("\nValidation PASSED");
  process.exit(0);
}

main();
