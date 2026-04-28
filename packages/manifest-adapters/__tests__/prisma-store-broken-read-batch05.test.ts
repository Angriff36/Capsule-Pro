/**
 * Persistence smoke tests for BROKEN_PRISMA_READ batch 05 stores.
 *
 * Covers: CommandBoardConnection, CommandBoardGroup, CommandBoardLayout,
 * ContractSignature, CycleCountRecord. Each test exercises a single
 * tenant-scoped round-trip — verifying that the where clauses include
 * `tenantId` (and `deletedAt: null` for soft-delete reads), and that key
 * fields are coerced to the spelling and shape the matching Prisma model
 * expects (JSON pass-through, String[] arrays, Decimal coercion via
 * `toDecimalRequired` which falls back to passthrough when the mocked
 * `Prisma.Decimal` constructor is undefined).
 *
 * Failure-path semantics (silent return undefined / false on Prisma throw)
 * are already covered by the AlertsConfig + batch01-04 suites that share
 * the same `reportOp` helper, so they are not re-tested here.
 *
 * @vitest-environment node
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  CommandBoardConnectionPrismaStore,
  CommandBoardGroupPrismaStore,
  CommandBoardLayoutPrismaStore,
} from "../src/prisma-stores/broken-read-batch05-command-board";
import {
  ContractSignaturePrismaStore,
  CycleCountRecordPrismaStore,
} from "../src/prisma-stores/broken-read-batch05-contract-cycle";

const mockCommandBoardConnection = vi.hoisted(() => ({
  findMany: vi.fn(),
  findFirst: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  deleteMany: vi.fn(),
}));
const mockCommandBoardGroup = vi.hoisted(() => ({
  findMany: vi.fn(),
  findFirst: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  deleteMany: vi.fn(),
}));
const mockCommandBoardLayout = vi.hoisted(() => ({
  findMany: vi.fn(),
  findFirst: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  deleteMany: vi.fn(),
}));
const mockContractSignature = vi.hoisted(() => ({
  findMany: vi.fn(),
  findFirst: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  deleteMany: vi.fn(),
}));
const mockCycleCountRecord = vi.hoisted(() => ({
  findMany: vi.fn(),
  findFirst: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  deleteMany: vi.fn(),
}));

vi.mock("@repo/database/standalone", () => ({
  Prisma: {},
}));

const TENANT = "33333333-3333-3333-3333-333333333333";

interface MockClient {
  commandBoardConnection: typeof mockCommandBoardConnection;
  commandBoardGroup: typeof mockCommandBoardGroup;
  commandBoardLayout: typeof mockCommandBoardLayout;
  contractSignature: typeof mockContractSignature;
  cycleCountRecord: typeof mockCycleCountRecord;
}

const prisma: MockClient = {
  commandBoardConnection: mockCommandBoardConnection,
  commandBoardGroup: mockCommandBoardGroup,
  commandBoardLayout: mockCommandBoardLayout,
  contractSignature: mockContractSignature,
  cycleCountRecord: mockCycleCountRecord,
};

beforeEach(() => {
  vi.resetAllMocks();
});

describe("CommandBoardConnectionPrismaStore", () => {
  it("create defaults relationshipType to 'generic' and visible to true", async () => {
    mockCommandBoardConnection.create.mockImplementationOnce(
      async ({ data }: { data: Record<string, unknown> }) => ({
        ...data,
        tenantId: TENANT,
      })
    );

    const store = new CommandBoardConnectionPrismaStore(
      prisma as never,
      TENANT
    );
    await store.create({
      boardId: "board-1",
      fromCardId: "card-a",
      toCardId: "card-b",
    });

    const call = mockCommandBoardConnection.create.mock.calls[0][0] as {
      data: Record<string, unknown>;
    };
    expect(call.data.tenantId).toBe(TENANT);
    expect(call.data.boardId).toBe("board-1");
    expect(call.data.fromCardId).toBe("card-a");
    expect(call.data.toCardId).toBe("card-b");
    expect(call.data.relationshipType).toBe("generic");
    expect(call.data.visible).toBe(true);
    expect(call.data.label).toBeNull();
  });

  it("getAll filters by tenant + deletedAt", async () => {
    mockCommandBoardConnection.findMany.mockResolvedValueOnce([]);
    const store = new CommandBoardConnectionPrismaStore(
      prisma as never,
      TENANT
    );
    await store.getAll();
    expect(mockCommandBoardConnection.findMany).toHaveBeenCalledWith({
      where: { tenantId: TENANT, deletedAt: null },
      orderBy: { id: "desc" },
    });
  });

  it("delete is soft-delete (sets deletedAt)", async () => {
    mockCommandBoardConnection.update.mockResolvedValueOnce({});
    const store = new CommandBoardConnectionPrismaStore(
      prisma as never,
      TENANT
    );
    const ok = await store.delete("conn-1");
    expect(ok).toBe(true);
    const call = mockCommandBoardConnection.update.mock.calls[0][0] as {
      where: { tenantId_id: { tenantId: string; id: string } };
      data: { deletedAt: Date };
    };
    expect(call.where.tenantId_id).toEqual({
      tenantId: TENANT,
      id: "conn-1",
    });
    expect(call.data.deletedAt).toBeInstanceOf(Date);
  });
});

describe("CommandBoardGroupPrismaStore", () => {
  it("create persists position/size defaults and nullable color", async () => {
    mockCommandBoardGroup.create.mockImplementationOnce(
      async ({ data }: { data: Record<string, unknown> }) => ({
        ...data,
        tenantId: TENANT,
      })
    );

    const store = new CommandBoardGroupPrismaStore(prisma as never, TENANT);
    await store.create({
      boardId: "board-1",
      name: "Prep Zone",
    });

    const call = mockCommandBoardGroup.create.mock.calls[0][0] as {
      data: Record<string, unknown>;
    };
    expect(call.data.tenantId).toBe(TENANT);
    expect(call.data.boardId).toBe("board-1");
    expect(call.data.name).toBe("Prep Zone");
    expect(call.data.color).toBeNull();
    expect(call.data.collapsed).toBe(false);
    expect(call.data.positionX).toBe(0);
    expect(call.data.positionY).toBe(0);
    expect(call.data.width).toBe(300);
    expect(call.data.height).toBe(200);
    expect(call.data.zIndex).toBe(0);
  });

  it("getById filters by tenant + deletedAt", async () => {
    mockCommandBoardGroup.findFirst.mockResolvedValueOnce(null);
    const store = new CommandBoardGroupPrismaStore(prisma as never, TENANT);
    const result = await store.getById("group-1");
    expect(result).toBeUndefined();
    expect(mockCommandBoardGroup.findFirst).toHaveBeenCalledWith({
      where: { tenantId: TENANT, id: "group-1", deletedAt: null },
    });
  });
});

describe("CommandBoardLayoutPrismaStore", () => {
  it("create normalizes string-visibleCards into a String[] array and passes JSON viewport through", async () => {
    mockCommandBoardLayout.create.mockImplementationOnce(
      async ({ data }: { data: Record<string, unknown> }) => ({
        ...data,
        tenantId: TENANT,
      })
    );

    const store = new CommandBoardLayoutPrismaStore(prisma as never, TENANT);
    await store.create({
      boardId: "board-1",
      userId: "user-1",
      name: "Default Layout",
      visibleCards: "card-a, card-b ,card-c",
      viewport: { x: 0, y: 0, zoom: 1.5 },
    });

    const call = mockCommandBoardLayout.create.mock.calls[0][0] as {
      data: Record<string, unknown>;
    };
    expect(call.data.tenantId).toBe(TENANT);
    expect(call.data.boardId).toBe("board-1");
    expect(call.data.userId).toBe("user-1");
    expect(call.data.name).toBe("Default Layout");
    expect(call.data.visibleCards).toEqual(["card-a", "card-b", "card-c"]);
    expect(call.data.viewport).toEqual({ x: 0, y: 0, zoom: 1.5 });
    expect(call.data.gridSize).toBe(40);
    expect(call.data.showGrid).toBe(true);
    expect(call.data.snapToGrid).toBe(true);
  });

  it("create accepts array visibleCards verbatim", async () => {
    mockCommandBoardLayout.create.mockImplementationOnce(
      async ({ data }: { data: Record<string, unknown> }) => ({
        ...data,
        tenantId: TENANT,
      })
    );

    const store = new CommandBoardLayoutPrismaStore(prisma as never, TENANT);
    await store.create({
      boardId: "board-2",
      userId: "user-2",
      name: "Other Layout",
      visibleCards: ["alpha", "beta"],
    });

    const call = mockCommandBoardLayout.create.mock.calls[0][0] as {
      data: Record<string, unknown>;
    };
    expect(call.data.visibleCards).toEqual(["alpha", "beta"]);
  });

  it("getAll filters by tenant + deletedAt", async () => {
    mockCommandBoardLayout.findMany.mockResolvedValueOnce([]);
    const store = new CommandBoardLayoutPrismaStore(prisma as never, TENANT);
    await store.getAll();
    expect(mockCommandBoardLayout.findMany).toHaveBeenCalledWith({
      where: { tenantId: TENANT, deletedAt: null },
      orderBy: { id: "desc" },
    });
  });
});

describe("ContractSignaturePrismaStore", () => {
  it("create defaults signedAt to a Date when not provided", async () => {
    mockContractSignature.create.mockImplementationOnce(
      async ({ data }: { data: Record<string, unknown> }) => ({
        ...data,
        tenantId: TENANT,
      })
    );

    const store = new ContractSignaturePrismaStore(prisma as never, TENANT);
    await store.create({
      contractId: "contract-1",
      signatureData: "data:image/png;base64,AAAA",
      signerName: "Jane Client",
    });

    const call = mockContractSignature.create.mock.calls[0][0] as {
      data: Record<string, unknown>;
    };
    expect(call.data.tenantId).toBe(TENANT);
    expect(call.data.contractId).toBe("contract-1");
    expect(call.data.signatureData).toBe("data:image/png;base64,AAAA");
    expect(call.data.signerName).toBe("Jane Client");
    expect(call.data.signerEmail).toBeNull();
    expect(call.data.ipAddress).toBeNull();
    expect(call.data.signedAt).toBeInstanceOf(Date);
  });

  it("delete is soft-delete (sets deletedAt)", async () => {
    mockContractSignature.update.mockResolvedValueOnce({});
    const store = new ContractSignaturePrismaStore(prisma as never, TENANT);
    const ok = await store.delete("sig-1");
    expect(ok).toBe(true);
    const call = mockContractSignature.update.mock.calls[0][0] as {
      where: { tenantId_id: { tenantId: string; id: string } };
      data: { deletedAt: Date };
    };
    expect(call.where.tenantId_id).toEqual({
      tenantId: TENANT,
      id: "sig-1",
    });
    expect(call.data.deletedAt).toBeInstanceOf(Date);
  });
});

describe("CycleCountRecordPrismaStore", () => {
  it("create coerces decimal columns and defaults isVerified/syncStatus", async () => {
    mockCycleCountRecord.create.mockImplementationOnce(
      async ({ data }: { data: Record<string, unknown> }) => ({
        ...data,
        tenantId: TENANT,
      })
    );

    const store = new CycleCountRecordPrismaStore(prisma as never, TENANT);
    await store.create({
      sessionId: "session-1",
      itemId: "item-1",
      itemNumber: "SKU-100",
      itemName: "Tomato (case)",
      storageLocationId: "loc-1",
      expectedQuantity: 24,
      countedQuantity: 22,
      variance: -2,
      variancePct: -8.33,
      countedById: "emp-1",
    });

    const call = mockCycleCountRecord.create.mock.calls[0][0] as {
      data: Record<string, unknown>;
    };
    expect(call.data.tenantId).toBe(TENANT);
    expect(call.data.sessionId).toBe("session-1");
    expect(call.data.itemId).toBe("item-1");
    expect(call.data.itemNumber).toBe("SKU-100");
    expect(call.data.itemName).toBe("Tomato (case)");
    expect(call.data.storageLocationId).toBe("loc-1");
    // Mock Prisma.Decimal is undefined, so toDecimalRequired passes the
    // raw number through verbatim.
    expect(call.data.expectedQuantity).toBe(24);
    expect(call.data.countedQuantity).toBe(22);
    expect(call.data.variance).toBe(-2);
    expect(call.data.variancePct).toBe(-8.33);
    expect(call.data.countDate).toBeInstanceOf(Date);
    expect(call.data.countedById).toBe("emp-1");
    expect(call.data.barcode).toBeNull();
    expect(call.data.notes).toBeNull();
    expect(call.data.isVerified).toBe(false);
    expect(call.data.verifiedById).toBeNull();
    expect(call.data.verifiedAt).toBeNull();
    expect(call.data.syncStatus).toBe("synced");
    expect(call.data.offlineId).toBeNull();
  });

  it("getAll filters by tenant + deletedAt", async () => {
    mockCycleCountRecord.findMany.mockResolvedValueOnce([]);
    const store = new CycleCountRecordPrismaStore(prisma as never, TENANT);
    await store.getAll();
    expect(mockCycleCountRecord.findMany).toHaveBeenCalledWith({
      where: { tenantId: TENANT, deletedAt: null },
      orderBy: { id: "desc" },
    });
  });

  it("delete is soft-delete (sets deletedAt)", async () => {
    mockCycleCountRecord.update.mockResolvedValueOnce({});
    const store = new CycleCountRecordPrismaStore(prisma as never, TENANT);
    const ok = await store.delete("rec-1");
    expect(ok).toBe(true);
    const call = mockCycleCountRecord.update.mock.calls[0][0] as {
      where: { tenantId_id: { tenantId: string; id: string } };
      data: { deletedAt: Date };
    };
    expect(call.where.tenantId_id).toEqual({
      tenantId: TENANT,
      id: "rec-1",
    });
    expect(call.data.deletedAt).toBeInstanceOf(Date);
  });
});
