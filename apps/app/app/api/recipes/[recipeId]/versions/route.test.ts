import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@repo/auth/server", () => ({
  auth: vi.fn(),
}));
vi.mock("@repo/database", () => ({
  database: {
    $queryRaw: vi.fn(),
  },
  Prisma: {
    sql: vi.fn(),
  },
}));
vi.mock("@/app/lib/tenant", () => ({
  getTenantIdForOrg: vi.fn(),
}));

import { NextRequest } from "next/server";
import { GET } from "./route";

describe("recipe versions route", () => {
  it("responds with 400 when recipeId is missing", async () => {
    const request = new NextRequest(
      "https://example.com/api/recipes//versions"
    );

    const response = await GET(request, {
      params: Promise.resolve({ recipeId: "" }),
    });

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: "params.recipeId must exist",
    });
  });
});
