#!/usr/bin/env node
import { execSync } from "node:child_process";
import fs from "node:fs";

const stagedSql = execSync("git diff --cached --name-only -- '*.sql'", {
  encoding: "utf8",
})
  .split(/\r?\n/)
  .map((line) => line.trim())
  .filter(Boolean);

if (stagedSql.length === 0) {
  process.exit(0);
}

const violations = [];
const createObjectRegex =
  /create\s+(table|type)\s+(if\s+not\s+exists\s+)?([^\s(]+)/gi;

for (const file of stagedSql) {
  const content = fs.readFileSync(file, "utf8");
  let match;
  while ((match = createObjectRegex.exec(content)) !== null) {
    const objectToken = match[3];
    const normalized = objectToken.replace(/;$/, "");
    const lower = normalized.toLowerCase();
    const hasSchema = normalized.includes(".");

    if (!hasSchema) {
      violations.push(`${file}: unqualified ${match[1]} ${normalized}`);
      continue;
    }

    if (lower.startsWith("public.") || lower.startsWith("\"public\".")) {
      violations.push(`${file}: ${match[1]} in public schema (${normalized})`);
    }
  }
}

if (violations.length > 0) {
  console.error("❌ Public schema guard tripped:");
  violations.forEach((violation) => {
    console.error(`  • ${violation}`);
  });
  console.error(
    "\nFix: schema-qualify every CREATE TABLE/TYPE and avoid the public schema.",
  );
  process.exit(1);
}

process.exit(0);
