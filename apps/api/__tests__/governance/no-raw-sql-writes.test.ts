import { describe, expect, it } from "vitest";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";

const repoRoot = path.resolve(__dirname, "../../../");

/**
 * Known pre-existing raw SQL write sites that have not yet been migrated to
 * Prisma ORM or governed Manifest commands. Each entry is a file path prefix
 * (relative to repo root). New violations should NOT be added here — migrate
 * them to Prisma ORM or Manifest runtime instead.
 *
 * Last audited: 2026-06-07
 */
const KNOWN_VIOLATIONS: string[] = [
  // Seed scripts — infrastructure, not production routes
  "app/prisma/seed-recipe-ingredients.ts",
  "app/prisma/seed-dev.ts",
  // Event setup — complex multi-entity transaction, not yet governed
  "app/app/(authenticated)/events/actions/setup-event-completely.ts",
  // Event summary — raw SQL aggregation, not yet governed
  "app/app/(authenticated)/events/actions/event-summary.ts",
  // Event importer — bulk import pipeline, not yet governed
  "app/app/(authenticated)/events/importer.ts",
  // Kitchen recipes — complex recipe versioning, not yet governed
  "app/app/(authenticated)/kitchen/recipes/actions.ts",
  "app/app/(authenticated)/kitchen/recipes/actions-manifest.ts",
  "app/app/(authenticated)/kitchen/recipes/actions-manifest-v2.ts",
  "app/app/(authenticated)/kitchen/recipes/cleanup/server-actions.ts",
  // Kitchen prep lists — complex prep plan generation, not yet governed
  "app/app/(authenticated)/kitchen/prep-lists/actions.ts",
  "app/app/(authenticated)/kitchen/prep-lists/actions-manifest.ts",
  // Battle board tasks — raw SQL for task management, not yet governed
  "app/app/(authenticated)/events/[eventId]/battle-board/actions/tasks.ts",
  // API routes — raw SQL for complex queries not expressible via Prisma ORM
  "api/app/api/payroll/tax/list/route.ts",
  "api/app/api/kitchen/prep-lists/generate/route.ts",
  "api/app/api/events/import/server-to-server/route.ts",
  // API command routes — governed Manifest orchestration + raw SQL persistence
  "api/app/api/kitchen/dishes/commands/create/route.ts",
  "api/app/api/kitchen/prep-lists/commands/create/route.ts",
];

const sourceFiles = () =>
  execFileSync(
    "rg",
    [
      "--files",
      "-g",
      "*.ts",
      "-g",
      "*.tsx",
      "-g",
      "*.mts",
      "-g",
      "!node_modules/**",
      "-g",
      "!docs/**",
      "-g",
      "!**/__tests__/**",
      "-g",
      "!**/*.test.ts",
      "-g",
      "!**/*.test.tsx",
      "-g",
      "!**/*.config.mts",
      "-g",
      "!**/*.config.ts",
      "-g",
      "!**/test/**",
      "-g",
      "!**/mocks/**",
    ],
    { cwd: repoRoot, encoding: "utf8" }
  )
    .split(/\r?\n/)
    .filter(Boolean);

const lineNumber = (source: string, index: number) =>
  source.slice(0, index).split(/\r?\n/).length;

const startsWithWriteStatement = (argumentSource: string) => {
  const normalized = argumentSource
    .replace(/^\s*<[^`(]+>\s*/, "")
    .replace(/^\s*\(\s*Prisma\.sql\s*/, "")
    .replace(/^\s*Prisma\.sql\s*/, "")
    .trimStart();
  const sql = normalized.startsWith("`") ? normalized.slice(1) : normalized;

  return /^(INSERT|UPDATE|DELETE|UPSERT|CREATE|DROP|ALTER|TRUNCATE)\b/i.test(
    sql.trimStart()
  );
};

const isKnownViolation = (relativeFile: string) =>
  KNOWN_VIOLATIONS.some((known) => relativeFile.replace(/\\/g, "/").startsWith(known));

describe("raw SQL write guardrail", () => {
  it("keeps application source free of raw write SQL calls", () => {
    const violations: string[] = [];

    for (const relativeFile of sourceFiles()) {
      const source = readFileSync(path.join(repoRoot, relativeFile), "utf8");
      const rawCallPattern =
        /\$(executeRawUnsafe|executeRaw|queryRawUnsafe|queryRaw)\b/g;
      let match: RegExpExecArray | null;

      while ((match = rawCallPattern.exec(source))) {
        const method = `$${match[1]}`;
        const lineStart = source.lastIndexOf("\n", match.index) + 1;
        const linePrefix = source.slice(lineStart, match.index).trimStart();
        if (linePrefix.startsWith("//") || linePrefix.startsWith("*")) {
          continue;
        }

        const argumentSource = source.slice(
          match.index + method.length,
          match.index + method.length + 500
        );
        const isRawWrite =
          method.startsWith("$executeRaw") ||
          startsWithWriteStatement(argumentSource);

        if (isRawWrite && !isKnownViolation(relativeFile)) {
          violations.push(
            `${relativeFile}:${lineNumber(source, match.index)} ${method}`
          );
        }
      }
    }

    expect(violations).toEqual([]);
  });
});
