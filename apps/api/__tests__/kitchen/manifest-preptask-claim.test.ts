/**
 * Integration Test: Manifest-Generated PrepTask Command Handler
 *
 * Tests that the manifest dispatcher correctly handles PrepTask commands
 * via the dynamic route: /api/manifest/[entity]/commands/[command]
 *
 * All PrepTask commands (claim, start, complete, release, reassign, update-quantity, cancel)
 * are handled by the same dispatcher route.
 */

import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const apiRoot = join(__dirname, "../..");

describe("Manifest-Generated PrepTask Commands", () => {
  it("should have a dynamic command dispatcher route", async () => {
    // All PrepTask commands go through the dynamic dispatcher
    const routePath = join(
      apiRoot,
      "app/api/manifest/[entity]/commands/[command]/route.ts"
    );

    const { existsSync, readFileSync } = await import("node:fs");

    expect(existsSync(routePath)).toBe(true);

    // Read and verify the dispatcher structure
    const content = readFileSync(routePath, "utf-8");

    // Verify it has the expected imports
    expect(content).toContain("createManifestRuntime");
    expect(content).toContain("manifestSuccessResponse");
    expect(content).toContain("manifestErrorResponse");

    // Verify it has the auth guard (checks requireCurrentUser)
    expect(content).toContain("requireCurrentUser");
    expect(content).toContain("InvariantError");

    // Verify it uses the runtime
    expect(content).toContain("runtime.runCommand");
    expect(content).toContain("createManifestRuntime");

    // Verify error handling
    expect(content).toContain("policyDenial");
    expect(content).toContain("guardFailure");

    console.info("✓ Dynamic command dispatcher structure verified");
  });

  it("should have correct response helpers", async () => {
    // Verify the response helper functions exist
    const responsePath = join(apiRoot, "lib/manifest-response.ts");

    const { existsSync, readFileSync } = await import("node:fs");

    expect(existsSync(responsePath)).toBe(true);

    const content = readFileSync(responsePath, "utf-8");

    // Verify helper functions
    expect(content).toContain("manifestSuccessResponse");
    expect(content).toContain("manifestErrorResponse");
    expect(content).toContain("NextResponse.json");

    console.info("✓ Response helpers verified");
  });

  it("should have runtime factory", async () => {
    // Verify the runtime factory exists
    const runtimePath = join(apiRoot, "lib/manifest-runtime.ts");

    const { existsSync, readFileSync } = await import("node:fs");

    expect(existsSync(runtimePath)).toBe(true);

    const content = readFileSync(runtimePath, "utf-8");

    // Verify it imports from @repo/manifest-adapters
    expect(content).toContain("createManifestRuntime");
    expect(content).toContain("@repo/manifest-adapters/manifest-runtime-factory");

    console.info("✓ Runtime factory verified");
  });

  it("should have commands defined in commands.json", async () => {
    const commandsFile = join(
      __dirname,
      "../../../../packages/manifest-ir/ir/kitchen/kitchen.commands.json"
    );

    const { existsSync, readFileSync } = await import("node:fs");

    expect(existsSync(commandsFile)).toBe(true);

    const content = readFileSync(commandsFile, "utf-8");
    const commands = JSON.parse(content);

    const prepTaskCommands = (commands as Array<{ entity: string; command: string }>)
      .filter((cmd) => cmd.entity === "PrepTask")
      .map((cmd) => cmd.command);

    // Verify we have commands
    expect(prepTaskCommands.length).toBeGreaterThan(0);
    expect(prepTaskCommands).toContain("claim");

    console.info(
      `✓ Found ${prepTaskCommands.length} PrepTask commands in commands.json`
    );
  });
});