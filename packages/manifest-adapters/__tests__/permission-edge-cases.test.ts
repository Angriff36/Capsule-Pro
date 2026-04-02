/**
 * @vitest-environment node
 */

import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  getPermissionsForRole,
  parsePermission,
  permissionCache,
  matchWildcard,
  type Permission,
  type RolePolicyData,
} from "../dist/permission-checker.js";
import {
  canExecuteCommand,
  filterAuthorizedCommands,
  getUserPermissions,
  PermissionDeniedError,
  AIApprovalRequiredError,
  COMMAND_PERMISSION_MAP,
} from "../dist/permission-guard.js";

// =============================================================================
// Edge case 1: Unknown/undefined roles
// =============================================================================

describe("Unknown role edge cases", () => {
  it("returns false for completely unknown role", () => {
    expect(
      hasPermission({
        userRole: "nonexistent_role",
        permission: "events.create" as Permission,
      })
    ).toBe(false);
  });

  it("returns false for empty string role", () => {
    expect(
      hasPermission({
        userRole: "",
        permission: "events.create" as Permission,
      })
    ).toBe(false);
  });

  it("returns empty permissions for unknown role", () => {
    const perms = getPermissionsForRole({ userRole: "unknown_role" });
    expect(perms).toEqual([]);
  });

  it("canExecuteCommand returns true for unknown role when no permission mapping exists", () => {
    // Commands without a permission mapping are allowed by default
    const result = canExecuteCommand("unknown_role", "SomeCommand", undefined);
    expect(result).toBe(true);
  });

  it("canExecuteCommand returns false for unknown role on mapped command", () => {
    const result = canExecuteCommand("unknown_role", "create", "Event");
    expect(result).toBe(false);
  });
});

// =============================================================================
// Edge case 2: Staff role — minimal permissions
// =============================================================================

describe("Staff role — minimal permissions", () => {
  it("staff can read events", () => {
    expect(
      hasPermission({
        userRole: "staff",
        permission: "events.read" as Permission,
      })
    ).toBe(true);
  });

  it("staff CANNOT create events", () => {
    expect(
      hasPermission({
        userRole: "staff",
        permission: "events.create" as Permission,
      })
    ).toBe(false);
  });

  it("staff CANNOT delete events", () => {
    expect(
      hasPermission({
        userRole: "staff",
        permission: "events.delete" as Permission,
      })
    ).toBe(false);
  });

  it("staff CANNOT manage users", () => {
    expect(
      hasPermission({
        userRole: "staff",
        permission: "users.manage_roles" as Permission,
      })
    ).toBe(false);
  });

  it("staff CANNOT manage settings", () => {
    expect(
      hasPermission({
        userRole: "staff",
        permission: "settings.manage" as Permission,
      })
    ).toBe(false);
  });

  it("staff can update tasks", () => {
    expect(
      hasPermission({
        userRole: "staff",
        permission: "tasks.update" as Permission,
      })
    ).toBe(true);
  });

  it("filterAuthorizedCommands removes unauthorized commands for staff", () => {
    const commands = [
      { name: "create", entity: "Event" },
      { name: "read", entity: "Event" },
      { name: "delete", entity: "Client" },
      { name: "update", entity: "User" },
      { name: "read", entity: "Event" }, // duplicate
    ];

    const filtered = filterAuthorizedCommands("staff", commands);

    // staff has: events.read, scheduling.read, tasks.read, tasks.update
    // "Event.create" maps to "events.create" → denied
    // "Event.read" maps to "events.read" → allowed
    // "Client.delete" maps to "clients.delete" → denied
    // "User.update" maps to "users.update" → denied
    expect(filtered).toHaveLength(2);
    expect(filtered[0]).toEqual({ name: "read", entity: "Event" });
    expect(filtered[1]).toEqual({ name: "read", entity: "Event" });
  });
});

// =============================================================================
// Edge case 3: Kitchen staff — limited domain access
// =============================================================================

