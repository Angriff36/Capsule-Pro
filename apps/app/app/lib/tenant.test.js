Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
vitest_1.vi.mock("server-only", () => ({}));
vitest_1.vi.mock("@repo/database", () => ({
  database: {
    account: {
      findFirst: vitest_1.vi.fn(),
      create: vitest_1.vi.fn(),
    },
  },
}));
vitest_1.vi.mock("@repo/auth/server", () => ({
  auth: vitest_1.vi.fn(),
}));
const server_1 = require("@repo/auth/server");
const tenant_1 = require("./tenant");
(0, vitest_1.describe)("requireTenantId", () => {
  (0, vitest_1.it)(
    "throws a descriptive invariant when orgId is missing",
    async () => {
      const mockAuth = vitest_1.vi.mocked(server_1.auth);
      mockAuth.mockResolvedValueOnce({});
      await (0, vitest_1.expect)(
        (0, tenant_1.requireTenantId)()
      ).rejects.toThrow("auth.orgId must exist");
    }
  );
});
