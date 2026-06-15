import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { explainManifestTarget } from "./upstream-manifest-mcp.js";

function resolveRepoRoot(): string {
  return process.env.MCP_PROJECT_ROOT ?? join(process.cwd(), "..", "..");
}

describe("explainManifestTarget", () => {
  it("explains a command without Windows ESM path or storeProvider errors", async () => {
    const irPath = join(resolveRepoRoot(), "manifest/ir/kitchen.ir.json");
    const ir = JSON.parse(readFileSync(irPath, "utf8"));

    const explanation = await explainManifestTarget(ir, {
      target: "command",
      name: "create",
      entityName: "Event",
    });

    expect(explanation).toContain("Command: create");
    expect(explanation).toContain("Entity: Event");
  });
});
