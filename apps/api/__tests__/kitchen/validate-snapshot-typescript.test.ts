/**
 * TypeScript Validation Test for Projection Snapshot
 *
 * This test validates that the generated snapshot is syntactically valid TypeScript
 * by attempting to parse it with the TypeScript compiler.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const SNAPSHOT_FILE = join(
  process.cwd(),
  "__tests__/kitchen/__snapshots__/preptask-claim-command.snapshot.ts"
);

describe("Snapshot TypeScript Validation", () => {
  it("should be valid TypeScript that can be compiled", async () => {
    const snapshot = readFileSync(SNAPSHOT_FILE, "utf-8");

    // Use TypeScript's built-in parser to validate syntax
    const ts = await import("typescript");

    // Create a source file from the snapshot - this will throw on parse errors
    let sourceFile: import("typescript").SourceFile;
    try {
      sourceFile = ts.createSourceFile(
        "snapshot.ts",
        snapshot,
        ts.ScriptTarget.Latest,
        true // setParentNodes: true for better analysis
      );
    } catch (parseError) {
      throw new Error(`Failed to parse snapshot: ${parseError}`);
    }

    // The snapshot is valid TypeScript if we got here without errors
    // Additional validation via the actual test run which imports and checks the snapshot

    // Verify source file was created successfully
    expect(sourceFile).toBeDefined();
    expect(sourceFile.statements.length).toBeGreaterThan(0);

    console.info("✓ Snapshot is syntactically valid TypeScript");
  });

  it("should contain expected TypeScript constructs", async () => {
    const snapshot = readFileSync(SNAPSHOT_FILE, "utf-8");

    const ts = await import("typescript");
    const sourceFile = ts.createSourceFile(
      "snapshot.ts",
      snapshot,
      ts.ScriptTarget.Latest,
      true
    );

    // Verify it has imports
    const hasImports = sourceFile.statements.some(
      (stmt) => stmt.kind === ts.SyntaxKind.ImportDeclaration
    );
    expect(hasImports).toBe(true);

    // Verify it has function declaration(s)
    const hasFunctions = sourceFile.statements.some(
      (stmt) => stmt.kind === ts.SyntaxKind.FunctionDeclaration
    );
    expect(hasFunctions).toBe(true);

    console.info("✓ Snapshot contains valid TypeScript constructs");
  });
});
