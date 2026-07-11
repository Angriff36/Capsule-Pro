#!/usr/bin/env node

/**
 * Prisma Schema Naming-Convention Linter
 *
 * WHY THIS EXISTS
 * ---------------
 * The 245-model `schema.prisma` mixes two conventions and has accumulated drift:
 *   - Canonical (preferred): `model PascalCase { ... @@map("snake_case") }` with
 *     camelCase fields mapped to snake_case columns via `@map`.
 *   - Legacy: `model snake_case { ... }` (model name == physical table, raw
 *     snake_case fields, no `@map`) — 31 pre-Manifest tables.
 * On top of that, 20 models resolve to a PascalCase *physical table* (4 via an
 * explicit `@@map("PascalCase")`, 16 PascalCase models with no `@@map` at all —
 * the IR-entity models added in Task 0.3, whose table defaults to the verbatim
 * model name). Without a gate, every new model can pick any of these shapes, so
 * the convention silently rots and the producer/store/route layers drift.
 *
 * This linter freezes today's reality via two allowlists and FAILS (in --strict)
 * on any NEW deviation, so new models are forced onto the canonical shape:
 *   R1  model name must be PascalCase           (unless legacy-allowlisted)
 *   R2  resolved table name must be snake_case   (unless pascal-table-allowlisted)
 *       resolved table = `@@map` value if present, else the model name verbatim.
 *   R3  allowlist hygiene: every allowlist entry must still exist in the schema
 *       (so the lists don't accumulate stale entries that mask future drift).
 *
 * The rule set is the SAME concept the constitution uses elsewhere (§17 governance
 * registries): capture the known exceptions in a tracked JSON allowlist, fail loud
 * on anything new. Matches the report-only / `--strict` pattern of the sibling
 * audit scripts (audit-schema-drift.mjs, audit-direct-writes.mjs).
 *
 * Outputs (gitignored, like other manifest/reports/* artifacts):
 *   manifest/reports/schema-naming/schema-naming.json  — full structured report
 *   manifest/reports/schema-naming/schema-naming.md    — human-readable summary
 *
 * Usage:
 *   node manifest/scripts/lint-schema.mjs            # report only (exit 0)
 *   node manifest/scripts/lint-schema.mjs --strict     # exit 1 on any violation (CI gate)
 *   node manifest/scripts/lint-schema.mjs --self-test   # assert the rules can fail
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const STRICT = process.argv.includes("--strict");
const SELF_TEST = process.argv.includes("--self-test");

const PATHS = {
  prismaSchema: path.join(ROOT, "packages/database/prisma/schema/manifest.prisma"),
  allowlist: path.join(
    ROOT,
    "manifest/governance/schema-naming-allowlist.json"
  ),
  outDir: path.join(ROOT, "manifest/reports/schema-naming"),
};

const PASCAL_CASE = /^[A-Z][A-Za-z0-9]*$/;
const SNAKE_CASE = /^[a-z][a-z0-9_]*$/;

// ---------------------------------------------------------------------------
// Pure parsing + rule evaluation (also exercised by --self-test)
// ---------------------------------------------------------------------------

/**
 * Parse `model X { ... @@map("y") }` blocks out of a schema.prisma string.
 * Returns [{ name, hasMap, mapValue, line }]. Deliberately line-based and
 * tolerant — it only needs the model name and the (optional) `@@map` value.
 */
export function parseModels(schemaText) {
  const lines = schemaText.split(/\r?\n/);
  const models = [];
  let current = null;
  const modelStart = /^\s*model\s+([A-Za-z_][A-Za-z0-9_]*)\s*\{/;
  const mapAttr = /^\s*@@map\(\s*"([^"]*)"\s*\)/;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!current) {
      const m = line.match(modelStart);
      if (m) {
        current = { name: m[1], hasMap: false, mapValue: null, line: i + 1 };
      }
      continue;
    }
    const map = line.match(mapAttr);
    if (map) {
      current.hasMap = true;
      current.mapValue = map[1];
    }
    if (/^\s*\}/.test(line)) {
      models.push(current);
      current = null;
    }
  }
  return models;
}

/**
 * Evaluate R1/R2/R3 against parsed models + the allowlist.
 * Returns { violations, stale, summary }.
 */
