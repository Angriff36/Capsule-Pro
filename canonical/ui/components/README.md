# App Components

Canonical ID: `ui.components`

Type: `feature`

Owner decision status: `needs-ryan`

Implementation status: `working`

Last reviewed: 2026-06-26

Last updated by: `agent`

---

## 1. What This Is

Plain-English purpose:

```text
Domain-specific reusable components in the Next.js app that orchestrate Manifest commands, present entity state, and compose design-system primitives into higher-level UI patterns. These are NOT design-system primitives (those live in @repo/design-system/components/ui/); they are application-level components that bridge the UI to the Manifest runtime.
```

Real app impact:

```text
When correct:
- Inline editing, status transitions, bulk actions, and permission gates use governed command dispatch (executeCommand) through the canonical Manifest dispatcher.
- Components are command-agnostic — callers name the entity, command, and field.
- Constitution §4 is honored: the UI visualizes state and collects intent, never encoding authoritative FSMs, validation rules, or domain invariants.

When wrong:
- Components hard-code transition graphs or validation logic that belongs in the Manifest IR.
- Components call raw Prisma writes or ad-hoc API endpoints instead of the Manifest dispatcher.
- Duplicate component patterns emerge across different page directories.
```

---

## 2. Ryan Final Decision

Decision:

```text
NEEDS-RYAN
```

Reason:

```text
The component layer exists and follows the constitution, but conventions for component placement (app/components/ vs. page-local), when to promote a component to the design system, and how to handle cross-cutting UI patterns (bulk actions, permission gates) need Ryan's decision.
```

Do not do:

```text
Do not hard-code FSM transition graphs in UI components (constitution §4).
Do not create shadcn/ui primitives in the app — they belong in @repo/design-system.
Do not duplicate component patterns across page directories instead of promoting to apps/app/app/components/.
Do not dispatch governed commands through any path other than executeCommand from manifest-client.ts.
```

---

## 3. Current Status

Current recorded status:

```text
Working. Six reusable components exist in apps/app/app/components/. All governed mutations route through executeCommand (manifest-client.ts). No app-level UI primitive directory exists. Components follow the "UI orchestrates intent, Manifest owns semantics" pattern.
```

Known gaps:

```text
1. No documented convention for when a component belongs in apps/app/app/components/ vs. page-local.
2. PermissionGate (permission-gate.tsx) exists but its relationship to Manifest policies is unclear.
3. BulkActions (bulk-actions.tsx) dispatches governed commands but the bulk-action pattern is not codified as a reusable seam.
4. No component storybook or visual regression testing exists at the app level (design-system has .stories.tsx for select blocks only).
5. PrintView (print-view.tsx) and AuthHeader (auth-header.tsx) are infrastructure components, not Manifest-connected — placement rationale is undocumented.
```

Confidence: `high`

Evidence:

```text
- apps/app/app/components/ — 6 files: auth-header.tsx, bulk-actions.tsx, inline-edit-field.tsx, permission-gate.tsx, print-view.tsx, status-transition-badge.tsx
- apps/app/app/components/ui/ — DOES NOT EXIST (verified)
- inline-edit-field.tsx — imports Button/Input from @repo/design-system, dispatches via useOptimisticCommand -> executeCommand
- status-transition-badge.tsx — fetches transitions from GET /api/manifest/{entity}/transitions, dispatches via executeCommand
- bulk-actions.tsx — dispatches governed commands via executeCommand
- All three command-dispatching components are "use client"
```

---

## 4. Where It Lives

Canonical decision file:

```text
canonical/ui/components/README.md
```

Source location:

```text
apps/app/app/components/
```

Generated output location:

```text
NONE
```

Runtime location:

```text
apps/app/app/components/ (imported by page components)
```

UI location:

```text
Used across multiple page directories in apps/app/app/(dashboard)/ and apps/app/app/(marketing)/
```

Test location:

```text
NONE — no test files for app-level components (design-system blocks have some .test.tsx)
```

Docs location:

```text
NONE
```

---

## 5. Entry Points

User-facing route:

```text
NONE (components are consumed by routes, not routes themselves)
```

Route file:

```text
NONE
```

API route / dispatcher:

```text
status-transition-badge.tsx calls GET /api/manifest/{entity}/transitions?status=...
inline-edit-field.tsx calls POST /api/manifest/{entity}/commands/{command} via executeCommand
bulk-actions.tsx calls POST /api/manifest/{entity}/commands/{command} via executeCommand
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
- apps/app/app/(dashboard)/ pages (entity list/detail views that use InlineEditField, StatusTransitionBadge, BulkActions)
- apps/app/app/components/auth-header.tsx (consumed by layout.tsx)
```

