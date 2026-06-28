# Manifest Policies

Canonical ID: `manifest.language.policies`

Type: `manifest-capability`

Owner decision status: `needs-ryan`

Implementation status: `working`

Last reviewed: `2026-06-26`

Last updated by: `agent`

---

## 1. What This Is

Plain-English purpose:

```text
Policies are access-control and permission rules that gate command execution. Defined in .manifest source files as `policy name execute: user.role in [...] "description"` blocks, and evaluated by the RuntimeEngine before guards and constraints. The system supports role inheritance (Admin extends Manager extends Staff) and is migrating from inline role arrays to a `roleAllows(user.role, "permission")` helper pattern.
```

Real app impact:

```text
When correct:
- Commands are gated by role-based policies before execution.
- Role hierarchy provides automatic permission inheritance.
- Unauthorized mutations return structured policy_denied errors.

When wrong:
- Policies are missing or too permissive → unauthorized mutations succeed.
- Hardcoded role arrays in route handlers bypass the policy system.
- Role hierarchy is inconsistent → permissions leak across tiers.
```

---

## 2. Ryan Final Decision

Decision:

```text
NEEDS-RYAN
```

Reason:

```text
Policy system is established but migrating from inline role arrays to roleAllows(). The final policy DSL syntax and whether attribute-based access control (ABAC) should supplement RBAC are open decisions.
```

Do not do:

```text
Do not hardcode role checks in route handlers that bypass the Manifest policy system.
Do not create policy bypasses without adding them to the approved bypass registry.
Do not skip policy evaluation for any governed command.
```

---

## 3. Current Status

Current recorded status:

```text
Role-based policies defined in .manifest source files. Three-tier role hierarchy (Staff → Manager → Admin). Migrating from inline `user.role in [...]` to `roleAllows(user.role, "permission")` helper. Governance registries track all governed entities, commands, and bypasses.
```

Known gaps:

```text
- Some route handlers in apps/api still have hardcoded role checks via requireApiRole() (apps/api/app/lib/auth-roles.ts) that duplicate Manifest policy logic.
- Migration from inline arrays to roleAllows() is in progress — both patterns coexist.
- No attribute-based access control (ABAC) — only RBAC.
```

Confidence: `medium`

Evidence:

```text
- Base definitions: manifest/source/_base.manifest (lines 13-29 roleAllows helper, lines 32-95 role hierarchy)
- Policy source: manifest/source/**/*.manifest (policy blocks in entity declarations)
- Runtime guard: manifest/runtime/src/permission-guard.ts (injects at before-guard hook)
- API role helper: apps/api/app/lib/auth-roles.ts (requireApiRole with ADMIN_ROLES, MANAGER_ROLES)
- Governance registries: manifest/governance/commands.json, entities.json, bypasses.json
```

---

## 4. Where It Lives

Canonical decision file:

```text
canonical/manifest/language/policies/README.md
```

Source location:

```text
manifest/source/**/*.manifest (policy blocks inside entity declarations)
manifest/source/_base.manifest (role hierarchy + roleAllows helper definition)
```

Generated output location:

```text
manifest/ir/kitchen.ir.json (policies embedded in entity IR)
```

Runtime location:

```text
manifest/runtime/src/permission-guard.ts (runtime enforcement at before-guard hook)
manifest/runtime/src/runtime-engine.ts (policy evaluation in command execution pipeline)
apps/api/app/lib/auth-roles.ts (API-level role guard — legacy, partially duplicates Manifest policies)
```

UI location:

```text
NONE
```

Test location:

```text
manifest/runtime/src/__tests__/ (policy-related tests)
```

Docs location:

```text
constitution.md §9 (governed writes, bypass registry)
```

---

## 5. Entry Points

User-facing route:

```text
NONE (policies are evaluated transparently during command execution)
```

Route file:

```text
NONE
```

API route / dispatcher:

```text
apps/api/app/api/manifest/[entity]/commands/[command]/route.ts (policies evaluated during command dispatch)
```

CLI command:

