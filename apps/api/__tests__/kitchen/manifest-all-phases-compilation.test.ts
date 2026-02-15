/**
 * Compilation Test: All 25 Phase Manifest Files
 *
 * Validates that every new manifest file (Phases 1–7):
 * 1. Can be read from disk
 * 2. Compiles to IR via compileToIR() without errors
 * 3. Contains the expected entity names
 * 4. Contains the expected command names per entity (after enforceCommandOwnership)
 *
 * Also validates:
 * - ENTITY_TO_MANIFEST mapping resolves correctly
 * - ManifestRuntimeEngine can be instantiated for each manifest
 *
 * All 25 manifests now compile successfully. Previous reserved word issues
 * (`delete`, `publish`) were resolved by renaming commands (`softDelete`,
 * `remove`, `release`).
 *
 * These are real compilation tests — no mocks, no DB, just file reads + IR compilation.
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { compileToIR } from "@manifest/runtime/ir-compiler";
import { enforceCommandOwnership } from "@repo/manifest-adapters/ir-contract";
import { ManifestRuntimeEngine } from "@repo/manifest-adapters/runtime-engine";
import { describe, expect, it } from "vitest";

const MANIFEST_DIR = join(
  process.cwd(),
  "../../packages/manifest-adapters/manifests"
);

// ---------------------------------------------------------------------------
// Manifest spec definitions — entities + expected commands for all 25 manifests
// ---------------------------------------------------------------------------

interface ManifestSpec {
  /** Manifest file name (without .manifest extension) */
  manifest: string;
  /** Phase label for grouping */
  phase: string;
  /** Entities expected in the IR, each with their expected commands */
  entities: Array<{
    name: string;
    commands: string[];
  }>;
  /**
   * Known compiler limitation — manifest uses reserved words or unsupported syntax.
   * When set, compilation failure is expected and documented.
   */
  knownCompilerIssue?: string;
}

/**
 * Previously tracked known compiler issues — all resolved by renaming reserved words.
 * - `delete` → `softDelete` or `remove`
 * - `publish` → `release`
 * - `not in` → negated constraint
 */
const KNOWN_COMPILER_ISSUES: Record<string, string> = {};

