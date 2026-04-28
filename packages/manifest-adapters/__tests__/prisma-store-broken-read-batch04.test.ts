/**
 * Persistence smoke tests for BROKEN_PRISMA_READ batch 04 stores.
 *
 * Covers: ClientContact, ClientInteraction, ClientPreference, CommandBoard,
 * CommandBoardCard. Each test exercises a single tenant-scoped round-trip —
 * verifying that the where clauses include `tenantId` (and `deletedAt: null`
 * for soft-delete reads), and that key fields are coerced to the spelling
 * the matching Prisma model expects (snake_case where applicable, JSON
 * pass-through, and arrays for `tags`).
 *
 * Failure-path semantics (silent return undefined / false on Prisma throw)
 * are already covered by the AlertsConfig + batch01-03 suites that share
 * the same `reportOp` helper, so they are not re-tested here.
 *
 * @vitest-environment node
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  ClientContactPrismaStore,
  ClientInteractionPrismaStore,
  ClientPreferencePrismaStore,
} from "../src/prisma-stores/broken-read-batch04-client-trio";
import {
  CommandBoardCardPrismaStore,
  CommandBoardPrismaStore,
} from "../src/prisma-stores/broken-read-batch04-command-board";

const mockClientContact = vi.hoisted(() => ({
  findMany: vi.fn(),
  findFirst: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  deleteMany: vi.fn(),
}));
const mockClientInteraction = vi.hoisted(() => ({
  findMany: vi.fn(),
  findFirst: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  deleteMany: vi.fn(),
}));
const mockClientPreference = vi.hoisted(() => ({
  findMany: vi.fn(),
  findFirst: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  deleteMany: vi.fn(),
}));
const mockCommandBoard = vi.hoisted(() => ({
  findMany: vi.fn(),
  findFirst: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  deleteMany: vi.fn(),
}));
const mockCommandBoardCard = vi.hoisted(() => ({
  findMany: vi.fn(),
  findFirst: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  deleteMany: vi.fn(),
}));

vi.mock("@repo/database/standalone", () => ({
  Prisma: {},
}));

const TENANT = "22222222-2222-2222-2222-222222222222";

interface MockClient {
  clientContact: typeof mockClientContact;
  clientInteraction: typeof mockClientInteraction;
  clientPreference: typeof mockClientPreference;
  commandBoard: typeof mockCommandBoard;
  commandBoardCard: typeof mockCommandBoardCard;
}

const prisma: MockClient = {
  clientContact: mockClientContact,
  clientInteraction: mockClientInteraction,
  clientPreference: mockClientPreference,
  commandBoard: mockCommandBoard,
  commandBoardCard: mockCommandBoardCard,
};

beforeEach(() => {
  vi.resetAllMocks();
});

describe("ClientContactPrismaStore", () => {
  it("create accepts both snake_case and camelCase first/last name", async () => {
    mockClientContact.create.mockImplementationOnce(
      async ({ data }: { data: Record<string, unknown> }) => ({
        ...data,
        tenantId: TENANT,
      })
    );

    const store = new ClientContactPrismaStore(prisma as never, TENANT);
    await store.create({
      clientId: "client-1",
      firstName: "Jane", // camelCase → first_name
      last_name: "Doe", // already snake_case
      email: "jane@example.test",
      isPrimary: true,
    });

    const call = mockClientContact.create.mock.calls[0][0] as {
      data: Record<string, unknown>;
    };
    expect(call.data.tenantId).toBe(TENANT);
    expect(call.data.clientId).toBe("client-1");
    expect(call.data.first_name).toBe("Jane");
    expect(call.data.last_name).toBe("Doe");
    expect(call.data.email).toBe("jane@example.test");
    expect(call.data.isPrimary).toBe(true);
    expect(call.data.isBillingContact).toBe(false);
  });

  it("getAll filters by tenant + deletedAt", async () => {
    mockClientContact.findMany.mockResolvedValueOnce([]);
    const store = new ClientContactPrismaStore(prisma as never, TENANT);
    await store.getAll();
    expect(mockClientContact.findMany).toHaveBeenCalledWith({
      where: { tenantId: TENANT, deletedAt: null },
      orderBy: { id: "desc" },
    });
  });

  it("delete is soft-delete (sets deletedAt)", async () => {
    mockClientContact.update.mockResolvedValueOnce({});
    const store = new ClientContactPrismaStore(prisma as never, TENANT);
    const ok = await store.delete("contact-1");
    expect(ok).toBe(true);
    const call = mockClientContact.update.mock.calls[0][0] as {
      where: { tenantId_id: { tenantId: string; id: string } };
      data: { deletedAt: Date };
    };
    expect(call.where.tenantId_id).toEqual({
      tenantId: TENANT,
      id: "contact-1",
    });
    expect(call.data.deletedAt).toBeInstanceOf(Date);
  });
});

describe("ClientInteractionPrismaStore", () => {
  it("create accepts both correlation_id and correlationId aliases", async () => {
    mockClientInteraction.create.mockImplementationOnce(
      async ({ data }: { data: Record<string, unknown> }) => ({
        ...data,
        tenantId: TENANT,
      })
    );

    const store = new ClientInteractionPrismaStore(prisma as never, TENANT);
    await store.create({
      employeeId: "emp-1",
      interactionType: "call",
      subject: "Catering follow-up",
      correlationId: "corr-abc", // camelCase → correlation_id
    });

    const call = mockClientInteraction.create.mock.calls[0][0] as {
      data: Record<string, unknown>;
    };
    expect(call.data.tenantId).toBe(TENANT);
    expect(call.data.employeeId).toBe("emp-1");
    expect(call.data.interactionType).toBe("call");
    expect(call.data.subject).toBe("Catering follow-up");
    expect(call.data.correlation_id).toBe("corr-abc");
    expect(call.data.followUpCompleted).toBe(false);
    expect(call.data.interactionDate).toBeInstanceOf(Date);
  });

  it("interactionType defaults to 'note' when blank", async () => {
    mockClientInteraction.create.mockImplementationOnce(
      async ({ data }: { data: Record<string, unknown> }) => ({
        ...data,
        tenantId: TENANT,
      })
    );

    const store = new ClientInteractionPrismaStore(prisma as never, TENANT);
    await store.create({
      employeeId: "emp-1",
    });

    const call = mockClientInteraction.create.mock.calls[0][0] as {
      data: Record<string, unknown>;
    };
    expect(call.data.interactionType).toBe("note");
  });
});

describe("ClientPreferencePrismaStore", () => {
  it("create passes preferenceValue through asJsonInput", async () => {
    mockClientPreference.create.mockImplementationOnce(
      async ({ data }: { data: Record<string, unknown> }) => ({
        ...data,
        tenantId: TENANT,
      })
    );

    const store = new ClientPreferencePrismaStore(prisma as never, TENANT);
    await store.create({
      clientId: "client-1",
      preferenceType: "dietary",
      preferenceKey: "allergies",
      preferenceValue: { gluten: true, dairy: false },
    });

    const call = mockClientPreference.create.mock.calls[0][0] as {
      data: Record<string, unknown>;
    };
    expect(call.data.tenantId).toBe(TENANT);
    expect(call.data.preferenceType).toBe("dietary");
    expect(call.data.preferenceKey).toBe("allergies");
    expect(call.data.preferenceValue).toEqual({
      gluten: true,
      dairy: false,
    });
  });

  it("getById filters by tenant + deletedAt", async () => {
    mockClientPreference.findFirst.mockResolvedValueOnce(null);
    const store = new ClientPreferencePrismaStore(prisma as never, TENANT);
    const result = await store.getById("pref-1");
    expect(result).toBeUndefined();
    expect(mockClientPreference.findFirst).toHaveBeenCalledWith({
      where: { tenantId: TENANT, id: "pref-1", deletedAt: null },
    });
  });
});

describe("CommandBoardPrismaStore", () => {
  it("create normalizes string-tags into a String[] array", async () => {
    mockCommandBoard.create.mockImplementationOnce(
      async ({ data }: { data: Record<string, unknown> }) => ({
        ...data,
        tenantId: TENANT,
      })
    );

    const store = new CommandBoardPrismaStore(prisma as never, TENANT);
    await store.create({
      name: "Spring Gala",
      eventId: "event-1",
      tags: "vip, urgent ,gala",
    });

    const call = mockCommandBoard.create.mock.calls[0][0] as {
      data: Record<string, unknown>;
    };
    expect(call.data.tenantId).toBe(TENANT);
    expect(call.data.name).toBe("Spring Gala");
    expect(call.data.eventId).toBe("event-1");
    expect(call.data.tags).toEqual(["vip", "urgent", "gala"]);
    expect(call.data.status).toBe("draft");
    expect(call.data.isTemplate).toBe(false);
    expect(call.data.autoPopulate).toBe(false);
    // scope is NOT in input, so it must NOT be in create payload
    expect("scope" in call.data).toBe(false);
  });

  it("create accepts array tags verbatim", async () => {
    mockCommandBoard.create.mockImplementationOnce(
      async ({ data }: { data: Record<string, unknown> }) => ({
        ...data,
        tenantId: TENANT,
      })
    );

    const store = new CommandBoardPrismaStore(prisma as never, TENANT);
    await store.create({
      name: "Plain Board",
      tags: ["alpha", "beta"],
    });

    const call = mockCommandBoard.create.mock.calls[0][0] as {
      data: Record<string, unknown>;
    };
    expect(call.data.tags).toEqual(["alpha", "beta"]);
  });

  it("getAll filters by tenant + deletedAt", async () => {
    mockCommandBoard.findMany.mockResolvedValueOnce([]);
    const store = new CommandBoardPrismaStore(prisma as never, TENANT);
    await store.getAll();
    expect(mockCommandBoard.findMany).toHaveBeenCalledWith({
      where: { tenantId: TENANT, deletedAt: null },
      orderBy: { id: "desc" },
    });
  });
});

describe("CommandBoardCardPrismaStore", () => {
  it("create persists position/size defaults and JSON metadata", async () => {
    mockCommandBoardCard.create.mockImplementationOnce(
      async ({ data }: { data: Record<string, unknown> }) => ({
        ...data,
        tenantId: TENANT,
      })
    );

    const store = new CommandBoardCardPrismaStore(prisma as never, TENANT);
    await store.create({
      boardId: "board-1",
      title: "Prep mise-en-place",
      cardType: "task",
      metadata: { priority: "high", owner: "ops" },
    });

    const call = mockCommandBoardCard.create.mock.calls[0][0] as {
      data: Record<string, unknown>;
    };
    expect(call.data.tenantId).toBe(TENANT);
    expect(call.data.boardId).toBe("board-1");
    expect(call.data.title).toBe("Prep mise-en-place");
    expect(call.data.cardType).toBe("task");
    expect(call.data.status).toBe("pending");
    expect(call.data.positionX).toBe(0);
    expect(call.data.positionY).toBe(0);
    expect(call.data.width).toBe(200);
    expect(call.data.height).toBe(150);
    expect(call.data.zIndex).toBe(0);
    expect(call.data.version).toBe(0);
    expect(call.data.metadata).toEqual({ priority: "high", owner: "ops" });
  });

  it("delete is soft-delete (sets deletedAt)", async () => {
    mockCommandBoardCard.update.mockResolvedValueOnce({});
    const store = new CommandBoardCardPrismaStore(prisma as never, TENANT);
    const ok = await store.delete("card-1");
    expect(ok).toBe(true);
    const call = mockCommandBoardCard.update.mock.calls[0][0] as {
      where: { tenantId_id: { tenantId: string; id: string } };
      data: { deletedAt: Date };
    };
    expect(call.where.tenantId_id).toEqual({
      tenantId: TENANT,
      id: "card-1",
    });
    expect(call.data.deletedAt).toBeInstanceOf(Date);
  });
});