Indirect consumers:

```text
All entity CRUD surfaces that use inline editing or status transitions.
```

Generated consumers:

```text
NONE
```

Human consumers:

```text
Ryan, frontend developers, coding agents.
```

---

## 7. What It Is Wired To

Manifest entities:

```text
Multiple — InlineEditField and StatusTransitionBadge are entity-agnostic; callers pass entity name as a prop.
```

Manifest commands:

```text
Multiple — dispatched via executeCommand(entity, command, payload). Specific commands are caller-dependent.
```

Manifest events:

```text
NONE (components dispatch commands; event consumption is via use-optimistic-command reconciliation and SSE realtime)
```

Manifest policies / access rules:

```text
permission-gate.tsx — may reference Manifest policies, but the exact mechanism is UNKNOWN.
```

Database tables / collections:

```text
NONE (indirect via Manifest runtime)
```

Generated types:

```text
NONE (components use executeCommand which returns CommandEnvelope<T>)
```

Generated client/hooks:

```text
- manifest-client.ts (executeCommand, CommandSuccess, CommandError)
- use-optimistic-command.ts (optimistic dispatch + rollback)
```

Forms/pages/components:

```text
@repo/design-system/components/ui/* (primitives used by app components)
```

---

## 8. Canonical Behavior

Happy path:

```text
An app component imports primitives from @repo/design-system, fetches data or transitions from generated hooks or the IR read projection endpoint, and dispatches user intent via executeCommand. The component never encodes domain rules — it renders what the Manifest runtime authorizes.

InlineEditField: click -> input -> Enter/blur -> executeCommand(entity, command, { id, [field]: value }) -> optimistic update -> reconcile or rollback.
StatusTransitionBadge: badge -> dropdown -> fetch transitions from IR projection -> executeCommand for selected transition.
BulkActions: select items -> action -> executeCommand per item (or batch).
```

Failure behavior:

```text
If the Manifest runtime rejects a command (guard failure, policy denial), the component surfaces the friendly-error toast from the CommandError response. The optimistic value is rolled back to the pre-command snapshot.
```

Forbidden behavior:

```text
No hard-coded FSM transition lists in components (must fetch from /api/manifest/{entity}/transitions).
No raw fetch() calls to ad-hoc API endpoints for governed mutations.
No direct Prisma database calls from components.
No validation logic in the UI that duplicates Manifest guard checks.
No shadcn primitives created in apps/app/app/components/ — those go in @repo/design-system.
```

---

## 9. Naming Rules

Canonical name:

```text
App Components (apps/app/app/components/)
```

Allowed aliases:

```text
shared components
app-level components
domain components
```

Forbidden aliases:

```text
ui-components (conflicts with @repo/design-system/components/ui/)
```

Casing / slug rules:

```text
Directory: apps/app/app/components/
File: PascalCase (InlineEditField.tsx, StatusTransitionBadge.tsx)
Import: @/app/components/<Component>
Canonical ID: ui.components
```

---

## 10. Open Questions

Agents may add rows. Agents may not decide for Ryan.

| ID   | Question | Why it matters | Evidence found | Options | Ryan decision |
| ---- | -------- | -------------- | -------------- | ------- | ------------- |
| Q001 | When should a component live in apps/app/app/components/ vs. page-local? | No documented placement convention. Risk: duplication across page dirs vs. over-promotion of page-specific code. | 6 components in apps/app/app/components/ — all seem cross-cutting. No page-local component directories found. | A: Only truly cross-entity components in app/components/; page-specific inline. B: All reusable components in app/components/. C: Formalize with a checklist. | NEEDS-RYAN |
| Q002 | Should PermissionGate reference Manifest policies or remain independent? | If Manifest policies exist for UI-level access control, PermissionGate should delegate to them. If not, it's a separate concern. | permission-gate.tsx exists. Manifest policies exist in the IR but are server-enforced. | A: PermissionGate reads Manifest policy IR projection. B: PermissionGate stays independent (role-based only). C: SOURCE REQUIRED — need Manifest policy spec. | NEEDS-RYAN |
| Q003 | Should BulkActions become a design-system block? | It is domain-agnostic (entity + command as props) and could benefit other apps. | bulk-actions.tsx is in app/components/ with executeCommand dependency. | A: Promote to design-system block. B: Keep in app (Manifest dependency makes it app-specific). | NEEDS-RYAN |

---

## 11. Decision History

| Date       | Decision | Made by | Reason |
| ---------- | -------- | ------- | ------ |
