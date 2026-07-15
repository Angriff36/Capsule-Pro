# Loop Run Log — YOUR_PROJECT

Append one entry per run. Prune entries older than 30 days.

## Format

```json
{
  "run_id": "2026-06-09T08:15:00Z",
  "pattern": "daily-triage",
  "duration_s": 45,
  "items_found": 4,
  "actions_taken": 1,
  "escalations": 0,
  "tokens_estimate": 52000,
  "outcome": "report-only | fix-proposed | escalated | no-op"
}
```

## Recent Runs

<!-- Loop appends below this line -->
```json
{
  "run_id": "2026-07-14-dbperf-13",
  "pattern": "db-perf-increment",
  "item": "#13 CRM scoring dual-write + 2N→N",
  "actions_taken": 1,
  "outcome": "fix-shipped (committed 67773d6dc, not pushed — push user-controlled)",
  "summary": "Added governed Lead.setScore(score,scoreBreakdown) command (manifest source + regen, manifest.prisma unchanged→no migration); swapped /crm/scoring/calculate off non-atomic dual-write (no-op Lead.update + raw lead.updateMany) → one governed setScore/lead = 2N→N + atomic. Test 3/3, CRM suite 144/144, apps/api tsc 14=baseline 0 new, manifest:ci green, db:check exit 0. #13 RESOLVED (core); residual N-serial parallelism blocked on runtime rework NEEDS-RYAN (#14/#18/#25).",
  "open_after": "#2(b/d/f), #6, #9, #22(measurement-gated), #25(runtime-blocked); spec criterion #5 latency pass needs seeded DB+servers"
}
```
```json
{
  "run_id": "2026-07-14-dbperf-14",
  "pattern": "db-perf-increment",
  "item": "#14 timecards/bulk read-N+1 + #17 stock-levels select",
  "actions_taken": 2,
  "outcome": "fix-shipped (committed a7bb7d5ec + cafb34906, not pushed — push user-controlled)",
  "summary": "2 bounded read-only Explore probes (run after concluding the surface was drained) surfaced: (1) #14 timecards/bulk POST read-N+1 — processEditRequests timeEntry findUnique→findMany+Map (2N→N+1; kept timecardEditRequest.findFirst serial = read-after-write dedup hazard) + processExceptionFlags notes read→group-by-timeEntryId+accumulate (N→1; preserves append for dups); (2) #17 stock-levels InventoryItem+InventoryStock select (drops tags String[]+description+~14 cols). Both: FIRST tests (5/5 + 3/3), tsc 14=baseline 0 new, biome clean, code-only. Falsifies 'apps/api select drained' again. Read-after-write-hazard check = reusable N+1-batching technique.",
  "open_after": "#2(b/d/f), #6, #9, #22(measurement-gated), #25(runtime-blocked); next: variance-reports select + inventory-forecasting N→1 (teed up); spec #5 needs seeded DB+servers"
}
```
```json
{
  "run_id": "2026-07-14-dbperf-15",
  "pattern": "db-perf-increment",
  "item": "inventory-forecasting alerts N+1 batch (1+4N→3) + single-SKU history dedup",
  "actions_taken": 1,
  "outcome": "fix-shipped (committed 6f81e7e5f, not pushed — push user-controlled)",
  "summary": "Collapsed batchCalculateForecasts (apps/api/app/lib/inventory-forecasting.ts) from 1+4N sequential reads to 3 constant reads — ONE inventoryItem.findMany+select→Map, ONE hoisted tenant-wide event.findMany (was re-fetched N× with unused _sku param), ONE inventoryTransaction.findMany grouped into per-item Map. Also deduped single-SKU calculateDepletionForecast (historical usage 2×→1×, 4→3 reads/SKU). Extracted pure helpers (computeHistoricalUsage/buildProjectedUsage/buildForecastPoints/computeConfidence); byte-identical math; removed 3 dead helpers; used DecimalLike structural interface. forecasting.test.ts 32/32 (31 prior + 1 new N+1 guard); inventory dir 261/261; tsc 14=baseline 0 new; code-only.",
  "open_after": "reorder-suggestions batch (3N), getAccuracySummary groupBy, shipments signatureData select"
}
```
```json
{
  "run_id": "2026-07-14-dbperf-16",
  "pattern": "db-perf-increment",
  "item": "reorder-suggestions N+1 batch + getAccuracySummary groupBy + shipments signatureData select (run #15 open tail)",
  "actions_taken": 2,
  "outcome": "fix-shipped (committed eec98d255 + 85cfff5bf, not pushed — push user-controlled)",
  "summary": "Cleared all three of run #15's teed-up open_after items, code-only/read-side, no governed writes: (1) generateReorderSuggestions now batches the per-SKU forecast via the existing batchCalculateForecasts (3 constant reads) instead of ~4 reads/SKU; extracted pure computeReorderSuggestion, deleted dead calculateReorderSuggestion; (2) getAccuracySummary replaced distinct-sku findMany + per-SKU count loop with ONE inventoryForecast.groupBy (accuracy cols don't exist → metrics stay zeroed); (3) shipments/route.ts list findMany now uses a top-level select dropping the signatureData base64 blob + reference (mirrors logistics/tracking shipmentSelect). forecasting.test.ts 34/34 (+2 N+1 guards); new shipments-list-select guard 2/2; apps/api tsc 14=baseline 0 new; biome clean (24 pre-existing warnings untouched on #15 funcs). 8th falsification of 'select surface mined out'. No git tag (repo convention: v0.12.X = manifest-release only).",
  "open_after": "#2(b/d/f), #6, #9, #22(measurement-gated), #25(runtime-blocked); #17/#19 read-side select+N+1 vein keeps producing (fresh probe needed for next targets); spec #5 latency pass needs seeded DB+servers"
}
```