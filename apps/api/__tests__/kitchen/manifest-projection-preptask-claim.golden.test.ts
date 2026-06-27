/**
 * Projection System Proof Test: PrepTask.claim Golden-File Snapshot
 *
 * Proves generator value without Next routing integration, Clerk, or tenant lookup:
 * 1) Compile using the same compile path the repo uses
 * 2) Generate ONE projection surface output (nextjs.command) for PrepTask.claim
 * 3) Assert byte-for-byte equality against a checked-in snapshot file
 * 4) Verify generated code contains expected structural elements
 *
 * @vitest-environment node
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { IR } from "@angriff36/manifest/ir";
import { compileToIR } from "@angriff36/manifest/ir-compiler";
import { NextJsProjection } from "@angriff36/manifest/projections/nextjs";
import { describe, expect, it } from "vitest";

const MANIFEST_ROOT = join(process.cwd(), "../../manifest/source");
const MANIFEST_PATH = join(MANIFEST_ROOT, "kitchen/prep-task-rules.manifest");

const SNAP_DIR = join(process.cwd(), "__tests__/kitchen/__snapshots__");
const SNAP_FILE = join(SNAP_DIR, "preptask-claim-command.snapshot.ts");

function normalizeIR(ir: IR): IR {
  if (ir.entities.length !== 1) {
    return ir;
  }

  const [entity] = ir.entities;
  if (!entity || entity.commands.length > 0) {
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

describe("Projection proof: PrepTask.claim golden snapshot", () => {
  it("matches the checked-in snapshot byte-for-byte", async () => {
    if (!existsSync(SNAP_DIR)) {
      mkdirSync(SNAP_DIR, { recursive: true });
    }

    const source = readFileSync(MANIFEST_PATH, "utf-8");
    const { ir, diagnostics } = await compileToIR(source);

    if (!ir) {
      throw new Error(
        `Failed to compile manifest: ${diagnostics.map((d: { message: string }) => d.message).join(", ")}`
      );
    }

    const projection = new NextJsProjection();
    expect(projection).toBeDefined();

    const normalizedIR = normalizeIR(ir);
    const ownedIR = normalizedIR;

    const result = projection.generate(ownedIR, {
      surface: "nextjs.command",
      entity: "PrepTask",
      command: "claim",
      options: {
        authProvider: "none",
        includeTenantFilter: false,
        responseImportPath: "@/lib/manifest-response",
        runtimeImportPath: "@/lib/manifest-runtime",
        concreteCommandRoutes: { enabled: true, legacyAliasesOnly: false },
      },
    });

    expect(result.diagnostics).toEqual([]);
    expect(result.artifacts).toHaveLength(1);

    const generated = result.artifacts[0]!.code;
    expect(typeof generated).toBe("string");
    expect(generated.length).toBeGreaterThan(0);

    if (existsSync(SNAP_FILE)) {
      const expected = readFileSync(SNAP_FILE, "utf-8");
      expect(generated).toBe(expected);
    } else {
      writeFileSync(SNAP_FILE, generated, "utf-8");
      throw new Error(
        `Created new golden snapshot: ${SNAP_FILE}\nRe-run the test to verify it matches.`
      );
    }
  });

  it("should generate TypeScript-valid code structure", () => {
    if (!existsSync(SNAP_FILE)) {
      return; // Skip if snapshot not yet created
    }

    const snapshot = readFileSync(SNAP_FILE, "utf-8");

    // Basic syntax checks
    expect(snapshot).toContain("export async function POST");
    expect(snapshot).toContain("NextRequest");
    expect(snapshot).toContain("createManifestRuntime");
    expect(snapshot).toContain("runtime.runCommand");
    expect(snapshot).toContain('"claim"');
    expect(snapshot).toContain("manifestSuccessResponse");
    expect(snapshot).toContain("manifestErrorResponse");

    // Verify error handling uses normalizeCommandResult
    expect(snapshot).toContain("normalizeCommandResult");
    expect(snapshot).toContain("policy_denial");
    expect(snapshot).toContain("guard_failure");

    // Verify imports are valid TypeScript syntax
    expect(snapshot).toMatch(/^import\s+\{[^}]+\}\s+from\s+"[^"]+";/m);
  });

  it("should verify snapshot contains PrepTask-specific logic", () => {
    if (!existsSync(SNAP_FILE)) {
      return;
    }

    const snapshot = readFileSync(SNAP_FILE, "utf-8");

    // Verify PrepTask entity context
    expect(snapshot).toContain("PrepTask");

    // Verify command name
    expect(snapshot).toContain('"claim"');

    // Verify it's a command handler (POST method)
    expect(snapshot).toContain("export async function POST");
  });
});
