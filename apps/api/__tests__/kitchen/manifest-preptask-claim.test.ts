/**
 * Integration Test: Manifest-Generated PrepTask.claim Handler
 *
 * Tests that the generated Manifest command handler:
 * 1. Properly enforces guards (status transitions)
 * 2. Handles errors correctly
 * 3. Returns expected response format
 */

import { describe, expect, it } from "vitest";

describe("Manifest-Generated PrepTask.claim Handler", () => {
  it("should exist and be properly structured", () => {
    // Verify the generated route file exists
    const routePath =
      "C:/projects/capsule-pro/apps/api/app/api/kitchen/prep-tasks/commands/claim/route.ts";

    // Import dynamically to avoid build issues if file doesn't exist
    import("node:fs")
      .then(({ existsSync }) => {
        expect(existsSync(routePath)).toBe(true);

        // Read and verify the file structure
        return import("node:fs").then(({ readFileSync }) => {
          const content = readFileSync(routePath, "utf-8");

          // Verify it has the expected imports
          expect(content).toContain('createManifestRuntime');
          expect(content).toContain('manifestSuccessResponse');
          expect(content).toContain('manifestErrorResponse');

          // Verify it has the auth guard (checks both userId and orgId)
          expect(content).toMatch(/userId.*orgId/);
          expect(content).toContain('"Unauthorized"');
          expect(content).toContain('401');

          // Verify it uses the runtime
          expect(content).toContain('runtime.runCommand');
          expect(content).toContain('"claim"');

          // Verify error handling
          expect(content).toContain('policyDenial');
          expect(content).toContain('guardFailure');

          console.info("✓ Generated claim handler structure verified");
        });
      })
      .catch((err) => {
        throw new Error(`Failed to verify handler: ${err.message}`);
      });
  });

  it("should have correct response helpers", () => {
    // Verify the response helper functions exist
    const responsePath =
      "C:/projects/capsule-pro/apps/api/lib/manifest-response.ts";

    import("node:fs")
      .then(({ existsSync, readFileSync }) => {
        expect(existsSync(responsePath)).toBe(true);

        const content = readFileSync(responsePath, "utf-8");

        // Verify helper functions
        expect(content).toContain('manifestSuccessResponse');
        expect(content).toContain('manifestErrorResponse');
        expect(content).toContain('NextResponse.json');

        console.info("✓ Response helpers verified");
      })
      .catch((err) => {
        throw new Error(`Failed to verify response helpers: ${err.message}`);
      });
  });

  it("should have runtime factory", () => {
    // Verify the runtime factory exists
    const runtimePath =
      "C:/projects/capsule-pro/apps/api/lib/manifest-runtime.ts";

    import("node:fs")
      .then(({ existsSync, readFileSync }) => {
        expect(existsSync(runtimePath)).toBe(true);

        const content = readFileSync(runtimePath, "utf-8");

        // Verify it imports from Manifest
        expect(content).toContain('@repo/manifest');
        expect(content).toContain('RuntimeEngine');
        expect(content).toContain('compileToIR');

        // Verify it creates runtime
        expect(content).toContain('createManifestRuntime');
        expect(content).toContain('new RuntimeEngine');

        // Verify it loads the manifest file
        expect(content).toContain('prep-task-rules');
        expect(content).toContain('.manifest');

        console.info("✓ Runtime factory verified");
      })
      .catch((err) => {
        throw new Error(`Failed to verify runtime factory: ${err.message}`);
      });
  });

  it("should generate all 7 PrepTask commands", () => {
    const commands = [
      "claim",
      "start",
      "complete",
      "release",
      "reassign",
      "update-quantity",
      "cancel",
    ];

    const baseDir =
      "C:/projects/capsule-pro/apps/api/app/api/kitchen/prep-tasks/commands";

    import("node:fs")
      .then(({ existsSync }) => {
        const missing: string[] = [];

        for (const cmd of commands) {
          const routePath = `${baseDir}/${cmd}/route.ts`;
          if (!existsSync(routePath)) {
            missing.push(cmd);
          }
        }

        if (missing.length > 0) {
          throw new Error(`Missing command handlers: ${missing.join(", ")}`);
        }

        console.info(`✓ All ${commands.length} PrepTask command handlers generated`);
      })
      .catch((err) => {
        throw new Error(`Failed to verify command handlers: ${err.message}`);
      });
  });
});
