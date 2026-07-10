#!/usr/bin/env node
/**
 * Live DB → prisma/schema drift check (STRICT).
 *
 * Prints the FULL `prisma migrate diff` script — no sanitizing, no
 * additive-only filtering. Any diff at all is drift and fails the check.
 * The old "accepted drift" workflow (sanitizer + db:repair + SQL trimming)
 * was removed 2026-07-10 after migration history was reconciled with the
 * schema (20260710142245_reconcile_schema_truth). See
 * docs/database/CONTRIBUTING.md for the standard workflow.
 */
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
  "--to-schema=prisma/schema",
  "--script",
].join(" ");

try {
  const output = execSync(command, {
    stdio: ["ignore", "pipe", "pipe"],
    encoding: "utf8",
  });
  const body = output
    .split("\n")
    .filter((line) => !line.startsWith("--") && line.trim() !== "")
    .join("\n")
    .trim();
  if (
    body === "" ||
    /^-- This is an empty migration\.?$/m.test(output.trim())
  ) {
    process.exit(0);
  }

  console.error("");
  console.error(
    "Database drift detected: the live DB does not match prisma/schema."
  );
  console.error("Full prisma migrate diff (DB -> schema):");
  console.error("");
  console.error(output.trim());
  console.error("");
  console.error("Fix options:");
  console.error(
    "- Create a migration: pnpm db:dev --create-only --name <intent>, review, then pnpm db:deploy."
  );
  console.error(
    "- If the dev DB is disposable and behind history: pnpm --filter @repo/database exec prisma migrate reset --force."
  );
  console.error("");
  process.exit(1);
} catch (error) {
  const stderr = error?.stderr?.toString()?.trim();
  if (stderr) {
    console.error(stderr);
  }
  process.exit(error?.status ?? 1);
}
