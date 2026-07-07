/**
 * @vitest-environment node
 *
 * Why this test matters: it pins the governance migration of the proposal-template
 * "single default" invariant. Per constitution §3/§9 a governed mutation MUST run
 * through the Manifest runtime (`ProposalTemplate.update`), NOT a direct
 * `prisma.proposalTemplate.updateMany` batch write. Promoting one template to the
 * default must DEMOTE every other current default — and that demotion is itself a
 * governed write.
 *
 * The `@repo/database` mock deliberately exposes NO `updateMany` method, so if the
 * action ever regresses to the old `database.proposalTemplate.updateMany(...)`
 * batch bypass the call throws "is not a function" and the test fails. The positive
 * assertions prove the demotion is dispatched as `ProposalTemplate.update` with
 * `isDefault:false` for each sibling, re-passing the sibling's own field values so
 * the full-mutate update command clobbers nothing else.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

vi.mock("@/app/lib/decimal", () => ({
  serializeDecimals: (x: unknown) => x,
}));

vi.mock("@/app/lib/invariant", () => ({
  invariant: (cond: unknown, msg?: string) => {
    if (!cond) {
      throw new Error(msg ?? "invariant failed");
    }
  },
}));

vi.mock("@/app/lib/tenant", () => ({
  requireCurrentUser: vi.fn(),
}));

vi.mock("@/lib/manifest-command", () => ({
  runManifestCommand: vi.fn(),
}));

// No `updateMany` on purpose: a reverted batch-write bypass would throw here.
vi.mock("@repo/database", () => ({
  database: {
    proposalTemplate: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
    },
  },
}));

import { database } from "@repo/database";
import { requireCurrentUser } from "@/app/lib/tenant";
import { runManifestCommand } from "@/lib/manifest-command";
import {
  createProposalTemplate,
  updateProposalTemplate,
} from "../../app/(authenticated)/(sales)/crm/proposals/templates/actions";

const runCommand = runManifestCommand as ReturnType<typeof vi.fn>;
const requireUser = requireCurrentUser as ReturnType<typeof vi.fn>;
const findMany = database.proposalTemplate.findMany as ReturnType<typeof vi.fn>;
const findFirst = database.proposalTemplate.findFirst as ReturnType<
  typeof vi.fn
>;

const TENANT_ID = "tenant-1";
const USER_ID = "user-1";

const siblingRow = (id: string) => ({
  id,
  tenantId: TENANT_ID,
  name: `Template ${id}`,
  description: "desc",
  eventType: "wedding",
  defaultTerms: "terms",
  defaultTaxRate: 7.5,
  defaultNotes: "notes",
  defaultLineItems: '[{"x":1}]',
  isActive: true,
  isDefault: true,
  logoUrl: "logo",
  primaryColor: "#111",
  secondaryColor: "#222",
  accentColor: "#333",
  fontFamily: "Inter",
  deletedAt: null,
});

const demoteCalls = () =>
  runCommand.mock.calls
    .map((c) => c[0] as Record<string, unknown>)
    .filter(
      (a) =>
        a.entity === "ProposalTemplate" &&
        a.command === "update" &&
        (a.body as Record<string, unknown>).isDefault === false
    );

describe("proposal-template single-default invariant — governance (§9)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireUser.mockResolvedValue({
      id: USER_ID,
      tenantId: TENANT_ID,
      role: "admin",
    });
    runCommand.mockResolvedValue({ ok: true, result: { id: "new-template" } });
    findFirst.mockResolvedValue(siblingRow("new-template"));
    findMany.mockResolvedValue([]);
  });

  it("demotes existing defaults via governed ProposalTemplate.update on create", async () => {
    findMany.mockResolvedValueOnce([siblingRow("old-default")]);

    await createProposalTemplate({ name: "New default", isDefault: true });

    const demotions = demoteCalls();
    expect(demotions).toHaveLength(1);
    expect(demotions[0]).toMatchObject({
      entity: "ProposalTemplate",
      command: "update",
      user: { id: USER_ID, tenantId: TENANT_ID, role: "admin" },
    });
    const body = demotions[0]?.body as Record<string, unknown>;
    // Re-passes the sibling's own values so nothing but isDefault changes.
    expect(body).toMatchObject({
      id: "old-default",
      name: "Template old-default",
      isDefault: false,
      isActive: true,
      defaultLineItems: '[{"x":1}]',
      defaultTaxRate: 7.5,
    });
    // No batch write exists on the db mock — reaching this line proves it.
    expect(
      (database.proposalTemplate as unknown as Record<string, unknown>)
        .updateMany
    ).toBeUndefined();
  });

  it("excludes the target row when demoting on update", async () => {
    findFirst.mockResolvedValue(siblingRow("target"));
    findMany.mockResolvedValueOnce([siblingRow("other-default")]);

    await updateProposalTemplate("target", { isDefault: true });

    // findMany for the demotion must exclude the row being promoted.
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          isDefault: true,
          id: { not: "target" },
        }),
      })
    );
    expect(demoteCalls()).toHaveLength(1);
  });

  it("does not demote anything when isDefault is not set", async () => {
    await createProposalTemplate({ name: "Plain", isDefault: false });
    expect(findMany).not.toHaveBeenCalled();
    expect(demoteCalls()).toHaveLength(0);
  });

  it("surfaces a failed demotion instead of proceeding to create", async () => {
    findMany.mockResolvedValueOnce([siblingRow("old-default")]);
    runCommand.mockResolvedValueOnce({
      ok: false,
      message: "policy denied",
    });

    await expect(
      createProposalTemplate({ name: "New", isDefault: true })
    ).rejects.toThrow(/policy denied|clear default/);
  });
});
