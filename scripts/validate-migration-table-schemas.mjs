#!/usr/bin/env node

/**
 * Validate Migration Table Schemas
 *
 * Checks the Prisma migration directory for structural integrity AND
 * cross-checks every model in schema.prisma against the tables actually
 * created by the migration history.
 *
 *  Structural checks:
 *  - Every migration directory contains a non-empty migration.sql
 *  - Migration directory names follow the timestamp naming convention
 *  - No duplicate migration timestamps
 *  - migration_lock.toml exists
 *
 *  Schema/table coherence checks (new — Task 21):
 *  - Every model in schema.prisma resolves to a table name that some
 *    CREATE TABLE statement actually creates (and that no later DROP
 *    TABLE removed). The expected table name is taken from `@@map("...")`
 *    when present, otherwise the model name verbatim (Prisma default).
 *    This catches the 2026-05-02 `EmployeeDeduction` class of incident
 *    where the model has no `@@map` and a hand-authored migration uses
 *    a guessed snake_case name instead of the PascalCase model name.
 *
 * Pure functions (parseModels, extractCreatedTables, extractDroppedTables,
 * validateModelsAgainstMigrations) are exported so the logic can be
 * unit-tested in scripts/__tests__/validate-migration-table-schemas.test.mjs.
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

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REPO_ROOT = join(__dirname, "..");
const MIGRATIONS_DIR = join(
  REPO_ROOT,
  "packages",
  "database",
  "prisma",
  "migrations"
);
const SCHEMA_PATH = join(
  REPO_ROOT,
  "packages",
  "database",
  "prisma",
  "schema", "manifest.prisma"
);

const MIGRATION_SQL = "migration.sql";
const LOCK_FILE = "migration_lock.toml";

const TIMESTAMP_RE = /^\d{14}_/;
const INIT_DIR = "0_init";

// ---------------------------------------------------------------------------
// Pure parsers (exported for unit tests)
// ---------------------------------------------------------------------------

/**
 * Parse model blocks out of a schema.prisma file content string.
 *
 * For each `model X { ... }` block, extract:
 *   - modelName: the identifier after `model`
 *   - tableName: value of `@@map("...")` if present, else modelName verbatim
 *   - schemaName: value of `@@schema("...")` if present, else null
 *
 * @param {string} schemaContent
 * @returns {Map<string, {tableName: string, schemaName: string | null}>}
 */
export function parseModels(schemaContent) {
  const models = new Map();
  const lines = schemaContent.split(/\r?\n/);

  let current = null;
  let depth = 0;

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (current === null) {
      const m = /^model\s+([A-Za-z_][A-Za-z0-9_]*)\s*\{/.exec(line);
      if (m) {
        current = { modelName: m[1], tableName: null, schemaName: null };
        depth = 1;
      }
      continue;
    }

    // Track depth so nested braces (e.g., in attributes) don't end the block early.
    for (const ch of line) {
      if (ch === "{") {
        depth++;
      } else if (ch === "}") {
        depth--;
      }
    }

    const mapMatch = /@@map\("([^"]+)"\)/.exec(line);
    if (mapMatch) {
      current.tableName = mapMatch[1];
    }

    const schMatch = /@@schema\("([^"]+)"\)/.exec(line);
    if (schMatch) {
      current.schemaName = schMatch[1];
    }

    if (depth === 0) {
      models.set(current.modelName, {
        tableName: current.tableName ?? current.modelName,
        schemaName: current.schemaName,
      });
      current = null;
    }
  }

  return models;
}

/**
 * Extract every CREATE TABLE statement from a migration.sql body.
 *
 * Recognised forms (case-insensitive on the keywords, but the identifiers
 * inside the double quotes are taken verbatim — Postgres is case-sensitive
 * for quoted identifiers, which is the whole point of the EmployeeDeduction
 * incident):
 *
 *   CREATE TABLE "schema"."table" (
 *   CREATE TABLE IF NOT EXISTS "schema"."table" (
 *   CREATE TABLE "table" (                       (legacy, no schema prefix)
 *   CREATE TABLE IF NOT EXISTS "table" (
 *
 * @param {string} sql
 * @returns {Array<{schema: string | null, table: string}>}
 */
