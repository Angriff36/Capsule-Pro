/**
 * RBAC Permission Checker Tests
 *
 * Tests for the permission checker service including:
 * - Permission parsing and building
 * - Wildcard matching
 * - Role-based permission checking
 * - Permission inheritance
 */

import { beforeEach, describe, expect, it } from "vitest";
import {
  buildPermission,
  filterAuthorizedPermissions,
  getPermissionsForRole,
  hasAllPermissions,
  hasAnyPermission,
  hasPermission,
  matchWildcard,
  type Permission,
  parsePermission,
  permissionCache,
  type RolePolicyData,
  toRolePolicyData,
} from "../src/permission-checker";

describe("permission-checker", () => {
  describe("parsePermission", () => {
    it("should parse a simple permission", () => {
      const result = parsePermission("events.create");
      expect(result).toEqual({
        domain: "events",
        action: "create",
        full: "events.create",
      });
    });

    it("should parse a complex permission with nested actions", () => {
      const result = parsePermission("admin.ai_approve");
      expect(result).toEqual({
        domain: "admin",
        action: "ai_approve",
        full: "admin.ai_approve",
      });
    });

    it("should handle permissions without a domain", () => {
      const result = parsePermission("create");
      expect(result).toEqual({
        domain: "",
        action: "create",
        full: "create",
      });
    });
  });

  describe("buildPermission", () => {
    it("should build a permission from domain and action", () => {
      const result = buildPermission("events", "create");
      expect(result).toBe("events.create");
    });

    it("should build a complex permission", () => {
      const result = buildPermission("admin", "ai_approve");
      expect(result).toBe("admin.ai_approve");
    });
  });

  describe("matchWildcard", () => {
    it("should match wildcard permission to anything", () => {
      expect(matchWildcard("*", "events.create")).toBe(true);
      expect(matchWildcard("*", "admin.ai_approve")).toBe(true);
      expect(matchWildcard("*", "anything")).toBe(true);
    });

    it("should match domain wildcard to all actions in domain", () => {
      expect(matchWildcard("events.*", "events.create")).toBe(true);
      expect(matchWildcard("events.*", "events.delete")).toBe(true);
      expect(matchWildcard("events.*", "events.update")).toBe(true);
      expect(matchWildcard("events.*", "admin.ai_approve")).toBe(false);
    });

    it("should match exact permissions", () => {
      expect(matchWildcard("events.create", "events.create")).toBe(true);
      expect(matchWildcard("events.create", "events.delete")).toBe(false);
    });

    it("should match nested wildcard", () => {
      expect(matchWildcard("admin.ai.*", "admin.ai.approve")).toBe(true);
      expect(matchWildcard("admin.ai.*", "admin.ai.train")).toBe(true);
      expect(matchWildcard("admin.ai.*", "admin.other")).toBe(false);
    });
  });

  describe("hasPermission", () => {
    it("should return true for admin with wildcard", () => {
      expect(
        hasPermission({
          userRole: "admin",
          permission: "events.create" as Permission,
        })
      ).toBe(true);
    });

    it("should return true for exact permission match", () => {
      expect(
        hasPermission({
          userRole: "manager",
          permission: "events.create" as Permission,
        })
      ).toBe(true);
    });

    it("should return false for missing permission", () => {
      expect(
        hasPermission({
          userRole: "staff",
          permission: "users.create" as Permission,
        })
      ).toBe(false);
    });

    it("should handle custom role policies", () => {
      const rolePolicies: RolePolicyData[] = [
        {
          roleId: "custom-role",
          roleName: "kitchen_staff",
          permissions: [
            "events.create" as Permission,
            "events.delete" as Permission,
          ],
          isActive: true,
        },
      ];

      expect(
        hasPermission({
          userRole: "kitchen_staff",
          permission: "events.delete" as Permission,
          rolePolicies,
        })
      ).toBe(true);
    });

    it("should ignore inactive role policies", () => {
      const rolePolicies: RolePolicyData[] = [
        {
          roleId: "custom-role",
          roleName: "kitchen_staff",
          permissions: ["events.delete" as Permission],
          isActive: false,
        },
      ];

      expect(
        hasPermission({
          userRole: "kitchen_staff",
          permission: "events.delete" as Permission,
          rolePolicies,
        })
      ).toBe(false);
    });
  });

  describe("hasAnyPermission", () => {
    it("should return true if user has at least one permission", () => {
      expect(
        hasAnyPermission({
          userRole: "staff",
          permissions: [
            "events.read" as Permission,
            "users.delete" as Permission,
          ],
        })
      ).toBe(true);
    });

    it("should return false if user has none of the permissions", () => {
      expect(
        hasAnyPermission({
          userRole: "staff",
          permissions: [
            "users.delete" as Permission,
            "users.manage_roles" as Permission,
          ],
        })
      ).toBe(false);
    });

    it("should work with wildcard permission", () => {
      expect(
        hasAnyPermission({
          userRole: "admin",
          permissions: ["some.random.permission" as Permission],
        })
      ).toBe(true);
    });
  });

  describe("hasAllPermissions", () => {
    it("should return true if user has all permissions", () => {
      expect(
        hasAllPermissions({
          userRole: "manager",
          permissions: [
            "events.create" as Permission,
            "clients.create" as Permission,
          ],
        })
      ).toBe(true);
    });

    it("should return false if user is missing any permission", () => {
      expect(
        hasAllPermissions({
          userRole: "staff",
          permissions: [
            "events.read" as Permission,
            "users.delete" as Permission,
          ],
        })
      ).toBe(false);
    });

    it("should work with wildcard permission", () => {
      expect(
        hasAllPermissions({
          userRole: "admin",
          permissions: [
            "any.permission" as Permission,
            "another.permission" as Permission,
          ],
        })
      ).toBe(true);
    });
  });

  describe("getPermissionsForRole", () => {
    it("should return default permissions for a role", () => {
      const permissions = getPermissionsForRole({ userRole: "manager" });
      expect(permissions).toContain("events.create");
      expect(permissions).toContain("clients.create");
    });

    it("should include custom role policies", () => {
      const rolePolicies: RolePolicyData[] = [
        {
          roleId: "custom",
          roleName: "kitchen_staff",
          permissions: ["custom.permission" as Permission],
          isActive: true,
        },
      ];

      const permissions = getPermissionsForRole({
        userRole: "kitchen_staff",
        rolePolicies,
      });

      expect(permissions).toContain("custom.permission");
    });

    it("should deduplicate permissions", () => {
      const rolePolicies: RolePolicyData[] = [
        {
          roleId: "custom",
          roleName: "kitchen_staff",
          permissions: [
            "kitchen.read" as Permission,
            "kitchen.read" as Permission,
          ],
          isActive: true,
        },
      ];

      const permissions = getPermissionsForRole({
        userRole: "kitchen_staff",
        rolePolicies,
      });

      const readCount = permissions.filter((p) => p === "kitchen.read").length;
      expect(readCount).toBe(1);
    });

    it("should preserve order with defaults first", () => {
      const rolePolicies: RolePolicyData[] = [
        {
          roleId: "custom",
          roleName: "kitchen_staff",
          permissions: ["custom.z" as Permission, "custom.a" as Permission],
          isActive: true,
        },
      ];

      const permissions = getPermissionsForRole({
        userRole: "kitchen_staff",
        rolePolicies,
      });

      // Default permissions should come before custom ones
      const customIndex = permissions.indexOf("custom.z");
      const kitchenReadIndex = permissions.indexOf("kitchen.read");
      expect(customIndex).toBeGreaterThan(kitchenReadIndex);
    });
  });

  describe("filterAuthorizedPermissions", () => {
    it("should return only authorized permissions", () => {
      const permissions = filterAuthorizedPermissions({
        userRole: "staff",
        permissions: [
          "events.read" as Permission,
          "users.delete" as Permission,
        ],
      });

      expect(permissions).toEqual(["events.read"]);
    });

    it("should return all permissions for admin", () => {
      const inputPermissions = [
        "one" as Permission,
        "two" as Permission,
        "three" as Permission,
      ];
      const permissions = filterAuthorizedPermissions({
        userRole: "admin",
        permissions: inputPermissions,
      });

      expect(permissions).toEqual(inputPermissions);
    });

    it("should return empty array for no matches", () => {
      const permissions = filterAuthorizedPermissions({
        userRole: "staff",
        permissions: [
          "users.delete" as Permission,
          "users.manage_roles" as Permission,
        ],
      });

      expect(permissions).toEqual([]);
    });
  });

  describe("toRolePolicyData", () => {
    it("should convert Prisma records to RolePolicyData", () => {
      const records = [
        {
          roleId: "role-1",
          roleName: "kitchen_staff",
          permissions: JSON.stringify(["events.create", "events.delete"]),
          isActive: true,
        },
        {
          roleId: "role-2",
          roleName: "manager",
          permissions: ["users.update" as unknown],
          isActive: true,
        },
      ];

      const result = toRolePolicyData(records);

      expect(result).toEqual([
        {
          roleId: "role-1",
          roleName: "kitchen_staff",
          permissions: ["events.create", "events.delete"],
          isActive: true,
        },
        {
          roleId: "role-2",
          roleName: "manager",
          permissions: ["users.update"],
          isActive: true,
        },
      ]);
    });

    it("should handle empty permissions", () => {
      const records = [
        {
          roleId: "role-1",
          roleName: "staff",
          permissions: [],
          isActive: true,
        },
      ];

      const result = toRolePolicyData(records);

      expect(result).toEqual([
        {
          roleId: "role-1",
          roleName: "staff",
          permissions: [],
          isActive: true,
        },
      ]);
    });

    it("should handle invalid JSON gracefully", () => {
      const records = [
        {
          roleId: "role-1",
          roleName: "staff",
          permissions: "invalid-json" as unknown,
          isActive: true,
        },
      ];

      const result = toRolePolicyData(records);

      expect(result).toEqual([
        {
          roleId: "role-1",
          roleName: "staff",
          permissions: [],
          isActive: true,
        },
      ]);
    });
  });

  describe("permissionCache", () => {
    beforeEach(() => {
      permissionCache.clear();
    });

    it("should store and retrieve role policies", () => {
      const policies: RolePolicyData[] = [
        {
          roleId: "role-1",
          roleName: "kitchen_staff",
          permissions: ["events.create"],
          isActive: true,
        },
      ];

      permissionCache.set("tenant-1", policies);
      const retrieved = permissionCache.get("tenant-1");

      expect(retrieved).toEqual(policies);
    });

    it("should return null for non-existent cache entries", () => {
      const retrieved = permissionCache.get("non-existent");
      expect(retrieved).toBeNull();
    });

    it("should clear specific tenant cache", () => {
      const policies: RolePolicyData[] = [
        {
          roleId: "role-1",
          roleName: "kitchen_staff",
          permissions: [],
          isActive: true,
        },
      ];

      permissionCache.set("tenant-1", policies);
      permissionCache.clear("tenant-1");

      expect(permissionCache.get("tenant-1")).toBeNull();
    });

    it("should clear all cache", () => {
      const policies: RolePolicyData[] = [
        {
          roleId: "role-1",
          roleName: "kitchen_staff",
          permissions: [],
          isActive: true,
        },
      ];

      permissionCache.set("tenant-1", policies);
      permissionCache.set("tenant-2", policies);
      permissionCache.clear();

      expect(permissionCache.get("tenant-1")).toBeNull();
      expect(permissionCache.get("tenant-2")).toBeNull();
    });
  });
});
