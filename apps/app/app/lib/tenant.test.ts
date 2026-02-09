import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@repo/database", () => ({
  database: {
    account: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
  },
}));
vi.mock("@repo/auth/server", () => ({
  auth: vi.fn(),
}));

import { auth } from "@repo/auth/server";
import { requireTenantId } from "./tenant";

describe("requireTenantId", () => {
  it("throws a descriptive invariant when orgId is missing", async () => {
    const mockAuth = vi.mocked(auth);
    mockAuth.mockResolvedValueOnce({
      orgId: undefined,
      userId: undefined,
    } as never);

    await expect(requireTenantId()).rejects.toThrow("auth.orgId must exist");
  });
});
