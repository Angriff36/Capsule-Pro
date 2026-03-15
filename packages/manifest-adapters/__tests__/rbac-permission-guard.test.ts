/**
 * RBAC Permission Guard Tests
 *
 * Tests for the permission guard that integrates with the Manifest RuntimeEngine
 */

import { beforeEach, describe, expect, it } from "vitest";
import {
  AIApprovalRequiredError,
  COMMAND_PERMISSION_MAP,
  canExecuteCommand,
  createPermissionGuard,
  filterAuthorizedCommands,
  getUserPermissions,
  invalidatePermissionCache,
  PermissionDeniedError,
  type RolePolicyData,
} from "../src/permission-guard";

// Mock RuntimeEngine
class MockRuntimeEngine {
  private context = {
    user: { id: "user-1", tenantId: "tenant-1", role: "staff" },
  };

  getContext() {
    return this.context;
  }

  setContext(ctx: unknown) {
    this.context = ctx as {
      user: { id: string; tenantId: string; role: string };
    };
  }

  async runCommand(
    commandName: string,
    input: Record<string, unknown>,
    options: { entityName?: string } = {}
  ) {
    // Mock successful execution
    return {
      success: true,
      result: { id: "test-1" },
      emittedEvents: [],
    };
  }
}

describe("permission-guard", () => {
  let mockRuntime: MockRuntimeEngine;

  beforeEach(() => {
    mockRuntime = new MockRuntimeEngine();
    invalidatePermissionCache();
  });

  describe("canExecuteCommand", () => {
    it("should return true for commands without specific permissions", () => {
      expect(canExecuteCommand("staff", "someUnknownCommand", undefined)).toBe(
        true
      );
    });

    it("should return true for commands the role has permission for", () => {
      expect(canExecuteCommand("manager", "create", "Event")).toBe(true);
    });

    it("should return false for commands the role lacks permission for", () => {
      expect(canExecuteCommand("staff", "create", "Event")).toBe(false);
    });

    it("should handle admin wildcard permission", () => {
      expect(canExecuteCommand("admin", "anyCommand", "anyEntity")).toBe(true);
    });

    it("should work with custom role policies", () => {
      const rolePolicies: RolePolicyData[] = [
        {
          roleId: "custom",
          roleName: "staff",
          permissions: ["events.create"],
          isActive: true,
        },
      ];

      expect(
        canExecuteCommand(
          "staff",
          "create",
          "Event",
          COMMAND_PERMISSION_MAP,
          rolePolicies
        )
      ).toBe(true);
    });
  });

  describe("getUserPermissions", () => {
    it("should return all permissions for a role", () => {
      const permissions = getUserPermissions("manager");

      expect(permissions).toContain("events.create");
      expect(permissions).toContain("clients.create");
      expect(permissions).toContain("users.read");
    });

    it("should include custom role policy permissions", () => {
      const rolePolicies: RolePolicyData[] = [
        {
          roleId: "custom",
          roleName: "kitchen_staff",
          permissions: ["custom.permission"],
          isActive: true,
        },
      ];

      const permissions = getUserPermissions("kitchen_staff", rolePolicies);

      expect(permissions).toContain("custom.permission");
    });

    it("should return wildcard for admin", () => {
      const permissions = getUserPermissions("admin");

      expect(permissions).toContain("*");
    });
  });

  describe("filterAuthorizedCommands", () => {
    it("should filter commands based on user permissions", () => {
      const commands = [
        { name: "create", entity: "Event" },
        { name: "create", entity: "Client" },
        { name: "delete", entity: "User" },
      ];

      const filtered = filterAuthorizedCommands("staff", commands);

      // Staff has events.read permission, not create, and User.delete is not in their permissions
      // However, User.delete is not explicitly mapped so it passes through
      expect(filtered).not.toContainEqual(
        expect.objectContaining({ name: "create", entity: "Event" })
      );
      expect(filtered).not.toContainEqual(
        expect.objectContaining({ name: "create", entity: "Client" })
      );
    });

    it("should allow all commands for admin", () => {
      const commands = [
        { name: "create", entity: "Event" },
        { name: "delete", entity: "User" },
      ];

      const filtered = filterAuthorizedCommands("admin", commands);

      expect(filtered).toEqual(commands);
    });

    it("should filter partially for manager", () => {
      const commands = [
        { name: "create", entity: "Event" },
        { name: "create", entity: "Client" },
        { name: "updateRole", entity: "User" },
      ];

      const filtered = filterAuthorizedCommands("manager", commands);

      expect(filtered).toEqual([
        { name: "create", entity: "Event" },
        { name: "create", entity: "Client" },
      ]);
      expect(filtered).not.toContain(
        expect.objectContaining({ name: "updateRole" })
      );
    });
  });

  describe("createPermissionGuard", () => {
    it("should allow command execution when user has permission", async () => {
      mockRuntime.setContext({
        user: { id: "user-1", tenantId: "tenant-1", role: "manager" },
      });
      const guarded = createPermissionGuard(mockRuntime as any);

      // Use Client.create instead of Event.create (which requires AI approval)
      const result = await guarded.runCommand(
        "create",
        {},
        { entityName: "Client" }
      );

      expect(result.success).toBe(true);
    });

    it("should deny command execution when user lacks permission", async () => {
      mockRuntime.setContext({
        user: { id: "user-1", tenantId: "tenant-1", role: "staff" },
      });
      const guarded = createPermissionGuard(mockRuntime as any);

      // Use Client.create instead of Event.create (which requires AI approval)
      const result = await guarded.runCommand(
        "create",
        {},
        { entityName: "Client" }
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("Permission denied");
    });

    it("should allow execution when enforce is false", async () => {
      mockRuntime.setContext({
        user: { id: "user-1", tenantId: "tenant-1", role: "staff" },
      });
      const guarded = createPermissionGuard(mockRuntime as any, {
        enforce: false,
      });

      const result = await guarded.runCommand(
        "create",
        {},
        { entityName: "Event" }
      );

      expect(result.success).toBe(true);
    });

    it("should pass through when no user role in context", async () => {
      mockRuntime.setContext({ user: { id: "user-1", tenantId: "tenant-1" } });
      const guarded = createPermissionGuard(mockRuntime as any);

      const result = await guarded.runCommand(
        "create",
        {},
        { entityName: "Event" }
      );

      expect(result.success).toBe(true);
    });

    it("should use custom command permission map", async () => {
      mockRuntime.setContext({
        user: { id: "user-1", tenantId: "tenant-1", role: "staff" },
      });

      const customMap = { "CustomEntity.create": "custom.permission" };
      const guarded = createPermissionGuard(mockRuntime as any, {
        commandPermissionMap: customMap,
      });

      const result = await guarded.runCommand(
        "create",
        {},
        { entityName: "CustomEntity" }
      );

      expect(result.success).toBe(false);
    });
  });

  describe("PermissionDeniedError", () => {
    it("should create error with correct properties", () => {
      const error = new PermissionDeniedError(
        "create",
        "Event",
        "staff",
        "events.create"
      );

      expect(error.name).toBe("PermissionDeniedError");
      expect(error.commandName).toBe("create");
      expect(error.entityName).toBe("Event");
      expect(error.userRole).toBe("staff");
      expect(error.requiredPermission).toBe("events.create");
      expect(error.message).toContain("staff");
      expect(error.message).toContain("create");
      expect(error.message).toContain("events.create");
    });
  });

  describe("AIApprovalRequiredError", () => {
    it("should create error with correct properties", () => {
      const error = new AIApprovalRequiredError("generate", "Menu");

      expect(error.name).toBe("AIApprovalRequiredError");
      expect(error.commandName).toBe("generate");
      expect(error.entityName).toBe("Menu");
      expect(error.message).toContain("generate");
      expect(error.message).toContain("settings.ai_approve");
    });
  });

  describe("invalidatePermissionCache", () => {
    it("should clear the permission cache", () => {
      // This is a simple test that the function exists and doesn't throw
      expect(() => invalidatePermissionCache()).not.toThrow();
      expect(() => invalidatePermissionCache("tenant-1")).not.toThrow();
    });
  });
});
