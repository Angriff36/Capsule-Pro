import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { describe, expect, it, vi } from "vitest";
import KitchenPage from "@/app/(authenticated)/kitchen/page";
import { getTenantIdForOrg } from "@/app/lib/tenant";

vi.mock("@repo/auth/server", () => ({
  auth: vi.fn(),
}));

vi.mock("@/app/lib/tenant", () => ({
  getTenantIdForOrg: vi.fn(),
}));

vi.mock("@repo/database", () => ({
  database: {
    kitchenTask: {
      findMany: vi.fn(),
    },
    kitchenTaskClaim: {
      findMany: vi.fn(),
    },
    user: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

vi.mock("@/app/(authenticated)/kitchen/components/kitchen-navigation", () => ({
  KitchenNavigation: () => null,
}));

vi.mock("@/app/(authenticated)/kitchen/production-board-client", () => ({
  ProductionBoardClient: () => null,
}));

vi.mock("@/app/(authenticated)/kitchen/production-board-realtime", () => ({
  ProductionBoardRealtime: () => null,
}));

describe("KitchenPage KitchenTask query shape", () => {
  it("does not filter KitchenTask reads by deletedAt", async () => {
    vi.mocked(auth).mockResolvedValue({
      orgId: "org_test",
      userId: "user_test",
    } as Awaited<ReturnType<typeof auth>>);
    vi.mocked(getTenantIdForOrg).mockResolvedValue("tenant_test");
    vi.mocked(database.user.findFirst).mockResolvedValue(null);
    vi.mocked(database.kitchenTask.findMany).mockResolvedValue([]);
    vi.mocked(database.kitchenTaskClaim.findMany).mockResolvedValue([]);
    vi.mocked(database.user.findMany).mockResolvedValue([]);

    await KitchenPage();

    const args = vi.mocked(database.kitchenTask.findMany).mock.calls[0]?.[0];
    expect(JSON.stringify(args)).not.toContain("deletedAt");
  });
});
