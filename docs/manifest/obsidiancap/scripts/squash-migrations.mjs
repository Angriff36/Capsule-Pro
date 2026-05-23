#!/usr/bin/env node
/**
 * squash-migrations.mjs
 *
 * Builds a single 0_init/migration.sql that combines:
 *   1. Prisma-generated DDL (from prisma migrate diff --from-empty)
 *   2. All custom SQL from existing migrations (extensions, functions,
 *      triggers, RLS policies, seed data, CHECK constraints, REPLICA IDENTITY, etc.)
 *
 * Does NOT touch the database — only rewrites the local migrations folder.
 */
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

const ROOT = path.resolve("packages/database");
const MIGRATIONS_DIR = path.join(ROOT, "prisma", "migrations");
const SCHEMA_PATH = path.join(ROOT, "prisma", "schema.prisma");

// Allow reading custom SQL from a backup dir if the main dir was already squashed
const SOURCE_DIR = process.argv[2]
  ? path.resolve(process.argv[2])
  : MIGRATIONS_DIR;

// ── Step 1: Read all existing migration SQL in sorted order ─────────────

const migrationDirs = fs
  .readdirSync(SOURCE_DIR)
  .filter((d) => {
    const full = path.join(SOURCE_DIR, d);
    return fs.statSync(full).isDirectory() && fs.existsSync(path.join(full, "migration.sql"));
  })
  .sort();

console.log(`Reading migrations from: ${SOURCE_DIR}`);
console.log(`Found ${migrationDirs.length} migration directories`);

const allMigrationSql = [];
for (const dir of migrationDirs) {
  const sqlPath = path.join(SOURCE_DIR, dir, "migration.sql");
  const content = fs.readFileSync(sqlPath, "utf8");
  allMigrationSql.push({ name: dir, content });
}

// ── Step 2: Extract custom SQL statements from each migration ───────────
//
// "Custom" = anything Prisma's `migrate diff --from-empty` won't generate.
// We detect these by scanning each statement against known patterns.

function splitStatements(sql) {
  const results = [];
  let current = "";
  let dollarDepth = 0;

  for (const line of sql.split("\n")) {
    current += line + "\n";

    // Track $$ blocks (PL/pgSQL functions, DO blocks)
    const dollarMatches = line.match(/\$\$/g);
    if (dollarMatches) {
      dollarDepth += dollarMatches.length;
    }

    // A statement ends at `;` only when not inside a $$ block
    if (dollarDepth % 2 === 0 && line.trim().endsWith(";")) {
      results.push(current.trim());
      current = "";
    }
  }

  if (current.trim()) {
    results.push(current.trim());
  }

  return results;
}

