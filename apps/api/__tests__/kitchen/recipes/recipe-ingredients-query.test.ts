/**
 * @vitest-environment node
 */

import { database, Prisma } from "@repo/database";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "../../../app/api/kitchen/recipes/[recipeId]/ingredients/route";

vi.mock("@repo/auth/server", () => ({
  auth: vi.fn().mockResolvedValue({ orgId: "org-1" }),
}));

vi.mock("@/app/lib/tenant", () => ({
  getTenantIdForOrg: vi.fn().mockResolvedValue("tenant-1"),
}));

describe("recipe ingredients API query", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("uses preparation_notes and sort_order columns", async () => {
    const sqlImpl = vi.fn(
      (strings: TemplateStringsArray, ...values: unknown[]) => ({
        strings,
        values,
        get sql() {
          return strings.reduce(
            (acc, str, index) =>
              acc +
              str +
              (values[index] !== undefined ? String(values[index]) : ""),
            ""
          );
        },
      })
    );
    (Prisma as { sql: typeof sqlImpl }).sql = sqlImpl;

    const queryRawSpy = vi.spyOn(database, "$queryRaw");
    queryRawSpy.mockResolvedValueOnce([]);

    await GET(new Request("http://localhost"), {
      params: Promise.resolve({ recipeId: "recipe-1" }),
    });

    const sql = queryRawSpy.mock.calls[0]?.[0];
    const sqlText = sql?.strings?.join("") ?? "";

    expect(sqlText).toContain("ri.preparation_notes");
    expect(sqlText).toContain("ri.sort_order");
    expect(sqlText).not.toContain("ri.notes");
    expect(sqlText).not.toContain("ri.order_index");
  });
});
