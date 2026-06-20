// Tests for scripts/validate-generated-migration.mjs
//
// Run with:
//   node --test scripts/__tests__/validate-generated-migration.test.mjs
//
// Pure-helper tests only — no DB, no filesystem. Mirrors the node --test
// convention used by validate-migration-table-schemas.test.mjs so both
// script-level suites run under the same harness.

import { strict as assert } from "node:assert/strict";
import { describe, it } from "node:test";

import {
  isNoOp,
  stripSqlComments,
  extractReferencedTables,
  findMigrationDirByName,
  validateGeneratedMigration,
} from "../validate-generated-migration.mjs";

describe("stripSqlComments", () => {
  it("strips line comments and trims whitespace", () => {
    const sql = "-- CreateTable\nCREATE TABLE \"a\" (\n  id UUID\n);-- trailing";
    assert.equal(stripSqlComments(sql), 'CREATE TABLE "a" (\n  id UUID\n);');
  });

  it("strips block comments", () => {
    const sql = "/* multi\nline */ CREATE TABLE \"a\" (id UUID);";
    assert.equal(stripSqlComments(sql), 'CREATE TABLE "a" (id UUID);');
  });

  it("returns empty string for a comment-only migration (no-op)", () => {
    const sql = "-- CreateTable\n-- nothing to do\n";
    assert.equal(stripSqlComments(sql), "");
  });
});

describe("isNoOp", () => {
  it("flags an empty migration as a no-op", () => {
    assert.equal(isNoOp(""), true);
    assert.equal(isNoOp("-- just a comment\n"), true);
  });

  it("flags a comment-only migration as a no-op", () => {
    assert.equal(
      isNoOp("-- CreateTable\n-- AlterTable\n"),
      true,
    );
  });

  it("does not flag a real CREATE TABLE migration", () => {
    const sql = `CREATE TABLE "core"."units" (id UUID);`;
    assert.equal(isNoOp(sql), false);
  });

  it("does not flag an ALTER TABLE migration", () => {
    const sql = `ALTER TABLE "core"."units" ADD COLUMN "name" TEXT;`;
    assert.equal(isNoOp(sql), false);
  });

  it("flags a SELECT-only body (no DDL)", () => {
    assert.equal(isNoOp("SELECT 1;\nNOTIFY foo;"), true);
  });
});

describe("extractReferencedTables", () => {
  it("extracts CREATE TABLE targets", () => {
    const sql = `CREATE TABLE "core"."units" (id UUID);`;
    assert.deepEqual(extractReferencedTables(sql), [
      { schema: "core", table: "units" },
    ]);
  });

  it("extracts ALTER TABLE targets", () => {
    const sql = `ALTER TABLE "core"."units" ADD COLUMN "name" TEXT;`;
    assert.deepEqual(extractReferencedTables(sql), [
      { schema: "core", table: "units" },
    ]);
  });

  it("extracts CREATE INDEX ... ON targets", () => {
    const sql = `CREATE INDEX "idx" ON "core"."units" ("id");`;
    assert.deepEqual(extractReferencedTables(sql), [
      { schema: "core", table: "units" },
    ]);
  });

  it("returns multiple in source order", () => {
    const sql = `
      CREATE TABLE "core"."units" (id UUID);
      CREATE UNIQUE INDEX "u" ON "core"."units" ("slug");
    `;
    assert.deepEqual(extractReferencedTables(sql), [
      { schema: "core", table: "units" },
      { schema: "core", table: "units" },
    ]);
  });
});