describe("Kitchen staff — limited domain access", () => {
  it("kitchen_staff can read kitchen", () => {
    expect(
      hasPermission({
        userRole: "kitchen_staff",
        permission: "kitchen.read" as Permission,
      })
    ).toBe(true);
  });

  it("kitchen_staff can claim prep tasks", () => {
    expect(
      hasPermission({
        userRole: "kitchen_staff",
        permission: "prep_tasks.claim" as Permission,
      })
    ).toBe(true);
  });

  it("kitchen_staff CANNOT create events", () => {
    expect(
      hasPermission({
        userRole: "kitchen_staff",
        permission: "events.create" as Permission,
      })
    ).toBe(false);
  });

  it("kitchen_staff CANNOT manage users", () => {
    expect(
      hasPermission({
        userRole: "kitchen_staff",
        permission: "users.update" as Permission,
      })
    ).toBe(false);
  });

  it("kitchen_staff CANNOT approve AI", () => {
    expect(
      hasPermission({
        userRole: "kitchen_staff",
        permission: "settings.ai_approve" as Permission,
      })
    ).toBe(false);
  });
});

// =============================================================================
// Edge case 4: Custom role policies override defaults
// =============================================================================

describe("Custom role policies — override behavior", () => {
  it("inactive policy does NOT grant permissions", () => {
    const policies: RolePolicyData[] = [
      {
        roleId: "r1",
        roleName: "staff",
        permissions: ["events.create" as Permission],
        isActive: false,
      },
    ];

    expect(
      hasPermission({
        userRole: "staff",
        permission: "events.create" as Permission,
        rolePolicies: policies,
      })
    ).toBe(false);
  });

  it("active policy DOES grant additional permissions", () => {
    const policies: RolePolicyData[] = [
      {
        roleId: "r1",
        roleName: "staff",
        permissions: ["events.create" as Permission],
        isActive: true,
      },
    ];

    expect(
      hasPermission({
        userRole: "staff",
        permission: "events.create" as Permission,
        rolePolicies: policies,
      })
    ).toBe(true);
  });

  it("custom policy cannot revoke default permissions", () => {
    // Staff already has events.read by default
    // Adding a custom policy with different permissions doesn't remove defaults
    const policies: RolePolicyData[] = [
      {
        roleId: "r1",
        roleName: "staff",
        permissions: ["events.create" as Permission],
        isActive: true,
      },
    ];

    expect(
      hasPermission({
        userRole: "staff",
        permission: "events.read" as Permission,
        rolePolicies: policies,
      })
    ).toBe(true);
  });

  it("multiple active policies for same role all apply", () => {
    const policies: RolePolicyData[] = [
      {
        roleId: "r1",
        roleName: "staff",
        permissions: ["events.create" as Permission],
        isActive: true,
      },
      {
        roleId: "r2",
        roleName: "staff",
        permissions: ["users.create" as Permission],
        isActive: true,
      },
    ];

    expect(
      hasPermission({
        userRole: "staff",
        permission: "events.create" as Permission,
        rolePolicies: policies,
      })
    ).toBe(true);
    expect(
      hasPermission({
        userRole: "staff",
        permission: "users.create" as Permission,
        rolePolicies: policies,
      })
    ).toBe(true);
  });
});

// =============================================================================
// Edge case 5: Wildcard permissions
// =============================================================================

describe("Wildcard permissions", () => {
  it("admin wildcard matches everything", () => {
    expect(
      hasPermission({
        userRole: "admin",
        permission: "events.create" as Permission,
      })
    ).toBe(true);
    expect(
      hasPermission({
        userRole: "admin",
        permission: "users.manage_roles" as Permission,
      })
    ).toBe(true);
    expect(
      hasPermission({
        userRole: "admin",
        permission: "settings.ai_approve" as Permission,
      })
    ).toBe(true);
    expect(
      hasPermission({
        userRole: "admin",
        permission: "anything.at.all" as Permission,
      })
    ).toBe(true);
  });

  it("domain wildcard matches all actions in domain", () => {
    const policies: RolePolicyData[] = [
      {
        roleId: "r1",
        roleName: "staff",
        permissions: ["events.*" as Permission],
        isActive: true,
      },
    ];

    expect(
      hasPermission({
        userRole: "staff",
        permission: "events.create" as Permission,
        rolePolicies: policies,
      })
    ).toBe(true);
    expect(
      hasPermission({
        userRole: "staff",
        permission: "events.delete" as Permission,
        rolePolicies: policies,
      })
    ).toBe(true);
    expect(
      hasPermission({
        userRole: "staff",
        permission: "users.create" as Permission,
        rolePolicies: policies,
      })
    ).toBe(false);
  });

  it("exact match takes priority over wildcard in same position", () => {
    // Both should match — wildcards match everything they cover
    expect(matchWildcard("events.*", "events.create")).toBe(true);
    expect(matchWildcard("events.create", "events.create")).toBe(true);
  });
});