export function evaluate(models, allowlist) {
  const legacy = new Set(allowlist?.legacySnakeCaseModels?.models ?? []);
  const pascalTable = new Set(
    allowlist?.pascalCaseTableExceptions?.models ?? []
  );

  const violations = [];
  for (const model of models) {
    const resolvedTable = model.mapValue ?? model.name;

    // R1 — model name must be PascalCase.
    if (!(PASCAL_CASE.test(model.name) || legacy.has(model.name))) {
      violations.push({
        rule: "R1",
        model: model.name,
        line: model.line,
        detail: `model name "${model.name}" is not PascalCase. Rename it (PascalCase) or, if it is a frozen legacy table, add it to legacySnakeCaseModels with a reason.`,
      });
    }

    // R2 — resolved physical table must be snake_case.
    if (!(SNAKE_CASE.test(resolvedTable) || pascalTable.has(model.name))) {
      const how = model.hasMap
        ? `@@map("${resolvedTable}") is not snake_case`
        : `PascalCase model "${model.name}" has no @@map, so its table defaults to "${resolvedTable}" (PascalCase)`;
      violations.push({
        rule: "R2",
        model: model.name,
        line: model.line,
        detail: `${how}. Add @@map("snake_case") (e.g. @@map("${toSnake(resolvedTable)}")), or, if the PascalCase table is frozen, add the model to pascalCaseTableExceptions with a reason.`,
      });
    }
  }

  // R3 — allowlist hygiene: every entry must still be a model in the schema.
  const modelNames = new Set(models.map((m) => m.name));
  const stale = [];
  for (const name of legacy) {
    if (!modelNames.has(name)) {
      stale.push({ list: "legacySnakeCaseModels", model: name });
    }
  }
  for (const name of pascalTable) {
    if (!modelNames.has(name)) {
      stale.push({ list: "pascalCaseTableExceptions", model: name });
    }
  }

  return {
    violations,
    stale,
    summary: {
      totalModels: models.length,
      pascalCaseModels: models.filter((m) => PASCAL_CASE.test(m.name)).length,
      snakeCaseModels: models.filter((m) => SNAKE_CASE.test(m.name)).length,
      pascalCaseTables: models.filter((m) => /[A-Z]/.test(m.mapValue ?? m.name))
        .length,
      legacyAllowlisted: legacy.size,
      pascalTableAllowlisted: pascalTable.size,
      violations: violations.length,
      staleAllowlistEntries: stale.length,
    },
  };
}

function toSnake(name) {
  return name
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1_$2")
    .toLowerCase();
}

// ---------------------------------------------------------------------------
// --self-test: prove the rules can FAIL (intent, not just behavior — Rule 9)
// ---------------------------------------------------------------------------

