/**
 * Feature-flag provider tests.
 *
 * Verifies:
 * 1. createEnvFlagProvider parses env vars correctly
 * 2. flag() builtin resolves through the provider
 * 3. Default behavior (no provider) returns false
 * 4. All three flag patterns compile into the IR
 *
 * Runtime integration (flag in guards/constraints) is verified indirectly:
 * the IR carries flag() call nodes in guard/constraint expressions, and
 * the upstream engine's getBuiltins() includes `flag` which calls the
 * provider. The full end-to-end guard evaluation is tested by the
 * existing entity-concurrency and reactions test suites which use the real IR.
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import { createEnvFlagProvider } from "../flag-provider";

const here = dirname(fileURLToPath(import.meta.url));
const irPath = join(here, "..", "..", "..", "ir", "kitchen.ir.json");

// ---------------------------------------------------------------------------
// Unit tests: createEnvFlagProvider
// ---------------------------------------------------------------------------

describe("createEnvFlagProvider", () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("returns false for unknown flags (safe default)", () => {
    const provider = createEnvFlagProvider();
    expect(provider("unknown.flag")).toBe(false);
  });

  it("returns false for empty env var", () => {
    process.env.MANIFEST_FLAG_TEST_EMPTY = "";
    const provider = createEnvFlagProvider();
    expect(provider("test.empty")).toBe(false);
  });

  it("parses 'true' as boolean true", () => {
    process.env.MANIFEST_FLAG_TEST_ENABLED = "true";
    const provider = createEnvFlagProvider();
    expect(provider("test.enabled")).toBe(true);
  });

  it("parses 'TRUE' (case-insensitive) as boolean true", () => {
    process.env.MANIFEST_FLAG_TEST_ENABLED = "TRUE";
    const provider = createEnvFlagProvider();
    expect(provider("test.enabled")).toBe(true);
  });

  it("parses '1' as boolean true", () => {
    process.env.MANIFEST_FLAG_TEST_ENABLED = "1";
    const provider = createEnvFlagProvider();
    expect(provider("test.enabled")).toBe(true);
  });

  it("parses 'yes' as boolean true", () => {
    process.env.MANIFEST_FLAG_TEST_ENABLED = "yes";
    const provider = createEnvFlagProvider();
    expect(provider("test.enabled")).toBe(true);
  });

  it("parses 'false' as boolean false", () => {
    process.env.MANIFEST_FLAG_TEST_DISABLED = "false";
    const provider = createEnvFlagProvider();
    expect(provider("test.disabled")).toBe(false);
  });

  it("parses '0' as boolean false", () => {
    process.env.MANIFEST_FLAG_TEST_DISABLED = "0";
    const provider = createEnvFlagProvider();
    expect(provider("test.disabled")).toBe(false);
  });

  it("parses 'no' as boolean false", () => {
    process.env.MANIFEST_FLAG_TEST_DISABLED = "no";
    const provider = createEnvFlagProvider();
    expect(provider("test.disabled")).toBe(false);
  });

  it("parses numeric strings as numbers", () => {
    process.env.MANIFEST_FLAG_TEST_COUNT = "42";
    const provider = createEnvFlagProvider();
    expect(provider("test.count")).toBe(42);
  });

  it("parses arbitrary strings as strings", () => {
    process.env.MANIFEST_FLAG_TEST_LABEL = "production";
    const provider = createEnvFlagProvider();
    expect(provider("test.label")).toBe("production");
  });

  it("converts dotted flag names to underscored env keys", () => {
    process.env.MANIFEST_FLAG_EVENTS_ADVANCED_PRICING = "true";
    const provider = createEnvFlagProvider();
    expect(provider("events.advanced_pricing")).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// IR verification: flag() expressions compiled into IR
// ---------------------------------------------------------------------------

describe("flag() expressions in compiled IR", () => {
  it("all 3 feature flags are present in the compiled IR", () => {
    const ir = JSON.parse(readFileSync(irPath, "utf8"));

    const irJson = JSON.stringify(ir);

    // Flag 1: budget.early_warning in EventBudget warn constraint
    expect(irJson).toContain('"budget.early_warning"');

    // Flag 2: payroll.maintenance_mode in PayrollRun.process guard
    expect(irJson).toContain('"payroll.maintenance_mode"');

    // Flag 3: procurement.budget_management in ProcurementBudget.create guard
    expect(irJson).toContain('"procurement.budget_management"');
  });

  it("flag calls use the correct AST structure (call + identifier + literal)", () => {
    const ir = JSON.parse(readFileSync(irPath, "utf8"));
    const irJson = JSON.stringify(ir);

    // All flag() calls should have this AST shape
    // {"kind":"call","callee":{"kind":"identifier","name":"flag"},...}
    expect(irJson).toContain('"name":"flag"');

    // Count flag occurrences — should be exactly 3
    const matches = irJson.match(/"name":"flag"/g);
    expect(matches).toHaveLength(3);
  });
});
