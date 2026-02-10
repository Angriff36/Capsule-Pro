/**
 * Temporary test to prove which manifest copy is executing.
 * This will be removed after confirming the runtime source.
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

// Get the actual file path being executed
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const packagesDir = join(__dirname, "../../../packages");

describe("Prove manifest runtime source", () => {
  it("should show manifest-adapters dist is present", () => {
    const manifestDistRuntime = join(
      packagesDir,
      "manifest-adapters/dist/manifest-runtime.js"
    );
    const manifestSrcRuntime = join(
      packagesDir,
      "manifest-adapters/src/manifest-runtime.ts"
    );

    console.log("Current directory:", __dirname);
    console.log("Packages directory:", packagesDir);
    console.log("Checking for dist manifest-runtime.js at:", manifestDistRuntime);
    console.log("Checking for src runtime-engine.ts at:", manifestSrcRuntime);

    // Check if dist file exists and has content
    const distContent = readFileSync(manifestDistRuntime, "utf-8");
    console.log("Dist manifest-runtime.js exists, size:", distContent.length);
    expect(distContent.length).toBeGreaterThan(0);

    // Check if src file exists
    const srcContent = readFileSync(manifestSrcRuntime, "utf-8");
    console.log("Src runtime-engine.ts exists, size:", srcContent.length);
    expect(srcContent.length).toBeGreaterThan(0);
  });

  it("should verify prisma-store dist exists in manifest-adapters", () => {
    const manifestDistPrismaStore = join(
      packagesDir,
      "manifest-adapters/dist/prisma-store.js"
    );
    const manifestSrcPrismaStore = join(
      packagesDir,
      "manifest-adapters/src/prisma-store.ts"
    );

    console.log(
      "Checking for dist prisma-store.js at:",
      manifestDistPrismaStore
    );
    console.log("Checking for src prisma-store.ts at:", manifestSrcPrismaStore);

    // Check dist exists
    const distContent = readFileSync(manifestDistPrismaStore, "utf-8");
    console.log("Dist prisma-store.js exists, size:", distContent.length);
    expect(distContent.length).toBeGreaterThan(0);

    // Check src exists
    const srcContent = readFileSync(manifestSrcPrismaStore, "utf-8");
    console.log("Src prisma-store.ts exists, size:", srcContent.length);
    expect(srcContent.length).toBeGreaterThan(0);
  });

  it("should verify package.json exports point to dist for manifest-adapters", () => {
    const packageJsonPath = join(packagesDir, "manifest-adapters/package.json");
    const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf-8"));

    console.log(
      "package.json exports:",
      JSON.stringify(packageJson.exports, null, 2)
    );

    // Verify runtime export points to dist
    expect(packageJson.exports["./runtime"].import).toBe("./dist/runtime.js");

    // Verify prisma-store export points to dist
    expect(packageJson.exports["./prisma-store"].import).toBe(
      "./dist/prisma-store.js"
    );
  });
});
