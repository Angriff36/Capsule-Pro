import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  getTenantIdForOrg: vi.fn(),
}));

vi.mock("@repo/auth/server", () => ({ auth: mocks.auth }));
vi.mock("@/app/lib/tenant", () => ({
  getTenantIdForOrg: mocks.getTenantIdForOrg,
}));
vi.mock("@sentry/nextjs", () => ({ captureException: vi.fn() }));
vi.mock("@repo/observability/log", () => ({ log: { error: vi.fn() } }));

import { POST } from "./route";

beforeEach(() => {
  mocks.auth.mockResolvedValue({
    orgId: "org_test",
    userId: "user_test",
  });
  mocks.getTenantIdForOrg.mockResolvedValue(
    "00000000-0000-0000-0000-000000000001"
  );
});

describe("POST /api/staffing/recommendations", () => {
  it("accepts the staffing recommendations UI payload and returns a client-compatible recommendation", async () => {
    const request = new NextRequest(
      "https://example.com/api/staffing/recommendations",
      {
        method: "POST",
        body: JSON.stringify({
          guestCount: 120,
          eventType: "corporate",
          serviceStyle: "plated",
          duration: 4,
        }),
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    const response = await POST(request);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.recommendation).toMatchObject({
      eventType: "corporate",
      guestCount: 120,
    });
    expect(Array.isArray(json.recommendation.roles)).toBe(true);
    expect(Array.isArray(json.recommendation.notes)).toBe(true);
    expect(typeof json.recommendation.totalStaff).toBe("number");
    expect(typeof json.recommendation.totalLaborCost).toBe("number");
  });
});
