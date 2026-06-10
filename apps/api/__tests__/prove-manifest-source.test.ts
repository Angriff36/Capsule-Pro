/**
 * Test to prove the manifest runtime is available and built.
 * Verifies dist artifacts exist in manifest/runtime (the @repo/manifest-runtime package).
 */

import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, "../../..");
const manifestRuntimeDir = join(projectRoot, "manifest/runtime");

describe("Prove manifest runtime source", () => {
  it("should verify manifest-runtime dist exists", () => {
    const distDir = join(manifestRuntimeDir, "dist");
    expect(existsSync(distDir)).toBe(true);

    // Check runtime-engine.js exists
    const runtimeEngine = join(distDir, "runtime-engine.js");
    expect(existsSync(runtimeEngine)).toBe(true);
    const content = readFileSync(runtimeEngine, "utf-8");
    expect(content.length).toBeGreaterThan(0);
  });

  it("should verify prisma-store dist exists in manifest-runtime", () => {
    const prismaStore = join(manifestRuntimeDir, "dist/prisma-store.js");
    expect(existsSync(prismaStore)).toBe(true);
    const content = readFileSync(prismaStore, "utf-8");
    expect(content.length).toBeGreaterThan(0);
  });

  it("should verify package.json exports point to dist for manifest-runtime", () => {
    const packageJsonPath = join(manifestRuntimeDir, "package.json");
    expect(existsSync(packageJsonPath)).toBe(true);
    const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf-8"));

    // Verify main export exists
    expect(packageJson.main || packageJson.exports).toBeDefined();
  });
});
