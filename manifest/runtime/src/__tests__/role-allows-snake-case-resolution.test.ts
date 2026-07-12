/**
 * Regression: `roleAllows` / `roleHasPermission` resolve snake_case DB roles.
 *
 * WHY this matters (not just WHAT it checks): Capsule injects `user.role` raw
 * from the DB (`User.role @default("staff")` — snake_case) at every governed
 * dispatch site. The upstream RuntimeEngine builds `roleIndex` keyed verbatim by
 * `role.name`, and `roleHasPermission` does an exact `roleIndex.get(roleName)`
 * lookup — unknown → false, with NO case normalization. When the compiled IR
 * carried PascalCase role names ("Manager", "KitchenLead", "HRAdmin"), every
 * `roleAllows(user.role, cap)` site resolved `roleIndex.get("manager")` →
 * undefined → false, denying EVERY real user on the 8 `roleAllows` policy sites
 * in accounting/time-entry-rules + accounting/payroll-rules.
 *
 * The fix: `_base.manifest` role declarations are snake_case, so the compiled IR
 * role names now match the DB-injected values exactly. This test loads the REAL
 * freshly-built IR through the same engine the API uses and asserts BOTH
 * directions so it fails loud if (a) the IR reverts to PascalCase or (b) the
 * rename over-grants. (CLAUDE.md Rule 9; constitution §13.)
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Store } from "@angriff36/manifest";
import { describe, expect, it } from "vitest";
import { ManifestRuntimeEngine } from "../runtime-engine.js";

const here = dirname(fileURLToPath(import.meta.url));
const irPath = join(here, "..", "..", "..", "ir", "kitchen.ir.json");
// biome-ignore lint/suspicious/noExplicitAny: IR is structural JSON; engine accepts it.
const ir: any = JSON.parse(readFileSync(irPath, "utf8"));

// Minimal stub store. roleHasPermission only reads the roleIndex (built in the
// constructor), so no command ever runs here — but the constructor still
// requires a storeProvider because every IR entity is durable.
const stubStore: Store = {
  // biome-ignore lint/suspicious/noExplicitAny: structural rows, intentionally inert.
  async getAll(): Promise<any[]> {
    return [];
  },
  // biome-ignore lint/suspicious/noExplicitAny: structural rows, intentionally inert.
  async getById(): Promise<any> {
    return;
  },
  // biome-ignore lint/suspicious/noExplicitAny: structural rows, intentionally inert.
  async create(): Promise<any> {
    return {};
  },
  // biome-ignore lint/suspicious/noExplicitAny: structural rows, intentionally inert.
  async update(): Promise<any> {
    return;
  },
  async delete(): Promise<boolean> {
    return false;
  },
  async clear(): Promise<void> {
    /* no-op */
  },
};

function makeEngine(): ManifestRuntimeEngine {
  return new ManifestRuntimeEngine(
    ir,
    {
      tenantId: "t-role-resolve",
      user: { id: "u-role-resolve", tenantId: "t-role-resolve", role: "admin" },
    },
    { storeProvider: () => stubStore }
  );
}

describe("roleAllows resolves snake_case DB roles against the compiled IR", () => {
  // Guards against a future revert of _base.manifest that the runtime would
  // otherwise mask (the rename must survive in the compiled IR to take effect).
  it("the compiled IR declares snake_case role names (no PascalCase leakage)", () => {
    const names: string[] = (ir.roles ?? []).map(
      // biome-ignore lint/suspicious/noExplicitAny: structural role objects.
      (r: any) => r.name as string
    );
    expect(names).toEqual(
      expect.arrayContaining([
        "staff",
        "manager",
        "admin",
        "kitchen_lead",
        "kitchen_staff",
        "hr_admin",
        "system",
      ])
    );
    // The exact Capsule-injected values must NOT collide with old PascalCase keys.
    expect(names).not.toContain("Manager");
    expect(names).not.toContain("KitchenLead");
    expect(names).not.toContain("HRAdmin");
    expect(names).not.toContain("Admin");
  });

  describe("POSITIVE — real DB roles now resolve (were denied before the rename)", () => {
    const engine = makeEngine();
    it.each<[string, string]>([
      ["manager", "manageAccess"], // Manager tier — owns manageAccess
      ["kitchen_lead", "leadAccess"], // KitchenLead allow leadAccess
      ["staff", "staffAccess"], // base tier
      ["hr_admin", "manageAccess"], // hr_admin extends manager → inherits manageAccess
      ["admin", "adminAccess"], // Admin allow adminAccess
      ["system", "adminAccess"], // system extends admin → inherits adminAccess
    ])("roleHasPermission(%j, %j) → true", (role, action) => {
      expect(engine.roleHasPermission(role, action)).toBe(true);
    });
  });

  describe("NEGATIVE — still deny (proves the rename did not over-grant)", () => {
    const engine = makeEngine();
    it.each<[string, string]>([
      ["staff", "manageAccess"], // base tier has no manageAccess
      ["kitchen_lead", "adminAccess"], // lead, not admin
      ["driver", "leadAccess"], // driver extends staff only
    ])("roleHasPermission(%j, %j) → false", (role, action) => {
      expect(engine.roleHasPermission(role, action)).toBe(false);
    });
  });

  it("unknown / legacy PascalCase role still denies (no permissive default)", () => {
    const engine = makeEngine();
    // "Manager" was a valid key BEFORE the rename; it must now be unknown.
    expect(engine.roleHasPermission("Manager", "manageAccess")).toBe(false);
    expect(engine.roleHasPermission("nonexistent", "manageAccess")).toBe(false);
  });
});
