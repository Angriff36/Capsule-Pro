# Task: EmailTemplateDeleted → deactivate dependent EmailWorkflows (P1 core orphan-event leg)

## Why this, not ClientArchived→withdraw Proposals (re-planned mid-task)
ClientArchived→withdraw Proposals looked clean but is NOT: `Client.archive` is
REVERSIBLE (`Client.reactivate` sets deletedAt=null), while `Proposal.withdraw` is
TERMINAL (no FSM transition out of "withdrawn"). Cascading an irreversible action off a
reversible parent state is the exact anti-pattern this codebase deliberately DEFERS
(vendor-suspend, dish-eightySix). So that leg is left deferred + documented in
IMPLEMENTATION_PLAN.md line 151.

EmailTemplateDeleted→EmailWorkflow.setActive(false) has NO such hazard: `setActive` is
itself REVERSIBLE, and deactivating workflows that point at a deleted template is the
correct protective semantic (a workflow whose template is gone would send broken/empty
emails). It is part of IMPLEMENTATION_PLAN.md line 184's cluster ("EmailWorkflow.setActive
already exists; only the reaction binding is missing").

## Problem
`EmailTemplateDeleted` (core/email-template-rules.manifest:92, emitted by
`EmailTemplate.softDelete`) has ZERO consumers. Soft-deleting a template leaves every
EmailWorkflow that references it (`EmailWorkflow.emailTemplateId`) ACTIVE — the trigger
service would keep firing those workflows against a missing template.

## Design decision
- On `EmailTemplateDeleted`, deactivate (setActive false) every EmailWorkflow with
  emailTemplateId == deleted templateId, tenantId match, deletedAt==null, isActive==true.
  (Skip already-inactive/deleted -> no spurious EmailWorkflowUpdated events; idempotent.)
- Reversible cascade: if the template is later recreated, an admin can re-activate the
  workflow. No irreversibility hazard.
- Mechanism: MIDDLEWARE (1:N fan-out by emailTemplateId; templateId reachable only as
  event.subject?.id since softDelete takes no params; declared event fields not
  auto-populated from self.*). NO IR/source/migration change.

## Plan
- [x] Investigate feasibility (orphan confirmed, FK + setActive confirmed, policy aligned).
- [x] New `manifest/runtime/src/middleware/email-template-deleted-deactivate-workflows-middleware.ts`
- [x] Export from `manifest/runtime/src/middleware/index.ts` barrel (after Dish*).
- [x] Import + register in `manifest/runtime/src/manifest-runtime-factory.ts`.
- [x] Conformance test `email-template-deleted-deactivate-workflows-middleware.test.ts` (3 tests).
- [x] Verify: runtime typecheck (0) + targeted test (3) + full runtime suite (388) +
      api typecheck (0) + audit-reaction-payloads (0/0) + schema:check (no drift).
- [x] Update IMPLEMENTATION_PLAN.md (line 184 leg done; line 151 deferral noted).
- [ ] commit, tag, push.

## Notes / known limitations
- setActive policy = manager/admin/system; EmailTemplate.softDelete default policy =
  manager/admin -> aligned, common path passes (documented in code + plan).
- Reference pattern: `vendor-blacklisted-cancel-purchase-orders-middleware.ts`.

## Review
- Implemented `EmailTemplateDeleted → EmailWorkflow.setActive(false)` as a pure-runtime 1:N
  middleware. ONE new middleware file + barrel export + factory import/registration + one
  conformance test. ZERO IR/source/schema/migration change.
- Re-planned mid-task: the originally-chosen ClientArchived→withdraw-Proposals leg was
  rejected after read-before-write surfaced that `Client.archive` is reversible while
  `Proposal.withdraw` is terminal (reversibility hazard) — deferred + documented in the plan
  instead of shipped. Picked the email leg, whose cascade action (setActive) is reversible.
- All gates green (see verify line). No pre-existing failures encountered.
