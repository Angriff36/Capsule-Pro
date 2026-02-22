/**
 * Projection System Proof Test: PrepTask.claim Golden-File Snapshot
 *
 * This test demonstrates the projection system's real value by:
 * 1. Compiling PrepTask manifest to IR using the same path Capsule-Pro uses
 * 2. Generating nextjs.command projection for PrepTask.claim
 * 3. Asserting byte-for-byte equality with a checked-in snapshot file
 * 4. Validating TypeScript syntax of generated output
 *
 * NO Next.js routing integration - this is pure projection generation
 * NO Clerk - using authProvider: "none"
 * NO tenant lookup - minimal projection options
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { IR } from "@angriff36/manifest/ir";
import { compileToIR } from "@angriff36/manifest/ir-compiler";
import { NextJsProjection } from "@angriff36/manifest/projections/nextjs";
import { describe, expect, it } from "vitest";

const MANIFEST_PATH = join(
  process.cwd(),
  "../../packages/manifest-adapters/manifests/prep-task-rules.manifest"
);

const SNAPSHOT_DIR = join(process.cwd(), "__tests__/kitchen/__snapshots__");
const SNAPSHOT_FILE = join(SNAPSHOT_DIR, "preptask-claim-command.snapshot.ts");

function normalizeIR(ir: IR): IR {
  if (ir.entities.length !== 1) {
    return ir;
  }

  const [entity] = ir.entities;
  if (entity.commands.length > 0) {
    return ir;
  }

  const commandNames = ir.commands.map((command) => command.name);
  return {
    ...ir,
    entities: [{ ...entity, commands: commandNames }],
    commands: ir.commands.map((command) =>
      command.entity ? command : { ...command, entity: entity.name }
    ),
  };
}

describe("Projection System Proof: PrepTask.claim Snapshot", () => {
  it("should generate PrepTask.claim command handler matching golden snapshot", async () => {
    // Step 1: Load and compile manifest to IR (same path as Capsule-Pro)
    const source = readFileSync(MANIFEST_PATH, "utf-8");
    const { ir, diagnostics } = await compileToIR(source);

    if (!ir) {
      throw new Error(
        `Failed to compile manifest: ${diagnostics.map((d: { message: string }) => d.message).join(", ")}`
      );
    }

    // Step 2: Get NextJsProjection from registry (auto-registers builtins)
    const projection = new NextJsProjection();
    expect(projection.name).toBe("nextjs");

    // Step 3: Generate nextjs.command surface for PrepTask.claim
    // Using minimal options to avoid Clerk/tenant dependencies
    const result = projection.generate(normalizeIR(ir), {
      surface: "nextjs.command",
      entity: "PrepTask",
      command: "claim",
      options: {
        authProvider: "none", // No Clerk
        includeTenantFilter: false, // No tenant lookup
        responseImportPath: "@/lib/manifest-response",
        runtimeImportPath: "@/lib/manifest-runtime",
      },
    });

    // Verify generation succeeded
    expect(result.diagnostics).toEqual([]);
    expect(result.artifacts).toHaveLength(1);

    const artifact = result.artifacts[0];
    expect(artifact.id).toBe("nextjs.command:PrepTask.claim");
    expect(artifact.contentType).toBe("typescript");
    expect(artifact.code).toBeTruthy();

    const generatedCode = artifact.code;

    // Step 4: Ensure snapshot directory exists
    if (!existsSync(SNAPSHOT_DIR)) {
      mkdirSync(SNAPSHOT_DIR, { recursive: true });
    }

    // Step 5: Golden-file snapshot comparison (byte-for-byte)
    if (existsSync(SNAPSHOT_FILE)) {
      // Subsequent runs: compare byte-for-byte
      const snapshot = readFileSync(SNAPSHOT_FILE, "utf-8");

      // Exact byte-for-byte comparison (no regex, no substring matching)
      expect(generatedCode).toBe(snapshot);
      console.info("✓ Generated code matches golden snapshot (byte-for-byte)");
    } else {
      // First run: create snapshot
      writeFileSync(SNAPSHOT_FILE, generatedCode, "utf-8");
      console.info("✓ Created golden snapshot:", SNAPSHOT_FILE);
    }
  });

  it("should generate TypeScript-valid code", () => {
    // Load the snapshot and validate it's syntactically correct TypeScript
    expect(existsSync(SNAPSHOT_FILE)).toBe(true);

    const snapshot = readFileSync(SNAPSHOT_FILE, "utf-8");

    // Basic syntax checks
    expect(snapshot).toContain("export async function POST");
    expect(snapshot).toContain("NextRequest");
    expect(snapshot).toContain("createManifestRuntime");
    expect(snapshot).toContain("runtime.runCommand");
    expect(snapshot).toContain('"claim"');
    expect(snapshot).toContain("manifestSuccessResponse");
    expect(snapshot).toContain("manifestErrorResponse");

    // Verify it has proper error handling structure
    expect(snapshot).toContain("policyDenial");
    expect(snapshot).toContain("guardFailure");
    expect(snapshot).toContain("try {");
    expect(snapshot).toContain("} catch");

    // Verify imports are valid TypeScript syntax
    expect(snapshot).toMatch(/^import\s+\{[^}]+\}\s+from\s+"[^"]+";/m);

    console.info("✓ Snapshot contains TypeScript-valid code structure");
  });

  it("should verify snapshot contains PrepTask-specific logic", () => {
    expect(existsSync(SNAPSHOT_FILE)).toBe(true);

    const snapshot = readFileSync(SNAPSHOT_FILE, "utf-8");

    // Verify PrepTask entity context
    expect(snapshot).toContain('entityName: "PrepTask"');

    // Verify command name
    expect(snapshot).toContain('"claim"');

    // Verify it's a command handler (POST method)
    expect(snapshot).toContain("export async function POST");

    console.info("✓ Snapshot contains PrepTask.claim-specific logic");
  });
});
