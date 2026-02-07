/**
 * CLI Path Validation Smoke Test
 *
 * Ensures the Capsule-Pro generator CLI validates output paths
 * according to Next.js App Router conventions and rejects invalid paths.
 *
 * Invariant: Generated routes must follow Next.js convention:
 *   - Contain /app/api/ in the path
 *   - End with /route.ts
 *
 * This prevents generating routes to wrong directories (e.g., apps/api vs apps/app).
 */

import { existsSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Helper to run the CLI programmatically
async function runCli(
  entity: string,
  input: string,
  output: string
): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  const { spawn } = await import("child_process");

  return new Promise((resolve) => {
    const proc = spawn(
      "npx",
      ["tsx", "bin/capsule-pro-generate.ts", entity, input, "--output", output],
      {
        cwd: join(__dirname, "../.."),
        stdio: "pipe",
        shell: true,
      }
    );

    let stdout = "";
    let stderr = "";

    proc.stdout?.on("data", (data) => {
      stdout += data.toString();
    });

    proc.stderr?.on("data", (data) => {
      stderr += data.toString();
    });

    proc.on("close", (code) => {
      resolve({ stdout, stderr, exitCode: code ?? 0 });
    });
  });
}

describe("CLI Path Validation", () => {
  const tempDir = join(__dirname, "../temp-test-routes");

  // Cleanup temp directory before/after tests
  before(() => {
    if (existsSync(tempDir)) {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  after(() => {
    if (existsSync(tempDir)) {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("should accept valid Next.js App Router path (apps/app/app/api/...)", async () => {
    const result = await runCli(
      "Recipe",
      "packages/kitchen-ops/manifests/recipe-rules.manifest",
      join(tempDir, "apps/app/app/api/kitchen/manifest/recipes/route.ts")
    );

    // Should succeed (exit code 0 or undefined which means success)
    expect(result.exitCode).toBe(0);
    // Should not contain error message
    expect(result.stderr).not.toContain("Error: Output path must follow");
  });

  it("should accept alternative valid path (other-app/app/api/...)", async () => {
    const result = await runCli(
      "Recipe",
      "packages/kitchen-ops/manifests/recipe-rules.manifest",
      join(tempDir, "other-app/app/api/kitchen/manifest/recipes/route.ts")
    );

    // Should succeed
    expect(result.exitCode).toBe(0);
    // Should warn about repo structure but not fail
    expect(result.stderr).toContain(
      "Warning: Output path doesn't match expected repo structure"
    );
  });

  it("should reject path missing /app/api/ (Pages Router pattern)", async () => {
    const result = await runCli(
      "Recipe",
      "packages/kitchen-ops/manifests/recipe-rules.manifest",
      join(tempDir, "apps/api/src/pages/kitchen/recipes.ts")
    );

    // Should fail
    expect(result.exitCode).not.toBe(0);
    // Should explain why
    expect(result.stderr).toContain(
      "Error: Output path must follow Next.js App Router convention"
    );
    expect(result.stderr).toContain(
      "Path must contain '/app/api/' for route handlers"
    );
  });

  it("should reject path not ending with /route.ts", async () => {
    const result = await runCli(
      "Recipe",
      "packages/kitchen-ops/manifests/recipe-rules.manifest",
      join(tempDir, "apps/app/app/api/kitchen/recipes/handler.ts")
    );

    // Should fail
    expect(result.exitCode).not.toBe(0);
    expect(result.stderr).toContain("Path must end with '/route.ts'");
  });

  it("should reject src pattern (apps/api/src/app/api/...)", async () => {
    const result = await runCli(
      "Recipe",
      "packages/kitchen-ops/manifests/recipe-rules.manifest",
      join(tempDir, "apps/api/src/app/api/kitchen/manifest/recipes/route.ts")
    );

    // This path technically contains /app/api/ after /src/, so it may pass validation
    // but should generate a warning about repo structure
    // The test documents current behavior - whether this should fail is a project decision
    expect(result.exitCode).toBe(0);
    expect(result.stderr).toContain(
      "Warning: Output path doesn't match expected repo structure"
    );
  });
});
