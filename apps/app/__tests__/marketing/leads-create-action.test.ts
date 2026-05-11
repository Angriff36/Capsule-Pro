/**
 * @vitest-environment node
 *
 * Why this test matters: spec FR-501 mandates a closed `source` enum
 * (`website` | `manual` | `import`) and spec FR-129 requires that leads with
 * duplicate emails be created anyway but flagged for the
 * "POSSIBLE DUPLICATE" annotation. Without these guarantees, the lead pipeline
 * accepts arbitrary source strings (breaking analytics in FR-702/SC-005) and
 * silently buries duplicates instead of surfacing them. This test pins the
 * behavior so regressions can't slip past.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@repo/auth/server", () => ({
  auth: vi.fn().mockResolvedValue({ orgId: "org-1" }),
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

vi.mock("../../app/lib/tenant", () => ({
  getTenantId: vi.fn().mockResolvedValue("tenant-1"),
}));

vi.mock("@repo/database", () => ({
  database: {
    lead: { create: vi.fn(), findFirst: vi.fn() },
    client: { findFirst: vi.fn() },
  },
}));

import { database } from "@repo/database";
import { createLead } from "../../app/(authenticated)/marketing/leads/actions";

const leadCreate = database.lead.create as ReturnType<typeof vi.fn>;
const leadFindFirst = database.lead.findFirst as ReturnType<typeof vi.fn>;
const clientFindFirst = database.client.findFirst as ReturnType<typeof vi.fn>;

describe("createLead server action — spec enforcement", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    leadCreate.mockImplementation(
      ({ data }: { data: Record<string, unknown> }) =>
        Promise.resolve({ id: "lead-1", ...data })
    );
    leadFindFirst.mockResolvedValue(null);
    clientFindFirst.mockResolvedValue(null);
  });

  it("defaults source to 'manual' when omitted (FR-501)", async () => {
    const result = await createLead({ contactName: "Jane Doe" });
    expect(result.lead).toBeTruthy();
    expect(leadCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({ source: "manual" }),
    });
  });

  it("accepts each closed-enum source value verbatim", async () => {
    for (const source of ["website", "manual", "import"] as const) {
      leadCreate.mockClear();
      await createLead({ contactName: "Jane", source });
      expect(leadCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({ source }),
      });
    }
  });

  it("rejects any source outside the closed enum (FR-501)", async () => {
    await expect(
      createLead({ contactName: "Jane", source: "Referral" })
    ).rejects.toThrow(/Lead source must be one of/);
    await expect(
      createLead({ contactName: "Jane", source: "social media" })
    ).rejects.toThrow(/Lead source must be one of/);
    expect(leadCreate).not.toHaveBeenCalled();
  });

  it("flags possibleDuplicate when an existing Client owns the email (FR-129)", async () => {
    clientFindFirst.mockResolvedValueOnce({ id: "client-9" });
    const result = await createLead({
      contactName: "Jane",
      contactEmail: "Jane@Example.com",
    });
    // Spec is clear: create regardless, flag for annotation.
    expect(leadCreate).toHaveBeenCalledTimes(1);
    expect(result.possibleDuplicate).toBe(true);
    expect(result.duplicateReason).toBe("client_email");
  });

  it("flags possibleDuplicate when another Lead already uses the email", async () => {
    leadFindFirst.mockResolvedValueOnce({ id: "lead-existing" });
    const result = await createLead({
      contactName: "Jane",
      contactEmail: "jane@example.com",
    });
    expect(result.possibleDuplicate).toBe(true);
    expect(result.duplicateReason).toBe("lead_email");
  });

  it("does not flag when no email is provided (nothing to compare)", async () => {
    const result = await createLead({ contactName: "Jane" });
    expect(result.possibleDuplicate).toBe(false);
    expect(clientFindFirst).not.toHaveBeenCalled();
    expect(leadFindFirst).not.toHaveBeenCalled();
  });

  it("does not flag when the email is unique across leads and clients", async () => {
    const result = await createLead({
      contactName: "Jane",
      contactEmail: "fresh@example.com",
    });
    expect(result.possibleDuplicate).toBe(false);
    expect(clientFindFirst).toHaveBeenCalledOnce();
    expect(leadFindFirst).toHaveBeenCalledOnce();
  });
});
