/**
 * @vitest-environment node
 *
 * Why this matters (db-performance plan #7 — apps/app server-action over-fetch):
 * `getEmailTemplates` did a paginated `emailTemplate.findMany` with NO select,
 * materializing every column of up to 50 rows on each settings list-page load —
 * including the heavy `body` (`String @db.Text`, full HTML email body) and
 * `mergeFields` (`Json`) columns that the list table NEVER renders. Those heavy
 * columns are consumed only on the [id] detail page (getEmailTemplateById). The
 * list table (email-templates-client.tsx) renders only id/name/type/subject/
 * default/status, so a column-only `select` is behavior-identical at runtime.
 *
 * This test pins:
 *  1. findMany carries a focused select of EXACTLY the 6 list fields — fails if
 *     the select is dropped (reverts to full-row) or a heavy column (`body` /
 *     `mergeFields`) is re-added.
 *  2. The pagination shape (count + findMany, page/limit/total/totalPages).
 *  3. The auth guard: no orgId → invariant throws → no DB read.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@repo/auth/server", () => ({ auth: vi.fn() }));
vi.mock("@/app/lib/tenant", () => ({
  getTenantId: vi.fn(),
  requireCurrentUser: vi.fn(),
}));
vi.mock("@/app/lib/invariant", () => ({ invariant: vi.fn() }));
vi.mock("@/lib/manifest-command", () => ({ runManifestCommand: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@repo/database", () => ({
  database: {
    emailTemplate: { findMany: vi.fn(), count: vi.fn() },
  },
}));

import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { invariant } from "@/app/lib/invariant";
import { getTenantId } from "@/app/lib/tenant";
import { getEmailTemplates } from "../../app/(authenticated)/(platform)/settings/email-templates/actions";

const authMock = auth as unknown as ReturnType<typeof vi.fn>;
const tenantMock = getTenantId as ReturnType<typeof vi.fn>;
const invariantMock = invariant as ReturnType<typeof vi.fn>;
const findMany = database.emailTemplate.findMany as ReturnType<typeof vi.fn>;
const count = database.emailTemplate.count as ReturnType<typeof vi.fn>;

const TENANT_ID = "tenant-1";

const LIST_SELECT = {
  id: true,
  name: true,
  templateType: true,
  subject: true,
  isDefault: true,
  isActive: true,
};

const templatesFixture = [
  {
    id: "tpl-1",
    name: "Proposal follow-up",
    templateType: "follow_up",
    subject: "Following up on your proposal",
    isDefault: true,
    isActive: true,
  },
  {
    id: "tpl-2",
    name: "Confirmation",
    templateType: "confirmation",
    subject: "Your event is confirmed",
    isDefault: false,
    isActive: true,
  },
];

describe("getEmailTemplates — focused select (plan #7)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMock.mockResolvedValue({ orgId: "org-1" });
    tenantMock.mockResolvedValue(TENANT_ID);
    invariantMock.mockImplementation((cond, msg) => {
      if (!cond) {
        throw new Error(msg);
      }
    });
    findMany.mockResolvedValue(templatesFixture);
    count.mockResolvedValue(2);
  });

  it("selects ONLY the 6 list fields (drops body @db.Text + mergeFields Json)", async () => {
    const result = await getEmailTemplates({}, 1, 50);

    expect(findMany).toHaveBeenCalledTimes(1);
    const call = findMany.mock.calls[0]?.[0] as {
      where: unknown;
      orderBy: unknown;
      take: number;
      skip: number;
      select: Record<string, boolean>;
    };
    // objectContaining deep-equals `select`, so this passes ONLY when select is
    // exactly these 6 keys — re-adding `body` / `mergeFields` or dropping the
    // select fails.
    expect(call).toEqual(
      expect.objectContaining({
        orderBy: [{ createdAt: "desc" }],
        take: 50,
        skip: 0,
        select: LIST_SELECT,
      })
    );
    // Explicit heavy-column regression guard.
    expect(call.select).not.toHaveProperty("body");
    expect(call.select).not.toHaveProperty("mergeFields");
    expect(Object.keys(call.select).sort()).toEqual([
      "id",
      "isActive",
      "isDefault",
      "name",
      "subject",
      "templateType",
    ]);

    // Row data flows through unchanged.
    expect(result.data).toEqual(templatesFixture);
  });

  it("applies the isActive + search filters to the where clause", async () => {
    await getEmailTemplates({ isActive: true, search: "proposal" }, 2, 10);

    expect(findMany).toHaveBeenCalledTimes(1);
    const call = findMany.mock.calls[0]?.[0] as {
      where: { AND: unknown[] };
      take: number;
      skip: number;
    };
    expect(call.take).toBe(10);
    expect(call.skip).toBe(10); // (page 2 - 1) * 10
    // AND carries tenant + deletedAt + search OR + isActive.
    expect(call.where.AND).toHaveLength(4);
  });

  it("returns the pagination envelope from the count", async () => {
    count.mockResolvedValue(120);

    const result = await getEmailTemplates({}, 1, 50);

    expect(count).toHaveBeenCalledTimes(1);
    expect(result.pagination).toEqual({
      page: 1,
      limit: 50,
      total: 120,
      totalPages: 3,
    });
  });

  it("does not read the DB when the auth guard fails", async () => {
    authMock.mockResolvedValue({ orgId: null });

    await expect(getEmailTemplates()).rejects.toThrow("Unauthorized");
    expect(findMany).not.toHaveBeenCalled();
    expect(count).not.toHaveBeenCalled();
  });
});
