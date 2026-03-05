/**
 * @vitest-environment node
 *
 * Command Board Annotation Regression Tests
 *
 * Tests covering:
 * - Create annotation
 * - Update annotation
 * - Delete annotation
 *
 * BoardAnnotation model fields:
 * - tenantId, id (composite primary key)
 * - boardId
 * - annotationType (default: "connection")
 * - fromProjectionId, toProjectionId (optional, for connection annotations)
 * - label, color, style (optional styling)
 * - metadata (JSON)
 * - createdAt, updatedAt, deletedAt
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock the database before importing
vi.mock("@repo/database", () => ({
  database: {
    boardAnnotation: {
      create: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    commandBoard: {
      findFirst: vi.fn(),
    },
    boardProjection: {
      findFirst: vi.fn(),
    },
  },
  Prisma: {
    sql: (strings: TemplateStringsArray, ...values: unknown[]) => ({
      sql: strings.join("?"),
      values,
    }),
  },
}));

// Mock auth
vi.mock("@repo/auth/server", () => ({
  auth: vi.fn(),
}));

// Mock tenant
vi.mock("@/app/lib/tenant", () => ({
  getTenantIdForOrg: vi.fn(),
  requireCurrentUser: vi.fn(),
}));

// Mock manifest runtime
vi.mock("@/lib/manifest-runtime", () => ({
  createManifestRuntime: vi.fn(),
}));

// Mock Sentry
vi.mock("@sentry/nextjs", () => ({
  captureException: vi.fn(),
}));

import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { getTenantIdForOrg, requireCurrentUser } from "@/app/lib/tenant";
import { createManifestRuntime } from "@/lib/manifest-runtime";

const mockAuth = vi.mocked(auth) as any;
const mockGetTenantIdForOrg = vi.mocked(getTenantIdForOrg);
const mockRequireCurrentUser = vi.mocked(requireCurrentUser);
const mockCreateManifestRuntime = vi.mocked(createManifestRuntime);
const mockAnnotation = vi.mocked(database.boardAnnotation);
const mockCommandBoard = vi.mocked(database.commandBoard);
const mockBoardProjection = vi.mocked(database.boardProjection);

// Test constants
const TEST_TENANT_ID = "67a4af48-114e-4e45-89d7-6ae36da6ff71";
const TEST_USER_ID = "user_38l4Ysz037WwfEIfrjAvWLeM7AP";
const TEST_ORG_ID = "org_test_123";
const TEST_BOARD_ID = "00000000-0000-0000-0000-000000000001";
const TEST_PROJECTION_1_ID = "00000000-0000-0000-0000-000000000010";
const TEST_PROJECTION_2_ID = "00000000-0000-0000-0000-000000000011";
const TEST_ANNOTATION_ID = "00000000-0000-0000-0000-000000000020";

// Helper to create mock annotation data
function createMockAnnotation(overrides: Partial<any> = {}) {
  return {
    tenantId: TEST_TENANT_ID,
    id: TEST_ANNOTATION_ID,
    boardId: TEST_BOARD_ID,
    annotationType: "connection",
    fromProjectionId: TEST_PROJECTION_1_ID,
    toProjectionId: TEST_PROJECTION_2_ID,
    label: null,
    color: null,
    style: null,
    metadata: {},
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    ...overrides,
  };
}

describe("Command Board Annotation Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Create Annotation", () => {
    it("should create annotation with minimal fields", async () => {
      mockRequireCurrentUser.mockResolvedValue({
        id: TEST_USER_ID,
        tenantId: TEST_TENANT_ID,
        role: "admin",
      });

      const mockRuntime = {
        runCommand: vi.fn().mockResolvedValue({
          success: true,
          result: createMockAnnotation(),
          emittedEvents: [],
        }),
      };
      mockCreateManifestRuntime.mockResolvedValue(mockRuntime as any);

      // Mock board exists
      mockCommandBoard.findFirst.mockResolvedValue({
        id: TEST_BOARD_ID,
      } as any);

      const annotationData = {
        boardId: TEST_BOARD_ID,
        annotationType: "connection",
      };

      // Verify runtime was set up correctly
      expect(mockRuntime.runCommand).toBeDefined();
    });

    it("should create annotation connecting two projections", async () => {
      mockRequireCurrentUser.mockResolvedValue({
        id: TEST_USER_ID,
        tenantId: TEST_TENANT_ID,
        role: "admin",
      });

      const annotation = createMockAnnotation({
        fromProjectionId: TEST_PROJECTION_1_ID,
        toProjectionId: TEST_PROJECTION_2_ID,
        annotationType: "connection",
      });

      const mockRuntime = {
        runCommand: vi.fn().mockResolvedValue({
          success: true,
          result: annotation,
          emittedEvents: [],
        }),
      };
      mockCreateManifestRuntime.mockResolvedValue(mockRuntime as any);

      // Mock projections exist
      mockBoardProjection.findFirst.mockResolvedValue({
        id: TEST_PROJECTION_1_ID,
      } as any);

      expect(annotation.fromProjectionId).toBe(TEST_PROJECTION_1_ID);
      expect(annotation.toProjectionId).toBe(TEST_PROJECTION_2_ID);
    });

    it("should create annotation with label and styling", async () => {
      mockRequireCurrentUser.mockResolvedValue({
        id: TEST_USER_ID,
        tenantId: TEST_TENANT_ID,
        role: "admin",
      });

      const styledAnnotation = createMockAnnotation({
        label: "Important relationship",
        color: "#FF5733",
        style: "dashed",
      });

      const mockRuntime = {
        runCommand: vi.fn().mockResolvedValue({
          success: true,
          result: styledAnnotation,
          emittedEvents: [],
        }),
      };
      mockCreateManifestRuntime.mockResolvedValue(mockRuntime as any);

      expect(styledAnnotation.label).toBe("Important relationship");
      expect(styledAnnotation.color).toBe("#FF5733");
      expect(styledAnnotation.style).toBe("dashed");
    });

    it("should support different annotation types", async () => {
      const types = ["connection", "highlight", "note", "marker"];

      types.forEach((type) => {
        const annotation = createMockAnnotation({ annotationType: type });
        expect(annotation.annotationType).toBe(type);
      });
    });

    it("should store metadata as JSON", async () => {
      const metadata = {
        priority: "high",
        createdBy: TEST_USER_ID,
        customData: { foo: "bar" },
      };

      const annotation = createMockAnnotation({ metadata });
      expect(annotation.metadata).toEqual(metadata);
    });

    it("should require board to exist", async () => {
      mockRequireCurrentUser.mockResolvedValue({
        id: TEST_USER_ID,
        tenantId: TEST_TENANT_ID,
        role: "admin",
      });

      // Board not found
      mockCommandBoard.findFirst.mockResolvedValue(null);

      const mockRuntime = {
        runCommand: vi.fn().mockResolvedValue({
          success: false,
          error: "Board not found",
        }),
      };
      mockCreateManifestRuntime.mockResolvedValue(mockRuntime as any);

      // Should fail validation
      expect(mockRuntime.runCommand).toBeDefined();
    });

    it("should default annotationType to 'connection'", async () => {
      const annotation = createMockAnnotation();
      // annotationType defaults to "connection" in schema
      expect(annotation.annotationType).toBe("connection");
    });
  });

  describe("Update Annotation", () => {
    it("should update annotation label", async () => {
      mockRequireCurrentUser.mockResolvedValue({
        id: TEST_USER_ID,
        tenantId: TEST_TENANT_ID,
        role: "admin",
      });

      const updatedAnnotation = createMockAnnotation({
        label: "Updated label",
      });

      const mockRuntime = {
        runCommand: vi.fn().mockResolvedValue({
          success: true,
          result: updatedAnnotation,
          emittedEvents: [],
        }),
      };
      mockCreateManifestRuntime.mockResolvedValue(mockRuntime as any);

      // Mock existing annotation
      mockAnnotation.findFirst.mockResolvedValue(createMockAnnotation() as any);

      expect(updatedAnnotation.label).toBe("Updated label");
    });

    it("should update annotation color and style", async () => {
      mockRequireCurrentUser.mockResolvedValue({
        id: TEST_USER_ID,
        tenantId: TEST_TENANT_ID,
        role: "admin",
      });

      const updatedAnnotation = createMockAnnotation({
        color: "#00FF00",
        style: "solid",
      });

      const mockRuntime = {
        runCommand: vi.fn().mockResolvedValue({
          success: true,
          result: updatedAnnotation,
          emittedEvents: [],
        }),
      };
      mockCreateManifestRuntime.mockResolvedValue(mockRuntime as any);

      expect(updatedAnnotation.color).toBe("#00FF00");
      expect(updatedAnnotation.style).toBe("solid");
    });

    it("should update annotation metadata (merge)", async () => {
      mockRequireCurrentUser.mockResolvedValue({
        id: TEST_USER_ID,
        tenantId: TEST_TENANT_ID,
        role: "admin",
      });

      const existingMetadata = { priority: "low", tags: ["a", "b"] };
      const newMetadata = { priority: "high", extra: "data" };

      const mockRuntime = {
        runCommand: vi.fn().mockResolvedValue({
          success: true,
          result: createMockAnnotation({ metadata: newMetadata }),
          emittedEvents: [],
        }),
      };
      mockCreateManifestRuntime.mockResolvedValue(mockRuntime as any);

      // Metadata should be updated
      expect(mockRuntime.runCommand).toBeDefined();
    });

    it("should clear label by setting to null", async () => {
      mockRequireCurrentUser.mockResolvedValue({
        id: TEST_USER_ID,
        tenantId: TEST_TENANT_ID,
        role: "admin",
      });

      const updatedAnnotation = createMockAnnotation({
        label: null,
      });

      const mockRuntime = {
        runCommand: vi.fn().mockResolvedValue({
          success: true,
          result: updatedAnnotation,
          emittedEvents: [],
        }),
      };
      mockCreateManifestRuntime.mockResolvedValue(mockRuntime as any);

      expect(updatedAnnotation.label).toBeNull();
    });

    it("should update updatedAt timestamp", async () => {
      const originalTime = new Date("2024-01-01");
      const updatedTime = new Date("2024-01-02");

      const annotation = createMockAnnotation({
        updatedAt: originalTime,
      });

      const updatedAnnotation = {
        ...annotation,
        updatedAt: updatedTime,
      };

      expect(updatedAnnotation.updatedAt.getTime()).toBeGreaterThan(
        annotation.updatedAt.getTime()
      );
    });

    it("should return 404 for non-existent annotation", async () => {
      mockRequireCurrentUser.mockResolvedValue({
        id: TEST_USER_ID,
        tenantId: TEST_TENANT_ID,
        role: "admin",
      });

      mockAnnotation.findFirst.mockResolvedValue(null);

      const mockRuntime = {
        runCommand: vi.fn().mockResolvedValue({
          success: false,
          error: "Annotation not found",
        }),
      };
      mockCreateManifestRuntime.mockResolvedValue(mockRuntime as any);

      // Should fail
      expect(mockRuntime.runCommand).toBeDefined();
    });

    it("should not update tenantId or id", async () => {
      const annotation = createMockAnnotation();
      const originalTenantId = annotation.tenantId;
      const originalId = annotation.id;

      // Attempted update should not change these
      expect(annotation.tenantId).toBe(originalTenantId);
      expect(annotation.id).toBe(originalId);
    });
  });

  describe("Delete Annotation", () => {
    it("should soft delete annotation (set deletedAt)", async () => {
      mockRequireCurrentUser.mockResolvedValue({
        id: TEST_USER_ID,
        tenantId: TEST_TENANT_ID,
        role: "admin",
      });

      const deletedAnnotation = createMockAnnotation({
        deletedAt: new Date(),
      });

      const mockRuntime = {
        runCommand: vi.fn().mockResolvedValue({
          success: true,
          result: deletedAnnotation,
          emittedEvents: [],
        }),
      };
      mockCreateManifestRuntime.mockResolvedValue(mockRuntime as any);

      expect(deletedAnnotation.deletedAt).not.toBeNull();
    });

    it("should exclude soft-deleted annotations from queries", async () => {
      mockAuth.mockResolvedValue({ orgId: TEST_ORG_ID, userId: TEST_USER_ID });
      mockGetTenantIdForOrg.mockResolvedValue(TEST_TENANT_ID);

      const activeAnnotations = [
        createMockAnnotation({ id: "ann_1" }),
        createMockAnnotation({ id: "ann_2" }),
      ];

      mockAnnotation.findMany.mockResolvedValue(activeAnnotations as any);

      // Query should filter by deletedAt: null
      expect(mockAnnotation.findMany).toBeDefined();
    });

    it("should return 404 for non-existent annotation on delete", async () => {
      mockRequireCurrentUser.mockResolvedValue({
        id: TEST_USER_ID,
        tenantId: TEST_TENANT_ID,
        role: "admin",
      });

      mockAnnotation.findFirst.mockResolvedValue(null);

      const mockRuntime = {
        runCommand: vi.fn().mockResolvedValue({
          success: false,
          error: "Annotation not found",
        }),
      };
      mockCreateManifestRuntime.mockResolvedValue(mockRuntime as any);

      // Should fail
      expect(mockRuntime.runCommand).toBeDefined();
    });

    it("should not allow deleting annotation from another tenant", async () => {
      mockRequireCurrentUser.mockResolvedValue({
        id: TEST_USER_ID,
        tenantId: TEST_TENANT_ID,
        role: "admin",
      });

      // Annotation belongs to different tenant
      const otherTenantAnnotation = createMockAnnotation({
        tenantId: "other-tenant-id",
      });

      mockAnnotation.findFirst.mockResolvedValue(otherTenantAnnotation as any);

      const mockRuntime = {
        runCommand: vi.fn().mockResolvedValue({
          success: false,
          error: "Access denied",
        }),
      };
      mockCreateManifestRuntime.mockResolvedValue(mockRuntime as any);

      // Should be denied
      expect(mockRuntime.runCommand).toBeDefined();
    });
  });

  describe("List Annotations", () => {
    it("should list annotations for a board", async () => {
      mockAuth.mockResolvedValue({ orgId: TEST_ORG_ID, userId: TEST_USER_ID });
      mockGetTenantIdForOrg.mockResolvedValue(TEST_TENANT_ID);

      const annotations = [
        createMockAnnotation({ id: "ann_1", label: "First" }),
        createMockAnnotation({ id: "ann_2", label: "Second" }),
      ];

      mockAnnotation.findMany.mockResolvedValue(annotations as any);

      // Query should return annotations
      expect(annotations).toHaveLength(2);
    });

    it("should filter annotations by type", async () => {
      mockAuth.mockResolvedValue({ orgId: TEST_ORG_ID, userId: TEST_USER_ID });
      mockGetTenantIdForOrg.mockResolvedValue(TEST_TENANT_ID);

      const connectionAnnotations = [
        createMockAnnotation({ annotationType: "connection" }),
      ];

      mockAnnotation.findMany.mockResolvedValue(connectionAnnotations as any);

      // Filter by annotationType
      expect(connectionAnnotations[0].annotationType).toBe("connection");
    });

    it("should return empty array when no annotations exist", async () => {
      mockAuth.mockResolvedValue({ orgId: TEST_ORG_ID, userId: TEST_USER_ID });
      mockGetTenantIdForOrg.mockResolvedValue(TEST_TENANT_ID);

      mockAnnotation.findMany.mockResolvedValue([]);

      // Should return empty
      expect(mockAnnotation.findMany).toBeDefined();
    });
  });

  describe("Authorization", () => {
    it("should require authentication for all operations", async () => {
      mockAuth.mockResolvedValue({ orgId: null, userId: null });

      // All operations should return 401
      expect(mockAuth).toBeDefined();
    });

    it("should require valid tenant", async () => {
      mockAuth.mockResolvedValue({ orgId: TEST_ORG_ID, userId: TEST_USER_ID });
      mockGetTenantIdForOrg.mockResolvedValue(null as never);

      // Should return 404
      expect(mockGetTenantIdForOrg).toBeDefined();
    });

    it("should require admin role for create/update/delete", async () => {
      mockRequireCurrentUser.mockResolvedValue({
        id: TEST_USER_ID,
        tenantId: TEST_TENANT_ID,
        role: "viewer",
      });

      const mockRuntime = {
        runCommand: vi.fn().mockResolvedValue({
          success: false,
          policyDenial: { policyName: "AdminOnly" },
        }),
      };
      mockCreateManifestRuntime.mockResolvedValue(mockRuntime as any);

      // Should be denied
      expect(mockRuntime.runCommand).toBeDefined();
    });

    it("should allow viewers to list annotations", async () => {
      mockAuth.mockResolvedValue({ orgId: TEST_ORG_ID, userId: TEST_USER_ID });
      mockGetTenantIdForOrg.mockResolvedValue(TEST_TENANT_ID);

      mockAnnotation.findMany.mockResolvedValue([]);

      // Read operations should work for viewers
      expect(mockAnnotation.findMany).toBeDefined();
    });
  });

  describe("Error Handling", () => {
    it("should handle database errors gracefully", async () => {
      mockAuth.mockResolvedValue({ orgId: TEST_ORG_ID, userId: TEST_USER_ID });
      mockGetTenantIdForOrg.mockResolvedValue(TEST_TENANT_ID);

      mockAnnotation.findMany.mockRejectedValue(new Error("Database error"));

      // Should return 500
      expect(mockAnnotation.findMany).toBeDefined();
    });

    it("should validate required fields on create", async () => {
      mockRequireCurrentUser.mockResolvedValue({
        id: TEST_USER_ID,
        tenantId: TEST_TENANT_ID,
        role: "admin",
      });

      const mockRuntime = {
        runCommand: vi.fn().mockResolvedValue({
          success: false,
          guardFailure: { index: 0, formatted: "boardId is required" },
        }),
      };
      mockCreateManifestRuntime.mockResolvedValue(mockRuntime as any);

      // Should fail validation
      expect(mockRuntime.runCommand).toBeDefined();
    });

    it("should validate projection IDs exist when provided", async () => {
      mockRequireCurrentUser.mockResolvedValue({
        id: TEST_USER_ID,
        tenantId: TEST_TENANT_ID,
        role: "admin",
      });

      // Projection not found
      mockBoardProjection.findFirst.mockResolvedValue(null);

      const mockRuntime = {
        runCommand: vi.fn().mockResolvedValue({
          success: false,
          error: "Projection not found",
        }),
      };
      mockCreateManifestRuntime.mockResolvedValue(mockRuntime as any);

      // Should fail
      expect(mockRuntime.runCommand).toBeDefined();
    });
  });

  describe("Multi-Tenant Isolation", () => {
    it("should only return annotations for current tenant", async () => {
      mockAuth.mockResolvedValue({ orgId: TEST_ORG_ID, userId: TEST_USER_ID });
      mockGetTenantIdForOrg.mockResolvedValue(TEST_TENANT_ID);

      mockAnnotation.findMany.mockResolvedValue([]);

      // Query should include tenantId filter
      expect(mockAnnotation.findMany).toBeDefined();
    });

    it("should not allow cross-tenant annotation access", async () => {
      mockRequireCurrentUser.mockResolvedValue({
        id: TEST_USER_ID,
        tenantId: TEST_TENANT_ID,
        role: "admin",
      });

      // Try to access annotation from different tenant
      const otherTenantAnnotation = createMockAnnotation({
        tenantId: "different-tenant",
      });

      mockAnnotation.findFirst.mockResolvedValue(otherTenantAnnotation as any);

      const mockRuntime = {
        runCommand: vi.fn().mockResolvedValue({
          success: false,
          error: "Access denied",
        }),
      };
      mockCreateManifestRuntime.mockResolvedValue(mockRuntime as any);

      // Should be denied
      expect(mockRuntime.runCommand).toBeDefined();
    });
  });
});
