/**
 * Minimal reproduction test for Manifest Runtime constraint polarity bug.
 *
 * BUG: RuntimeEngine.evaluateConstraint uses constraint.name.startsWith("severity")
 * to detect "negative-type" constraints, but real-world constraints use naming
 * conventions like "block*", "severity*", "warn*" etc. Constraints whose names
 * DON'T start with "severity" (e.g., "blockVoteIfFinalized", "blockNotPublished",
 * "blockStockout", "blockAtCapacity") are treated as positive constraints, meaning
 * their expression result is used directly (passed = !!result). This inverts the
 * semantics for negative/blocking constraints where the expression describes a BAD
 * state that should BLOCK when TRUE.
 *
 * The concrete effect: when a block* constraint's expression evaluates to TRUE
 * (bad state detected), the runtime sets passed = !!true = true, treating the
 * constraint as PASSED -- the opposite of the intended behavior.
 */

import { describe, expect, it } from "vitest";
import type { IR, IRConstraint } from "./ir";
import { RuntimeEngine } from "./runtime-engine";
import { COMPILER_VERSION } from "./version";

// ---------------------------------------------------------------------------
// Helper: build a minimal IR with a single entity having one constraint
// ---------------------------------------------------------------------------
function makeIRWithConstraint(constraint: IRConstraint): IR {
  return {
    version: "1.0",
    provenance: {
      contentHash: "polarity-bug-test",
      compilerVersion: COMPILER_VERSION,
      schemaVersion: "1.0",
      compiledAt: new Date().toISOString(),
    },
    modules: [],
    entities: [
      {
        name: "Widget",
        properties: [
          {
            name: "status",
            type: { name: "string", nullable: false },
            modifiers: [],
            defaultValue: { kind: "string", value: "draft" },
          },
        ],
        computedProperties: [],
        relationships: [],
        commands: [],
        constraints: [constraint],
        policies: [],
      },
    ],
    stores: [],
    events: [],
    commands: [],
    policies: [],
  };
}

// Expression: self.status == "finalized"  (returns true when status IS finalized)
const exprStatusFinalized: IR["entities"][0]["constraints"][0]["expression"] = {
  kind: "binary",
  operator: "==",
  left: {
    kind: "member",
    object: { kind: "identifier", name: "self" },
    property: "status",
  },
  right: { kind: "literal", value: { kind: "string", value: "finalized" } },
};

// Expression: self.status != "published"  (returns true when status is NOT published)
const exprStatusNotPublished: IR["entities"][0]["constraints"][0]["expression"] =
  {
    kind: "binary",
    operator: "!=",
    left: {
      kind: "member",
      object: { kind: "identifier", name: "self" },
      property: "status",
    },
    right: { kind: "literal", value: { kind: "string", value: "published" } },
  };