```text
NONE
```

Background job / cron / worker:

```text
NONE
```

---

## 6. What Consumes It

Direct consumers:

```text
- manifest/runtime/src/runtime-engine.ts (evaluates policies during command execution)
- manifest/runtime/src/permission-guard.ts (injects policy checks at before-guard hook)
- manifest/governance/bypasses.json (approved bypass registry)
```

Indirect consumers:

```text
- All command dispatch paths (every POST to /api/manifest/[entity]/commands/[command])
- Route handlers that call requireApiRole() (legacy, partially duplicates Manifest policy logic)
```

Generated consumers:

```text
- Policy metadata in IR (manifest/ir/kitchen.ir.json)
```

Human consumers:

```text
Ryan, coding agents authoring new policies or modifying role hierarchy.
```

---

## 7. What It Is Wired To

Manifest entities:

```text
All 213 entities (policies are per-entity)
```

Manifest commands:

```text
All 1,059 commands (each evaluated against entity policies)
```

Manifest events:

```text
NONE (policies do not emit events)
```

Manifest policies / access rules:

```text
Three-tier hierarchy: Staff → Manager → Admin. Policies use `user.role in [...]` or `roleAllows(user.role, "permission")`.
```

Database tables / collections:

```text
NONE (policies are runtime-evaluated, not persisted)
```

Generated types:

```text
NONE
```

Generated client/hooks:

```text
NONE
```

Forms/pages/components:

```text
NONE (UI role checks are client-side, separate from Manifest policies)
```

---

## 8. Canonical Behavior

Happy path:

```text
Command dispatch → RuntimeEngine evaluates entity policies → policy passes → guards evaluated → command executes. If policy denies, returns policy_denied error with description.
```

Failure behavior:

```text
- Policy denied → structured error: policy_denied, with policy description.
- Missing policy → command executes without policy gate (gap).
- Hardcoded role check in route handler duplicates Manifest policy — may diverge.
```

Forbidden behavior:

```text
- Skipping policy evaluation for governed commands.
- Hardcoding role checks in route handlers instead of using Manifest policies.
- Creating bypasses without registering in manifest/governance/bypasses.json.
```

---

## 9. Naming Rules

Canonical name:

```text
Manifest Policies
```

Allowed aliases:

```text
Access Policies, RBAC Policies, Permission Rules
```

Forbidden aliases:

```text
Auth middleware, route guards, API permissions (these are app-level, not Manifest-level)
```

Casing / slug rules:

```text
- Policy name in DSL: camelCase (e.g., adminOnly, staffCanView)
- Role name: lowercase (e.g., admin, manager, staff)
- roleAllows key: lowercase kebab or camelCase (e.g., "permission-name")
```

---

## 10. Open Questions

Agents may add rows. Agents may not decide for Ryan.

| ID   | Question | Why it matters | Evidence found | Options | Ryan decision |
| ---- | -------- | -------------- | -------------- | ------- | ------------- |
| Q001 | Should attribute-based access control (ABAC) supplement RBAC? | Current system is RBAC-only. ABAC would allow policies based on entity state, ownership, or context (e.g., "only the creator can cancel"). | Only `user.role` checks exist. No entity-state-based access control in .manifest DSL. | A: Add ABAC to DSL; B: Keep RBAC-only; C: Implement ABAC in middleware | NEEDS-RYAN |
| Q002 | Should legacy requireApiRole() in apps/api be replaced with Manifest policies? | apps/api/app/lib/auth-roles.ts partially duplicates Manifest policy logic — divergence risk. | requireApiRole() with ADMIN_ROLES, MANAGER_ROLES exists in apps/api. Manifest policies are the governance SoT. | A: Replace with Manifest policy checks; B: Keep both (document duplication); C: Merge into single layer | NEEDS-RYAN |

---

## 11. Decision History

| Date       | Decision | Made by | Reason |
| ---------- | -------- | ------- | ------ |
| 2026-06-26 | Initial evidence gathered | agent | Canonical unit created with real repo evidence |
