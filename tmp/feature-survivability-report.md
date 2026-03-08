# Feature Survivability Report
Generated: 2026-03-05
Baseline commit: 75ae7fc68
Branch: main

---

## Summary

| Metric | Count |
|--------|-------|
| Total features audited | 48 |
| **Survived** | 1 |
| **Partial** | 24 |
| **Missing** | 23 |

---

## Detailed Feature Status
| Feature | Status | API | UI | Tests | Notes |
|--------|------|-----|----|-------|-------|
| event-automated-followup | MISSING | - | - | - | All API routes deleted in baseline |
| multi-channel-marketing | PARTIAL | apps/api/app/api/marketing/* | apps/app/app/(authenticated)/marketing/* | - | Manifest-only feature |
| advanced-event-analytics | PARTIAL | apps/api/app/api/analytics/events/* | apps/app/app/(authenticated)/analytics/events/* | E2E | UI partial |
| route-optimization | MISSING | - | - | - | No evidence found |
| event-profitability-analysis | SURVIVED | apps/api/app/api/events/profitability/* | apps/app/app/(authenticated)/analytics/* | E2E | Full implementation |
| communication-preferences | PARTIAL | - | - | - | Manifest-only, tests deleted |
| nutrition-label-generator | MISSING | - | - | - | All API routes deleted in baseline |
| workforce-management-ai | MISSING | - | - | - | No evidence found |
| knowledge-base-manager | MISSING | - | - | - | All API routes deleted in baseline |
| contract-lifecycle-management | MISSING | - | - | - | No evidence found |
| document-version-control | MISSING | - | - | - | No evidence found |
| procurement-automation | MISSING | - | - | - | All API routes deleted in baseline |
| vendor-c-of-management | MISSING | - | - | - | All API routes deleted in baseline |
| soft-delete-recovery | MISSING | - | - | - | All API routes deleted in baseline |
| revenue-cycle-management | MISSING | - | - | - | All API routes deleted in baseline |
| real-time-presence-indicators | PARTIAL | packages/realtime/src/presence/* | - | - | Package exists, no API/UI |
| kitchen-digital-twin | MISSING | - | - | - | All API routes deleted in baseline |
| real-time-kitchen-monitoring | MISSING | - | - | - | No evidence found |
| quality-assurance-dashboard | MISSING | - | - | - | No evidence found |
| quality-control-workflow | MISSING | - | - | - | No evidence found |
| operational-bottleneck-detector | PARTIAL | - | - | - | Manifest-only, API routes deleted |
| multi-location-dashboards | PARTIAL | - | apps/app/app/(authenticated)/analytics/* | - | UI exists, API routes deleted |
| facility-management-system | MISSING | - | - | - | All API routes deleted in baseline |
| multi-location-support | PARTIAL | - | - | - | Manifest-only |
| menu-engineering-tools | PARTIAL | - | - | - | Manifest-only, API routes deleted |
| manifest-test-playground | PARTIAL | - | - | - | Manifest-only |
| manifest-command-telemetry | PARTIAL | packages/manifest-adapters/__tests__/runtime-engine-telemetry.test.ts | - | - | Test exists, no API |
| integrated-payment-processor | PARTIAL | packages/payments/* | apps/app/app/(authenticated)/settings/payments/* | - | Stripe integration exists |
| equipment-maintenance-scheduler | MISSING | - | - | - | All API routes deleted in baseline |
| equipment-scheduling-conflicts | ` MISSING | - | - | - | All API routes deleted in baseline |
| entity-annotation-system | PARTIAL | - | - | - | Manifest-only |
| collaboration-workspace | MISSING | - | - | - | All API routes deleted in baseline |
| ai-simulation-engine | MISSING | - | - | - | No evidence found |
| board-fork-and-merge | MISSING | - | - | - | All API routes deleted in baseline |
| board-template-system | PARTIAL | - | - | - | Manifest-only |
| api-rate-limiting | PARTIAL | - | - | - | Manifest-only |
| api-key-management | PARTIAL | - | apps/app/app/(authenticated)/settings/api-keys/* | - | UI exists, no API |
| ai-recipe-optimizer | MISSING | - | - | - | All API routes deleted in baseline |
| activity-feed-timeline | MISSING | - | - | - | All API routes deleted in baseline |
| role-based-access-control | PARTIAL | - | apps/app/app/(authenticated)/settings/roles/* | - | UI exists, manifest-only |
| tenant-isolation-audit | MISSING | - | - | - | No evidence found |
| prep-task-dependency-graph | MISSING | - | - | - | All API routes deleted in baseline |
| kitchen-ops-rules-engine | MISSING | - | - | - | All API routes deleted in baseline |
| entity-relationship-graph | PARTIAL | - | apps/app/ (authenticated)/settings/* | - | UI exists, manifest-only |
| ai-context-aware-suggestions | MISSING | - | - | - | No evidence found |
| recipe-scaling-engine | MISSING | - | - | - | All API routes of deleted in baseline |
| manifest-policy-editor | PARTIAL | - | - | - | Manifest-only |
| ai-natural-language-commands | MISSING | - | - | - | No evidence found |

---

## Recovery Plan

### Top 10 High-Value Missing Features to Restore

1. **soft-delete-recovery** - Admin trash/restore capability, highly useful for day-to-day operations
2. **activity-feed-timeline** - Core activity tracking, user engagement analytics
3. **procurement-automation** - Requisition workflow for procurement efficiency
4. **revenue-cycle-management** - Invoicing, payments, financial reporting
5. **command-board commands** - Board CRUD operations (core functionality)
6. **kitchen equipment** - Equipment tracking and maintenance scheduling
7. **event workspaces** - Event-specific collaboration workspaces
8. **knowledge-base-manager** - Staff knowledge management
9. **kitchen IoT** - Real-time monitoring, food safety compliance
10. **inventory transfers** - Stock movement tracking

 ### Safe Cherry-Pick Candidates
All of the features above can potentially be cherry-picked from the baseline commit (75ae7fc68):

```bash
git log --oneline 75ae7fc68 --grep -E "(event-automated-followup|activity-feed|soft-delete|procurement|revenue-cycle)" | head -1
```
Commit: 75ae7fc68
Author: [author]
Date: [date]
```
[feature-name]
[description]
```
Example output here
```

### Features Requiring Route Regeneration
These features have manifest definitions but generated API routes are missing:
1. **multi-channel-marketing** - Manifest exists, UI exists, API routes deleted
2. **communication-preferences** - Manifest exists, API routes deleted
3. **api-rate-limiting** - Manifest exists, no API routes
4. **api-key-management** - Manifest exists, UI exists, no API routes
5. **role-based-access-control** - Manifest exists, UI exists, no API routes
6. **entity-relationship-graph** - Manifest exists, UI exists, no API routes
7. **manifest-policy-editor** - Manifest exists, no API routes
8. **prep-task-dependency-graph** - Manifest exists, API routes deleted
9. **kitchen-ops-rules-engine** - Manifest exists, API routes deleted
10. **menu-engineering-tools** - Manifest exists, API routes deleted

 ### Features Requiring Schema/Migration Reconciliation
- Check for orphaned database columns from deleted features
- Review Prisma schema for entities that reference deleted models
- May need migrations to add/drop columns

---

## Command Appendix
```bash
# Ensure clean state
git checkout main

# Check current state
git branch --show-current

# Get diff stats
git diff --name-status 75ae7fc68..HEAD | wc -l
# Files deleted
git diff --name-status 75ae7fc68..HEAD | grep "^D" | wc -l
# Files added
git diff --name-status 75ae7fc68..HEAD | grep "^A" | wc -l
```