describe("findMigrationDirByName", () => {
  it("returns null for a nonexistent directory", () => {
    assert.equal(
      findMigrationDirByName("/does/not/exist/xyz", "anything"),
      null,
    );
  });

  it("locates a migration dir by name suffix (real repo migration)", () => {
    // The repo ships this migration dir; resolve it by its --name suffix.
    const path = findMigrationDirByName(
      "packages/database/prisma/migrations",
      "manifest_runtime_tables",
    );
    assert.ok(path, "expected to find the manifest_runtime_tables migration");
    assert.match(path, /manifest_runtime_tables/);
  });

  it("matches case-insensitively (Prisma lowercases --name)", () => {
    const path = findMigrationDirByName(
      "packages/database/prisma/migrations",
      "MANIFEST_RUNTIME_TABLES",
    );
    assert.ok(path);
  });

  it("returns null when no migration matches the suffix", () => {
    assert.equal(
      findMigrationDirByName(
        "packages/database/prisma/migrations",
        "this_name_does_not_exist_xyz",
      ),
      null,
    );
  });
});

describe("validateGeneratedMigration", () => {
  const schemaWithMap = `
    model Unit {
      id String @id
      @@map("units")
      @@schema("core")
    }
  `;
  const schemaNoMapPascal = `
    model EmployeeDeduction {
      id String @id
      @@schema("tenant_staff")
    }
  `;

  it("passes when a CREATE TABLE matches a @@map'd model", () => {
    const sql = `CREATE TABLE "core"."units" (id TEXT);`;
    const { errors, warnings } = validateGeneratedMigration(schemaWithMap, sql);
    assert.deepEqual(errors, []);
    assert.deepEqual(warnings, []);
  });

  it("errors on a CREATE TABLE with no matching model (orphaned table)", () => {
    const sql = `CREATE TABLE "core"."widgets" (id TEXT);`;
    const { errors } = validateGeneratedMigration(schemaWithMap, sql);
    assert.equal(errors.length, 1);
    assert.equal(errors[0].kind, "orphaned-table");
    assert.match(errors[0].message, /widgets/);
  });

  it("allows DROP TABLE of a table no model declares (model removal)", () => {
    const sql = `DROP TABLE IF EXISTS "core"."legacy_widgets" CASCADE;`;
    const { errors } = validateGeneratedMigration(schemaWithMap, sql);
    assert.deepEqual(errors, []);
  });

  it("flags a PascalCase CREATE TABLE for a model without @@map (warning)", () => {
    // EmployeeDeduction risk class: no @@map → Prisma uses the PascalCase model
    // name verbatim. WARNING (review), not a hard error.
    const sql = `CREATE TABLE "tenant_staff"."EmployeeDeduction" (id TEXT);`;
    const { errors, warnings } = validateGeneratedMigration(
      schemaNoMapPascal,
      sql,
    );
    assert.deepEqual(errors, []);
    assert.equal(warnings.length, 1);
    assert.equal(warnings[0].kind, "pascalcase-no-map");
    assert.match(warnings[0].message, /@@map/);
  });

  it("does not warn when a PascalCase model has @@map", () => {
    const schema = `
      model Widget {
        id String @id
        @@map("widgets")
        @@schema("core")
      }
    `;
    const sql = `CREATE TABLE "core"."widgets" (id TEXT);`;
    const { warnings } = validateGeneratedMigration(schema, sql);
    assert.deepEqual(warnings, []);
  });

  it("checks multiple CREATE TABLE statements in one migration", () => {
    const sql = `
      CREATE TABLE "core"."units" (id TEXT);
      CREATE TABLE "core"."ghosts" (id TEXT);
    `;
    const { errors } = validateGeneratedMigration(schemaWithMap, sql);
    assert.equal(errors.length, 1);
    assert.match(errors[0].message, /ghosts/);
  });

  it("accepts a legacy bare CREATE TABLE (no schema prefix) for a schema-qualified model", () => {
    const schema = `
      model OutboxEvent {
        id String @id
        @@schema("tenant")
      }
    `;
    const sql = `CREATE TABLE "OutboxEvent" (id TEXT);`;
    const { errors } = validateGeneratedMigration(schema, sql);
    assert.deepEqual(errors, []);
  });
});
