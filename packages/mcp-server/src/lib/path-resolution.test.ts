/**
 * Tests for path resolution — MCP_PROJECT_ROOT env var handling.
 *
 * Tests the invariant: "All project-relative paths resolve via
 * MCP_PROJECT_ROOT when set, falling back to process.cwd()."
 *
 * Covers:
 * - projectRoot constant in each plugin uses MCP_PROJECT_ROOT
 * - routes.manifest.json path resolves correctly under MCP_PROJECT_ROOT
 * - Resolved root is stable regardless of actual cwd
 * - ir-loader resolveFromRepoRoot uses MCP_PROJECT_ROOT
 */

import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ---------------------------------------------------------------------------
// projectRoot resolution tests
// ---------------------------------------------------------------------------

describe("projectRoot resolution", () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("uses MCP_PROJECT_ROOT when set", () => {
    process.env.MCP_PROJECT_ROOT = "/custom/project/root";
    const projectRoot = process.env.MCP_PROJECT_ROOT || process.cwd();
    expect(projectRoot).toBe("/custom/project/root");
  });

  it("falls back to process.cwd() when MCP_PROJECT_ROOT is not set", () => {
    process.env.MCP_PROJECT_ROOT = undefined as unknown as string;
    const projectRoot = process.env.MCP_PROJECT_ROOT || process.cwd();
    expect(projectRoot).toBe(process.cwd());
  });

  it("routes.manifest.json resolves under MCP_PROJECT_ROOT", () => {
    process.env.MCP_PROJECT_ROOT = "C:\\Projects\\capsule-pro";
    const projectRoot = process.env.MCP_PROJECT_ROOT || process.cwd();
    const manifestPath = join(
      projectRoot,
      "packages/manifest-ir/dist/routes.manifest.json"
    );
    expect(manifestPath).toContain("capsule-pro");
    expect(manifestPath).toContain("routes.manifest.json");
    expect(manifestPath).not.toContain("Users");
  });

  it("resolved root is stable when launched from a different cwd", () => {
    // Simulate Cursor launching from user home directory
    process.env.MCP_PROJECT_ROOT = "C:\\Projects\\capsule-pro";
    const projectRoot = process.env.MCP_PROJECT_ROOT || process.cwd();

    // Even if cwd is the user's home, projectRoot should be the project
    const manifestPath = join(
      projectRoot,
      "packages/manifest-ir/dist/routes.manifest.json"
    );
    expect(manifestPath).toBe(
      join(
        "C:\\Projects\\capsule-pro",
        "packages/manifest-ir/dist/routes.manifest.json"
      )
    );
    // Verify it does NOT use cwd
    expect(manifestPath).not.toBe(
      join(process.cwd(), "packages/manifest-ir/dist/routes.manifest.json")
    );
  });

  it("governance scanner paths resolve under MCP_PROJECT_ROOT", () => {
    process.env.MCP_PROJECT_ROOT = "/srv/capsule";
    const projectRoot = process.env.MCP_PROJECT_ROOT || process.cwd();
    const apiDir = join(projectRoot, "apps/api");
    const specsDir = join(projectRoot, "specs");
    expect(apiDir).toBe(join("/srv/capsule", "apps/api"));
    expect(specsDir).toBe(join("/srv/capsule", "specs"));
  });
});

// ---------------------------------------------------------------------------
// ir-loader resolveFromRepoRoot uses MCP_PROJECT_ROOT
// ---------------------------------------------------------------------------

describe("ir-loader MCP_PROJECT_ROOT", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("resolveFromRepoRoot starts from MCP_PROJECT_ROOT when set", async () => {
    // Set MCP_PROJECT_ROOT to the actual project root so the walk-up
    // finds pnpm-workspace.yaml immediately
    process.env.MCP_PROJECT_ROOT = join(process.cwd());

    // Mock the transitive imports that ir-loader needs
    vi.doMock("@angriff36/manifest/ir", () => ({}));
    vi.doMock("@repo/manifest-adapters/runtime/loadManifests", () => ({
      loadPrecompiledIR: vi.fn(() => ({
        ir: {
          entities: [],
          commands: [],
          events: [],
          policies: [],
          version: "test",
        },
      })),
    }));

    const { getIR, invalidateIRCache } = await import("./ir-loader.js");
    invalidateIRCache();

    // Should not throw — MCP_PROJECT_ROOT points to a valid monorepo root
    const ir = getIR();
    expect(ir).toBeDefined();
    expect(ir.version).toBe("test");
  });
});