const CUSTOM_PATTERNS = [
  /^\s*CREATE\s+EXTENSION/im,
  /^\s*CREATE\s+(OR\s+REPLACE\s+)?FUNCTION/im,
  /^\s*DROP\s+TRIGGER/im,
  /^\s*CREATE\s+TRIGGER/im,
  /^\s*CREATE\s+POLICY/im,
  /^\s*DROP\s+POLICY/im,
  /ALTER\s+TABLE[^;]+ENABLE\s+ROW\s+LEVEL\s+SECURITY/im,
  /ALTER\s+TABLE[^;]+FORCE\s+ROW\s+LEVEL\s+SECURITY/im,
  /ALTER\s+TABLE[^;]+REPLICA\s+IDENTITY/im,
  /ALTER\s+TABLE[^;]+ADD\s+CONSTRAINT[^;]+CHECK\s*\(/ims,
  /^\s*INSERT\s+INTO/im,
  /^\s*DO\s+\$\$/im,
  /^\s*UPDATE\s+/im,
];

function isCustomStatement(stmt) {
  return CUSTOM_PATTERNS.some((p) => p.test(stmt));
}

function isCommentOnly(stmt) {
  return stmt
    .split("\n")
    .every((line) => line.trim().startsWith("--") || line.trim() === "");
}

const customBlocks = [];
const seenStatements = new Set();

for (const { name, content } of allMigrationSql) {
  const statements = splitStatements(content);
  for (const stmt of statements) {
    if (isCommentOnly(stmt)) continue;
    if (!isCustomStatement(stmt)) continue;

    // Deduplicate: normalize whitespace for comparison
    const normalized = stmt.replace(/\s+/g, " ").trim();
    if (seenStatements.has(normalized)) continue;
    seenStatements.add(normalized);

    customBlocks.push({ migration: name, sql: stmt });
  }
}

console.log(`Extracted ${customBlocks.length} unique custom SQL statements`);

// Group for reporting
const byMigration = {};
for (const cb of customBlocks) {
  byMigration[cb.migration] = (byMigration[cb.migration] || 0) + 1;
}
for (const [m, count] of Object.entries(byMigration)) {
  console.log(`  ${m}: ${count} custom statements`);
}

// ── Step 3: Generate Prisma DDL from the actual DB ──────────────────────
//
// Using --to-config-datasource captures the real DB state (correct index
// names, FK names, etc.) instead of what Prisma would generate fresh from
// the schema (which may use different auto-generated names).

console.log("\nGenerating Prisma DDL from actual database...");
const prismaDdl = execSync(
  `pnpm exec prisma migrate diff --from-empty --to-config-datasource --script`,
  { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }
);
console.log(`Prisma DDL: ${prismaDdl.split("\n").length} lines`);

// ── Step 4: Build combined baseline ─────────────────────────────────────

const sections = [
  "-- ==========================================================",
  "-- Capsule-Pro: Squashed baseline migration",
  `-- Generated: ${new Date().toISOString()}`,
  "-- ==========================================================",
  "",
  "-- ── Extensions ────────────────────────────────────────────",
  "",
  ...customBlocks.filter((b) => /CREATE\s+EXTENSION/i.test(b.sql)).map((b) => b.sql),
  "",
  "-- ── Functions ─────────────────────────────────────────────",
  "",
  ...customBlocks
    .filter((b) => /CREATE\s+(OR\s+REPLACE\s+)?FUNCTION/i.test(b.sql))
    .map((b) => b.sql),
  "",
  "-- ── Prisma Schema DDL ─────────────────────────────────────",
  "",
  prismaDdl.trim(),
  "",
  "-- ── Row Level Security ────────────────────────────────────",
  "",
  ...customBlocks
    .filter(
      (b) =>
        /ENABLE\s+ROW\s+LEVEL\s+SECURITY/i.test(b.sql) ||
        /FORCE\s+ROW\s+LEVEL\s+SECURITY/i.test(b.sql) ||
        /CREATE\s+POLICY/i.test(b.sql) ||
        /DROP\s+POLICY/i.test(b.sql)
    )
    .map((b) => b.sql),
  "",
  "-- ── Triggers ──────────────────────────────────────────────",
  "",
  ...customBlocks
    .filter((b) => /CREATE\s+TRIGGER/i.test(b.sql) || /DROP\s+TRIGGER/i.test(b.sql))
    .map((b) => b.sql),
  "",
  "-- ── CHECK Constraints ─────────────────────────────────────",
  "",
  ...customBlocks.filter((b) => /ADD\s+CONSTRAINT[^;]+CHECK\s*\(/ims.test(b.sql)).map((b) => b.sql),
  "",
  "-- ── REPLICA IDENTITY ──────────────────────────────────────",
  "",
  ...customBlocks.filter((b) => /REPLICA\s+IDENTITY/i.test(b.sql)).map((b) => b.sql),
  "",
  "-- ── Seed Data ─────────────────────────────────────────────",
  "",
  ...customBlocks.filter((b) => /^\s*INSERT\s+INTO/im.test(b.sql)).map((b) => b.sql),
  "",
  "-- ── DO Blocks (conditional FKs, data migrations) ──────────",
  "",
  ...customBlocks.filter((b) => /^\s*DO\s+\$\$/im.test(b.sql)).map((b) => b.sql),
  "",
  "-- ── Data Migrations (UPDATE) ──────────────────────────────",
  "",
  ...customBlocks
    .filter((b) => /^\s*UPDATE\s+/im.test(b.sql) && !/^\s*DO\s+/im.test(b.sql))
    .map((b) => b.sql),
  "",
];

const combined = sections.join("\n") + "\n";

// ── Step 5: Write out ───────────────────────────────────────────────────

// Back up existing migrations
const backupDir = path.join(ROOT, "prisma", "migrations_backup_" + Date.now());
fs.cpSync(MIGRATIONS_DIR, backupDir, { recursive: true });
console.log(`\nBacked up existing migrations to: ${path.basename(backupDir)}`);

// Remove all migration directories from the output dir (keep migration_lock.toml)
const currentDirs = fs
  .readdirSync(MIGRATIONS_DIR)
  .filter((d) => {
    const full = path.join(MIGRATIONS_DIR, d);
    return fs.statSync(full).isDirectory();
  });
for (const dir of currentDirs) {
  fs.rmSync(path.join(MIGRATIONS_DIR, dir), { recursive: true });
}

// Create 0_init
const initDir = path.join(MIGRATIONS_DIR, "0_init");
fs.mkdirSync(initDir, { recursive: true });
fs.writeFileSync(path.join(initDir, "migration.sql"), combined);

console.log(`\nWrote squashed baseline: 0_init/migration.sql (${combined.split("\n").length} lines)`);
console.log("\nNext steps:");
console.log("  1. Review the generated migration.sql");
console.log("  2. Clean _prisma_migrations table in the DB");
console.log("  3. Run: pnpm exec prisma migrate resolve --applied 0_init");