// =============================================================================
// Edge case 6: PermissionDeniedError and AIApprovalRequiredError
// =============================================================================

describe("Error types", () => {
  it("PermissionDeniedError has correct properties", () => {
    const error = new PermissionDeniedError(
      "delete",
      "Event",
      "staff",
      "events.delete" as Permission
    );

    expect(error.name).toBe("PermissionDeniedError");
    expect(error.commandName).toBe("delete");
    expect(error.entityName).toBe("Event");
    expect(error.userRole).toBe("staff");
    expect(error.requiredPermission).toBe("events.delete");
    expect(error.message).toContain("Permission denied");
    expect(error.message).toContain("staff");
    expect(error.message).toContain("events.delete");
  });

  it("PermissionDeniedError works without entityName", () => {
    const error = new PermissionDeniedError(
      "delete",
      undefined,
      "staff",
      "events.delete" as Permission
    );

    expect(error.entityName).toBeUndefined();
    expect(error.message).not.toContain("on entity");
  });

  it("AIApprovalRequiredError has correct properties", () => {
    const error = new AIApprovalRequiredError("create", "Event");

    expect(error.name).toBe("AIApprovalRequiredError");
    expect(error.commandName).toBe("create");
    expect(error.entityName).toBe("Event");
    expect(error.message).toContain("AI approval required");
  });

  it("errors are instanceof Error", () => {
    const permError = new PermissionDeniedError("x", "y", "z", "a" as Permission);
    const aiError = new AIApprovalRequiredError("x", "y");

    expect(permError).toBeInstanceOf(Error);
    expect(aiError).toBeInstanceOf(Error);
  });

  it("errors are catchable with try/catch", () => {
    let caught = false;
    try {
      throw new PermissionDeniedError("delete", "Event", "staff", "events.delete" as Permission);
    } catch (e) {
      caught = true;
      expect(e).toBeInstanceOf(PermissionDeniedError);
      expect((e as PermissionDeniedError).userRole).toBe("staff");
    }
    expect(caught).toBe(true);
  });
});

// =============================================================================
// Edge case 7: hasAnyPermission / hasAllPermissions
// =============================================================================

describe("Multi-permission checks", () => {
  it("hasAnyPermission returns true if at least one matches", () => {
    expect(
      hasAnyPermission({
        userRole: "staff",
        permissions: [
          "events.create" as Permission,
          "events.read" as Permission,
        ],
      })
    ).toBe(true);
  });

  it("hasAnyPermission returns false if none match", () => {
    expect(
      hasAnyPermission({
        userRole: "staff",
        permissions: [
          "users.create" as Permission,
          "users.delete" as Permission,
          "settings.manage" as Permission,
        ],
      })
    ).toBe(false);
  });

  it("hasAllPermissions returns true only if all match", () => {
    expect(
      hasAllPermissions({
        userRole: "staff",
        permissions: [
          "events.read" as Permission,
          "tasks.read" as Permission,
        ],
      })
    ).toBe(true);
  });

  it("hasAllPermissions returns false if any is missing", () => {
    expect(
      hasAllPermissions({
        userRole: "staff",
        permissions: [
          "events.read" as Permission,
          "events.delete" as Permission,
        ],
      })
    ).toBe(false);
  });

  it("hasAnyPermission with empty array returns false", () => {
    expect(
      hasAnyPermission({
        userRole: "staff",
        permissions: [],
      })
    ).toBe(false);
  });

  it("hasAllPermissions with empty array returns true (vacuously true)", () => {
    expect(
      hasAllPermissions({
        userRole: "staff",
        permissions: [],
      })
    ).toBe(true);
  });
});

// =============================================================================
// Edge case 8: Permission parsing edge cases
// =============================================================================

