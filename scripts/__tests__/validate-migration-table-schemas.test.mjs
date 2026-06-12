// Tests for scripts/validate-migration-table-schemas.mjs
//
// Run with:
//   node --test scripts/__tests__/validate-migration-table-schemas.test.mjs
//
// These tests exercise the pure parser + validator functions; they do NOT
// touch the filesystem (other than importing the module itself) so they are
// safe to run from any working directory and do not require a database.
//
// Why node --test instead of vitest: the validator is plain ESM in
// scripts/ which has no vitest config of its own, and we want the test to
// be runnable directly from the repo root without depending on a workspace
// vitest entry. node --test is built in and zero-config.

import { strict as assert } from "node:assert/strict";
import { describe, it } from "node:test";

import {
  extractCreatedTables,
  extractDroppedTables,
  parseModels,
  validateModelsAgainstMigrations,
} from "../validate-migration-table-schemas.mjs";

describe("parseModels", () => {
  it("uses @@map value when present", () => {
    const schema = `
      model User {
        id Int @id
        @@map("employees")
        @@schema("tenant_staff")
      }
    `;
    const models = parseModels(schema);
    assert.equal(models.size, 1);
    assert.deepEqual(models.get("User"), {
      tableName: "employees",
      schemaName: "tenant_staff",
    });
  });

  it("falls back to the model name verbatim when @@map is absent (PascalCase case)", () => {
    // This is the case that caused the 2026-05-02 EmployeeDeduction incident:
    // model name is PascalCase, no @@map, so Prisma uses the model name as the
    // table name verbatim.
    const schema = `
      model EmployeeDeduction {
        id Int @id
        @@schema("tenant_staff")
      }
    `;
    const models = parseModels(schema);
    assert.equal(models.size, 1);
    assert.deepEqual(models.get("EmployeeDeduction"), {
      tableName: "EmployeeDeduction",
      schemaName: "tenant_staff",
    });
  });

  it("captures schemaName = null when no @@schema is declared", () => {
    const schema = `
      model Loose {
        id Int @id
      }
    `;
    const models = parseModels(schema);
    assert.deepEqual(models.get("Loose"), {
      tableName: "Loose",
      schemaName: null,
    });
  });

  it("handles nested-brace attributes without ending the block early", () => {
    // @@index([a], map: "...") contains no braces but @default(...) blocks can
    // include inline objects in future Prisma versions; the parser must rely on
    // brace depth, not on a regex that matches the first `}` it sees.
    const schema = `
      model Complex {
        id Int @id
        meta Json @default("{\\"hello\\": 1}")
        @@map("complex_things")
        @@schema("core")
      }

      model Second {
        id Int @id
        @@schema("core")
      }
    `;
    const models = parseModels(schema);
    assert.equal(models.size, 2);
    assert.equal(models.get("Complex").tableName, "complex_things");
    assert.equal(models.get("Second").tableName, "Second");
  });
});

describe("extractCreatedTables", () => {
  it("extracts schema-qualified CREATE TABLE", () => {
    const sql = `CREATE TABLE "tenant_staff"."employees" (
      tenant_id UUID,
      id UUID
    );`;
    assert.deepEqual(extractCreatedTables(sql), [
      { schema: "tenant_staff", table: "employees" },
    ]);
  });

  it("extracts CREATE TABLE IF NOT EXISTS", () => {
    const sql = `CREATE TABLE IF NOT EXISTS "tenant_staff"."EmployeeDeduction" (
      id UUID
    );`;
    assert.deepEqual(extractCreatedTables(sql), [
      { schema: "tenant_staff", table: "EmployeeDeduction" },
    ]);
  });

  it("extracts legacy CREATE TABLE without schema prefix", () => {
    const sql = `CREATE TABLE "OutboxEvent" (
      id UUID
    );`;
    assert.deepEqual(extractCreatedTables(sql), [
      { schema: null, table: "OutboxEvent" },
    ]);
  });

  it("returns multiple statements in source order", () => {
    const sql = `
      CREATE TABLE "core"."units" (id UUID);
      CREATE TABLE IF NOT EXISTS "tenant"."settings" (id UUID);
    `;
    assert.deepEqual(extractCreatedTables(sql), [
      { schema: "core", table: "units" },
      { schema: "tenant", table: "settings" },
    ]);
  });
});

describe("extractDroppedTables", () => {
  it("extracts DROP TABLE IF EXISTS ... CASCADE", () => {
    const sql = `DROP TABLE IF EXISTS "tenant_admin"."api_keys" CASCADE;`;
    assert.deepEqual(extractDroppedTables(sql), [
      { schema: "tenant_admin", table: "api_keys" },
    ]);
  });
});

