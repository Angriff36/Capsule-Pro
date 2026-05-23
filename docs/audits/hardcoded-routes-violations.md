# Hardcoded Route Violations — Migration Status

**Baseline:** 2026-05-22 (ratcheted)
**Violations:** 587 across 186 files
**CI gate:** `scripts/check-hardcoded-routes.mjs` in `.github/workflows/ci.yml`
**Status:** Ratcheted — baseline is `scripts/check-canonical-routes-baseline.txt`. New violations fail CI; existing violations are tolerated up to the baseline count.

## Why ratcheted

`check-hardcoded-routes.mjs` rejects raw `"/api/..."` string literals and template expressions in client code (`apps/app/**`, `packages/ui/**`). The intent is to force all client-to-API calls through the typed route helpers in `apps/app/app/lib/routes.ts`.

The repo has not finished that migration. Failing CI on the full 587 today would block every PR. Per CI rules, the gate uses the same ratchet pattern as `lint-explicit-any` so new violations cannot accumulate while the migration burns down.

## Top concentrations

| Directory | Violations | Notes |
|---|---|---|
| `apps/app/app/lib/` | 74 | Data-fetching hooks (`use-shipments`, `use-inventory`, `use-budgets`, `use-stock-levels`, etc.). Highest-value migration target — one fix per hook eliminates many call sites. |
| `apps/app/app/(authenticated)/settings/integrations/` | 16 | `integrations-client.tsx` (single file). |
| `apps/app/app/(authenticated)/settings/notifications/` | 11 | `notifications-client.tsx`. |
| `apps/app/app/(authenticated)/settings/webhooks/` | 10 | `webhooks-client.tsx`. |
| `apps/app/app/(dev-console)/dev-console/webhooks/` | 10 | Dev-console mirror of above. |
| `apps/app/app/(authenticated)/tools/autofill-reports/` | 10 | `autofill-reports-client.tsx`. |
| `apps/app/app/(authenticated)/payroll/timecards/` | 10 | `page.tsx`. |
| `apps/app/app/(authenticated)/events/components/` | 10 | Multiple components. |
| `apps/app/app/(authenticated)/administrative/chat/components/` | 8 | `admin-chat-client.tsx`. |
| `apps/app/app/(authenticated)/calendar/sync/` | 8 | Calendar sync flow. |
| `apps/app/app/(authenticated)/contracts/[contractId]/` | 8 | `contract-detail-client.tsx`. |
| `apps/app/app/(authenticated)/warehouse/audits/[sessionId]/` | 8 | Warehouse audit session page. |

The remaining ~404 violations are spread across 170+ files at 1–7 hits each.

## Migration path

Recommended order — fixing hooks first eliminates downstream call sites without rewriting the components that import them.

1. **`apps/app/app/lib/use-*.ts`** — 74 violations across the hook files. Replace inline `/api/...` strings with `routes.X()` helpers from `apps/app/app/lib/routes.ts`. Adding a new helper there is documented at the top of the file.
2. **High-density single files** (`integrations-client.tsx`, `notifications-client.tsx`, `webhooks-client.tsx`, `admin-chat-client.tsx`, `autofill-reports-client.tsx`) — 10+ violations each, isolated cleanup.
3. **Page-level handlers** — payroll/calendar/contracts/warehouse pages, 7–8 violations each.
4. **The long tail** — 170+ files with 1–7 hits each. Burn down opportunistically when touching nearby code.

Run `node scripts/check-hardcoded-routes.mjs` locally to see the full current list.

## How to lock in wins

When a PR removes hardcoded routes, the script will report:

```
[check-hardcoded-routes] ✅ Count improved (N < 587). Update scripts/check-canonical-routes-baseline.txt to lock in the win.
```

Edit `scripts/check-canonical-routes-baseline.txt` and replace `587` with the new count. Commit the lower number in the same PR. The baseline never goes up; once at `0`, delete the baseline file's contents (set to `0`) or remove the file and adjust the script to fail on any non-zero — at that point this document can be deleted.
