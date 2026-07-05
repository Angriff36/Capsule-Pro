# Stabilization ledger — 2026-07-05

Root-cause classes found: 8. All fixed. Commits 9a97d7acf..7ab204138 (this session's stabilization: 64a6f269a, ff8f47a39, ad2be53e1, 9ed251613, d6487fbed, 042640525, eb197493c, 7ab204138, + migrations 20260705120000/121500/130000).

## Class 1 — Clerk id written into UUID columns / used as governed actor
Symptom: repeating 500s (user-preferences ~99/session) + silent misattribution. Cause: `auth().userId` ("user_…") into @db.Uuid cols and command user contexts. Fix: requireCurrentUser().id across ~37 routes (user-preferences + wave C ~34 + timecards/receive/complete). Verified: curl 401 not 500; stock-levels/adjust resolves employee id before write.

## Class 2 — text-vs-enum column drift (+ enum NAMESPACE sub-defect)
Symptom: 500 "operator does not exist: text = <Enum>" on every status filter (events/today, /crm, overview-boards). Cause: 19 live status columns still TEXT while generated Prisma declared enums. Fix: migration 20260705063000 (15 conversions +4 CREATE TYPE +1 data repair). SUB-DEFECT (caught by fresh DB reviewer): that migration matched enum NAMES not their @@map/@@schema, moving 4 columns to wrong public.* types + missed shipments core-vs-public — corrected by 20260705120000 (revert to core.*, drop wrong types, prep_tasks default). Independently verified: all 20 enum cols correct namespace, 0 membership violations, migrate:status clean, ZERO remaining enum drift across all 44 enum types.

## Class 3 — stale generated-boundary assumptions (snake_case fields, renamed relations, retired enum literals)
Symptom: PrismaClientValidationError 500s + silently-empty lists + wrong counts. Cause: code written against pre-projection shapes. Fix: budgetLineItems→lineItems, completions→trainingCompletions, participants→adminChatParticipants, company_name/board_name/first_name/last_name/order_status/shift_start→camelCase (~20 files across both apps + staff libs), kitchen enum literals open→pending/completed→done, approvals data.data.orders→data.orders.

## Class 4 — over-required command params
Symptom: 400 on every AllergenWarning.acknowledge / LogisticsRoute.create. Fix: notes/endTime/totalDistance/totalDuration/description made optional in manifest source + regen.

## Class 5 — persist-before-mutates (required datetime, no source default)
Symptom: Event.create 500 (misleading "Unknown argument tenantId") when eventDate null. Fix: Event.eventDate = now() source default + column migration 20260705121500. (Same club as PrepList.generatedAt/EventSummary.generatedAt.)

## Class 6 — insert-path NOT NULL hazard (live-only legacy columns)
Symptom: latent 23502 on inserts into 13 tables + event_timeline_items. Cause: projection dropped columns that stayed NOT NULL live with no default. Fix: DROP NOT NULL on 23 columns (20260705120000) + completed_at (20260705130000). task_bundle_items PK members excluded (composite-PK insert limitation stands).

## Class 7 — chat AI param typing coupled to a fragile loader
Symptom: numeric AI commands 400 (Event.updateGuestCount "45"). Cause: coarse types gated on agent-sdk toolgen loading; required detection wrong for 3.1.3 IR. Fix: coarse types from IR alone; required = param.required !== false. Verified live: guest_count=45 persisted.

## Class 8 — non-fatal routing/log noise
uuid-cast 500 on /kitchen/recipes/dishes (redirect + guard); dangling /login,/onboarding redirects; 3 missing api rewrites; trash KitchenTaskClaim/Progress (no deletedAt) removed; store_missing 820-line spam deduped; /scheduling/leaderboard + /api/staff/workforce-analytics 500s (shift_start / eskill.deleted_at).

## Verifiers (fresh, independent)
- DB safety: PASS — 3 migrations safe, namespace correction validated, zero runtime-risking drift.
- Runtime: 13/13 ledger items fixed; found 2 new 500s (fixed); item-12 stale chunk cleared by api restart.
- Flagship: PASS end-to-end — supplier-draft math reconciles exactly, traceability + AI governance intact.

## Gates (final)
manifest:ci exit 0 · api typecheck 0 · app typecheck 295 (from 415) · command-board 140/140 · api kitchen+procurement 863/863.

## Known remaining (not runtime-risk now)
- app typecheck 295: mostly TS6133 unused vars, TS18048 unchecked index/map lookups, strict-null — inert hygiene debt.
- task_bundle_items composite-PK insert still blocked (needs schema-level fix, out of scope).
- event_timeline_items.completed_at was fixed; pre-existing baseline otherwise accepted-upstream projection looseness.
