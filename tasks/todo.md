# Todo: Fix all errors from dev-server log (chatgptoutput.txt, 2026-06-11)

Source: C:\Users\Ryan\Documents\chatgptoutput.txt — app (2221) + api (2223) dev logs.

## Issues — ALL FIXED
- [x] 1. `Invalid time value` — get-client-ltv.ts: unquoted camelCase SQL aliases folded to lowercase (createdAt→createdat→undefined). Quoted 5 aliases ×2 queries + `COUNT()::int` + ORDER BY/ALLOWED_ORDER_CLAUSES quoting. Also un-NaN'd lifetimeValue/orderCount/lastOrderDate (silent same-class).
- [x] 2. `tenant_admin.audit_log does not exist` — apps/app route was a phantom (no backing table/columns, wrong response shape). DELETED; `/api/settings/audit-log` now proxies via rewrite to the working apps/api route (platform.audit_log).
- [x] 3. `tenant_admin.activity_feed does not exist` — table is `tenant_admin."ActivityFeed"` (PascalCase @@map). Fixed 3 queries in stats route + 2 in activity-feed-service.ts.
- [x] 4. `bind supplies 1 params, requires 2` — menu-engineering: params array passed un-spread to variadic $queryRawUnsafe; + raw `${locationId}` interpolation → `$3::uuid`.
- [x] 5. `pt.tenantid` / `pli.createdat` — bottleneck detector: camelCase→snake_case across 5 queries; `pt.completed_at` (nonexistent) → `updated_at`; un-spread params fixed in all 5 call sites (latent); `s.id::text = pli.station_id` (uuid=text, latent) + tenant scope added to EXISTS.
- [x] 6+7. email-workflows "use server" exporting object/array — constants moved to constants.ts, 3 importers updated; latent LEAD_SOURCES (marketing/leads) un-exported.
- [x] 8. createEvent E_TYPE_DATETIME — root cause = process/deploy skew (v0.12.249 coercion not in the running executor; main ~40 ahead of origin). Senders hardened to epoch ms (actions.ts ×3, importer.ts ×1). OPERATIONAL: restart dev servers; push+deploy for prod.
- [x] 9. Playground entity-detail 404s — afterFiles rewrite captured the dynamic [entityName] route. `/api/settings/:path*` narrowed to api-keys/audit-log/rate-limits subtrees.
- [x] 10. React key warning — keyed `<Fragment>` replaces shorthand fragment in LocationComparisonSection.
- [x] 11. null `.status` on /settings/integrations — NowstaStatus lastSync/statistics now `| null` (matching API), optional chaining ×3, autoSyncInterval fallback.

## Verification — DONE
- [x] `pnpm --filter app typecheck` exit 0
- [x] `pnpm --filter api typecheck` exit 0
- [x] `pnpm --filter @repo/manifest-runtime typecheck` exit 0
- [x] Tests: api activity-feed 26/26, api integrations 66/66, runtime full suite 172/172, app events/settings/analytics/marketing 59/59
- [x] Live-DB probes: all 12 corrected SQL statements accepted by Neon dev DB
- [x] No generated "DO NOT EDIT" file touched

## Review
10 distinct bugs from the log + 8 latent same-class bugs fixed in one pass. Dominant class:
raw-SQL identifier drift (aliases fold, camelCase field names as columns, @@map'd table names) —
see manifest/notes.md §39 for the full catalog and the rewrite-ordering rule.
Remaining operational items: restart both dev servers (pick up coercion fix + these changes);
push to origin + deploy api so prod gets f257af45b and this batch (push = Tier 3, needs user).
Flagged not fixed: trash/list ENTITY_QUERIES dead map (cleanup candidate, notes §39).

# Round 2 (post-restart log + screenshot) — ALL FIXED
- [x] events `column version does not exist` — NOT local: Infisical dev env overrides .env.local, app posted to PROD API/DB (no version column there). dev scripts now pin NEXT_PUBLIC_API_URL=localhost:2223 (ed4583c0a).
- [x] recipe-cost detail `undefined.name` — POST /cost returned command envelope instead of breakdown (26ef0c5de regression). Contract restored + client guard.
- [x] inventory items `undefined.toFixed` — generated-client adoption shape mismatch (7dae4343a). Reverted to bespoke /api/inventory/items endpoints.
- [x] vendor-catalog modal — per-field validation, supplier empty-state, NaN effective dates → epoch ms, currency/units aligned to IR vocab. OPEN: no InventorySupplier creation UI exists (structural).
- [x] validDifficulty/validStatus block spam — entity-level :block anti-pattern removed at source (transitions + create guard), IR recompiled, manifest:ci green. OPEN: upstream engine mutate-swallow (silent 200 no-ops).

Verification: manifest:ci PASS, runtime 172/172, api kitchen 728/728, constraint-severity 3/3, app kitchen+adoption 4/4, app+api typecheck 0 errors.
Operational: prod DB needs db:deploy (+ consider migrate step in deploy.yml); push still pending (user, Tier 3).