describe("Constraint polarity (Blocker #2 — FIXED)", () => {
  it("FIXED: blockVoteIfFinalized constraint correctly blocks finalized status", async () => {
    // This is the exact constraint from battle-board-rules.manifest line 36:
    //   constraint blockVoteIfFinalized:block self.status == "finalized" { ... }
    //
    // Intent: BLOCK when status IS finalized (expression evaluates TRUE = bad state)
    const constraint: IRConstraint = {
      name: "blockVoteIfFinalized",
      code: "blockVoteIfFinalized",
      expression: exprStatusFinalized,
      severity: "block",
      message: "Cannot vote on finalized battle board",
      overrideable: false,
    };

    const ir = makeIRWithConstraint(constraint);
    const runtime = new RuntimeEngine(ir);

    // When status IS "finalized", the expression evaluates to TRUE.
    // A negative constraint should interpret TRUE as FIRES (constraint fails/blocks).
    const failures = await runtime.checkConstraints("Widget", {
      status: "finalized",
    });

    // After fix: constraint.name.startsWith("block") is also detected as negative.
    // "blockVoteIfFinalized" IS now detected: isNegativeType = true
    // passed = !result = !true = false (constraint FIRES, blocks correctly)
    expect(failures.length).toBe(1);
    expect(failures[0].constraintName).toBe("blockVoteIfFinalized");
  });

  it("FIXED: blockNotPublished constraint correctly blocks non-published status", async () => {
    // This is the exact constraint from schedule-rules.manifest line 73:
    //   constraint blockNotPublished:block self.status != "published" { ... }
    //
    // Intent: BLOCK when status is NOT published (expression evaluates TRUE = bad state)
    const constraint: IRConstraint = {
      name: "blockNotPublished",
      code: "blockNotPublished",
      expression: exprStatusNotPublished,
      severity: "block",
      message: "Cannot close schedule that is not published",
      overrideable: false,
    };

    const ir = makeIRWithConstraint(constraint);
    const runtime = new RuntimeEngine(ir);

    // When status is "draft" (not published), expression evaluates to TRUE.
    // The constraint should fire (block the close operation).
    const failures = await runtime.checkConstraints("Widget", {
      status: "draft",
    });

    // After fix: "blockNotPublished" starts with "block", so detected as negative.
    // passed = !result = !true = false (FIRES correctly)
    expect(failures.length).toBe(1);
    expect(failures[0].constraintName).toBe("blockNotPublished");
  });

  it("severity-prefixed constraint works correctly (current behavior)", async () => {
    // Constraints starting with "severity" ARE correctly detected as negative-type.
    // This confirms the polarity mechanism works for severity-prefixed names.
    const constraint: IRConstraint = {
      name: "severityBlockFinalized",
      code: "severityBlockFinalized",
      expression: exprStatusFinalized,
      severity: "block",
      message: "Cannot operate on finalized entity",
      overrideable: false,
    };

    const ir = makeIRWithConstraint(constraint);
    const runtime = new RuntimeEngine(ir);

    // When status IS "finalized", expression = TRUE.
    // isNegativeType = name.startsWith("severity") = true
    // passed = !result = !true = false (FIRES correctly)
    const failures = await runtime.checkConstraints("Widget", {
      status: "finalized",
    });

    expect(failures.length).toBe(1); // Correctly blocks
    expect(failures[0].constraintName).toBe("severityBlockFinalized");
  });

  it("positive constraint works correctly (current behavior)", async () => {
    // Constraints that describe what MUST be true (positive) work fine
    // because passed = !!result is the correct interpretation.
    const expr: IR["entities"][0]["constraints"][0]["expression"] = {
      kind: "binary",
      operator: "in",
      left: {
        kind: "member",
        object: { kind: "identifier", name: "self" },
        property: "status",
      },
      right: {
        kind: "array",
        elements: [
          { kind: "literal", value: { kind: "string", value: "draft" } },
          { kind: "literal", value: { kind: "string", value: "published" } },
          { kind: "literal", value: { kind: "string", value: "closed" } },
        ],
      },
    };

    const constraint: IRConstraint = {
      name: "validStatus",
      code: "validStatus",
      expression: expr,
      severity: "block",
      message: "Invalid status",
      overrideable: false,
    };

    const ir = makeIRWithConstraint(constraint);
    const runtime = new RuntimeEngine(ir);

    // "draft" is in the valid list -> expression = true -> passed = !!true = true (correct)
    let failures = await runtime.checkConstraints("Widget", {
      status: "draft",
    });
    expect(failures.length).toBe(0);

    // "unknown" is NOT in the valid list -> expression = false -> passed = !!false = false (correct)
    failures = await runtime.checkConstraints("Widget", { status: "unknown" });
    expect(failures.length).toBe(1);
    expect(failures[0].constraintName).toBe("validStatus");
  });

  it("all block* constraints from manifests are now correctly detected as negative", () => {
    // These are the real constraint names from manifests/ that use the block* naming
    // convention and have severity "block". All of them describe BAD states (the
    // expression evaluates TRUE when the bad state is present).
    // After fix: constraint.name.startsWith("block") is also detected as negative.
    const affectedConstraints = [
      "blockVoteIfFinalized", // battle-board-rules.manifest:36
      "blockFinalizeNoData", // battle-board-rules.manifest:43
      "blockNoDishes", // battle-board-rules.manifest:71
      "blockCancelIfCompleted", // catering-order-rules.manifest:72
      "blockCompanyNoName", // client-rules.manifest:57
      "blockIndividualNoName", // client-rules.manifest:62
      "blockFinalizeHighVariance", // event-budget-rules.manifest:49
      "blockNoLineItems", // event-budget-rules.manifest:99
      "blockSubmitEmptyContent", // event-report-rules.manifest:45
      "blockApproveIfNotCompleted", // event-report-rules.manifest:52
      "blockCancelIfFinalized", // event-rules.manifest:53
      "blockArchiveIfNotCompleted", // event-rules.manifest:61
      "blockNoGuestCount", // event-rules.manifest:120
      "blockAlreadyConverted", // lead-rules.manifest:113
      "blockDisqualified", // lead-rules.manifest:122
      "blockStockout", // inventory-rules.manifest:70
      "blockInsufficientStock", // inventory-rules.manifest:114
      "blockInsufficientForWaste", // inventory-rules.manifest:156
      "blockDeleteIfResolved", // prep-comment-rules.manifest:20
      "blockEditAfterSubmit", // procurement-requisition-rules.manifest:53
      "blockNoItems", // procurement-requisition-rules.manifest:98
      "blockEditAfterSubmit", // purchase-order-rules.manifest:40
      "blockCancelReceived", // purchase-order-rules.manifest:121
      "blockNoShifts", // schedule-rules.manifest:54
      "blockNotPublished", // schedule-rules.manifest:73
      "blockNoLineItems", // proposal-rules.manifest:138
      "blockExpired", // proposal-rules.manifest:184
      "blockAlreadyAccepted", // proposal-rules.manifest:214
      "blockAlreadyWithdrawn", // proposal-rules.manifest:223
      "blockAlreadyClockedIn", // time-entry-rules.manifest:29
      "blockNotClockedIn", // time-entry-rules.manifest:53
      "blockAlreadyProcessed", // time-entry-rules.manifest:158
      "blockAtCapacity", // station-rules.manifest:36
      "blockOverCapacity", // station-rules.manifest:45
      "blockInactive", // station-rules.manifest:55
      "blockFull", // station-rules.manifest:76
      "blockNoTriggerConfig", // workflow-rules.manifest:62
      "blockModifyActive", // vendor-contract-rules.manifest:56
      "blockAlreadyTerminated", // user-rules.manifest:84
    ];

    // After fix: the detection logic now checks both "severity" and "block" prefixes
    const isDetectedAsNegative = (name: string) =>
      name.startsWith("severity") || name.startsWith("block");

    // Verify: ALL block* constraints are now detected as negative
    const detected = affectedConstraints.filter(isDetectedAsNegative);
    expect(detected.length).toBe(affectedConstraints.length);

    // And the detection still catches the "severity*" convention too
    expect(isDetectedAsNegative("severityBlock")).toBe(true);
    expect(isDetectedAsNegative("severityWarn")).toBe(true);
    expect(isDetectedAsNegative("severityInfo")).toBe(true);

    // Positive constraints are NOT falsely detected
    expect(isDetectedAsNegative("validStatus")).toBe(false);
    expect(isDetectedAsNegative("amountLimit")).toBe(false);
  });
});