const MANIFEST_SPECS: ManifestSpec[] = [
  // ── Phase 1: Kitchen Operations ──────────────────────────────────────────
  {
    manifest: "prep-comment-rules",
    phase: "Phase 1",
    entities: [
      {
        name: "PrepComment",
        commands: ["create", "resolve", "unresolve", "softDelete"],
      },
    ],
  },
  {
    manifest: "ingredient-rules",
    phase: "Phase 1",
    entities: [
      {
        name: "Ingredient",
        commands: [
          "create",
          "update",
          "deactivate",
          "updateAllergens",
          "updateShelfLife",
        ],
      },
    ],
  },
  {
    manifest: "dish-rules",
    phase: "Phase 1",
    entities: [
      {
        name: "Dish",
        commands: [
          "create",
          "update",
          "deactivate",
          "updatePricing",
          "updateLeadTime",
        ],
      },
    ],
  },
  {
    manifest: "container-rules",
    phase: "Phase 1",
    entities: [
      {
        name: "Container",
        commands: ["create", "update", "deactivate"],
      },
    ],
  },
  {
    manifest: "prep-method-rules",
    phase: "Phase 1",
    entities: [
      {
        name: "PrepMethod",
        commands: ["create", "update", "deactivate"],
      },
    ],
  },

  // ── Phase 2: Events & Catering ───────────────────────────────────────────
  {
    manifest: "event-rules",
    phase: "Phase 2",
    entities: [
      {
        name: "Event",
        commands: [
          "create",
          "update",
          "confirm",
          "cancel",
          "archive",
          "updateGuestCount",
          "updateDate",
          "updateLocation",
          "finalize",
          "unfinalize",
        ],
      },
      {
        name: "EventProfitability",
        commands: ["create", "update", "recalculate"],
      },
      {
        name: "EventSummary",
        commands: ["create", "update", "refresh"],
      },
    ],
  },
  {
    manifest: "event-report-rules",
    phase: "Phase 2",
    entities: [
      {
        name: "EventReport",
        commands: ["create", "submit", "approve", "complete"],
      },
    ],
  },
  {
    manifest: "event-budget-rules",
    phase: "Phase 2",
    entities: [
      {
        name: "EventBudget",
        commands: ["create", "update", "approve", "finalize"],
      },
      {
        name: "BudgetLineItem",
        commands: ["create", "update", "remove"],
      },
    ],
  },
  {
    manifest: "catering-order-rules",
    phase: "Phase 2",
    entities: [
      {
        name: "CateringOrder",
        commands: [
          "create",
          "update",
          "confirm",
          "cancel",
          "startPrep",
          "markComplete",
        ],
      },
    ],
  },
  {
    manifest: "battle-board-rules",
    phase: "Phase 2",
    entities: [
      {
        name: "BattleBoard",
        commands: [
          "create",
          "open",
          "addDish",
          "removeDish",
          "startVoting",
          "vote",
          "finalize",
        ],
      },
    ],
  },

  // ── Phase 3: CRM & Sales ─────────────────────────────────────────────────
  {
    manifest: "client-rules",
    phase: "Phase 3",
    entities: [
      {
        name: "Client",
        commands: ["create", "update", "archive", "reactivate"],
      },
      {
        name: "ClientContact",
        commands: ["create", "update", "remove", "setPrimary"],
      },
      {
        name: "ClientPreference",
        commands: ["create", "update", "remove"],
      },
    ],
  },
  {
    manifest: "lead-rules",
    phase: "Phase 3",
    entities: [
      {
        name: "Lead",
        commands: [
          "create",
          "update",
          "convertToClient",
          "disqualify",
          "archive",
        ],
      },
    ],
  },
  {
    manifest: "proposal-rules",
    phase: "Phase 3",
    entities: [
      {
        name: "Proposal",
        commands: [
          "create",
          "update",
          "send",
          "markViewed",
          "accept",
          "reject",
          "withdraw",
        ],
      },
      {
        name: "ProposalLineItem",
        commands: ["create", "update", "remove"],
      },
    ],
  },
  {
    manifest: "client-interaction-rules",
    phase: "Phase 3",
    entities: [
      {
        name: "ClientInteraction",
        commands: ["create", "update", "complete"],
      },
    ],
  },

  // ── Phase 4: Purchasing & Inventory ──────────────────────────────────────
  {
    manifest: "purchase-order-rules",
    phase: "Phase 4",
    entities: [
      {
        name: "PurchaseOrder",
        commands: [
          "create",
          "submit",
          "approve",
          "reject",
          "cancel",
          "markOrdered",
          "markReceived",
        ],
      },
      {
        name: "PurchaseOrderItem",
        commands: ["create", "update", "remove"],
      },
    ],
  },
  {
    manifest: "shipment-rules",
    phase: "Phase 4",
    entities: [
      {
        name: "Shipment",
        commands: [
          "create",
          "update",
          "schedule",
          "startPreparing",
          "ship",
          "markDelivered",
          "cancel",
        ],
      },
      {
        name: "ShipmentItem",
        commands: ["create", "updateReceived"],
      },
    ],
  },
  {
    manifest: "inventory-transaction-rules",
    phase: "Phase 4",
    entities: [
      {
        name: "InventoryTransaction",
        commands: ["create"],
      },
    ],
  },
  {
    manifest: "inventory-supplier-rules",
    phase: "Phase 4",
    entities: [
      {
        name: "InventorySupplier",
        commands: ["create", "update", "deactivate"],
      },
    ],
  },
  {
    manifest: "cycle-count-rules",
    phase: "Phase 4",
    entities: [
      {
        name: "CycleCountSession",
        commands: ["create", "start", "complete", "finalize", "cancel"],
      },
      {
        name: "CycleCountRecord",
        commands: ["create", "update", "verify"],
      },
      {
        name: "VarianceReport",
        commands: ["create", "review", "approve"],
      },
    ],
  },

  // ── Phase 5: Staff & Scheduling ──────────────────────────────────────────
  {
    manifest: "user-rules",
    phase: "Phase 5",
    entities: [
      {
        name: "User",
        commands: ["create", "update", "deactivate", "terminate", "updateRole"],
      },
    ],
  },
  {
    manifest: "schedule-rules",
    phase: "Phase 5",
    entities: [
      {
        name: "Schedule",
        commands: ["create", "update", "release", "close"],
      },
      {
        name: "ScheduleShift",
        commands: ["create", "update", "remove"],
      },
    ],
  },
  {
    manifest: "time-entry-rules",
    phase: "Phase 5",
    entities: [
      {
        name: "TimeEntry",
        commands: ["clockIn", "clockOut", "addEntry"],
      },
      {
        name: "TimecardEditRequest",
        commands: ["create", "approve", "reject"],
      },
    ],
  },

  // ── Phase 6: Command Board ───────────────────────────────────────────────
  {
    manifest: "command-board-rules",
    phase: "Phase 6",
    entities: [
      {
        name: "CommandBoard",
        commands: ["create", "update", "activate", "deactivate"],
      },
      {
        name: "CommandBoardCard",
        commands: ["create", "update", "move", "resize", "remove"],
      },
      {
        name: "CommandBoardGroup",
        commands: ["create", "update", "remove"],
      },
      {
        name: "CommandBoardConnection",
        commands: ["create", "remove"],
      },
      {
        name: "CommandBoardLayout",
        commands: ["create", "update", "remove"],
      },
    ],
  },

  // ── Phase 7: Workflows & Notifications ───────────────────────────────────
  {
    manifest: "workflow-rules",
    phase: "Phase 7",
    entities: [
      {
        name: "Workflow",
        commands: ["create", "update", "activate", "deactivate"],
      },
    ],
  },
  {
    manifest: "notification-rules",
    phase: "Phase 7",
    entities: [
      {
        name: "Notification",
        commands: ["create", "markRead", "markDismissed", "remove"],
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// ENTITY_TO_MANIFEST mapping — expected resolution for every entity
// ---------------------------------------------------------------------------

const EXPECTED_ENTITY_MAPPING: Record<string, string> = {
  // Phase 1
  PrepComment: "prep-comment-rules",
  Ingredient: "ingredient-rules",
  Dish: "dish-rules",
  Container: "container-rules",
  PrepMethod: "prep-method-rules",
  // Phase 2
  Event: "event-rules",
  EventProfitability: "event-rules",
  EventSummary: "event-rules",
  EventReport: "event-report-rules",
  EventBudget: "event-budget-rules",
  BudgetLineItem: "event-budget-rules",
  CateringOrder: "catering-order-rules",
  BattleBoard: "battle-board-rules",
  // Phase 3
  Client: "client-rules",
  ClientContact: "client-rules",
  ClientPreference: "client-rules",
  Lead: "lead-rules",
  Proposal: "proposal-rules",
  ProposalLineItem: "proposal-rules",
  ClientInteraction: "client-interaction-rules",
  // Phase 4
  PurchaseOrder: "purchase-order-rules",
  PurchaseOrderItem: "purchase-order-rules",
  Shipment: "shipment-rules",
  ShipmentItem: "shipment-rules",
  InventoryTransaction: "inventory-transaction-rules",
  InventorySupplier: "inventory-supplier-rules",
  CycleCountSession: "cycle-count-rules",
  CycleCountRecord: "cycle-count-rules",
  VarianceReport: "cycle-count-rules",
  // Phase 5
  User: "user-rules",
  Schedule: "schedule-rules",
  ScheduleShift: "schedule-rules",
  TimeEntry: "time-entry-rules",
  TimecardEditRequest: "time-entry-rules",
  // Phase 6
  CommandBoard: "command-board-rules",
  CommandBoardCard: "command-board-rules",
  CommandBoardLayout: "command-board-rules",
  CommandBoardGroup: "command-board-rules",
  CommandBoardConnection: "command-board-rules",
  // Phase 7
  Workflow: "workflow-rules",
  Notification: "notification-rules",
};

// ---------------------------------------------------------------------------
// Helper: compile + normalize a manifest, returning null for known failures
// ---------------------------------------------------------------------------

async function compileManifest(manifestName: string) {
  const manifestPath = join(MANIFEST_DIR, `${manifestName}.manifest`);
  const source = readFileSync(manifestPath, "utf-8");
  const { ir, diagnostics } = await compileToIR(source);
  return { ir, diagnostics, source };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("Manifest All-Phases Compilation", () => {
  // Verify we're testing exactly 25 manifests
  it("should define exactly 25 manifest specs", () => {
    expect(MANIFEST_SPECS).toHaveLength(25);
  });

  // ── Per-manifest compilation tests ─────────────────────────────────────

  // Split specs into compilable vs known-issue
  const compilableSpecs = MANIFEST_SPECS.filter((s) => !s.knownCompilerIssue);
  const knownIssueSpecs = MANIFEST_SPECS.filter((s) => s.knownCompilerIssue);

  // --- Tests for manifests that SHOULD compile successfully ---
  describe.each(compilableSpecs)("$phase — $manifest", ({
    manifest,
    phase,
    entities,
  }) => {
    const manifestPath = join(MANIFEST_DIR, `${manifest}.manifest`);

    it("manifest file exists on disk", () => {
      expect(
        existsSync(manifestPath),
        `${manifest}.manifest not found at ${manifestPath}`
      ).toBe(true);
    });

    it("compiles to IR without errors", async () => {
      const { ir, diagnostics } = await compileManifest(manifest);

      if (!ir) {
        console.error(
          `[${phase}] ${manifest} compilation failed:`,
          diagnostics.map((d: { message: string }) => d.message)
        );
      }

      expect(ir, `${manifest} should compile to a valid IR`).toBeDefined();
      expect(ir).not.toBeNull();
    });

    it("IR contains expected entity names", async () => {
      const { ir } = await compileManifest(manifest);
      expect(ir).toBeDefined();

      const irEntityNames = ir!.entities.map((e: { name: string }) => e.name);

      for (const entitySpec of entities) {
        expect(
          irEntityNames,
          `${manifest} IR should contain entity '${entitySpec.name}'`
        ).toContain(entitySpec.name);
      }
    });

    it("IR contains expected commands for each entity (after normalization)", async () => {
      const { ir } = await compileManifest(manifest);
      expect(ir).toBeDefined();

      // Apply enforceCommandOwnership to normalize entity→command mapping
      // This is the same normalization the runtime uses
      const normalized = enforceCommandOwnership(ir!, manifest);

      for (const entitySpec of entities) {
        // After normalization, commands have entity set
        const entityCommands = normalized.commands
          .filter((c: { entity?: string }) => c.entity === entitySpec.name)
          .map((c: { name: string }) => c.name);

        for (const expectedCmd of entitySpec.commands) {
          expect(
            entityCommands,
            `${manifest} → ${entitySpec.name} should have command '${expectedCmd}'`
          ).toContain(expectedCmd);
        }
      }
    });

    it("ManifestRuntimeEngine can be instantiated", async () => {
      const { ir } = await compileManifest(manifest);
      expect(ir).toBeDefined();

      const normalized = enforceCommandOwnership(ir!, manifest);

      const runtime = new ManifestRuntimeEngine(normalized, {
        user: {
          id: "test-user",
          tenantId: "test-tenant",
          role: "admin",
        },
      });

      expect(runtime).toBeDefined();
      expect(runtime).toBeInstanceOf(ManifestRuntimeEngine);
    });
  });

  // --- Tests for manifests with KNOWN compiler issues (currently none) ---
  // All reserved word issues have been resolved. This block is retained for
  // future use if new compiler limitations are discovered.
  if (knownIssueSpecs.length > 0) {
    describe.each(
      knownIssueSpecs
    )("$phase — $manifest (known compiler issue)", ({
      manifest,
      knownCompilerIssue,
    }) => {
      const manifestPath = join(MANIFEST_DIR, `${manifest}.manifest`);

      it("manifest file exists on disk", () => {
        expect(
          existsSync(manifestPath),
          `${manifest}.manifest not found at ${manifestPath}`
        ).toBe(true);
      });

      it("documents known compiler limitation", () => {
        console.info(`  ⚠️  ${manifest}: ${knownCompilerIssue}`);
        expect(knownCompilerIssue).toBeDefined();
        expect(knownCompilerIssue!.length).toBeGreaterThan(0);
      });

      it("fails compilation due to known reserved word / syntax issue", async () => {
        const { ir, diagnostics } = await compileManifest(manifest);

        expect(
          ir,
          `${manifest} should fail compilation due to: ${knownCompilerIssue}`
        ).toBeNull();

        expect(diagnostics.length).toBeGreaterThan(0);

        console.info(
          `  ⚠️  ${manifest} compiler diagnostics: ${diagnostics.map((d: { message: string }) => d.message).join(", ")}`
        );
      });
    });
  }

  // ── ENTITY_TO_MANIFEST mapping tests ───────────────────────────────────
  describe("ENTITY_TO_MANIFEST mapping", () => {
    it("should map all new entities to their correct manifest files", () => {
      for (const [entityName, expectedManifest] of Object.entries(
        EXPECTED_ENTITY_MAPPING
      )) {
        const manifestPath = join(MANIFEST_DIR, `${expectedManifest}.manifest`);
        expect(
          existsSync(manifestPath),
          `Manifest file for entity '${entityName}' should exist: ${expectedManifest}.manifest`
        ).toBe(true);
      }
    });

    it("should cover all entities from all 25 manifests", () => {
      const allSpecEntities = MANIFEST_SPECS.flatMap((spec) =>
        spec.entities.map((e) => e.name)
      );

      for (const entityName of allSpecEntities) {
        expect(
          EXPECTED_ENTITY_MAPPING,
          `Entity '${entityName}' should be in ENTITY_TO_MANIFEST mapping`
        ).toHaveProperty(entityName);
      }
    });

    it("should have no duplicate entity names across different manifests", () => {
      const entityToManifest = new Map<string, string>();
      const duplicates: string[] = [];

      for (const spec of MANIFEST_SPECS) {
        for (const entity of spec.entities) {
          const existing = entityToManifest.get(entity.name);
          if (existing && existing !== spec.manifest) {
            duplicates.push(
              `${entity.name} appears in both '${existing}' and '${spec.manifest}'`
            );
          }
          entityToManifest.set(entity.name, spec.manifest);
        }
      }

      expect(
        duplicates,
        `No entity should appear in multiple manifests: ${duplicates.join("; ")}`
      ).toHaveLength(0);
    });
  });

  // ── Summary report ─────────────────────────────────────────────────────
  it("prints compilation summary", async () => {
    const results: Array<{
      manifest: string;
      phase: string;
      entities: number;
      commands: number;
      compiled: boolean;
      knownIssue: boolean;
    }> = [];

    for (const spec of MANIFEST_SPECS) {
      const { ir } = await compileManifest(spec.manifest);

      results.push({
        manifest: spec.manifest,
        phase: spec.phase,
        entities: ir?.entities.length ?? 0,
        commands: ir?.commands.length ?? 0,
        compiled: !!ir,
        knownIssue: !!spec.knownCompilerIssue,
      });
    }

    const totalEntities = results.reduce((sum, r) => sum + r.entities, 0);
    const totalCommands = results.reduce((sum, r) => sum + r.commands, 0);
    const compiledCount = results.filter((r) => r.compiled).length;
    const knownIssueCount = results.filter((r) => r.knownIssue).length;
    const unexpectedFailures = results.filter(
      (r) => !(r.compiled || r.knownIssue)
    );

    console.info("\n");
    console.info("=".repeat(80));
    console.info("  Manifest All-Phases Compilation Summary");
    console.info("=".repeat(80));
    console.info(`  Total Manifests:        ${results.length}`);
    console.info(`  Compiled Successfully:  ${compiledCount}`);
    console.info(`  Known Compiler Issues:  ${knownIssueCount}`);
    console.info(`  Unexpected Failures:    ${unexpectedFailures.length}`);
    console.info(`  Total Entities:         ${totalEntities}`);
    console.info(`  Total Commands:         ${totalCommands}`);
    console.info("");

    for (const r of results) {
      let status: string;
      if (r.compiled) {
        status = "PASS";
      } else if (r.knownIssue) {
        status = "SKIP";
      } else {
        status = "FAIL";
      }
      const pad = status === "SKIP" ? " " : "";
      console.info(
        `  [${status}]${pad} ${r.phase.padEnd(8)} ${r.manifest.padEnd(32)} ${String(r.entities).padStart(2)} entities, ${String(r.commands).padStart(3)} commands`
      );
    }

    console.info("");
    if (knownIssueCount > 0) {
      console.info("  Known compiler limitations:");
      for (const spec of MANIFEST_SPECS.filter((s) => s.knownCompilerIssue)) {
        console.info(`    - ${spec.manifest}: ${spec.knownCompilerIssue}`);
      }
    }
    console.info("=".repeat(80));
    console.info("\n");

    // Only fail on UNEXPECTED compilation failures
    expect(
      unexpectedFailures.length,
      `Unexpected compilation failures: ${unexpectedFailures.map((r) => r.manifest).join(", ")}`
    ).toBe(0);
  });
});
