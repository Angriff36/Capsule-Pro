# Saga Decisions — U9 Remediation

**Date:** 2026-06-14 · **Manifest:** @2.5.1 · **Divergence:** U9

## Background

DIVERGENCES U9 reported 5 sagas declared in the manifest source, of which only 2
had server-action callers and 3 were completely dead (zero callers).  This file
documents the decision and the actions taken.

## Original 5 Sagas

| # | Saga | File | Status | Decision |
|---|------|------|--------|----------|
| 1 | `FinalizeEventWithReporting` | `events/event-rules.manifest:614` | **KEPT** | Has server-action caller (`finalizeEventWithReporting`, `confirmEventWithOptionalPrepList` in `event-saga-actions.ts`) with full `runManifestSaga` transport wired |
| 2 | `AutoGeneratePrepList` | `kitchen/prep-list-rules.manifest:535` | **KEPT** | Has server-action caller (`autoGeneratePrepListForEvent`) with full `runManifestSaga` transport wired |
| 3 | `FinalizeCycleCountSession` | `inventory/cycle-count-rules.manifest` | **DELETED** | Vestigial — no code caller (`runManifestSaga`/`runSaga`) ever invoked it. Cycle count finalization + variance approval handled by direct command dispatch + middleware |
| 4 | `InstallSelOnboardingTraining` | `staff/training-module-sel-rules.manifest` | **DELETED** | Vestigial — no code caller. SEL onboarding seed data installed via direct command dispatch through the middleware pipeline. 12-step saga was dead IR |
| 5 | `ProcessInvoicePayment` | `platform/payment-rules.manifest` | **DELETED** | Replaced by middleware reaction (Payment → Invoice.applyPayment guard-safe dispatch). Removed to prevent double-apply between saga and middleware |

## Decision

**Keep functional sagas, delete vestigial ones.**

The 3 dead sagas (#3–5) have already been removed from the manifest source.
Removal comments remain in their respective files explaining why they were
deleted and what replaced them.

The 2 remaining sagas (#1–2) are **kept** because:
- They have working server-action wrappers (`event-saga-actions.ts`)
- The `runManifestSaga` transport (`execute-saga.ts`, `run-manifest-saga-core.ts`,
  `apps/api/app/api/manifest/sagas/[saga]/route.ts`) is fully wired
- They model genuine multi-step workflows with compensation semantics
  that middleware alone cannot express:
  - `FinalizeEventWithReporting`: finalize → calculateProfitability → generateSummary
    (with unfinalize compensation)
  - `AutoGeneratePrepList`: createFromSeed → finalize
    (with cancel compensation)

## Remaining gap (not blocking)

The server actions in `event-saga-actions.ts` are exported but have **no UI
callers** — no component imports or invokes them.  This is a UI-wiring task, not
a manifest IR correctness issue.  The saga declarations are valid, the transport
works, and the server actions are tested.  Wiring them into the events UI
(e.g. "Finalize Event" button on the event detail page) is tracked as a
follow-up.

## Prerequisite for full adoption

Per U9: before promoting any shard to the merge root, harden `mergeIrDocuments`
to spread sagas (D9) or they silently disappear.  This was resolved in manifest
@2.5.0 (saga/webhook/schedule merge + `mergeIR` export shipped).
