/**
 * Latency measurement test — exercises the full dispatcher path directly.
 * No HTTP proxy involved.
 */
import { performance } from "node:perf_hooks";
import { describe, it } from "vitest";

describe("manifest command dispatch latency", () => {
  it("measures cold + warm dispatcher path", async () => {
    // ── Cold: force fresh module loads ──
    const tCold = performance.now();

    // Import the real execute-command (pulls in kitchen.commands.json as static import)
    const { runManifestCommand } = await import(
      "@/lib/manifest/execute-command"
    );
    console.log(
      `[measure] execute-command module import: ${(performance.now() - tCold).toFixed(0)}ms`
    );

    // First call — builds registry, creates runtime, loads IR from disk
    const tFirst = performance.now();
    try {
      const result = await runManifestCommand({
        entity: "PrepTask",
        command: "claim",
        body: { userId: "test-user-123" },
        user: {
          id: "test-user-123",
          tenantId: "tenant-test",
          role: "admin",
        },
      });
      console.log(
        `[measure] FIRST call: ${(performance.now() - tFirst).toFixed(0)}ms (success=${result?.status !== 500})`
      );
    } catch (e: any) {
      console.log(
        `[measure] FIRST call: ${(performance.now() - tFirst).toFixed(0)}ms (error: ${e.message?.slice(0, 80)})`
      );
    }

    // Second call — registry cached, IR cached
    const tSecond = performance.now();
    try {
      await runManifestCommand({
        entity: "PrepTask",
        command: "claim",
        body: { userId: "test-user-123" },
        user: {
          id: "test-user-123",
          tenantId: "tenant-test",
          role: "admin",
        },
      });
      console.log(
        `[measure] SECOND call: ${(performance.now() - tSecond).toFixed(0)}ms`
      );
    } catch (e: any) {
      console.log(
        `[measure] SECOND call: ${(performance.now() - tSecond).toFixed(0)}ms (error: ${e.message?.slice(0, 80)})`
      );
    }

    // Third call — fully warm
    const tThird = performance.now();
    try {
      await runManifestCommand({
        entity: "PrepTask",
        command: "claim",
        body: { userId: "test-user-123" },
        user: {
          id: "test-user-123",
          tenantId: "tenant-test",
          role: "admin",
        },
      });
      console.log(
        `[measure] THIRD call: ${(performance.now() - tThird).toFixed(0)}ms`
      );
    } catch (e: any) {
      console.log(
        `[measure] THIRD call: ${(performance.now() - tThird).toFixed(0)}ms (error: ${e.message?.slice(0, 80)})`
      );
    }

    console.log(
      `[measure] TOTAL test: ${(performance.now() - tCold).toFixed(0)}ms`
    );
  });
});
