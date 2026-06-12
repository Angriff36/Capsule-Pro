/**
 * Projection Snapshot Tests for CI
 *
 * Validates that the Manifest code generation pipeline produces deterministic,
 * byte-for-byte identical output across runs. Covers multiple entities and
 * both write (nextjs.dispatcher) and read (nextjs.route) surfaces.
 *
 * Why this exists:
 *   - If a manifest source changes without regenerating projections, this test
 *     catches the drift before it reaches production.
 *   - If the projection generator itself changes (e.g. @angriff36/manifest
 *     upgrade), the snapshots flag the new output for review.
 *
 * Coverage (5 entities, 2 surfaces):
 *   Surfaces:
 *     - nextjs.dispatcher — universal POST handler for governed writes (1 snapshot)
 *     - nextjs.route      — per-entity GET handler for reads (4 snapshots)
 *
 *   Entities covered via nextjs.route (entity-specific, catches per-entity drift):
 *     - PrepTask       — kitchen domain
 *     - AdminTask      — transitions (backlog→in_progress), constraints
 *     - CateringOrder  — complex state machine (draft→confirmed), 6 constraints
 *     - BattleBoard    — multi-transition (draft→open), 5 constraints
 *     - InventoryItem  — common entity, multiple relationships
 *
 *   nextjs.dispatcher produces a single universal handler (not entity-specific)
 *   so we snapshot it once to catch generator-level changes.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { IR } from "@angriff36/manifest/ir";
import { compileToIR } from "@angriff36/manifest/ir-compiler";
import { NextJsProjection } from "@angriff36/manifest/projections/nextjs";
import { describe, expect, it } from "vitest";

const MANIFEST_ROOT = join(process.cwd(), "../../manifest/source");
const SNAPSHOT_DIR = join(process.cwd(), "__tests__/kitchen/__snapshots__");

const PROJECTION_OPTIONS = {
  authProvider: "none" as const,
  includeTenantFilter: false,
  responseImportPath: "@/lib/manifest-response",
  runtimeImportPath: "@/lib/manifest-runtime",
};

/**
 * Compiles a .manifest source file to IR, applying normalization
 * so that standalone commands are linked to their entity.
 */
async function compileManifest(manifestPath: string): Promise<IR> {
  const source = readFileSync(manifestPath, "utf-8");
  const { ir, diagnostics } = await compileToIR(source);

  if (!ir) {
    throw new Error(
      `Failed to compile ${manifestPath}: ${diagnostics.map((d: { message: string }) => d.message).join(", ")}`
    );
  }

  // Normalize: link orphan commands to their entity
  if (ir.entities.length === 1 && ir.entities[0].commands.length === 0) {
    const [entity] = ir.entities;
    const commandNames = ir.commands.map((command) => command.name);
    return {
      ...ir,
      entities: [{ ...entity, commands: commandNames }],
      commands: ir.commands.map((command) =>
        command.entity ? command : { ...command, entity: entity.name }
      ),
    };
  }

  return ir;
}

/**
 * Generates a projection artifact and returns its code.
 * Throws if generation fails or produces no artifacts.
 */
function generateArtifact(
  ir: IR,
  surface: string,
  entity: string,
  command?: string
): string {
  const projection = new NextJsProjection();
  const result = projection.generate(ir, {
    surface,
    entity,
    ...(command ? { command } : {}),
    options: PROJECTION_OPTIONS,
  });

  if (result.diagnostics.length > 0) {
    throw new Error(
      `Projection diagnostics for ${surface}:${entity}${command ? `.${command}` : ""}: ${result.diagnostics.map((d: { message: string }) => d.message).join("; ")}`
    );
  }

  expect(result.artifacts).toHaveLength(1);
  return result.artifacts[0].code;
}

/**
 * Golden-file snapshot comparison: byte-for-byte equality.
 * On first run, creates the snapshot file. On subsequent runs, compares.
 */
function assertGoldenSnapshot(snapshotName: string, code: string): void {
  const snapshotPath = join(SNAPSHOT_DIR, snapshotName);

  if (!existsSync(SNAPSHOT_DIR)) {
    mkdirSync(SNAPSHOT_DIR, { recursive: true });
  }

  if (existsSync(snapshotPath)) {
    const snapshot = readFileSync(snapshotPath, "utf-8");
    expect(code).toBe(snapshot);
  } else {
    writeFileSync(snapshotPath, code, "utf-8");
    // Fail on first creation so CI doesn't silently pass with new snapshots
    throw new Error(
      `Created new snapshot: ${snapshotName}\nRe-run the test to verify it matches.`
    );
  }
}

/**
 * Validates that generated code contains the expected structural elements
 * for the universal dispatcher surface.
 */
