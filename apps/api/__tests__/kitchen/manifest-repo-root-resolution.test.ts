/**
 * Regression test: manifest path resolution must work regardless of process.cwd().
 *
 * Root cause of the SERVICE_UNAVAILABLE bug:
 *   loadManifests.ts was resolving "packages/manifest-adapters/manifests" off
 *   process.cwd(). When Next.js runs apps/api, process.cwd() === "apps/api",
 *   so the path became "apps/api/packages/manifest-adapters/manifests" — ENOENT
 *   → 500 → Command Board maps any 5xx to SERVICE_UNAVAILABLE.
 *
 * Fix: findRepoRoot() walks up until pnpm-workspace.yaml is found, then all
 * paths are resolved from that anchor.
 */

import { existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { loadPrecompiledIR } from "@repo/manifest-adapters/runtime/loadManifests";
import { describe, expect, it } from "vitest";

describe("manifest repo-root path resolution", () => {
  it("loadPrecompiledIR resolves kitchen.ir.json from the repo root regardless of cwd", () => {
    // This test runs with cwd = apps/api (vitest is invoked from there).
    // If path resolution were broken, this would throw ENOENT.
    const bundle = loadPrecompiledIR(
      "packages/manifest-ir/ir/kitchen/kitchen.ir.json"
    );

    expect(bundle.ir).toBeDefined();
    expect(bundle.ir.entities.length).toBeGreaterThan(0);
    expect(bundle.ir.commands.length).toBeGreaterThan(0);
    expect(bundle.ir.policies.length).toBeGreaterThan(0);
    expect(bundle.hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("loadPrecompiledIR includes Event entity and Event.create command", () => {
    const bundle = loadPrecompiledIR(
      "packages/manifest-ir/ir/kitchen/kitchen.ir.json"
    );

    const eventEntity = bundle.ir.entities.find((e) => e.name === "Event");
    expect(eventEntity).toBeDefined();

    const createCmd = bundle.ir.commands.find(
      (c) => c.entity === "Event" && c.name === "create"
    );
    expect(createCmd).toBeDefined();
    expect(createCmd?.parameters?.length).toBeGreaterThan(0);
  });

  it("loadPrecompiledIR throws a descriptive error for a missing IR path", () => {
    expect(() =>
      loadPrecompiledIR("packages/manifest-ir/ir/does-not-exist.json")
    ).toThrow(/Precompiled IR not found at/);
  });

  it("pnpm-workspace.yaml exists at the repo root (sanity check for findRepoRoot)", () => {
    // Walk up from cwd to find the repo root the same way findRepoRoot does.
    let dir = process.cwd();
    let found = false;
    while (true) {
      if (existsSync(join(dir, "pnpm-workspace.yaml"))) {
        found = true;
        break;
      }
      const parent = resolve(dir, "..");
      if (parent === dir) {
        break;
      }
      dir = parent;
    }
    expect(found).toBe(true);
  });
});