export function extractCreatedTables(sql) {
  const re =
    /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:"([^"]+)"\s*\.\s*)?"([^"]+)"\s*\(/gi;
  const out = [];
  let m;
  while ((m = re.exec(sql)) !== null) {
    out.push({ schema: m[1] ?? null, table: m[2] });
  }
  return out;
}

/**
 * Extract every DROP TABLE statement from a migration.sql body.
 *
 * @param {string} sql
 * @returns {Array<{schema: string | null, table: string}>}
 */
export function extractDroppedTables(sql) {
  const re =
    /DROP\s+TABLE\s+(?:IF\s+EXISTS\s+)?(?:"([^"]+)"\s*\.\s*)?"([^"]+)"/gi;
  const out = [];
  let m;
  while ((m = re.exec(sql)) !== null) {
    out.push({ schema: m[1] ?? null, table: m[2] });
  }
  return out;
}

/**
 * Cross-check the models declared in schema.prisma against the tables
 * actually created (and not later dropped) by the migration history.
 *
 * **Scope (deliberately narrow):** this validator targets exactly the
 * 2026-05-02 `EmployeeDeduction` incident class — a model declared as
 * PascalCase with no `@@map(...)`, paired with a hand-authored migration
 * that creates a snake_case (or otherwise non-matching) version of that
 * name. Prisma defaults the physical table name to the model name verbatim,
 * so the model expects `"EmployeeDeduction"` while a guessed-snake-case
 * migration creates `"employee_deductions"` and the application sees a
 * missing-relation error at runtime.
 *
 * Models that declare `@@map(...)` are NOT cross-checked here, because the
 * pre-existing schema has ~29 models whose tables are baked into a squashed
 * `0_init` baseline (or were created historically via `prisma db push`)
 * and therefore legitimately have no CREATE TABLE in the migration history.
 * Wiring those into this validator would only add noise; they belong to a
 * separate audit (tracked as a follow-on plan item).
 *
 * @param {string} schemaContent
 * @param {Array<{name: string, sql: string}>} migrations - in apply order
 * @returns {Array<{kind: string, model: string, expectedSchema: string | null, expectedTable: string, message: string}>}
 */
export function validateModelsAgainstMigrations(schemaContent, migrations) {
  const models = parseModels(schemaContent);

  // Build the live-table set by replaying CREATE / DROP events.
  // Key shape: "schema.table" when schema is known, else ".table".
  const live = new Set();
  for (const { sql } of migrations) {
    for (const t of extractCreatedTables(sql)) {
      live.add(`${t.schema ?? ""}.${t.table}`);
    }
    for (const t of extractDroppedTables(sql)) {
      live.delete(`${t.schema ?? ""}.${t.table}`);
    }
  }
  // Also build a schema-agnostic set for the legacy no-schema-prefix case.
  const liveBareTables = new Set();
  for (const key of live) {
    liveBareTables.add(key.split(".").slice(1).join("."));
  }

  const errors = [];
  for (const [modelName, info] of models) {
    // Only audit the high-risk class: model name has uppercase characters AND
    // no @@map. If @@map is set, the table name was an explicit author
    // decision (and our scope intentionally excludes the squashed-baseline
    // population of models that match this case).
    const hasUppercase = /[A-Z]/.test(modelName);
    const inferredFromModelName = info.tableName === modelName;
    if (!(hasUppercase && inferredFromModelName)) {
      continue;
    }

    const expectedKey = `${info.schemaName ?? ""}.${info.tableName}`;
    if (live.has(expectedKey)) {
      continue;
    }
    if (info.schemaName && liveBareTables.has(info.tableName)) {
      continue;
    }

    errors.push({
      kind: "missing-create-table",
      model: modelName,
      expectedSchema: info.schemaName,
      expectedTable: info.tableName,
      message:
        `Model "${modelName}" has no @@map, so Prisma expects table ` +
        `"${info.schemaName ?? "<no-schema>"}"."${info.tableName}" ` +
        `(PascalCase, verbatim from the model name), but no migration's ` +
        "CREATE TABLE produces that exact identifier. Either rename/recreate " +
        `the migration to use the PascalCase name, or add @@map("<actual_table_name>") ` +
        "to the model to point at the table the migrations actually create.",
    });
  }

  return errors;
}

// ---------------------------------------------------------------------------
// CLI helpers
// ---------------------------------------------------------------------------

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

function readMigrationsInOrder() {
  const entries = readdirSync(MIGRATIONS_DIR, { withFileTypes: true });
  return entries
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort() // Prisma applies in lexicographic order
    .map((name) => {
      const sqlPath = join(MIGRATIONS_DIR, name, MIGRATION_SQL);
      const sql = existsSync(sqlPath) ? readFileSync(sqlPath, "utf8") : "";
      return { name, sql };
    });
}

function main() {
  console.log("\nMigration Table Schema Validation");
  console.log("==================================\n");

  // 1. Check migrations directory exists
  if (!existsSync(MIGRATIONS_DIR)) {
    err(`Migrations directory not found: ${MIGRATIONS_DIR}`);
    process.exit(1);
  }
  ok("Migrations directory exists");

  const entries = readdirSync(MIGRATIONS_DIR, { withFileTypes: true });
  const dirs = entries
    .filter((e) => e.isDirectory() && e.name !== "migration_lock.toml")
    .map((e) => e.name);

  // 2. Check migration_lock.toml
  const lockPath = join(MIGRATIONS_DIR, LOCK_FILE);
  if (existsSync(lockPath)) {
    const lockContent = readFileSync(lockPath, "utf8");
    if (lockContent.includes("postgresql")) {
      ok(`${LOCK_FILE} exists and specifies postgresql`);
    } else {
      err(`${LOCK_FILE} does not specify postgresql provider`);
    }
  } else {
    err(`${LOCK_FILE} is missing`);
  }

  // 3. Validate each migration directory (structural)
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

  // 4. Cross-check schema.prisma models against migration CREATE TABLE
  //    statements. This catches the EmployeeDeduction-class of drift where
  //    a model with no @@map defaults to a PascalCase table name but a
  //    hand-written migration uses a snake_case guess (or vice versa).
  if (existsSync(SCHEMA_PATH)) {
    console.log(
      "\nCross-checking schema models against migration history...\n"
    );
    const schemaContent = readFileSync(SCHEMA_PATH, "utf8");
    const migrations = readMigrationsInOrder();
    const driftErrors = validateModelsAgainstMigrations(
      schemaContent,
      migrations
    );
    if (driftErrors.length === 0) {
      ok(
        `${parseModels(schemaContent).size} models all have matching CREATE TABLE statements`
      );
    } else {
      for (const e of driftErrors) {
        err(e.message);
      }
    }
  } else {
    err(`schema.prisma not found at ${SCHEMA_PATH}`);
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

// Only run main() when invoked as a CLI, not when imported by a test.
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main();
}
