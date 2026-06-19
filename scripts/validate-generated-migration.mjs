#!/usr/bin/env node
/**
 * validate-generated-migration.mjs
 *
 * Validates a Prisma migration produced by `prisma migrate dev --create-only`
 * against packages/database/prisma/schema.prisma. Run by the migration-preview
 * CI gate AFTER Prisma generates a candidate migration on the ephemeral Neon
 * branch. The gate's job is to fail the PR *before* a broken migration reaches
 * `db:deploy` — the 2026-05-02 EmployeeDeduction class of incident where a
 * model with no @@map defaults to a PascalCase table name but the migration
 * SQL creates a different (snake_case) name, breaking deploy.
 *
 * Checks (any failure → exit 1):
 *
 *   1. NON-EMPTY   The generated migration.sql must contain real, actionable
 *                  DDL after comments are stripped. An empty/no-op migration
 *                  means the schema change produced nothing deployable — either
 *                  a drift the dev forgot to commit, or an attribute-only
 *                  change with no DB effect. Fail so it is caught here.
 *
 *   2. TABLE-NAME CORRECTNESS  Every table touched by the generated DDL
 *                  (CREATE / ALTER / DROP / INDEX) must resolve to a table name
 *                  declared by a schema.prisma model — honouring @@map when
 *                  present, else the model name verbatim. Flags the exact
 *                  EmployeeDeduction drift: a CREATE TABLE whose identifier
 *                  matches no model's resolved table name.
 *
 *                  Also flags PascalCase CREATE TABLE targets that correspond
 *                  to a model with no @@map (the high-risk naming class), as a
 *                  WARNING so reviewers see it even when technically valid.
 *
 * Pure functions are exported (stripSqlComments, findNewestMigrationDir,
 * validateGeneratedMigration) so the logic is unit-tested in
 * scripts/__tests__/validate-generated-migration.test.mjs the same way the
 * sibling validate-migration-table-schemas validator is.
 *
 * Usage:
 *   node scripts/validate-generated-migration.mjs [--migration-dir <dir>]
 *
 *   --migration-dir   Optional path to the generated migration directory
 *                     (the one containing migration.sql). If omitted, the
 *                     newest timestamped directory under the migrations folder
 *                     is used. The caller records the "before" count so the
 *                     newest is guaranteed to be the just-generated one.
 *
 * Exit codes:
 *   0 - All checks passed (or no migration was generated — see below)
 *   1 - One or more checks failed
 *   2 - A migration was generated but could not be located/read
 */

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  parseModels,
  extractCreatedTables,
  extractDroppedTables,
} from "./validate-migration-table-schemas.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REPO_ROOT = join(__dirname, "..");
const MIGRATIONS_DIR = join(
  REPO_ROOT,
  "packages",
  "database",
  "prisma",
  "migrations",
);
const SCHEMA_PATH = join(
  REPO_ROOT,
  "packages",
  "database",
  "prisma",
  "schema.prisma",
);

// CREATE/ALTER/DROP TABLE [IF [NOT] EXISTS] ["schema".]"table"
const TABLE_DDL_RE =
  /(?:CREATE\s+TABLE|ALTER\s+TABLE|DROP\s+TABLE)\s+(?:IF\s+(?:NOT\s+)?EXISTS\s+)?(?:"([^"]+)"\s*\.\s*)?"([^"]+)"/gi;
// CREATE [UNIQUE] INDEX [IF NOT EXISTS] "name" ON ["schema".]"table"
const INDEX_DDL_RE =
  /CREATE\s+(?:UNIQUE\s+)?INDEX\s+(?:IF\s+NOT\s+EXISTS\s+)?"[^"]+"\s+ON\s+(?:"([^"]+)"\s*\.\s*)?"([^"]+)"/gi;

// ---------------------------------------------------------------------------
// Pure helpers (exported for unit tests)
// ---------------------------------------------------------------------------

/**
 * Strip SQL line comments (`-- ...`) and block comments (`/* ... *\/`).
 * @param {string} sql
 * @returns {string}
 */
export function stripSqlComments(sql) {
  return sql
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/--[^\n]*/g, "")
    .trim();
}

/**
 * A migration is a no-op if, after stripping comments + whitespace, it has no
 * actionable DDL keywords. Catches empty migration.sql files AND migrations
 * that are only comments / SELECTs / no-ops.
 *
 * @param {string} sql
 * @returns {boolean}
 */
export function isNoOp(sql) {
  const stripped = stripSqlComments(sql);
  if (stripped.length === 0) return true;
  // Must contain at least one DDL keyword to be considered actionable.
  return !/\b(CREATE|ALTER|DROP|ADD\s+COLUMN|RENAME|TRUNCATE)\b/i.test(stripped);
}

