/**
 * @vitest-environment node
 *
 * Why this test matters: spec FR-501 mandates a closed `source` enum
 * (`website` | `manual` | `import`) and spec FR-129 requires that leads with
 * duplicate emails be created anyway but flagged for the
 * "POSSIBLE DUPLICATE" annotation. Without these guarantees, the lead pipeline
 * accepts arbitrary source strings (breaking analytics in FR-702/SC-005) and
 * silently buries duplicates instead of surfacing them.
 *
 * It ALSO pins the Task 8.3 governance migration: `createLead` must route its
 * write through the governed `Lead.create` Manifest command (constitution §9),
 * NOT a direct `prisma.lead.create`. The assertions fail if the write ever
 * regresses to a direct mutation, if pre-validation stops gating the dispatch,
 * or if the canonical command body drifts (status is command-owned; eventDate
 * is epoch-ms / null).
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

vi.mock("@/app/lib/tenant", () => ({
  requireCurrentUser: vi.fn(),
}));

vi.mock("@/lib/manifest-command", () => ({
  runManifestCommand: vi.fn(),
}));

vi.mock("@repo/database", () => ({
  database: {
    lead: { findFirst: vi.fn() },
    client: { findFirst: vi.fn() },
  },
}));

import { database } from "@repo/database";
import { revalidatePath } from "next/cache";
import { runManifestCommand } from "@/lib/manifest-command";
import { requireCurrentUser } from "@/app/lib/tenant";
import { createLead } from "../../app/(authenticated)/marketing/leads/actions";

const leadFindFirst = database.lead.findFirst as ReturnType<typeof vi.fn>;
const clientFindFirst = database.client.findFirst as ReturnType<typeof vi.fn>;
const runCommand = runManifestCommand as ReturnType<typeof vi.fn>;
const requireUser = requireCurrentUser as ReturnType<typeof vi.fn>;
const revalidate = revalidatePath as ReturnType<typeof vi.fn>;

const LEAD_ID = "lead-1";
const TENANT_ID = "tenant-1";
const USER_ID = "user-1";

const persistedLead = {
  id: LEAD_ID,
  tenantId: TENANT_ID,
  contactName: "Jane Doe",
  companyName: "",
  contactEmail: "",
  contactPhone: "",
  source: "manual",
  eventType: "",
  eventDate: null,
  estimatedGuests: 0,
  estimatedValue: 0,
  notes: "",
  assignedTo: "",
  status: "new",
  deletedAt: null,
};

// `database.lead.findFirst` serves two distinct callers: the FR-129 duplicate
// check (where has NO `id`) and the post-create read-back (where has `id`).
const isReadBack = (call: unknown[]) =>
  Boolean((call[0] as { where?: { id?: string } })?.where?.id);
const dupeCheckCalls = () =>
  leadFindFirst.mock.calls.filter((c) => !isReadBack(c));
const readBackCalls = () => leadFindFirst.mock.calls.filter(isReadBack);

describe("createLead server action — spec enforcement + governance", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireUser.mockResolvedValue({
      id: USER_ID,
      tenantId: TENANT_ID,
      role: "admin",
      email: "u@example.com",
      firstName: "U",
      lastName: "Ser",
    });
    runCommand.mockResolvedValue({
      ok: true,
      entity: "Lead",
      command: "create",
      result: { id: LEAD_ID },
    });
    leadFindFirst.mockImplementation((args: { where?: { id?: string } }) =>
      args?.where?.id ? Promise.resolve(persistedLead) : Promise.resolve(null)
    );
    clientFindFirst.mockResolvedValue(null);
  });

  it("defaults source to 'manual' when omitted (FR-501)", async () => {
    const result = await createLead({ contactName: "Jane Doe" });
    expect(result.lead).toEqual(persistedLead);
    expect(runCommand).toHaveBeenCalledWith(
      expect.objectContaining({
        entity: "Lead",
        command: "create",
        body: expect.objectContaining({ source: "manual" }),
      })
    );
  });

  it("accepts each closed-enum source value verbatim", async () => {
    for (const source of ["website", "manual", "import"] as const) {
      runCommand.mockClear();
      await createLead({ contactName: "Jane", source });
      expect(runCommand).toHaveBeenCalledWith(
        expect.objectContaining({
          entity: "Lead",
          command: "create",
          body: expect.objectContaining({ source }),
        })
      );
    }
  });

  it("rejects any source outside the closed enum BEFORE dispatching (FR-501)", async () => {
    await expect(
      createLead({ contactName: "Jane", source: "Referral" })
    ).rejects.toThrow(/Lead source must be one of/);
    await expect(
      createLead({ contactName: "Jane", source: "social media" })
    ).rejects.toThrow(/Lead source must be one of/);
    expect(runCommand).not.toHaveBeenCalled();
  });

  it("rejects empty contactName BEFORE dispatching", async () => {
    await expect(createLead({ contactName: "   " })).rejects.toThrow(
      /Contact name is required/
    );
    expect(runCommand).not.toHaveBeenCalled();
  });

  it("routes the write through the governed Lead.create command (constitution §9)", async () => {
    const result = await createLead({ contactName: "Jane Doe" });
    expect(runCommand).toHaveBeenCalledTimes(1);
    expect(runCommand).toHaveBeenCalledWith(
      expect.objectContaining({
        entity: "Lead",
        command: "create",
        user: { id: USER_ID, tenantId: TENANT_ID, role: "admin" },
      })
    );
    // The persisted row is read back to preserve the CreateLeadResult.lead shape.
    expect(readBackCalls().length).toBe(1);
    expect(result.lead).toEqual(persistedLead);
    expect(revalidate).toHaveBeenCalledWith("/marketing/leads");
  });

  it("encodes eventDate as epoch-ms and lets the command own status", async () => {
    await createLead({ contactName: "Jane", eventDate: "2026-06-20" });
    const body = runCommand.mock.calls[0][0].body;
    expect(typeof body.eventDate).toBe("number");
    expect(body.eventDate).toBe(new Date("2026-06-20").getTime());
    expect(body).not.toHaveProperty("status");
  });

  it("sends eventDate=null when no date is supplied", async () => {
    await createLead({ contactName: "Jane" });
    expect(runCommand.mock.calls[0][0].body.eventDate).toBeNull();
  });

  it("flags possibleDuplicate when an existing Client owns the email (FR-129)", async () => {
    clientFindFirst.mockResolvedValueOnce({ id: "client-9" });
    const result = await createLead({
      contactName: "Jane",
      contactEmail: "Jane@Example.com",
    });
    // Spec is clear: create regardless, flag for annotation.
    expect(runCommand).toHaveBeenCalledTimes(1);
    expect(result.possibleDuplicate).toBe(true);
    expect(result.duplicateReason).toBe("client_email");
  });

  it("flags possibleDuplicate when another Lead already uses the email", async () => {
    leadFindFirst.mockImplementation((args: { where?: { id?: string } }) =>
      args?.where?.id
        ? Promise.resolve(persistedLead)
        : Promise.resolve({ id: "lead-existing" })
    );
    const result = await createLead({
      contactName: "Jane",
      contactEmail: "jane@example.com",
    });
    expect(result.possibleDuplicate).toBe(true);
    expect(result.duplicateReason).toBe("lead_email");
    expect(runCommand).toHaveBeenCalledTimes(1);
  });

  it("does not flag when no email is provided (nothing to compare)", async () => {
    const result = await createLead({ contactName: "Jane" });
    expect(result.possibleDuplicate).toBe(false);
    expect(clientFindFirst).not.toHaveBeenCalled();
    expect(dupeCheckCalls().length).toBe(0);
  });

  it("does not flag when the email is unique across leads and clients", async () => {
    const result = await createLead({
      contactName: "Jane",
      contactEmail: "fresh@example.com",
    });
    expect(result.possibleDuplicate).toBe(false);
    expect(clientFindFirst).toHaveBeenCalledOnce();
    expect(dupeCheckCalls().length).toBe(1);
  });

  it("surfaces a failed governed command and skips the read-back", async () => {
    runCommand.mockResolvedValue({
      ok: false,
      kind: "guard_failed",
      message: "Contact name is required",
    });
    await expect(createLead({ contactName: "Boom" })).rejects.toThrow(
      /Contact name is required/
    );
    expect(readBackCalls().length).toBe(0);
  });
});
