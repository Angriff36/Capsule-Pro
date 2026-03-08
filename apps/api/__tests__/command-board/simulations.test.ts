/**
 * @vitest-environment node
 *
 * Command Board Simulations API Tests
 *
 * Tests covering:
 * - List simulations with pagination
 * - Create simulation (fork board)
 * - Get simulation detail
 * - Get simulation delta
 * - Apply simulation
 * - Discard simulation
 * - Delete simulation
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";

// Mock the database before importing
vi.mock("@repo/database", () => ({
  database: {
    commandBoard: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    boardProjection: {
      createMany: vi.fn(),
      updateMany: vi.fn(),
      update: vi.fn(),
    },
    commandBoardGroup: {
      createMany: vi.fn(),
      updateMany: vi.fn(),
    },
    boardAnnotation: {
      createMany: vi.fn(),
      updateMany: vi.fn(),
    },
    $transaction: vi.fn((fn: Function) => fn({
      commandBoard: {
        update: vi.fn(),
      },
      boardProjection: {
        update: vi.fn(),
        createMany: vi.fn(),
        updateMany: vi.fn(),
      },
      commandBoardGroup: {
        createMany: vi.fn(),
        updateMany: vi.fn(),
      },
      boardAnnotation: {
        createMany: vi.fn(),
        updateMany: vi.fn(),
      },
    })),
  },
  EntityType: {
    EVENT: "EVENT",
    CLIENT: "CLIENT",
    TASK: "TASK",
    EMPLOYEE: "EMPLOYEE",
    RECIPE: "RECIPE",
    INVENTORY: "INVENTORY",
  },
}));

vi.mock("@repo/auth/server", () => ({
  auth: vi.fn(),
}));

vi.mock("@/app/lib/tenant", () => ({
  getTenantIdForOrg: vi.fn(),
}));

import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import { GET, POST } from "@/app/api/command-board/simulations/route";
import { GET as GetSimulation, DELETE as DeleteSimulation } from "@/app/api/command-board/simulations/[id]/route";
import { POST as ApplySimulation } from "@/app/api/command-board/simulations/[id]/apply/route";
import { POST as DiscardSimulation } from "@/app/api/command-board/simulations/[id]/discard/route";
import { GET as GetDelta } from "@/app/api/command-board/simulations/[id]/delta/route";

const mockAuth = vi.mocked(auth);
const mockGetTenantIdForOrg = vi.mocked(getTenantIdForOrg);
const mockCommandBoard = vi.mocked(database.commandBoard);

// Test constants
const TEST_TENANT_ID = "67a4af48-114e-4e45-89d7-6ae36da6ff71";
const TEST_ORG_ID = "org_123";
const TEST_BOARD_ID = "board_123";
const TEST_SIMULATION_ID = "sim_123";

// Helper to create mock NextRequest
function createRequest(url: string, options?: RequestInit): NextRequest {
  return new Request(url, options) as NextRequest;
}

describe("Command Board Simulations API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ orgId: TEST_ORG_ID } as any);
    mockGetTenantIdForOrg.mockResolvedValue(TEST_TENANT_ID);
  });

  describe("GET /api/command-board/simulations", () => {
    it("should return 401 if not authenticated", async () => {
      mockAuth.mockResolvedValueOnce({ orgId: null } as any);
      const response = await GET(createRequest("http://localhost/api/command-board/simulations"));
      expect(response.status).toBe(401);
    });

    it("should return 404 if tenant not found", async () => {
      mockGetTenantIdForOrg.mockResolvedValueOnce(null as any);
      const response = await GET(createRequest("http://localhost/api/command-board/simulations"));
      expect(response.status).toBe(404);
    });

    it("should list simulations with pagination", async () => {
      mockCommandBoard.count.mockResolvedValueOnce(1);
      mockCommandBoard.findMany.mockResolvedValueOnce([
        {
          id: TEST_SIMULATION_ID,
          tenantId: TEST_TENANT_ID,
          name: "[Simulation] Test Sim",
          description: "Test description",
          status: "draft",
          isTemplate: false,
          tags: ["simulation", `source:${TEST_BOARD_ID}`],
          createdAt: new Date(),
          updatedAt: new Date(),
          deletedAt: null,
          _count: {
            projections: 5,
            groups: 2,
            annotations: 3,
          },
        } as any,
      ]);

      const response = await GET(createRequest("http://localhost/api/command-board/simulations"));
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.data).toHaveLength(1);
      expect(data.data[0].simulation_name).toBe("Test Sim");
      expect(data.data[0].status).toBe("active");
      expect(data.data[0].projections_count).toBe(5);
      expect(data.pagination.total).toBe(1);
    });

    it("should filter by source_board_id", async () => {
      mockCommandBoard.count.mockResolvedValueOnce(0);
      mockCommandBoard.findMany.mockResolvedValueOnce([]);

      await GET(createRequest(`http://localhost/api/command-board/simulations?source_board_id=${TEST_BOARD_ID}`));

      expect(mockCommandBoard.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tags: { has: `source:${TEST_BOARD_ID}` },
          }),
        })
      );
    });
  });

  describe("POST /api/command-board/simulations", () => {
    it("should return 400 if source_board_id missing", async () => {
      const response = await POST(
        createRequest("http://localhost/api/command-board/simulations", {
          method: "POST",
          body: JSON.stringify({ simulation_name: "Test" }),
        })
      );
      expect(response.status).toBe(400);
    });

    it("should return 404 if source board not found", async () => {
      mockCommandBoard.findUnique.mockResolvedValueOnce(null);

      const response = await POST(
        createRequest("http://localhost/api/command-board/simulations", {
          method: "POST",
          body: JSON.stringify({ source_board_id: TEST_BOARD_ID, simulation_name: "Test" }),
        })
      );
      expect(response.status).toBe(404);
    });

    it("should create simulation successfully", async () => {
      mockCommandBoard.findUnique.mockResolvedValueOnce({
        id: TEST_BOARD_ID,
        tenantId: TEST_TENANT_ID,
        name: "Source Board",
        status: "active",
        tags: [],
        projections: [],
        groups: [],
        annotations: [],
      } as any);

      mockCommandBoard.create.mockResolvedValueOnce({
        id: TEST_SIMULATION_ID,
        tenantId: TEST_TENANT_ID,
        name: "[Simulation] Test Sim",
        status: "draft",
        tags: ["simulation", `source:${TEST_BOARD_ID}`],
        createdAt: new Date(),
      } as any);

      const response = await POST(
        createRequest("http://localhost/api/command-board/simulations", {
          method: "POST",
          body: JSON.stringify({ source_board_id: TEST_BOARD_ID, simulation_name: "Test Sim" }),
        })
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.simulation.simulation_name).toBe("Test Sim");
    });
  });

  describe("GET /api/command-board/simulations/[id]", () => {
    it("should return 404 if simulation not found", async () => {
      mockCommandBoard.findUnique.mockResolvedValueOnce(null);

      const response = await GetSimulation(
        createRequest("http://localhost/api/command-board/simulations/123"),
        { params: Promise.resolve({ id: "123" }) }
      );
      expect(response.status).toBe(404);
    });

    it("should return 404 if board is not a simulation", async () => {
      mockCommandBoard.findUnique.mockResolvedValueOnce({
        id: "123",
        tags: [],
      } as any);

      const response = await GetSimulation(
        createRequest("http://localhost/api/command-board/simulations/123"),
        { params: Promise.resolve({ id: "123" }) }
      );
      expect(response.status).toBe(404);
    });

    it("should return simulation context", async () => {
      mockCommandBoard.findUnique.mockResolvedValueOnce({
        id: TEST_SIMULATION_ID,
        tenantId: TEST_TENANT_ID,
        name: "[Simulation] Test",
        status: "draft",
        tags: ["simulation", `source:${TEST_BOARD_ID}`],
        createdAt: new Date(),
        projections: [],
        groups: [],
        annotations: [],
      } as any);

      const response = await GetSimulation(
        createRequest(`http://localhost/api/command-board/simulations/${TEST_SIMULATION_ID}`),
        { params: Promise.resolve({ id: TEST_SIMULATION_ID }) }
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.id).toBe(TEST_SIMULATION_ID);
      expect(data.source_board_id).toBe(TEST_BOARD_ID);
    });
  });

  describe("POST /api/command-board/simulations/[id]/discard", () => {
    it("should return 400 if simulation already applied", async () => {
      mockCommandBoard.findUnique.mockResolvedValueOnce({
        id: TEST_SIMULATION_ID,
        tags: ["simulation", "applied"],
        status: "active",
      } as any);

      const response = await DiscardSimulation(
        createRequest(`http://localhost/api/command-board/simulations/${TEST_SIMULATION_ID}/discard`, {
          method: "POST",
        }),
        { params: Promise.resolve({ id: TEST_SIMULATION_ID }) }
      );

      expect(response.status).toBe(400);
    });

    it("should discard simulation successfully", async () => {
      mockCommandBoard.findUnique.mockResolvedValueOnce({
        id: TEST_SIMULATION_ID,
        tenantId: TEST_TENANT_ID,
        tags: ["simulation"],
        status: "draft",
      } as any);

      mockCommandBoard.update.mockResolvedValueOnce({} as any);

      const response = await DiscardSimulation(
        createRequest(`http://localhost/api/command-board/simulations/${TEST_SIMULATION_ID}/discard`, {
          method: "POST",
        }),
        { params: Promise.resolve({ id: TEST_SIMULATION_ID }) }
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
    });
  });

  describe("DELETE /api/command-board/simulations/[id]", () => {
    it("should soft delete simulation", async () => {
      mockCommandBoard.findUnique.mockResolvedValueOnce({
        id: TEST_SIMULATION_ID,
        tenantId: TEST_TENANT_ID,
        tags: ["simulation"],
      } as any);

      mockCommandBoard.update.mockResolvedValueOnce({} as any);

      const response = await DeleteSimulation(
        createRequest(`http://localhost/api/command-board/simulations/${TEST_SIMULATION_ID}`, {
          method: "DELETE",
        }),
        { params: Promise.resolve({ id: TEST_SIMULATION_ID }) }
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
    });
  });

  describe("GET /api/command-board/simulations/[id]/delta", () => {
    it("should compute and return delta", async () => {
      mockCommandBoard.findUnique.mockResolvedValueOnce({
        id: TEST_SIMULATION_ID,
        tenantId: TEST_TENANT_ID,
        tags: ["simulation", `source:${TEST_BOARD_ID}`],
        projections: [
          { id: "p1", entityId: "e1", entityType: "EVENT", positionX: 100, positionY: 200 } as any,
        ],
        groups: [],
        annotations: [],
      } as any);

      mockCommandBoard.findUnique.mockResolvedValueOnce({
        id: TEST_BOARD_ID,
        tenantId: TEST_TENANT_ID,
        projections: [
          { id: "p0", entityId: "e1", entityType: "EVENT", positionX: 50, positionY: 100 } as any,
        ],
        groups: [],
        annotations: [],
      } as any);

      const response = await GetDelta(
        createRequest(`http://localhost/api/command-board/simulations/${TEST_SIMULATION_ID}/delta`),
        { params: Promise.resolve({ id: TEST_SIMULATION_ID }) }
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.simulation_id).toBe(TEST_SIMULATION_ID);
      expect(data.source_board_id).toBe(TEST_BOARD_ID);
      expect(data.delta).toBeDefined();
      expect(data.delta.summary).toBeDefined();
    });
  });

  describe("POST /api/command-board/simulations/[id]/apply", () => {
    it("should return 400 if simulation already applied", async () => {
      mockCommandBoard.findUnique.mockResolvedValueOnce({
        id: TEST_SIMULATION_ID,
        tenantId: TEST_TENANT_ID,
        tags: ["simulation", "applied"],
      } as any);

      const response = await ApplySimulation(
        createRequest(`http://localhost/api/command-board/simulations/${TEST_SIMULATION_ID}/apply`, {
          method: "POST",
          body: JSON.stringify({}),
        }),
        { params: Promise.resolve({ id: TEST_SIMULATION_ID }) }
      );

      expect(response.status).toBe(400);
    });

    it("should return 400 if no source board reference", async () => {
      mockCommandBoard.findUnique.mockResolvedValueOnce({
        id: TEST_SIMULATION_ID,
        tenantId: TEST_TENANT_ID,
        tags: ["simulation"], // Missing source: tag
      } as any);

      const response = await ApplySimulation(
        createRequest(`http://localhost/api/command-board/simulations/${TEST_SIMULATION_ID}/apply`, {
          method: "POST",
          body: JSON.stringify({}),
        }),
        { params: Promise.resolve({ id: TEST_SIMULATION_ID }) }
      );

      expect(response.status).toBe(400);
    });

    it("should apply simulation successfully", async () => {
      mockCommandBoard.findUnique.mockResolvedValueOnce({
        id: TEST_SIMULATION_ID,
        tenantId: TEST_TENANT_ID,
        tags: ["simulation", `source:${TEST_BOARD_ID}`],
        projections: [],
        groups: [],
        annotations: [],
      } as any);

      mockCommandBoard.findUnique.mockResolvedValueOnce({
        id: TEST_BOARD_ID,
        tenantId: TEST_TENANT_ID,
        projections: [],
        groups: [],
        annotations: [],
      } as any);

      const response = await ApplySimulation(
        createRequest(`http://localhost/api/command-board/simulations/${TEST_SIMULATION_ID}/apply`, {
          method: "POST",
          body: JSON.stringify({}),
        }),
        { params: Promise.resolve({ id: TEST_SIMULATION_ID }) }
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.delta).toBeDefined();
    });
  });
});
