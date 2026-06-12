# Schema-Drift Baseline Drain (2026-06-12, autonomous 8h run)

## Stages — ALL COMPLETE
- [x] 1. Classification: 13 agents, 614 decisions, 0 failed groups
- [x] 2. Adversarial verify: 178 REMOVE/RENAME → 167 CONFIRM, 10 REVISE, 0 REJECT
- [x] 3. Apply: 276/279 across 52 manifests + 23 callers (1 skip: signature reserved word)
- [x] 4. Schema: 247 columns, migration 20260612150718 applied, db:check zero drift
- [x] 5. Regen chain + straggler fixes (audit create-mutation coverage, BoardAnnotation int, OnboardingCompletion mutate)
- [x] 6. Gates: manifest:ci GREEN; api/app/runtime typecheck 0 errors; tests 5263+341+172 pass
- [x] 7. Baseline 614 → 58 (exactly the 57 design-conflict DEFERs + 1 reserved-word blocker)
- [x] 8. Commits: ed162e0bb, ee4e62f8a, 1c7777732 (+docs)

## Review
The 58 residual baseline entries need USER decisions — documented in manifest/notes.md §50:
EventImportWorkflow own-table, ML trio (ForecastInput/InventoryForecast/ReorderSuggestion),
EventTimelineItem vs TimelineTask dup, CorrectiveAction polymorphic source,
TemperatureProbe.isActive shape, Schedule.shiftCount defect, Shipment 'signature' upstream fix.

# Next: lint pass (in progress)
- [ ] Biome/ultracite triage: 11,147 errors + 4,683 warnings repo-wide
