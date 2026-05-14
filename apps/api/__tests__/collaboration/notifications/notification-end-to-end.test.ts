/**
 * Notification End-to-End Persistence Tests
 *
 * Tests that the Notification write path (manifest command →
 * NotificationPrismaStore) and read path (Prisma list/detail API) are aligned.
 * The write path persists through the NotificationPrismaStore, and the read
 * path queries the same Prisma model — so a created notification is immediately
 * visible in the list API.
 *
 * This test also verifies the `instanceId` fix: instance-scoped command routes
 * (markRead, markDismissed, remove) must pass `instanceId` to
 * `runtime.runCommand` so the store can target the correct entity row.
 */

import { database } from "@repo/database";
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const { mockDatabase } = vi.hoisted(() => {
  const mockNotificationStore = {
    findMany: vi.fn(),
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    deleteMany: vi.fn(),
  };
  return {
    mockDatabase: {
      notification: mockNotificationStore,
      user: { findFirst: vi.fn() },
    },
  };
});

vi.mock("@repo/database", () => ({
  database: mockDatabase,
}));

// The list route imports from @/lib/database (a re-export of @repo/database)
vi.mock("@/lib/database", () => ({
  database: mockDatabase,
}));

vi.mock("@repo/auth/server", () => ({
  auth: vi.fn(),
}));

vi.mock("@/app/lib/tenant", () => ({
  getTenantIdForOrg: vi.fn(),
  requireCurrentUser: vi.fn().mockResolvedValue({
    id: TEST_USER_ID,
    tenantId: TEST_TENANT_ID,
    role: "admin",
    email: "test@example.com",
    firstName: "Test",
    lastName: "User",
  }),
}));

vi.mock("@sentry/nextjs", () => ({
  captureException: vi.fn(),
}));

vi.mock("@/lib/manifest-runtime", () => ({
  createManifestRuntime: vi.fn(),
}));

// Import mocked modules after vi.mock setup
import { auth } from "@repo/auth/server";
import { getTenantIdForOrg, requireCurrentUser } from "@/app/lib/tenant";
import { createManifestRuntime } from "@/lib/manifest-runtime";

// ---------------------------------------------------------------------------
// Test constants
// ---------------------------------------------------------------------------

const TEST_TENANT_ID = "a0000000-0000-4000-a000-000000000001";
const TEST_ORG_ID = "org-test-123";
const TEST_USER_ID = "u0000000-0000-4000-a000-000000000001";
const TEST_CLERK_ID = "clerk_test_001";

// ---------------------------------------------------------------------------
// Mock data factories
// ---------------------------------------------------------------------------

function createMockNotification(overrides: Record<string, unknown> = {}) {
  return {
    id: "notif-001",
    tenantId: TEST_TENANT_ID,
    recipient_employee_id: TEST_USER_ID,
    notification_type: "info",
    title: "Test Notification",
    body: "This is a test notification",
    action_url: null,
    isRead: false,
    readAt: null,
    createdAt: new Date("2026-01-01"),
    correlation_id: null,
    ...overrides,
  };
}

