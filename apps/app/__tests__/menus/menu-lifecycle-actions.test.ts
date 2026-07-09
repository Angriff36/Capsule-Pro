/**
 * @vitest-environment node
 *
 * Pins Menu publication lifecycle to Manifest commands:
 * draft → published (markPublished), published → draft (unpublish),
 * draft|published → archived (archive), archived → draft (restore).
 * Must not toggle isActive via Menu.update.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

vi.mock("@/app/lib/tenant", () => ({
  requireCurrentUser: vi.fn(),
  requireTenantId: vi.fn(),
}));

vi.mock("@/lib/manifest-command", () => ({
  runManifestCommand: vi.fn(),
}));

vi.mock("@repo/database", () => ({
  database: {
    menu: { findFirst: vi.fn() },
  },
}));

import { database } from "@repo/database";
import { revalidatePath } from "next/cache";
import { requireCurrentUser, requireTenantId } from "@/app/lib/tenant";
import { runManifestCommand } from "@/lib/manifest-command";
import {
  archiveMenuManifest,
  publishMenuManifest,
  restoreMenuManifest,
  unpublishMenuManifest,
} from "../../app/(authenticated)/(operations)/kitchen/recipes/menus/menu-lifecycle-actions";

const runCommand = runManifestCommand as ReturnType<typeof vi.fn>;
const requireUser = requireCurrentUser as ReturnType<typeof vi.fn>;
const requireTenant = requireTenantId as ReturnType<typeof vi.fn>;
const findFirst = database.menu.findFirst as ReturnType<typeof vi.fn>;
const revalidate = revalidatePath as ReturnType<typeof vi.fn>;

const MENU_ID = "menu-1";
const TENANT_ID = "tenant-1";
const USER_ID = "user-1";

const mockMenu = (status: string, isActive = true) =>
  findFirst.mockResolvedValue({
    id: MENU_ID,
    name: "Spring Menu",
    status,
    isActive,
  });

describe("Menu lifecycle Manifest actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireTenant.mockResolvedValue(TENANT_ID);
    requireUser.mockResolvedValue({
      id: USER_ID,
      tenantId: TENANT_ID,
      role: "admin",
    });
    runCommand.mockResolvedValue({ ok: true, result: { id: MENU_ID } });
  });

  it("publishes a draft via Menu.markPublished", async () => {
    mockMenu("draft");
    const result = await publishMenuManifest(MENU_ID);
    expect(result.success).toBe(true);
    expect(runCommand).toHaveBeenCalledWith(
      expect.objectContaining({
        entity: "Menu",
        command: "markPublished",
        instanceId: MENU_ID,
        body: expect.objectContaining({
          id: MENU_ID,
          publishedBy: USER_ID,
        }),
      })
    );
    expect(runCommand).not.toHaveBeenCalledWith(
      expect.objectContaining({ command: "update" })
    );
    expect(revalidate).toHaveBeenCalled();
  });

  it("rejects publish when menu is not draft", async () => {
    mockMenu("published");
    const result = await publishMenuManifest(MENU_ID);
    expect(result.success).toBe(false);
    expect(runCommand).not.toHaveBeenCalled();
  });

  it("unpublishes a published menu via Menu.unpublish", async () => {
    mockMenu("published");
    const result = await unpublishMenuManifest(MENU_ID);
    expect(result.success).toBe(true);
    expect(runCommand).toHaveBeenCalledWith(
      expect.objectContaining({
        entity: "Menu",
        command: "unpublish",
        instanceId: MENU_ID,
      })
    );
  });

  it("archives draft or published via Menu.archive", async () => {
    mockMenu("draft");
    const result = await archiveMenuManifest(MENU_ID);
    expect(result.success).toBe(true);
    expect(runCommand).toHaveBeenCalledWith(
      expect.objectContaining({
        entity: "Menu",
        command: "archive",
      })
    );
  });

  it("restores archived via Menu.restore", async () => {
    mockMenu("archived", false);
    const result = await restoreMenuManifest(MENU_ID);
    expect(result.success).toBe(true);
    expect(runCommand).toHaveBeenCalledWith(
      expect.objectContaining({
        entity: "Menu",
        command: "restore",
      })
    );
  });

  it("rejects restore when not archived", async () => {
    mockMenu("draft");
    const result = await restoreMenuManifest(MENU_ID);
    expect(result.success).toBe(false);
    expect(runCommand).not.toHaveBeenCalled();
  });
});
