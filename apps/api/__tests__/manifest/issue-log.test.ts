import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("manifest issue log", () => {
  let tempDir: string;
  let previousLogPath: string | undefined;
  let previousDisable: string | undefined;
  let previousInitCwd: string | undefined;

  beforeEach(async () => {
    tempDir = await mkdtemp(path.join(os.tmpdir(), "manifest-issue-log-"));
    previousLogPath = process.env.MANIFEST_ISSUE_LOG_PATH;
    previousDisable = process.env.MANIFEST_ISSUE_LOG;
    previousInitCwd = process.env.INIT_CWD;
    process.env.MANIFEST_ISSUE_LOG_PATH = path.join(tempDir, "issues.jsonl");
    process.env.INIT_CWD = tempDir;
    vi.resetModules();
  });

  afterEach(async () => {
    if (previousLogPath === undefined) {
      delete process.env.MANIFEST_ISSUE_LOG_PATH;
    } else {
      process.env.MANIFEST_ISSUE_LOG_PATH = previousLogPath;
    }

    if (previousDisable === undefined) {
      delete process.env.MANIFEST_ISSUE_LOG;
    } else {
      process.env.MANIFEST_ISSUE_LOG = previousDisable;
    }

    if (previousInitCwd === undefined) {
      delete process.env.INIT_CWD;
    } else {
      process.env.INIT_CWD = previousInitCwd;
    }

    await rm(tempDir, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  it("appends JSONL records for manifest failures", async () => {
    const { logManifestIssue, getManifestIssueLogPath } = await import(
      "@repo/observability/manifest-issue-log"
    );

    logManifestIssue({
      kind: "guard_failed",
      entity: "AllergenWarning",
      command: "acknowledge",
      httpStatus: 422,
      message: "Guard 0 failed: already acknowledged",
    });

    await new Promise((resolve) => setTimeout(resolve, 25));

    const contents = await readFile(getManifestIssueLogPath(), "utf8");
    const line = contents.trim().split("\n").at(-1);
    expect(line).toBeDefined();

    const parsed = JSON.parse(line ?? "{}") as {
      kind: string;
      entity: string;
      command: string;
      message: string;
    };

    expect(parsed.kind).toBe("guard_failed");
    expect(parsed.entity).toBe("AllergenWarning");
    expect(parsed.command).toBe("acknowledge");
    expect(parsed.message).toContain("already acknowledged");
  });

  it("classifies guard_failed as an expected validation outcome (separate from real issues)", async () => {
    const { logManifestIssue, getManifestIssueLogPath } = await import(
      "@repo/observability/manifest-issue-log"
    );

    // A genuine guard failure is still recorded for debugging...
    logManifestIssue({
      kind: "guard_failed",
      entity: "AllergenWarning",
      command: "escalate",
      httpStatus: 422,
      message: "Guard 1 failed: already acknowledged",
    });
    // ...but a real fault is not "expected".
    logManifestIssue({
      kind: "runtime_error",
      entity: "AllergenWarning",
      command: "acknowledge",
      httpStatus: 500,
      message: "boom",
    });

    await new Promise((resolve) => setTimeout(resolve, 25));

    const contents = await readFile(getManifestIssueLogPath(), "utf8");
    const lines = contents.trim().split("\n").filter(Boolean);
    const records = lines.map(
      (l) => JSON.parse(l) as { kind: string; expected?: boolean }
    );
    const guard = records.find((r) => r.kind === "guard_failed");
    const fault = records.find((r) => r.kind === "runtime_error");

    // guard_failed is persisted (debuggable) AND flagged expected → it can be
    // filtered out of the real-issue signal.
    expect(guard?.expected).toBe(true);
    // real faults are not expected.
    expect(fault?.expected ?? false).toBe(false);
  });

  it("dedupes store_json_fallback entries per entity", async () => {
    const { logManifestIssue, getManifestIssueLogPath } = await import(
      "@repo/observability/manifest-issue-log"
    );

    logManifestIssue({
      kind: "store_json_fallback",
      entity: "StaffPerformance",
      message: "Entity uses PrismaJsonStore (no typed Prisma store)",
    });
    logManifestIssue({
      kind: "store_json_fallback",
      entity: "StaffPerformance",
      message: "Entity uses PrismaJsonStore (no typed Prisma store)",
    });

    await new Promise((resolve) => setTimeout(resolve, 25));

    const contents = await readFile(getManifestIssueLogPath(), "utf8");
    const lines = contents.trim().split("\n").filter(Boolean);
    expect(lines).toHaveLength(1);
  });
});
