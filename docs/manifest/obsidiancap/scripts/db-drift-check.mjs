#!/usr/bin/env node
import { execSync } from "node:child_process";

const command = [
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
    if (upper.startsWith("DROP ")) continue;

    if (upper.startsWith("CREATE TABLE")) {
      keep.push(`${cleaned};`);
      continue;
    }

    if (upper.startsWith("CREATE INDEX") || upper.startsWith("CREATE UNIQUE INDEX")) {
      keep.push(`${cleaned};`);
      continue;
    }

    if (upper.startsWith("ALTER TABLE")) {
      const match = cleaned.match(/^ALTER TABLE\s+(.+?)\s+([\s\S]+)$/i);
      if (!match) continue;

      const table = match[1].trim();
      const clauses = splitClauses(match[2]);
      const safeClauses = clauses.filter((clause) => {
        const clauseUpper = clause.toUpperCase();
        if (clauseUpper.startsWith("DROP COLUMN")) return false;
        if (clauseUpper.startsWith("DROP CONSTRAINT")) return false;
        if (clauseUpper.startsWith("DROP INDEX")) return false;
        return clauseUpper.startsWith("ADD COLUMN") || clauseUpper.startsWith("ALTER COLUMN");
      });

      if (safeClauses.length > 0) {
        keep.push(`ALTER TABLE ${table} ${safeClauses.join(",\n")};`);
      }
      continue;
    }
  }

  return keep;
}

try {
  const output = execSync(command, { stdio: ["ignore", "pipe", "pipe"], encoding: "utf8" });
  const sanitizedStatements = sanitizeDiff(output);
  if (sanitizedStatements.length === 0) {
    process.exit(0);
  }

  console.error("");
  console.error("Database drift detected (missing schema changes).");
  console.error("Prisma diff (sanitized to additive changes):");
  console.error("");
  console.error(sanitizedStatements.join("\n\n"));
  console.error("");
  console.error("Fix options:");
  console.error("- Run `pnpm db:repair` to generate a repair migration.");
  console.error("- Or, if the DB is disposable, run `pnpm --filter @repo/database exec prisma migrate reset --force`.");
  console.error("");
  process.exit(1);
} catch (error) {
  const stderr = error?.stderr?.toString()?.trim();
  if (stderr) {
    console.error(stderr);
  }
  process.exit(error?.status ?? 1);
}
