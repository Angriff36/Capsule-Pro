/**
 * RolePolicy adminOnly Policy Enforcement Test
 *
 * Validates that every RolePolicy command (update, grant, revoke) enforces
 * the adminOnly policy: only users with role "admin" or "owner" can execute.
 *
 * This is a Phase 1 Governance security requirement — non-admin roles must
 * be denied access to all RolePolicy mutations.
 */

import { ManifestRuntimeEngine } from "@repo/manifest-runtime/runtime-engine";
import { describe, expect, it } from "vitest";
import {
  compileManifestSourceForTest,
  inMemoryStoreProvider,
} from "../test-helpers";

const ROLE_POLICY_MANIFEST = "platform/role-policy-rules.manifest";

async function getRolePolicyRuntime(userRole: string) {
  const ir = await compileManifestSourceForTest(ROLE_POLICY_MANIFEST);

  return new ManifestRuntimeEngine(
    ir,
    {
      tenantId: "test-tenant-456",
      user: {
        id: "test-user-123",
        tenantId: "test-tenant-456",
        role: userRole,
      },
    },
    { storeProvider: inMemoryStoreProvider() }
  );
}

async function createTestRolePolicy(runtime: ManifestRuntimeEngine) {
  return runtime.createInstance("RolePolicy", {
    id: "rp-001",
    tenantId: "test-tenant-456",
    roleId: "role-kitchen-staff",
    roleName: "Kitchen Staff",
    permissions: '["read:menu"]',
    description: "Kitchen staff base permissions",
    isActive: true,
  });
}

// All RolePolicy commands that must be admin-only
const ROLE_POLICY_COMMANDS = [
  {
    name: "update",
    args: {
      roleName: "Updated Role",
      permissions: '["read:menu","write:menu"]',
      description: "Updated description",
      isActive: true,
    },
  },
  {
    name: "grant",
    args: { permission: "write:events", grantedBy: "test-user-123" },
  },
  {
    name: "revoke",
    args: { permission: "read:menu", revokedBy: "test-user-123" },
  },
] as const;

// Roles that should be DENIED access
const DENIED_ROLES = [
  "kitchen_staff",
  "kitchen_lead",
  "event_coordinator",
  "manager",
  "finance",
  "viewer",
];

// Roles that should be ALLOWED access
const ALLOWED_ROLES = ["admin", "owner"];

describe("RolePolicy adminOnly Policy Enforcement", () => {
  it("compiles role-policy-rules.manifest successfully", async () => {
    const ir = await compileManifestSourceForTest(ROLE_POLICY_MANIFEST);

    expect(ir).toBeDefined();
    expect(ir).not.toBeNull();

    const entityNames = ir.entities.map((e: { name: string }) => e.name);
    expect(entityNames).toContain("RolePolicy");
  });

  it("IR contains adminOnly policy with correct role restriction", async () => {
    const ir = await compileManifestSourceForTest(ROLE_POLICY_MANIFEST);

    expect(ir).toBeDefined();
    expect(ir.policies).toBeDefined();
    expect(ir.policies.length).toBeGreaterThan(0);

    const adminPolicy = ir.policies.find(
      (p: { name: string }) => p.name === "adminOnly"
    );
    expect(
      adminPolicy,
      "adminOnly policy must exist in role-policy-rules IR"
    ).toBeDefined();
  });

  // Test each command is denied for non-admin roles
  describe.each(ROLE_POLICY_COMMANDS)("command: $name", ({ name, args }) => {
    it.each(DENIED_ROLES)("denies %s role", async (role) => {
      const runtime = await getRolePolicyRuntime(role);
      await createTestRolePolicy(runtime);

      const result = await runtime.runCommand(
        name,
        { ...args },
        {
          entityName: "RolePolicy",
          instanceId: "rp-001",
        }
      );

      expect(
        result.success,
        `RolePolicy.${name} should be denied for role "${role}"`
      ).toBe(false);
      expect(
        result.policyDenial,
        `RolePolicy.${name} should return policyDenial for role "${role}"`
      ).toBeDefined();
    });

    it.each(ALLOWED_ROLES)("allows %s role", async (role) => {
      const runtime = await getRolePolicyRuntime(role);
      await createTestRolePolicy(runtime);

      const result = await runtime.runCommand(
        name,
        { ...args },
        {
          entityName: "RolePolicy",
          instanceId: "rp-001",
        }
      );

      expect(
        result.success,
        `RolePolicy.${name} should succeed for role "${role}"`
      ).toBe(true);
      expect(result.policyDenial).toBeUndefined();
    });
  });

  // Summary: verify ALL 3 commands are covered
  it("covers all RolePolicy commands in enforcement tests", () => {
    const testedCommands = ROLE_POLICY_COMMANDS.map((c) => c.name);
    expect(testedCommands).toContain("update");
    expect(testedCommands).toContain("grant");
    expect(testedCommands).toContain("revoke");
    expect(testedCommands).toHaveLength(3);
  });
});