/**
 * Extract every (schema, table) referenced by table-touching DDL statements.
 * Covers CREATE TABLE, ALTER TABLE, DROP TABLE, and CREATE [UNIQUE] INDEX ...
 * ON <table>. For INDEX, the table is the identifier after ON, not the index
 * name that follows INDEX directly.
 *
 * @param {string} sql
 * @returns {Array<{schema: string | null, table: string}>}
 */
export function extractReferencedTables(sql) {
  const out = [];
  for (const re of [TABLE_DDL_RE, INDEX_DDL_RE]) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(sql)) !== null) {
      out.push({ schema: m[1] ?? null, table: m[2] });
    }
  }
  return out;
}

/**
 * Find the newest timestamped migration directory (the one Prisma just wrote
 * when --create-only ran). Excludes `0_init` and any non-timestamp names.
 *
 * @param {string} migrationsDir
 * @returns {string | null} absolute path to the newest migration dir, or null
 */
export function findNewestMigrationDir(migrationsDir) {
  if (!existsSync(migrationsDir)) return null;
  const dirs = readdirSync(migrationsDir, { withFileTypes: true })
    .filter((e) => e.isDirectory() && /^\d{14}_/.test(e.name))
    .map((e) => ({ name: e.name, path: join(migrationsDir, e.name) }))
    .sort((a, b) => b.name.localeCompare(a.name));
  return dirs.length > 0 ? dirs[0].path : null;
}

/**
 * Find a migration directory by its `--name` suffix (case-insensitive). Prisma
 * lowercases the --name when writing the dir, so the match is case-insensitive.
 *
 * @param {string} migrationsDir
 * @param {string} migrationName
 * @returns {string | null}
 */
export function findMigrationDirByName(migrationsDir, migrationName) {
  if (!existsSync(migrationsDir)) return null;
  const want = `_${migrationName.toLowerCase()}`;
  const match = readdirSync(migrationsDir, { withFileTypes: true })
    .filter((e) => e.isDirectory() && e.name.toLowerCase().endsWith(want))
    .map((e) => join(migrationsDir, e.name))
    .sort((a, b) => b.localeCompare(a)); // newest first if multiple
  return match.length > 0 ? match[0] : null;
}

/**
 * Build the set of physical table names the schema declares, keyed so the
 * comparison is schema-agnostic where possible (legacy migrations omit the
 * schema prefix). Returns { byKey: Set<"schema.table">, byBareTable: Set<"table"> }.
 *
 * @param {Map<string, {tableName: string, schemaName: string | null}>} models
 */
function buildDeclaredTableSets(models) {
  const byKey = new Set();
  const byBareTable = new Set();
  for (const info of models.values()) {
    byKey.add(`${info.schemaName ?? ""}.${info.tableName}`);
    byBareTable.add(info.tableName);
  }
  return { byKey, byBareTable };
}

/**
 * Cross-check every table referenced by the generated migration against the
 * table names schema.prisma declares (honouring @@map). Returns findings:
 *
 *   - orphaned-table: DDL touches a table no model declares.
 *   - pascalcase-no-map (warning): a CREATE TABLE uses a PascalCase name that
 *     matches a no-@@map model — the EmployeeDeduction risk class. Reported as
 *     a warning; reviewers should confirm @@map is intentionally absent.
 *
 * @param {string} schemaContent
 * @param {string} migrationSql
 * @returns {{ errors: Array<{kind, message}>, warnings: Array<{kind, message}> }}
 */
