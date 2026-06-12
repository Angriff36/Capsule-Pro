#!/usr/bin/env node
/**
 * Remove stale artifacts under manifest/generated/ that have no consumers.
 *
 * Keeps: generated/runtime/ (committed Prisma store metadata)
 *        generated/schemas/, drizzle/, kysely/, analytics/, llm-context/, materialized-views/
 * Deletes: orphan Prisma client copy, stale hooks, legacy Zod monolith
 */
import { existsSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";

const root = resolve(process.cwd());
const generatedRoot = join(root, "manifest/generated");

const orphanPaths = [
  "models",
  "client.ts",
  "browser.ts",
  "enums.ts",
  "commonInputTypes.ts",
  "internal",
  "hooks/manifest-hooks.generated.ts",
  "schemas/manifest-schemas.ts",
];

let removed = 0;
for (const rel of orphanPaths) {
  const target = join(generatedRoot, rel);
  if (!existsSync(target)) {
    continue;
  }
  rmSync(target, { recursive: true, force: true });
  removed++;
  console.log(`[cleanup-generated] removed ${rel}`);
}

if (removed === 0) {
  console.log("[cleanup-generated] no orphan artifacts found");
} else {
  console.log(`[cleanup-generated] removed ${removed} orphan path(s)`);
}
