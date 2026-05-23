#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

const migrationsDir = path.resolve("packages/database/prisma/migrations");
const diffCommand = [
  "pnpm",
  "--filter",
  "@repo/database",
  "exec",
  "prisma",
  "migrate",
  "diff",
  "--from-config-datasource",
  "--to-schema=prisma/schema.prisma",
  "--script",
].join(" ");

function stripCommentLines(statement) {
  return statement
    .split("\n")
    .filter((line) => !line.trim().startsWith("--"))
    .join("\n")
    .trim();
}

function splitStatements(sql) {
  return sql
    .split(/;\s*\n/)
    .map((statement) => statement.trim())
    .filter(Boolean);
}

function splitClauses(clausesText) {
  const clauses = [];
  let current = "";
  let depth = 0;
  let inSingleQuote = false;

  for (let i = 0; i < clausesText.length; i += 1) {
    const char = clausesText[i];
    const prev = i > 0 ? clausesText[i - 1] : "";

    if (char === "'" && prev !== "\\") {
      inSingleQuote = !inSingleQuote;
    }

    if (!inSingleQuote) {
      if (char === "(") depth += 1;
      if (char === ")") depth = Math.max(0, depth - 1);
      if (char === "," && depth === 0) {
        const trimmed = current.trim();
        if (trimmed) clauses.push(trimmed);
        current = "";
        continue;
      }
    }

    current += char;
  }

  const trimmed = current.trim();
  if (trimmed) clauses.push(trimmed);

  return clauses;
}

function sanitizeDiff(sql) {
  const statements = splitStatements(sql);
  const keep = [];

  for (const statement of statements) {
    const cleaned = stripCommentLines(statement);
    if (!cleaned) continue;

    const upper = cleaned.toUpperCase();
    if (upper.startsWith("DROP INDEX")) {
      const rewritten = cleaned.replace(/^DROP INDEX\s+/i, "DROP INDEX IF EXISTS ");
      keep.push(`${rewritten};`);
      continue;
    }

    if (upper.startsWith("DROP ")) continue;

    if (upper.startsWith("CREATE TABLE")) {
      const rewritten = cleaned.replace(/^CREATE TABLE\s+/i, "CREATE TABLE IF NOT EXISTS ");
      keep.push(`${rewritten};`);
      continue;
    }

    if (upper.startsWith("CREATE INDEX") || upper.startsWith("CREATE UNIQUE INDEX")) {
      const rewritten = cleaned.replace(
        /^CREATE\s+(UNIQUE\s+)?INDEX\s+/i,
        (_match, unique) => `CREATE ${unique ?? ""}INDEX IF NOT EXISTS `
      );
      keep.push(`${rewritten};`);
      continue;
    }

    if (upper.startsWith("ALTER TABLE")) {
      const match = cleaned.match(/^ALTER TABLE\s+(.+?)\s+([\s\S]+)$/i);
      if (!match) continue;

      const table = match[1].trim();
      const clauses = splitClauses(match[2]);
      const safeClauses = clauses
        .filter((clause) => {
        const clauseUpper = clause.toUpperCase();
        if (clauseUpper.startsWith("DROP COLUMN")) return false;
        if (clauseUpper.startsWith("DROP CONSTRAINT")) return false;
        if (clauseUpper.startsWith("DROP INDEX")) return false;
        return clauseUpper.startsWith("ADD COLUMN") || clauseUpper.startsWith("ALTER COLUMN");
      })
        .map((clause) => {
          if (clause.toUpperCase().startsWith("ADD COLUMN ")) {
            return clause.replace(/^ADD COLUMN\s+/i, "ADD COLUMN IF NOT EXISTS ");
          }
          return clause;
        });

      if (safeClauses.length > 0) {
        keep.push(`ALTER TABLE ${table} ${safeClauses.join(",\n")};`);
      }
      continue;
    }
  }

  return keep.join("\n\n").trim();
}

function pad(value) {
  return String(value).padStart(2, "0");
}

function timestamp() {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = pad(now.getUTCMonth() + 1);
  const day = pad(now.getUTCDate());
  const hour = pad(now.getUTCHours());
  const minute = pad(now.getUTCMinutes());
  const second = pad(now.getUTCSeconds());
  return `${year}${month}${day}${hour}${minute}${second}`;
}

let sql = "";
try {
  sql = execSync(diffCommand, { stdio: ["ignore", "pipe", "pipe"], encoding: "utf8" });
} catch (error) {
  const stderr = error?.stderr?.toString()?.trim();
  const stdout = error?.stdout?.toString()?.trim();
  if (stdout) {
    console.error(stdout);
  }
  if (stderr) {
    console.error(stderr);
  }
  process.exit(error?.status ?? 1);
}

const trimmed = sql.trim();
if (!trimmed) {
  console.log("No drift detected. Nothing to repair.");
  process.exit(0);
}

const sanitized = sanitizeDiff(trimmed);
if (!sanitized) {
  console.log("No additive drift detected. Nothing to repair.");
  process.exit(0);
}

const name = `${timestamp()}_repair_drift`;
const migrationPath = path.join(migrationsDir, name);
fs.mkdirSync(migrationPath, { recursive: true });
fs.writeFileSync(path.join(migrationPath, "migration.sql"), `${sanitized}\n`);

console.log(`Created repair migration: ${migrationPath}`);
console.log("");
console.log("Next steps:");
console.log("1. Append a review entry to packages/database/DATABASE_PRE_MIGRATION_CHECKLIST.md");
console.log("2. Review the migration to confirm only additive changes");
console.log("3. Run `pnpm db:deploy` to apply the repair migration");

