import { describe, expect, it, vi } from "vitest";
import { loadKitchenProductionBoard } from "@/app/lib/convex/domain-loaders";
import { serverListEntity } from "@/app/lib/convex/server-reads";

vi.mock("@/app/lib/convex/server-reads", () => ({
  serverListEntity: vi.fn(),
  activeTenantRows: (rows: unknown[]) => rows,
  convexDocId: (doc: { _id?: string; id?: string }) =>
    String((doc as { _id?: string })._id ?? (doc as { id?: string }).id ?? ""),
  msToDate: (ms: number | null | undefined) =>
    ms == null ? null : new Date(ms),
  parseDecimalString: (v: unknown) => String(v ?? ""),
}));

describe("loadKitchenProductionBoard", () => {
  it("loads KitchenTask via tenant-scoped Convex list (no Prisma deletedAt filter)", async () => {
    vi.mocked(serverListEntity).mockResolvedValue([]);

    await loadKitchenProductionBoard();

    expect(serverListEntity).toHaveBeenCalledWith("KitchenTask");
    expect(serverListEntity).toHaveBeenCalledWith("KitchenTaskClaim");
    expect(serverListEntity).toHaveBeenCalledWith("User");
  });
});
