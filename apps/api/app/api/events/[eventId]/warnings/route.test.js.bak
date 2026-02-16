Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
vitest_1.vi.mock("server-only", () => ({}));
vitest_1.vi.mock("@repo/auth/server", () => ({
  auth: vitest_1.vi.fn(),
}));
vitest_1.vi.mock("@repo/database", () => ({
  database: {
    event: {
      findFirst: vitest_1.vi.fn(),
    },
    allergenWarning: {
      findMany: vitest_1.vi.fn(),
    },
  },
}));
vitest_1.vi.mock("@/app/lib/tenant", () => ({
  getTenantIdForOrg: vitest_1.vi.fn(),
}));
const server_1 = require("@repo/auth/server");
const server_2 = require("next/server");
const tenant_1 = require("@/app/lib/tenant");
const route_1 = require("./route");
(0, vitest_1.describe)("warnings route", () => {
  (0, vitest_1.it)("responds with 400 when eventId is missing", async () => {
    const mockAuth = vitest_1.vi.mocked(server_1.auth);
    const mockGetTenantId = vitest_1.vi.mocked(tenant_1.getTenantIdForOrg);
    mockAuth.mockResolvedValue({
      userId: "user-1",
      orgId: "org-1",
    });
    mockGetTenantId.mockResolvedValue("tenant-1");
    const request = new server_2.NextRequest(
      "https://example.com/api/events//warnings"
    );
    const response = await (0, route_1.GET)(request, {
      params: Promise.resolve({ eventId: "" }),
    });
    (0, vitest_1.expect)(response.status).toBe(400);
    (0, vitest_1.expect)(await response.json()).toEqual({
      error: "params.eventId must exist",
    });
  });
});