function runSelfTest() {
  const allowlist = {
    legacySnakeCaseModels: { models: ["legacy_thing"] },
    pascalCaseTableExceptions: { models: ["FrozenPascalTable"] },
  };
  const fixture = [
    // Good: PascalCase model + snake_case @@map → no violation.
    'model GoodThing {\n  id String @id\n  @@map("good_things")\n}',
    // Bad R1: snake_case model name, NOT allowlisted.
    "model bad_thing {\n  id String @id\n}",
    // Bad R2: PascalCase model, no @@map, NOT allowlisted → PascalCase table.
    "model BadTable {\n  id String @id\n}",
    // Bad R2: explicit PascalCase @@map, NOT allowlisted.
    'model AnotherBad {\n  id String @id\n  @@map("AnotherBad")\n}',
    // Allowlisted legacy → no violation despite snake_case name.
    "model legacy_thing {\n  id String @id\n}",
    // Allowlisted PascalCase table (no @@map) → no violation.
    "model FrozenPascalTable {\n  id String @id\n}",
  ].join("\n\n");

  const models = parseModels(fixture);
  const { violations, stale } = evaluate(models, allowlist);

  const assertions = [];
  const expect = (name, cond) => assertions.push({ name, pass: !!cond });

  expect("parses 6 models", models.length === 6);
  expect("flags exactly 3 violations", violations.length === 3);
  expect(
    "R1 flags bad_thing",
    violations.some((v) => v.rule === "R1" && v.model === "bad_thing")
  );
  expect(
    "R2 flags BadTable (no @@map)",
    violations.some((v) => v.rule === "R2" && v.model === "BadTable")
  );
  expect(
    "R2 flags AnotherBad (PascalCase @@map)",
    violations.some((v) => v.rule === "R2" && v.model === "AnotherBad")
  );
  expect(
    "does NOT flag GoodThing",
    !violations.some((v) => v.model === "GoodThing")
  );
  expect(
    "does NOT flag allowlisted legacy_thing",
    !violations.some((v) => v.model === "legacy_thing")
  );
  expect(
    "does NOT flag allowlisted FrozenPascalTable",
    !violations.some((v) => v.model === "FrozenPascalTable")
  );
  expect("no stale allowlist entries (both used)", stale.length === 0);
  // Negative R3: an unused allowlist entry must be reported stale.
  const stale2 = evaluate(models, {
    legacySnakeCaseModels: { models: ["legacy_thing", "ghost_model"] },
    pascalCaseTableExceptions: { models: ["FrozenPascalTable"] },
  }).stale;
  expect(
    "R3 flags ghost_model as stale",
    stale2.some((s) => s.model === "ghost_model")
  );
  // suggestion helper sanity
  expect(
    "toSnake(AnotherBad) === another_bad",
    toSnake("AnotherBad") === "another_bad"
  );

  const failed = assertions.filter((a) => !a.pass);
  for (const a of assertions) {
    console.log(`${a.pass ? "PASS" : "FAIL"}  ${a.name}`);
  }
  if (failed.length) {
    console.error(
      `\nself-test FAILED: ${failed.length}/${assertions.length} assertions`
    );
    process.exit(1);
  }
  console.log(
    `\nself-test PASSED: ${assertions.length}/${assertions.length} assertions`
  );
  process.exit(0);
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

function writeReports(report) {
  if (!existsSync(PATHS.outDir)) {
    mkdirSync(PATHS.outDir, { recursive: true });
  }
  writeFileSync(
    path.join(PATHS.outDir, "schema-naming.json"),
    JSON.stringify(report, null, 2)
  );

  const lines = [];
  lines.push("# Schema Naming Convention Lint");
  lines.push("");
  lines.push(`- Total models: **${report.summary.totalModels}**`);
  lines.push(
    `- PascalCase models: ${report.summary.pascalCaseModels} · snake_case (legacy): ${report.summary.snakeCaseModels}`
  );
  lines.push(
    `- PascalCase physical tables (frozen): ${report.summary.pascalCaseTables}`
  );
  lines.push(
    `- Violations: **${report.summary.violations}** · Stale allowlist entries: ${report.summary.staleAllowlistEntries}`
  );
  lines.push("");
  if (report.violations.length) {
    lines.push("## Violations");
    lines.push("");
    lines.push("| Rule | Model | Line | Detail |");
    lines.push("|---|---|---|---|");
    for (const v of report.violations) {
      lines.push(
        `| ${v.rule} | \`${v.model}\` | ${v.line} | ${v.detail.replace(/\|/g, "\\|")} |`
      );
    }
    lines.push("");
  } else {
    lines.push("✅ No naming violations.");
    lines.push("");
  }
  if (report.stale.length) {
    lines.push("## Stale allowlist entries (model no longer in schema)");
    lines.push("");
    for (const s of report.stale) {
      lines.push(`- \`${s.model}\` (${s.list})`);
    }
    lines.push("");
  }
  writeFileSync(path.join(PATHS.outDir, "schema-naming.md"), lines.join("\n"));
}

function main() {
  if (SELF_TEST) {
    return runSelfTest();
  }

  if (!existsSync(PATHS.prismaSchema)) {
    console.error(`schema not found: ${PATHS.prismaSchema}`);
    process.exit(2);
  }
  const allowlist = existsSync(PATHS.allowlist)
    ? JSON.parse(readFileSync(PATHS.allowlist, "utf8"))
    : {
        legacySnakeCaseModels: { models: [] },
        pascalCaseTableExceptions: { models: [] },
      };

  const schemaText = readFileSync(PATHS.prismaSchema, "utf8");
  const models = parseModels(schemaText);
  const { violations, stale, summary } = evaluate(models, allowlist);
  const report = {
    generatedAt: new Date().toISOString(),
    summary,
    violations,
    stale,
  };

  writeReports(report);

  console.log("Schema naming lint:");
  console.log(
    `  ${summary.totalModels} models — ${summary.pascalCaseModels} PascalCase, ${summary.snakeCaseModels} legacy snake_case`
  );
  console.log(
    `  ${summary.pascalCaseTables} PascalCase physical tables (allowlisted: ${summary.pascalTableAllowlisted}), ${summary.legacyAllowlisted} legacy models allowlisted`
  );

  for (const v of violations) {
    console.log(`  [${v.rule}] ${v.model} (line ${v.line}): ${v.detail}`);
  }
  for (const s of stale) {
    console.log(
      `  [R3 stale] ${s.model} no longer in schema (${s.list}) — remove from allowlist`
    );
  }

  const failures = violations.length + stale.length;
  if (failures === 0) {
    console.log("  ✅ 0 violations");
  } else {
    console.log(
      `  ⚠ ${violations.length} violations, ${stale.length} stale allowlist entries`
    );
  }

  if (STRICT && failures > 0) {
    process.exit(1);
  }
}

main();