describe("validateModelsAgainstMigrations", () => {
  // The validator is deliberately scoped to PascalCase models without
  // @@map(...) — the specific class that caused the 2026-05-02
  // EmployeeDeduction incident. Models with @@map are excluded because the
  // squashed-baseline migration history doesn't contain CREATE TABLE
  // statements for every table the live DB has (see the schema vs
  // migrations follow-on plan item). The narrow scope makes this gate
  // produce zero false positives on the current repo while still catching
  // the exact incident class the task names.

  it("passes when a PascalCase-no-@@map model has a matching PascalCase CREATE TABLE", () => {
    const schema = `
      model EmployeeDeduction {
        id Int @id
        @@schema("tenant_staff")
      }
    `;
    const migrations = [
      {
        name: "20260101000000_init",
        sql: `CREATE TABLE "tenant_staff"."EmployeeDeduction" (
          id UUID
        );`,
      },
    ];
    const errs = validateModelsAgainstMigrations(schema, migrations);
    assert.deepEqual(errs, []);
  });

  it("catches the EmployeeDeduction-class drift: PascalCase-no-@@map model, snake_case CREATE TABLE", () => {
    // This is the EXACT incident the task spec calls out: a model with no
    // @@map defaults to its model name verbatim (PascalCase), but the
    // hand-authored migration creates "employee_deductions" (snake_case).
    // The previous validator silently passed because it didn't cross-check
    // schema models against migration CREATE TABLE statements at all.
    const schema = `
      model EmployeeDeduction {
        id Int @id
        @@schema("tenant_staff")
      }
    `;
    const migrations = [
      {
        name: "20260502000000_add_employee_deductions",
        sql: `CREATE TABLE "tenant_staff"."employee_deductions" (
          id UUID
        );`,
      },
    ];
    const errs = validateModelsAgainstMigrations(schema, migrations);
    assert.equal(errs.length, 1);
    assert.equal(errs[0].kind, "missing-create-table");
    assert.equal(errs[0].model, "EmployeeDeduction");
    assert.equal(errs[0].expectedTable, "EmployeeDeduction");
    assert.equal(errs[0].expectedSchema, "tenant_staff");
    // Message must guide the developer toward the actual fix paths (rename
    // the migration to use the PascalCase name, OR add @@map).
    assert.match(errs[0].message, /@@map/);
    assert.match(errs[0].message, /PascalCase/);
  });

  it("flags a PascalCase-no-@@map model whose table is missing from migrations entirely", () => {
    // Different signal from the snake_case-drift case: no migration creates
    // any near-match either. Caller should know the table was never created.
    const schema = `
      model UntrackedTable {
        id Int @id
        @@schema("core")
      }
    `;
    const migrations = [
      {
        name: "0_init",
        sql: `CREATE TABLE "core"."unrelated_thing" (id UUID);`,
      },
    ];
    const errs = validateModelsAgainstMigrations(schema, migrations);
    assert.equal(errs.length, 1);
    assert.equal(errs[0].kind, "missing-create-table");
    assert.equal(errs[0].model, "UntrackedTable");
  });

  it("does NOT cross-check models with @@map (out of scope)", () => {
    // Models with @@map are intentionally excluded — the squashed-baseline
    // population of @@map models would produce a flood of false positives
    // on the current repo. Excluding them keeps this gate noise-free until
    // a dedicated schema-vs-baseline audit lands as a follow-on task.
    const schema = `
      model UserMappedExplicitly {
        id Int @id
        @@map("employees")
        @@schema("tenant_staff")
      }
    `;
    const migrations = [
      {
        name: "0_init",
        sql: `CREATE TABLE "core"."something_else" (id UUID);`,
      },
    ];
    const errs = validateModelsAgainstMigrations(schema, migrations);
    assert.deepEqual(errs, []);
  });

  it("does NOT cross-check all-lowercase-snake_case models (no PascalCase ambiguity)", () => {
    // A model literally named `audit_log` (no @@map needed) is its own
    // table name. There is no PascalCase-vs-snake_case ambiguity to detect
    // and the squashed-baseline exclusion applies.
    const schema = `
      model audit_log {
        id Int @id
        @@schema("platform")
      }
    `;
    const migrations = [
      {
        name: "0_init",
        sql: `CREATE TABLE "core"."unrelated" (id UUID);`,
      },
    ];
    const errs = validateModelsAgainstMigrations(schema, migrations);
    assert.deepEqual(errs, []);
  });

  it("treats a later DROP TABLE as removing the table from live set", () => {
    const schema = `
      model SurvivingTable {
        id Int @id
        @@schema("core")
      }
    `;
    const migrations = [
      {
        name: "20260101000000_init",
        sql: `CREATE TABLE "core"."SurvivingTable" (id UUID);
              CREATE TABLE "core"."DeletedTable" (id UUID);`,
      },
      {
        name: "20260102000000_drop",
        sql: `DROP TABLE IF EXISTS "core"."DeletedTable" CASCADE;`,
      },
    ];
    // SurvivingTable is a PascalCase-no-@@map model, but it was created and
    // never dropped — should pass. The dropped DeletedTable has no
    // corresponding model so it's correctly ignored.
    const errs = validateModelsAgainstMigrations(schema, migrations);
    assert.deepEqual(errs, []);
  });

  it("flags a PascalCase-no-@@map model whose table was created and then later dropped", () => {
    const schema = `
      model GhostTable {
        id Int @id
        @@schema("core")
      }
    `;
    const migrations = [
      {
        name: "20260101000000_init",
        sql: `CREATE TABLE "core"."GhostTable" (id UUID);`,
      },
      {
        name: "20260102000000_drop",
        sql: `DROP TABLE IF EXISTS "core"."GhostTable" CASCADE;`,
      },
    ];
    const errs = validateModelsAgainstMigrations(schema, migrations);
    assert.equal(errs.length, 1);
    assert.equal(errs[0].model, "GhostTable");
  });

  it("accepts a bare CREATE TABLE (legacy, no schema prefix) for a schema-qualified model", () => {
    // Some 0_init migrations were authored before the multi-schema setup
    // and created tables without a schema prefix. The validator should
    // accept that as a match for a model that now declares @@schema(...).
    const schema = `
      model OutboxEvent {
        id Int @id
        @@schema("tenant")
      }
    `;
    const migrations = [
      {
        name: "0_init",
        sql: `CREATE TABLE "OutboxEvent" (id UUID);`,
      },
    ];
    const errs = validateModelsAgainstMigrations(schema, migrations);
    assert.deepEqual(errs, []);
  });
});
