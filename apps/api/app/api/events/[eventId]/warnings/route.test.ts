import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@repo/auth/server", () => ({
  auth: vi.fn(),
}));
vi.mock("@repo/database", () => ({
  database: {
    event: {
      findFirst: vi.fn(),
    },
    allergenWarning: {
      findMany: vi.fn(),
    },
  },
}));
vi.mock("@/app/lib/tenant", () => ({
  getTenantIdForOrg: vi.fn(),
}));

import { auth } from "@repo/auth/server";
import { NextRequest } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import { GET } from "./route";

describe("warnings route", () => {
  it("responds with 400 when eventId is missing", async () => {
    const mockAuth = vi.mocked(auth);
    const mockGetTenantId = vi.mocked(getTenantIdForOrg);

    mockAuth.mockResolvedValue({
      userId: "user-1",
      orgId: "org-1",
    });
    mockGetTenantId.mockResolvedValue("tenant-1");

    const request = new NextRequest("https://example.com/api/events//warnings");

    const response = await GET(request, {
      params: Promise.resolve({ eventId: "" }),
    });

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: "params.eventId must exist",
    });
  });
});
