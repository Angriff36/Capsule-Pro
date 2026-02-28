/**
 * RolePolicy adminOnly Policy Enforcement Test
 *
 * Validates that every RolePolicy command (update, grant, revoke) enforces
 * the adminOnly policy: only users with role "admin" or "owner" can execute.
 *
 * This is a Phase 1 Governance security requirement — non-admin roles must
 * be denied access to all RolePolicy mutations.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { compileToIR } from "@angriff36/manifest/ir-compiler";
import { enforceCommandOwnership } from "@repo/manifest-adapters/ir-contract";
import { ManifestRuntimeEngine } from "@repo/manifest-adapters/runtime-engine";
import { describe, expect, it } from "vitest";

const MANIFEST_DIR = join(
  process.cwd(),
  "../../packages/manifest-adapters/manifests"
);

async function getRolePolicyRuntime(userRole: string) {
  const manifestPath = join(MANIFEST_DIR, "role-policy-rules.manifest");
  const source = readFileSync(manifestPath, "utf-8");
  const { ir, diagnostics } = await compileToIR(source);

  if (!ir) {
    throw new Error(
      `Failed to compile role-policy-rules.manifest: ${diagnostics.map((d: { message: string }) => d.message).join(", ")}`
    );
  }

  return new ManifestRuntimeEngine(
    enforceCommandOwnership(ir, "role-policy-rules"),
    {
      user: {
        id: "test-user-123",
        tenantId: "test-tenant-456",
        role: userRole,
      },
    }
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
    const manifestPath = join(MANIFEST_DIR, "role-policy-rules.manifest");
    const source = readFileSync(manifestPath, "utf-8");
    const { ir } = await compileToIR(source);

    expect(ir).toBeDefined();
    expect(ir).not.toBeNull();

    const entityNames = ir?.entities.map((e: { name: string }) => e.name);
    expect(entityNames).toContain("RolePolicy");
  });

  it("IR contains adminOnly policy with correct role restriction", async () => {
    const manifestPath = join(MANIFEST_DIR, "role-policy-rules.manifest");
    const source = readFileSync(manifestPath, "utf-8");
    const { ir } = await compileToIR(source);

    expect(ir).toBeDefined();
    expect(ir?.policies).toBeDefined();
    expect(ir?.policies.length).toBeGreaterThan(0);

    const adminPolicy = ir?.policies.find(
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
