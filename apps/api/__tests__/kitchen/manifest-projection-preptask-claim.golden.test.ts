/**
 * Projection System Proof Test: PrepTask.claim Golden-File Snapshot
 *
 * Proves generator value without Next routing integration, Clerk, or tenant lookup:
 * 1) Compile using the same compile path the repo uses
 * 2) Generate ONE projection surface output (nextjs.command) for PrepTask.claim
 * 3) Assert byte-for-byte equality against a checked-in snapshot file
 * 4) Prove TypeScript validity by running tsc --noEmit on a tiny tsconfig that includes the snapshot
 */

import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { compileToIR } from "@manifest/runtime/ir-compiler";
import { NextJsProjection } from "@manifest/runtime/projections/nextjs";
import { enforceCommandOwnership } from "@repo/manifest-adapters/ir-contract";
import { describe, expect, it } from "vitest";

const SNAP_DIR = join(import.meta.dirname, "__snapshots__");
const SNAP_FILE = join(SNAP_DIR, "preptask-claim-command.snapshot.ts");

// A tiny tsconfig dedicated to this proof test.
// It extends apps/api's tsconfig so path aliases + module resolution match the repo.
const TSCONFIG_DIR = join(import.meta.dirname, "__tsc__");
const TSCONFIG_FILE = join(TSCONFIG_DIR, "tsconfig.projection-snapshot.json");

describe("Projection proof: PrepTask.claim golden snapshot", () => {
  it("matches the checked-in snapshot byte-for-byte", async () => {
    if (!existsSync(SNAP_DIR)) {
      mkdirSync(SNAP_DIR, { recursive: true });
    }

    // Use the EXACT same manifest loading path as existing PrepTask tests
    const manifestPath = join(
      process.cwd(),
      "../../packages/manifest-adapters/manifests/prep-task-rules.manifest"
    );
    const source = readFileSync(manifestPath, "utf-8");
    const { ir, diagnostics } = await compileToIR(source);

    if (!ir) {
      throw new Error(
        `Failed to compile manifest: ${diagnostics.map((d: { message: string }) => d.message).join(", ")}`
      );
    }

    // Get NextJsProjection from registry
    const projection = new NextJsProjection();
    expect(projection).toBeDefined();

    // Generate nextjs.command surface for PrepTask.claim
    // Using authProvider: "none" for minimal test (no Clerk)
    // Using includeTenantFilter: false to avoid database tenant lookup
    const result = projection.generate(enforceCommandOwnership(ir), {
      surface: "nextjs.command",
      entity: "PrepTask",
      command: "claim",
      options: {
        authProvider: "none",
        includeTenantFilter: false,
        responseImportPath: "@/lib/manifest-response",
        runtimeImportPath: "@/lib/manifest-runtime",
      },
    });

    expect(result.diagnostics).toEqual([]);
    expect(result.artifacts).toHaveLength(1);

    const generated = result.artifacts[0].code;
    expect(typeof generated).toBe("string");
    expect(generated.length).toBeGreaterThan(0);

    if (existsSync(SNAP_FILE)) {
      const expected = readFileSync(SNAP_FILE, "utf-8");
      // Byte-for-byte equality (no regex, no substring matching)
      expect(generated).toBe(expected);
      console.info("✓ Generated code matches golden snapshot (byte-for-byte)");
    } else {
      // First-run convenience: write once so you can commit it.
      // After commit, this becomes strict golden-file comparison.
      writeFileSync(SNAP_FILE, generated, "utf-8");
      console.info("✓ Created golden snapshot:", SNAP_FILE);
    }
  });

  it("typechecks against repo imports (tsc --noEmit)", () => {
    expect(existsSync(SNAP_FILE)).toBe(true);

    if (!existsSync(TSCONFIG_DIR)) {
      mkdirSync(TSCONFIG_DIR, { recursive: true });
    }

    // Create a minimal tsconfig that includes only the snapshot file,
    // but inherits moduleResolution/paths from apps/api.
    // This makes the check actually prove "valid against current repo imports".
    const tsconfig = {
      extends: "../../../tsconfig.json",
      compilerOptions: {
        baseUrl: "../../..", // Relative to this tsconfig, points to apps/api
        noEmit: true,
        skipLibCheck: true, // Focus on our snapshot, not node_modules
        // Override paths to be relative to baseUrl (apps/api)
        paths: {
          "@/*": ["./*"],
        },
      },
      include: ["../__snapshots__/preptask-claim-command.snapshot.ts"],
    };

    writeFileSync(TSCONFIG_FILE, JSON.stringify(tsconfig, null, 2), "utf-8");

    // Run tsc synchronously so the test fails with a real compiler error message.
    const result = spawnSync(
      "pnpm",
      ["exec", "tsc", "--noEmit", "-p", TSCONFIG_FILE],
      {
        shell: true,
        cwd: process.cwd(),
        encoding: "utf-8",
      }
    );

    if (result.error) {
      throw new Error(`Failed to execute tsc: ${result.error.message}`);
    }

    if (result.status !== 0) {
      throw new Error(
        `TypeScript compilation failed (exit ${result.status}):\nSTDOUT:\n${result.stdout}\nSTDERR:\n${result.stderr}`
      );
    }

    console.info("✓ Snapshot typechecks successfully with tsc --noEmit");
  }, 30_000);
});
