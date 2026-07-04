/**
 * @vitest-environment node
 */

import { describe, expect, it, vi } from "vitest";

vi.mock("@repo/auth/server", () => ({
  auth: vi.fn().mockResolvedValue({ orgId: "org-1" }),
}));

vi.mock("next/navigation", () => ({
  notFound: vi.fn(),
}));

vi.mock("../../app/lib/tenant", () => ({
  getTenantIdForOrg: vi.fn().mockResolvedValue("tenant-1"),
}));

vi.mock("@repo/database", () => ({
  database: {},
}));

import MarketingPage from "../../app/(authenticated)/marketing/page";

describe("marketing pages without marketing models", () => {
  it("does not crash on the marketing overview page", () => {
    const result = MarketingPage();
    expect(result).toBeTruthy();
  });
});
