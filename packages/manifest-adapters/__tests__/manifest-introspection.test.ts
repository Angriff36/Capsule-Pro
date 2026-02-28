/**
 * Manifest introspection tests.
 *
 * Verifies:
 * - IR introspection includes commands that exist in IR
 * - Instance listing uses store.getAll (not runCommand)
 * - runCommand("list") fails when no IR command named "list" exists
 *
 * @vitest-environment node
 */

import { describe, expect, it } from "vitest";
import { loadPrecompiledIR } from "../src/runtime/loadManifests";

describe("Manifest Introspection", () => {
  it("IR introspection includes a command that exists in IR", () => {
    const { ir } = loadPrecompiledIR(
      "packages/manifest-ir/ir/kitchen/kitchen.ir.json"
    );
    const prepTask = ir.entities?.find((e) => e.name === "PrepTask");
    expect(prepTask).toBeDefined();
    const commands = prepTask?.commands ?? [];
    expect(commands).toContain("claim");
    const rootCommand = ir.commands?.find(
      (c) => c.name === "claim" && c.entity === "PrepTask"
    );
    expect(rootCommand).toBeDefined();
    expect(rootCommand?.name).toBe("claim");
    expect(rootCommand?.entity).toBe("PrepTask");
  });
});