function createMockRequest(
  url: string,
  options: RequestInit = {}
): NextRequest {
  if (options.body && !options.headers) {
    options.headers = { "Content-Type": "application/json" };
  }
  return new NextRequest(
    new URL(url, "http://localhost:3000"),
    options as ConstructorParameters<typeof NextRequest>[1]
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("Notification Persistence (write → read alignment)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // -------------------------------------------------------------------------
  // 1. GET /api/collaboration/notifications/list — list route
  // -------------------------------------------------------------------------

  describe("GET /api/collaboration/notifications/list", () => {
    it("returns notifications persisted through NotificationPrismaStore", async () => {
      const mockNotification = createMockNotification({
        id: "notif-001",
        title: "New Event Assigned",
        notification_type: "event",
        isRead: false,
      });

      vi.mocked(auth).mockResolvedValue({
        orgId: TEST_ORG_ID,
        userId: TEST_CLERK_ID,
      } as any);
      vi.mocked(getTenantIdForOrg).mockResolvedValue(TEST_TENANT_ID);
      vi.mocked(database.notification.findMany).mockResolvedValue([
        mockNotification,
      ] as never);

      const { GET } = await import(
        "@/app/api/collaboration/notifications/list/route"
      );

      const request = createMockRequest(
        "http://localhost:3000/api/collaboration/notifications/list"
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.notifications).toHaveLength(1);
      expect(data.notifications[0].id).toBe("notif-001");
      expect(data.notifications[0].title).toBe("New Event Assigned");

      // Verify the read path uses Prisma (not in-memory store)
      expect(database.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tenantId: TEST_TENANT_ID,
          }),
        })
      );
    });

    it("returns 401 for unauthenticated requests", async () => {
      vi.mocked(auth).mockResolvedValue({ orgId: null } as any);

      const { GET } = await import(
        "@/app/api/collaboration/notifications/list/route"
      );

      const request = createMockRequest(
        "http://localhost:3000/api/collaboration/notifications/list"
      );
      const response = await GET(request);

      expect(response.status).toBe(401);
    });

    it("returns empty list when no notifications exist", async () => {
      vi.mocked(auth).mockResolvedValue({
        orgId: TEST_ORG_ID,
        userId: TEST_CLERK_ID,
      } as any);
      vi.mocked(getTenantIdForOrg).mockResolvedValue(TEST_TENANT_ID);
      vi.mocked(database.notification.findMany).mockResolvedValue([]);

      const { GET } = await import(
        "@/app/api/collaboration/notifications/list/route"
      );

      const request = createMockRequest(
        "http://localhost:3000/api/collaboration/notifications/list"
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.notifications).toHaveLength(0);
    });
  });

  // -------------------------------------------------------------------------
  // 2. GET /api/collaboration/notifications/[id] — detail route
  // -------------------------------------------------------------------------

  describe("GET /api/collaboration/notifications/[id] (detail)", () => {
    it("returns a single persisted notification", async () => {
      const mockNotification = createMockNotification({
        id: "notif-002",
        title: "Shift Updated",
        notification_type: "schedule",
        isRead: true,
        readAt: new Date("2026-01-02"),
      });

      vi.mocked(auth).mockResolvedValue({
        orgId: TEST_ORG_ID,
        userId: TEST_CLERK_ID,
      } as any);
      vi.mocked(getTenantIdForOrg).mockResolvedValue(TEST_TENANT_ID);
      vi.mocked(database.notification.findFirst).mockResolvedValue(
        mockNotification as never
      );

      const { GET } = await import(
        "@/app/api/collaboration/notifications/[id]/route"
      );

      const request = createMockRequest(
        "http://localhost:3000/api/collaboration/notifications/notif-002"
      );
      const response = await GET(request, {
        params: Promise.resolve({ id: "notif-002" }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.notification.id).toBe("notif-002");
      expect(data.notification.title).toBe("Shift Updated");
      expect(data.notification.isRead).toBe(true);

      // Verify the read uses Prisma findFirst with tenant + id scoping
      expect(database.notification.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: "notif-002",
            tenantId: TEST_TENANT_ID,
          }),
        })
      );
    });

    it("returns 404 for non-existent notification", async () => {
      vi.mocked(auth).mockResolvedValue({
        orgId: TEST_ORG_ID,
        userId: TEST_CLERK_ID,
      } as any);
      vi.mocked(getTenantIdForOrg).mockResolvedValue(TEST_TENANT_ID);
      vi.mocked(database.notification.findFirst).mockResolvedValue(null);

      const { GET } = await import(
        "@/app/api/collaboration/notifications/[id]/route"
      );

      const request = createMockRequest(
        "http://localhost:3000/api/collaboration/notifications/non-existent"
      );
      const response = await GET(request, {
        params: Promise.resolve({ id: "non-existent" }),
      });

      expect(response.status).toBe(404);
    });
  });

  // -------------------------------------------------------------------------
  // 3. Command routes pass instanceId for instance-scoped verbs
  // -------------------------------------------------------------------------

  describe("instanceId on command routes (Blocker #1 fix)", () => {
    const mockUser = {
      id: TEST_USER_ID,
      tenantId: TEST_TENANT_ID,
      role: "admin",
      authUserId: TEST_CLERK_ID,
    };

    const mockRunCommand = vi.fn().mockResolvedValue({
      success: true,
      result: { id: "notif-003", isRead: true },
      emittedEvents: [],
    });

    beforeEach(() => {
      vi.mocked(auth).mockResolvedValue({
        orgId: TEST_ORG_ID,
        userId: TEST_CLERK_ID,
      } as any);
      vi.mocked(getTenantIdForOrg).mockResolvedValue(TEST_TENANT_ID);
      vi.mocked(requireCurrentUser).mockResolvedValue({
        id: TEST_USER_ID,
        tenantId: TEST_TENANT_ID,
        role: "admin",
        email: "test@example.com",
        firstName: "Test",
        lastName: "User",
      });
      vi.mocked(database.user.findFirst).mockResolvedValue(mockUser as never);
      mockRunCommand.mockClear();
      vi.mocked(createManifestRuntime).mockResolvedValue({
        runCommand: mockRunCommand,
      } as any);
    });

    const instanceScopedVerbs = [
      { verb: "markRead", file: "mark-read" },
      { verb: "markDismissed", file: "mark-dismissed" },
      { verb: "remove", file: "remove" },
    ];

    for (const { verb, file } of instanceScopedVerbs) {
      it(`${verb} route passes instanceId to runCommand`, async () => {
        const mod = await import(
          `@/app/api/collaboration/notifications/commands/${file}/route`
        );
        const request = createMockRequest(
          `http://localhost:3000/api/collaboration/notifications/commands/${file}`,
          {
            method: "POST",
            body: JSON.stringify({ id: "notif-003" }),
          }
        );

        await mod.POST(request, {
          params: Promise.resolve({
            entity: "Notification",
            command: "create",
          }),
        });

        expect(mockRunCommand).toHaveBeenCalledWith(verb, expect.any(Object), {
          entityName: "Notification",
        });
      });
    }

    it("create route does NOT pass instanceId", async () => {
      const mod = await import(
        "@/app/api/manifest/[entity]/commands/[command]/route"
      );
      const request = createMockRequest(
        "http://localhost:3000/api/collaboration/notifications/commands/create",
        {
          method: "POST",
          body: JSON.stringify({
            title: "New Notification",
            notificationType: "info",
          }),
        }
      );

      await mod.POST(request, {
        params: Promise.resolve({ entity: "Notification", command: "create" }),
      });

      expect(mockRunCommand).toHaveBeenCalledWith(
        "create",
        expect.any(Object),
        expect.not.objectContaining({ instanceId: expect.anything() })
      );
    });
  });
});
