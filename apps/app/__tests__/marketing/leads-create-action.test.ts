/**
 * @vitest-environment node
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

vi.mock("@/app/lib/tenant", () => ({
  requireCurrentUser: vi.fn(),
}));

vi.mock("@/lib/manifest-command", () => ({
  runManifestCommand: vi.fn(),
}));

vi.mock("@/app/lib/manifest-client.generated", () => ({
  listClients: vi.fn(),
  listLeads: vi.fn(),
}));

import {
  listClients,
  listLeads,
} from "@/app/lib/manifest-client.generated";
import { revalidatePath } from "next/cache";
import { requireCurrentUser } from "@/app/lib/tenant";
import { runManifestCommand } from "@/lib/manifest-command";
import { createLead } from "../../app/(authenticated)/marketing/leads/actions";

const listClientsMock = listClients as ReturnType<typeof vi.fn>;
const listLeadsMock = listLeads as ReturnType<typeof vi.fn>;
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

function setupListMocks(options?: {
  clientDuplicate?: boolean;
  contactEmail?: boolean;
  leadDuplicate?: boolean;
}) {
  listClientsMock.mockResolvedValue({
    data: options?.clientDuplicate ? [{ id: "client-9" }] : [],
  });

  let leadCalls = 0;
  listLeadsMock.mockImplementation(async () => {
    leadCalls += 1;
    if (options?.contactEmail && !options?.clientDuplicate && leadCalls === 1) {
      if (options.leadDuplicate) {
        return { data: [{ id: "lead-existing" }] };
      }
      return { data: [] };
    }
    return { data: [persistedLead] };
  });
}

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
    setupListMocks();
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
      setupListMocks();
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

  it("flags possibleDuplicate when an existing Client owns the email (FR-129)", async () => {
    setupListMocks({ clientDuplicate: true, contactEmail: true });
    const result = await createLead({
      contactName: "Jane",
      contactEmail: "Jane@Example.com",
    });
    expect(runCommand).toHaveBeenCalledTimes(1);
    expect(result.possibleDuplicate).toBe(true);
    expect(result.duplicateReason).toBe("client_email");
  });

  it("flags possibleDuplicate when another Lead already uses the email", async () => {
    setupListMocks({ contactEmail: true, leadDuplicate: true });
    const result = await createLead({
      contactName: "Jane",
      contactEmail: "jane@example.com",
    });
    expect(result.possibleDuplicate).toBe(true);
    expect(result.duplicateReason).toBe("lead_email");
  });

  it("does not flag when no email is provided", async () => {
    const result = await createLead({ contactName: "Jane" });
    expect(result.possibleDuplicate).toBe(false);
    expect(listClientsMock).not.toHaveBeenCalled();
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
    expect(listLeadsMock).not.toHaveBeenCalled();
  });
});
