/**
 * Overrideable Constraints Conformance Test
 *
 * Verifies that the compiled IR declares exactly the expected set of
 * overrideable constraints — all at severity "warn" — and that every
 * other constraint is non-overrideable.
 *
 * IR structure:
 *   - ir.entities[].constraints[]  → entity-level constraints
 *   - ir.commands[]                → array-indexed command objects
 *   - ir.commands[].constraints[]  → command-level constraints
 *   - Each constraint: { name, severity, overrideable (bool|undefined) }
 */
import { beforeAll, describe, expect, it } from "vitest";
import { loadMergedPrecompiledIR } from "../runtime/loadManifests";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let ir: any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let entities: any[];
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let commands: any[];

beforeAll(() => {
  const bundle = loadMergedPrecompiledIR();
  ir = bundle.ir;
  entities = ir.entities ?? [];
  commands = ir.commands ?? [];
});

// ── 1. Exact overrideable set ─────────────────────────────────────────────

describe("Overrideable Constraints — Exact Set", () => {
  it("has exactly 5 overrideable constraints", () => {
    const overrideable: string[] = [];

    // Entity-level
    for (const entity of entities) {
      for (const c of entity.constraints ?? []) {
        if (c.overrideable) {
          overrideable.push(`${entity.name}.${c.name}`);
        }
      }
    }

    // Command-level
    for (const cmd of commands) {
      if (!cmd) {
        continue;
      }
      for (const c of cmd.constraints ?? []) {
        if (c.overrideable) {
          overrideable.push(`${cmd.entity}.${cmd.name}.${c.name}`);
        }
      }
    }

    expect(overrideable).toHaveLength(5);
  });

  it("includes EventBudget.warnOverBudget (entity-level)", () => {
    const eventBudget = entities.find(
      (e: { name: string }) => e.name === "EventBudget"
    );
    expect(eventBudget).toBeDefined();

    const constraint = (eventBudget.constraints ?? []).find(
      (c: { name: string }) => c.name === "warnOverBudget"
    );
    expect(constraint).toBeDefined();
    expect(constraint.overrideable).toBe(true);
    expect(constraint.severity).toBe("warn");
  });

  it("includes Proposal.warnHighDiscount (entity-level)", () => {
    const proposal = entities.find(
      (e: { name: string }) => e.name === "Proposal"
    );
    expect(proposal).toBeDefined();

    const constraint = (proposal.constraints ?? []).find(
      (c: { name: string }) => c.name === "warnHighDiscount"
    );
    expect(constraint).toBeDefined();
    expect(constraint.overrideable).toBe(true);
    expect(constraint.severity).toBe("warn");
  });

  it("includes Shipment.cancel.warnCancelInTransit (command-level)", () => {
    const cmd = commands.find(
      (c: { entity?: string; name?: string }) =>
        c?.entity === "Shipment" && c?.name === "cancel"
    );
    expect(cmd).toBeDefined();

    const constraint = (cmd.constraints ?? []).find(
      (c: { name: string }) => c.name === "warnCancelInTransit"
    );
    expect(constraint).toBeDefined();
    expect(constraint.overrideable).toBe(true);
    expect(constraint.severity).toBe("warn");
  });

  it("includes VendorCatalog.updatePrice.warnLargePriceIncrease (command-level)", () => {
    const cmd = commands.find(
      (c: { entity?: string; name?: string }) =>
        c?.entity === "VendorCatalog" && c?.name === "updatePrice"
    );
    expect(cmd).toBeDefined();

    const constraint = (cmd.constraints ?? []).find(
      (c: { name: string }) => c.name === "warnLargePriceIncrease"
    );
    expect(constraint).toBeDefined();
    expect(constraint.overrideable).toBe(true);
    expect(constraint.severity).toBe("warn");
  });

  it("includes VendorContract.terminate.warnEarlyTermination (command-level)", () => {
    const cmd = commands.find(
      (c: { entity?: string; name?: string }) =>
        c?.entity === "VendorContract" && c?.name === "terminate"
    );
    expect(cmd).toBeDefined();

    const constraint = (cmd.constraints ?? []).find(
      (c: { name: string }) => c.name === "warnEarlyTermination"
    );
    expect(constraint).toBeDefined();
    expect(constraint.overrideable).toBe(true);
    expect(constraint.severity).toBe("warn");
  });
});

// ── 2. All other constraints are NOT overrideable ─────────────────────────

describe("Overrideable Constraints — Non-overrideable remainder", () => {
  it("every constraint not in the overrideable set has overrideable !== true", () => {
    const overrideableNames = new Set([
      "warnOverBudget",
      "warnHighDiscount",
      "warnCancelInTransit",
      "warnLargePriceIncrease",
      "warnEarlyTermination",
    ]);

    const violations: string[] = [];

    // Entity-level
    for (const entity of entities) {
      for (const c of entity.constraints ?? []) {
        if (c.overrideable && !overrideableNames.has(c.name)) {
          violations.push(
            `entity ${entity.name}.${c.name} (overrideable=true)`
          );
        }
      }
    }

    // Command-level
    for (const cmd of commands) {
      if (!cmd) {
        continue;
      }
      for (const c of cmd.constraints ?? []) {
        if (c.overrideable && !overrideableNames.has(c.name)) {
          violations.push(
            `command ${cmd.entity}.${cmd.name}.${c.name} (overrideable=true)`
          );
        }
      }
    }

    if (violations.length > 0) {
      console.error(
        `[Overrideable] Unexpected overrideable constraints (${violations.length}):`,
        violations
      );
    }

    expect(violations).toEqual([]);
  });
});

// ── 3. All overrideable constraints have severity "warn" ──────────────────

describe("Overrideable Constraints — Severity check", () => {
  it("all overrideable constraints have severity 'warn'", () => {
    const overrideable: { location: string; severity: string }[] = [];

    // Entity-level
    for (const entity of entities) {
      for (const c of entity.constraints ?? []) {
        if (c.overrideable) {
          overrideable.push({
            location: `entity ${entity.name}.${c.name}`,
            severity: c.severity,
          });
        }
      }
    }

    // Command-level
    for (const cmd of commands) {
      if (!cmd) {
        continue;
      }
      for (const c of cmd.constraints ?? []) {
        if (c.overrideable) {
          overrideable.push({
            location: `command ${cmd.entity}.${cmd.name}.${c.name}`,
            severity: c.severity,
          });
        }
      }
    }

    const nonWarn = overrideable.filter((o) => o.severity !== "warn");

    if (nonWarn.length > 0) {
      console.error(
        "[Overrideable] Overrideable constraints with non-warn severity:",
        nonWarn
      );
    }

    expect(nonWarn).toEqual([]);
  });
});