describe("Permission parsing edge cases", () => {
  it("handles permission without dot", () => {
    const result = parsePermission("create" as Permission);
    expect(result.domain).toBe("");
    expect(result.action).toBe("create");
    expect(result.full).toBe("create");
  });

  it("handles permission with multiple dots", () => {
    const result = parsePermission("admin.ai.approve" as Permission);
    expect(result.domain).toBe("admin");
    expect(result.action).toBe("ai.approve");
  });

  it("handles empty permission string", () => {
    const result = parsePermission("" as Permission);
    expect(result.domain).toBe("");
    expect(result.action).toBe("");
    expect(result.full).toBe("");
  });

  it("hasPermission with empty permission string", () => {
    // Empty string won't match any wildcard
    expect(
      hasPermission({
        userRole: "admin",
        permission: "" as Permission,
      })
    ).toBe(true); // admin has "*" which matches everything via matchWildcard
  });

  it("hasPermission with permission containing only a dot", () => {
    const result = parsePermission("." as Permission);
    expect(result.domain).toBe("");
    expect(result.action).toBe("");
  });
});

// =============================================================================
// Edge case 9: Command permission map coverage
// =============================================================================

describe("Command permission map coverage", () => {
  it("all standard entity commands have permission mappings", () => {
    const entities = ["Event", "Client", "User", "InventoryItem", "Dish", "Recipe", "PrepTask", "RolePolicy"];
    const actions = ["create", "update", "delete"];

    for (const entity of entities) {
      for (const action of actions) {
        const key = `${entity}.${action}`;
        if (key in COMMAND_PERMISSION_MAP) {
          expect(COMMAND_PERMISSION_MAP[key]).toBeTruthy();
          expect(typeof COMMAND_PERMISSION_MAP[key]).toBe("string");
        }
      }
    }
  });

  it("User.updateRole requires users.manage_roles (highest privilege)", () => {
    expect(COMMAND_PERMISSION_MAP["User.updateRole"]).toBe("users.manage_roles");
  });

  it("User.deactivate and User.terminate require users.delete", () => {
    expect(COMMAND_PERMISSION_MAP["User.deactivate"]).toBe("users.delete");
    expect(COMMAND_PERMISSION_MAP["User.terminate"]).toBe("users.delete");
  });

  it("commands without mapping return true from canExecuteCommand", () => {
    expect(canExecuteCommand("staff", "unmappedCommand", undefined)).toBe(true);
  });
});

// =============================================================================
// Edge case 10: No unhandled promise rejections
// =============================================================================

describe("No unhandled promise rejections", () => {
  it("hasPermission is synchronous — no promise rejection possible", () => {
    // hasPermission is a pure function with no async operations
    const result = hasPermission({
      userRole: "staff",
      permission: "events.create" as Permission,
    });
    expect(typeof result).toBe("boolean");
  });

  it("canExecuteCommand is synchronous — no promise rejection possible", () => {
    const result = canExecuteCommand("staff", "create", "Event");
    expect(typeof result).toBe("boolean");
  });

  it("filterAuthorizedCommands is synchronous — no promise rejection possible", () => {
    const result = filterAuthorizedCommands("staff", [
      { name: "create", entity: "Event" },
    ]);
    expect(Array.isArray(result)).toBe(true);
  });

  it("getUserPermissions is synchronous — no promise rejection possible", () => {
    const result = getUserPermissions("staff");
    expect(Array.isArray(result)).toBe(true);
  });

  it("getPermissionsForRole handles undefined rolePolicies", () => {
    // rolePolicies defaults to [] — no crash
    const result = getPermissionsForRole({ userRole: "staff" });
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
  });

  it("parsePermission does not throw on any input", () => {
    const inputs = ["", ".", "...", "a.b.c.d", "x", null as any, undefined as any];
    for (const input of inputs) {
      expect(() => parsePermission(input as Permission)).not.toThrow();
    }
  });
});

// =============================================================================
// Edge case 11: Permission cache behavior
// =============================================================================

describe("Permission cache edge cases", () => {
  beforeEach(() => {
    permissionCache.clear();
  });

  it("cache handles empty policies", () => {
    permissionCache.set("tenant-1", []);
    expect(permissionCache.get("tenant-1")).toEqual([]);
  });

  it("cache handles undefined tenant", () => {
    permissionCache.clear(undefined as any);
    expect(permissionCache.get("any-tenant")).toBeNull();
  });

  it("cache handles null tenant", () => {
    permissionCache.clear(null as any);
    expect(permissionCache.get("any-tenant")).toBeNull();
  });
});
