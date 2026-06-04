import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import { GET as getAvailableTasks } from "@/app/api/kitchen/tasks/available/route";
import { GET as getTasks } from "@/app/api/kitchen/tasks/route";

vi.mock("@repo/auth/server", () => ({
  auth: vi.fn(),
}));

vi.mock("@/app/lib/tenant", () => ({
  getTenantIdForOrg: vi.fn(),
}));

vi.mock("@/lib/manifest/execute-command", () => ({
  runManifestCommand: vi.fn(),
}));

const tenantId = "tenant_test";

const expectNoDeletedAt = (value: unknown) => {
  expect(JSON.stringify(value)).not.toContain("deletedAt");
};

describe("KitchenTask API query shape", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(auth).mockResolvedValue({
      orgId: "org_test",
      userId: "user_test",
    } as Awaited<ReturnType<typeof auth>>);
    vi.mocked(getTenantIdForOrg).mockResolvedValue(tenantId);
    vi.mocked(database.kitchenTask.findMany).mockResolvedValue([]);
    vi.mocked(database.kitchenTaskClaim.findMany).mockResolvedValue([]);
    vi.mocked(database.user.findFirst).mockResolvedValue({
      id: "employee_test",
      firstName: "Ada",
      lastName: "Lovelace",
    } as never);
    vi.mocked(database.user.findMany).mockResolvedValue([]);
  });

  it("does not filter the kitchen task list by deletedAt", async () => {
    await getTasks(new Request("http://localhost/api/kitchen/tasks"));

    const args = vi.mocked(database.kitchenTask.findMany).mock.calls[0]?.[0];
    expectNoDeletedAt(args);
  });

  it("uses array-membership station filtering for available kitchen tasks", async () => {
    await getAvailableTasks(
      new Request("http://localhost/api/kitchen/tasks/available?station=grill")
    );

    const args = vi.mocked(database.kitchenTask.findMany).mock.calls[0]?.[0];
    expectNoDeletedAt(args);
    // KitchenTask.tags is a Postgres String[] (schema.prisma:326, GIN-indexed).
    // The correct Prisma list filter for "tags contains this station" is `{ has }`,
    // not the scalar-string `{ contains }` (which is a type error on String[]).
    expect(args).toEqual(
      expect.objectContaining({
        where: expect.objectContaining({
          AND: expect.arrayContaining([
            expect.objectContaining({
              tags: expect.objectContaining({ has: "grill" }),
            }),
          ]),
        }),
      })
    );
  });
});
