/**
 * @vitest-environment node
 *
 * Why this test matters: it pins the Task 8.3 governance migration of
 * `createFacility`. The server action must route its write through the governed
 * `Facility.create` Manifest command (constitution §9), NOT a direct
 * `database.facility.create`. The assertions fail if the write regresses to a
 * direct mutation, if the canonical command body drifts (form fields must map to
 * the reconciled Prisma columns; `status` is command-owned and must NOT be sent;
 * `addressLine2`/`country` are not collected and default to ""), or if the actor
 * context required for policy + audit (§19) stops being forwarded.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

vi.mock("@repo/auth/server", () => ({
  auth: vi.fn(async () => ({ orgId: "org-1" })),
}));

vi.mock("@/app/lib/tenant", () => ({
  requireCurrentUser: vi.fn(),
  getTenantId: vi.fn(async () => "tenant-1"),
}));

vi.mock("@/lib/manifest-command", () => ({
  runManifestCommand: vi.fn(),
}));

vi.mock("@repo/database", () => ({
  database: {
    facility: { create: vi.fn(), findMany: vi.fn() },
  },
}));

import { database } from "@repo/database";
import { revalidatePath } from "next/cache";
import { runManifestCommand } from "@/lib/manifest-command";
import { requireCurrentUser } from "@/app/lib/tenant";
import { createFacility } from "../../app/(authenticated)/facilities/actions";

const runCommand = runManifestCommand as ReturnType<typeof vi.fn>;
const requireUser = requireCurrentUser as ReturnType<typeof vi.fn>;
const revalidate = revalidatePath as ReturnType<typeof vi.fn>;
const facilityCreate = database.facility.create as ReturnType<typeof vi.fn>;

const TENANT_ID = "tenant-1";
const USER_ID = "user-1";

function form(fields: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.append(k, v);
  return fd;
}

const FULL = {
  name: "Main Kitchen",
  code: "MAIN-KIT",
  facilityType: "warehouse",
  addressLine1: "500 Industrial Way",
  city: "Springfield",
  state: "IL",
  postalCode: "62701",
  phone: "555-0142",
  notes: "Primary site",
};

describe("createFacility server action — governance migration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireUser.mockResolvedValue({
      id: USER_ID,
      tenantId: TENANT_ID,
      role: "facility_manager",
    });
    runCommand.mockResolvedValue({
      ok: true,
      entity: "Facility",
      command: "create",
      result: { id: "fac-1" },
    });
  });

  it("routes the write through the governed Facility.create command (constitution §9)", async () => {
    await createFacility(form(FULL));
    expect(facilityCreate).not.toHaveBeenCalled();
    expect(runCommand).toHaveBeenCalledTimes(1);
    expect(runCommand).toHaveBeenCalledWith(
      expect.objectContaining({
        entity: "Facility",
        command: "create",
        user: { id: USER_ID, tenantId: TENANT_ID, role: "facility_manager" },
      })
    );
    expect(revalidate).toHaveBeenCalledWith("/facilities");
  });

  it("maps every form field to its reconciled Prisma column in the command body", async () => {
    await createFacility(form(FULL));
    const body = runCommand.mock.calls[0][0].body;
    expect(body).toMatchObject({
      name: "Main Kitchen",
      code: "MAIN-KIT",
      facilityType: "warehouse",
      addressLine1: "500 Industrial Way",
      city: "Springfield",
      state: "IL",
      postalCode: "62701",
      phone: "555-0142",
      notes: "Primary site",
      // Not collected by the form → "" (GenericPrismaStore coerces "" → NULL).
      addressLine2: "",
      country: "",
    });
  });

  it("lets the command own status (never sent in the body)", async () => {
    await createFacility(form(FULL));
    expect(runCommand.mock.calls[0][0].body).not.toHaveProperty("status");
  });

  it("defaults a blank name to 'Untitled Facility' and missing type to 'kitchen'", async () => {
    await createFacility(form({ name: "   " }));
    const body = runCommand.mock.calls[0][0].body;
    expect(body.name).toBe("Untitled Facility");
    expect(body.facilityType).toBe("kitchen");
    // Blank optional code is forwarded as "" so the store NULLs it (unique-safe).
    expect(body.code).toBe("");
  });

  it("surfaces a failed governed command", async () => {
    runCommand.mockResolvedValue({
      ok: false,
      kind: "policy_denied",
      message: "Facilities management",
    });
    await expect(createFacility(form(FULL))).rejects.toThrow(
      /Facilities management/
    );
    expect(revalidate).not.toHaveBeenCalled();
  });
});