export function validateGeneratedMigration(schemaContent, migrationSql) {
  const models = parseModels(schemaContent);
  const { byKey, byBareTable } = buildDeclaredTableSets(models);

  // Reverse map: bareTableName → modelName, to identify the PascalCase-no-map risk.
  const bareToModel = new Map();
  const noMapPascal = new Set();
  for (const [modelName, info] of models) {
    bareToModel.set(info.tableName, modelName);
    if (!info.tableName || info.tableName === modelName) {
      // tableName defaulted to model name verbatim (no @@map).
      if (/[A-Z]/.test(modelName)) noMapPascal.add(info.tableName);
    }
  }

  const created = extractCreatedTables(migrationSql);
  const dropped = extractDroppedTables(migrationSql);
  const referenced = extractReferencedTables(migrationSql);

  const errors = [];
  const warnings = [];

  for (const { schema, table } of referenced) {
    const key = `${schema ?? ""}.${table}`;
    const declared = byKey.has(key) || byBareTable.has(table);
    if (!declared) {
      // Allow DROP TABLE of a table being removed (schema model may also be
      // gone) — only flag if it's not a DROP and not declared.
      const isDrop = dropped.some(
        (d) => (d.schema ?? "") === (schema ?? "") && d.table === table,
      );
      if (!isDrop) {
        errors.push({
          kind: "orphaned-table",
          message:
            `Generated DDL touches table "${schema ? `${schema}.` : ""}${table}", ` +
            "which is not declared by any schema.prisma model (via @@map or the " +
            "model name). This is the EmployeeDeduction-class drift: the migration " +
            "creates/alters a table the schema does not know about. Add @@map to the " +
            "model, or correct the migration source.",
        });
      }
    }
  }

  for (const { schema, table } of created) {
    if (noMapPascal.has(table)) {
      warnings.push({
        kind: "pascalcase-no-map",
        message:
          `CREATE TABLE creates "${schema ? `${schema}.` : ""}${table}" from a model ` +
          "with no @@map, so the physical table name is the PascalCase model name " +
          "verbatim. This is the naming class behind the 2026-05-02 deploy incident. " +
          "Confirm this is intended, or add @@map(\"<snake_case_name>\").",
      });
    }
  }

  return { errors, warnings, modelCount: models.size, referenced };
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

let exitCode = 0;
function fail(msg) {
  console.error(`  ✗ ${msg}`);
  exitCode = 1;
}
function warn(msg) {
  console.warn(`  ⚠ ${msg}`);
}
function ok(msg) {
  console.log(`  ✓ ${msg}`);
}

function readMigrationDir(explicitDir, migrationName) {
  let dir = explicitDir;
  if (!dir) {
    if (migrationName) {
      // Locate the generated migration by its --name suffix. Prisma lowercases
      // the name and prefixes the timestamp: <ts>_<name>.
      const want = migrationName.toLowerCase();
      const dirs = readdirSync(MIGRATIONS_DIR, { withFileTypes: true })
        .filter((e) => e.isDirectory() && /^\d{14}_/.test(e.name))
        .sort((a, b) => b.name.localeCompare(a.name));
      const match = dirs.find((e) => e.name.toLowerCase().endsWith(`_${want}`));
      dir = match ? join(MIGRATIONS_DIR, match.name) : null;
    } else {
      dir = findNewestMigrationDir(MIGRATIONS_DIR);
    }
    if (!dir) {
      console.error(
        "No timestamped migration directory found — Prisma reported no schema drift " +
          "(schema.prisma matches the migrated state). Nothing to validate.",
      );
      return null;
    }
  }
  const sqlPath = join(dir, "migration.sql");
  if (!existsSync(sqlPath)) {
    fail(`No migration.sql found in ${dir}`);
    return null;
  }
  const sql = readFileSync(sqlPath, "utf8");
  return { dir, sql, sqlPath };
}

function main() {
  const args = process.argv.slice(2);
  const explicitDirIdx = args.indexOf("--migration-dir");
  const migrationNameIdx = args.indexOf("--migration-name");
  const explicitDir = explicitDirIdx >= 0 ? args[explicitDirIdx + 1] : null;
  const migrationName = migrationNameIdx >= 0 ? args[migrationNameIdx + 1] : null;

  console.log("\nGenerated Migration Validation");
  console.log("===============================\n");

  const migration = readMigrationDir(explicitDir, migrationName);
  if (!migration) {
    // If we couldn't locate a migration and none was specified, treat as a
    // PASS with a notice: Prisma found no drift. If a dir WAS specified but
    // unreadable, exitCode is already 1 from readMigrationDir.
    if (exitCode === 0) {
      ok("No candidate migration to validate — schema already in sync.");
    }
    process.exit(exitCode);
  }

  const { dir, sql, sqlPath } = migration;
  console.log(`Migration: ${dir}\n`);

  if (!existsSync(SCHEMA_PATH)) {
    fail(`schema.prisma not found at ${SCHEMA_PATH}`);
    process.exit(1);
  }
  const schemaContent = readFileSync(SCHEMA_PATH, "utf8");

  // 1. NON-EMPTY / NO-OP check
  console.log("Checking for empty / no-op migration SQL…");
  if (isNoOp(sql)) {
    fail(
      "Generated migration.sql contains no actionable DDL (empty or comments-only " +
        "after stripping). A schema.prisma change that produces an empty migration " +
        "usually means the change was already applied, or is an attribute-only edit " +
        "with no DB effect. Commit the real migration or revert the no-op change.",
    );
  } else {
    ok("Migration contains actionable DDL statements.");
  }

  // 2. TABLE-NAME CORRECTNESS check
  console.log("\nCross-checking table names against schema.prisma @@map…");
  const { errors, warnings, modelCount, referenced } = validateGeneratedMigration(
    schemaContent,
    sql,
  );
  if (errors.length === 0) {
    ok(
      `All ${referenced.length} referenced table(s) resolve to declared models (${modelCount} models).`,
    );
  } else {
    for (const e of errors) fail(e.message);
  }
  for (const w of warnings) warn(w.message);

  // Summary
  console.log("\n--- migration.sql preview (first 20 lines) ---");
  console.log(sql.split(/\r?\n/).slice(0, 20).join("\n"));
  console.log("----------------------------------------------");

  if (exitCode === 0) {
    console.log("\nValidation PASSED");
  } else {
    console.error("\nValidation FAILED");
  }
  process.exit(exitCode);
}

// Only run main() when invoked as a CLI, not when imported by a test.
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main();
}