function assertDispatcherStructure(code: string): void {
  expect(code).toContain("export async function POST");
  expect(code).toContain("NextRequest");
  expect(code).toContain("createManifestRuntime");
  expect(code).toContain("runtime.runCommand");
  expect(code).toContain("manifestSuccessResponse");
  expect(code).toContain("manifestErrorResponse");
  // Dispatcher reads entity/command from URL params, not hardcoded
  expect(code).toContain("ctx.params");
  expect(code).toMatch(/^import\s+\{[^}]+\}\s+from\s+"[^"]+";/m);
}

/**
 * Validates that generated code contains the expected structural elements
 * for a route (read) surface.
 */
function assertRouteStructure(code: string, entity: string): void {
  expect(code).toContain("export async function GET");
  expect(code).toContain("NextRequest");
  expect(code).toContain("manifestSuccessResponse");
  expect(code).toContain("manifestErrorResponse");
  // Should reference the entity name in a Prisma query
  const camelEntity = entity.charAt(0).toLowerCase() + entity.slice(1);
  expect(code).toContain(`database.${camelEntity}`);
  expect(code).toMatch(/^import\s+\{[^}]+\}\s+from\s+"[^"]+";/m);
}

// ---------------------------------------------------------------------------
// Test suites
// ---------------------------------------------------------------------------

describe("Projection Snapshot: Universal Dispatcher", () => {
  it("dispatcher snapshot matches golden file", async () => {
    // The dispatcher is a universal handler — not entity-specific.
    // Snapshot it once from any entity to catch generator-level changes.
    const ir = await compileManifest(
      join(MANIFEST_ROOT, "kitchen/prep-task-rules.manifest")
    );
    const code = generateArtifact(ir, "nextjs.dispatcher", "PrepTask", "claim");
    assertGoldenSnapshot("universal-dispatcher.snapshot.ts", code);
    assertDispatcherStructure(code);
  });
});

describe("Projection Snapshots: Entity Read Routes", () => {
  it("PrepTask read route matches golden file", async () => {
    const ir = await compileManifest(
      join(MANIFEST_ROOT, "kitchen/prep-task-rules.manifest")
    );
    const code = generateArtifact(ir, "nextjs.route", "PrepTask");
    assertGoldenSnapshot("preptask-route.snapshot.ts", code);
    assertRouteStructure(code, "PrepTask");
  });

  it("AdminTask read route matches golden file", async () => {
    const ir = await compileManifest(
      join(MANIFEST_ROOT, "core/admin-task-rules.manifest")
    );
    const code = generateArtifact(ir, "nextjs.route", "AdminTask");
    assertGoldenSnapshot("admintask-route.snapshot.ts", code);
    assertRouteStructure(code, "AdminTask");
  });

  it("CateringOrder read route matches golden file", async () => {
    const ir = await compileManifest(
      join(MANIFEST_ROOT, "events/catering-order-rules.manifest")
    );
    const code = generateArtifact(ir, "nextjs.route", "CateringOrder");
    assertGoldenSnapshot("cateringorder-route.snapshot.ts", code);
    assertRouteStructure(code, "CateringOrder");
  });

  it("BattleBoard read route matches golden file", async () => {
    const ir = await compileManifest(
      join(MANIFEST_ROOT, "events/battle-board-rules.manifest")
    );
    const code = generateArtifact(ir, "nextjs.route", "BattleBoard");
    assertGoldenSnapshot("battleboard-route.snapshot.ts", code);
    assertRouteStructure(code, "BattleBoard");
  });

  it("InventoryItem read route matches golden file", async () => {
    // InventoryItem is defined in the kitchen IR (multi-entity manifest).
    // Load the compiled IR directly rather than a single manifest source.
    const irPath = join(process.cwd(), "../../manifest/ir/kitchen.ir.json");
    const ir = JSON.parse(readFileSync(irPath, "utf-8"));
    const code = generateArtifact(ir, "nextjs.route", "InventoryItem");
    assertGoldenSnapshot("inventoryitem-route.snapshot.ts", code);
    assertRouteStructure(code, "InventoryItem");
  });
});

describe("Projection determinism", () => {
  it("generates identical output on repeated calls", async () => {
    const ir = await compileManifest(
      join(MANIFEST_ROOT, "core/admin-task-rules.manifest")
    );
    const code1 = generateArtifact(ir, "nextjs.route", "AdminTask");
    const code2 = generateArtifact(ir, "nextjs.route", "AdminTask");
    expect(code1).toBe(code2);
  });

  it("different entities produce different read routes", async () => {
    const adminIR = await compileManifest(
      join(MANIFEST_ROOT, "core/admin-task-rules.manifest")
    );
    const battleIR = await compileManifest(
      join(MANIFEST_ROOT, "events/battle-board-rules.manifest")
    );
    const adminRoute = generateArtifact(adminIR, "nextjs.route", "AdminTask");
    const battleRoute = generateArtifact(
      battleIR,
      "nextjs.route",
      "BattleBoard"
    );
    expect(adminRoute).not.toBe(battleRoute);
  });
});
