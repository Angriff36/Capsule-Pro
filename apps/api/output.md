./
├── .next/
│   ├── cache/
│   │   ├── swc/
│   │   │   └── plugins/
│   │   │       └── v7_windows_x86_64_17.0.0/
│   │   └── webpack/
│   │       ├── client-production/
│   │       ├── edge-server-production/
│   │       └── server-production/
│   ├── diagnostics/
│   ├── server/
│   │   ├── app/
│   │   │   ├── ably/
│   │   │   │   └── auth/
│   │   │   ├── api/
│   │   │   │   ├── accounting/
│   │   │   │   │   └── accounts/
│   │   │   │   │       └── [id]/
│   │   │   │   ├── administrative/
│   │   │   │   │   └── chat/
│   │   │   │   │       └── threads/
│   │   │   │   │           └── [threadId]/
│   │   │   │   │               └── messages/
│   │   │   │   ├── ai/
│   │   │   │   │   ├── suggestions/
│   │   │   │   │   └── summaries/
│   │   │   │   │       └── [eventId]/
│   │   │   │   ├── analytics/
│   │   │   │   │   ├── events/
│   │   │   │   │   │   └── profitability/
│   │   │   │   │   ├── finance/
│   │   │   │   │   ├── kitchen/
│   │   │   │   │   └── staff/
│   │   │   │   │       ├── employees/
│   │   │   │   │       │   └── [employeeId]/
│   │   │   │   │       └── summary/
│   │   │   │   ├── collaboration/
│   │   │   │   │   └── auth/
│   │   │   │   ├── command-board/
│   │   │   │   │   ├── [boardId]/
│   │   │   │   │   │   ├── cards/
│   │   │   │   │   │   │   └── [cardId]/
│   │   │   │   │   │   ├── connections/
│   │   │   │   │   │   │   └── [connectionId]/
│   │   │   │   │   │   └── groups/
│   │   │   │   │   │       └── [groupId]/
│   │   │   │   │   │           └── cards/
│   │   │   │   │   └── layouts/
│   │   │   │   │       └── [layoutId]/
│   │   │   │   ├── conflicts/
│   │   │   │   │   └── detect/
│   │   │   │   ├── crm/
│   │   │   │   │   ├── clients/
│   │   │   │   │   │   └── [id]/
│   │   │   │   │   │       ├── contacts/
│   │   │   │   │   │       ├── events/
│   │   │   │   │   │       ├── interactions/
│   │   │   │   │   │       │   └── [interactionId]/
│   │   │   │   │   │       └── preferences/
│   │   │   │   │   ├── proposals/
│   │   │   │   │   │   └── [id]/
│   │   │   │   │   │       ├── pdf/
│   │   │   │   │   │       └── send/
│   │   │   │   │   └── venues/
│   │   │   │   │       └── [id]/
│   │   │   │   │           └── events/
│   │   │   │   ├── events/
│   │   │   │   │   ├── [eventId]/
│   │   │   │   │   │   ├── battle-board/
│   │   │   │   │   │   │   └── pdf/
│   │   │   │   │   │   ├── export/
│   │   │   │   │   │   │   ├── csv/
│   │   │   │   │   │   │   └── pdf/
│   │   │   │   │   │   ├── guests/
│   │   │   │   │   │   └── warnings/
│   │   │   │   │   ├── allergens/
│   │   │   │   │   │   ├── check/
│   │   │   │   │   │   └── warnings/
│   │   │   │   │   │       └── acknowledge/
│   │   │   │   │   ├── battle-boards/
│   │   │   │   │   │   └── [boardId]/
│   │   │   │   │   ├── budgets/
│   │   │   │   │   │   └── [id]/
│   │   │   │   │   │       └── line-items/
│   │   │   │   │   │           └── [lineItemId]/
│   │   │   │   │   ├── contracts/
│   │   │   │   │   │   ├── [id]/
│   │   │   │   │   │   │   ├── document/
│   │   │   │   │   │   │   ├── pdf/
│   │   │   │   │   │   │   ├── send/
│   │   │   │   │   │   │   ├── signature/
│   │   │   │   │   │   │   ├── signatures/
│   │   │   │   │   │   │   └── status/
│   │   │   │   │   │   └── expiring/
│   │   │   │   │   ├── documents/
│   │   │   │   │   │   └── parse/
│   │   │   │   │   ├── export/
│   │   │   │   │   │   └── csv/
│   │   │   │   │   ├── guests/
│   │   │   │   │   │   └── [guestId]/
│   │   │   │   │   ├── import/
│   │   │   │   │   │   └── server-to-server/
│   │   │   │   │   ├── imports/
│   │   │   │   │   │   └── [importId]/
│   │   │   │   │   └── reports/
│   │   │   │   │       └── [reportId]/
│   │   │   │   ├── inventory/
│   │   │   │   │   ├── alerts/
│   │   │   │   │   │   └── subscribe/
│   │   │   │   │   ├── cycle-count/
│   │   │   │   │   │   ├── audit-logs/
│   │   │   │   │   │   ├── records/
│   │   │   │   │   │   │   └── [id]/
│   │   │   │   │   │   └── sessions/
│   │   │   │   │   │       └── [sessionId]/
│   │   │   │   │   │           ├── finalize/
│   │   │   │   │   │           ├── records/
│   │   │   │   │   │           └── variance-reports/
│   │   │   │   │   ├── forecasts/
│   │   │   │   │   │   ├── alerts/
│   │   │   │   │   │   └── batch/
│   │   │   │   │   ├── items/
│   │   │   │   │   │   └── [id]/
│   │   │   │   │   ├── purchase-orders/
│   │   │   │   │   │   └── [id]/
│   │   │   │   │   │       ├── complete/
│   │   │   │   │   │       └── items/
│   │   │   │   │   │           └── [itemId]/
│   │   │   │   │   │               ├── quality/
│   │   │   │   │   │               └── quantity/
│   │   │   │   │   ├── reorder-suggestions/
│   │   │   │   │   └── stock-levels/
│   │   │   │   │       ├── adjust/
│   │   │   │   │       ├── locations/
│   │   │   │   │       └── transactions/
│   │   │   │   ├── kitchen/
│   │   │   │   │   ├── ai/
│   │   │   │   │   │   └── bulk-generate/
│   │   │   │   │   │       └── prep-tasks/
│   │   │   │   │   │           └── save/
│   │   │   │   │   ├── allergens/
│   │   │   │   │   │   ├── detect-conflicts/
│   │   │   │   │   │   ├── update-dish/
│   │   │   │   │   │   └── warnings/
│   │   │   │   │   ├── dishes/
│   │   │   │   │   │   └── commands/
│   │   │   │   │   │       ├── update-lead-time/
│   │   │   │   │   │       └── update-pricing/
│   │   │   │   │   ├── ingredients/
│   │   │   │   │   │   └── commands/
│   │   │   │   │   │       └── update-allergens/
│   │   │   │   │   ├── inventory/
│   │   │   │   │   │   └── commands/
│   │   │   │   │   │       ├── adjust/
│   │   │   │   │   │       ├── consume/
│   │   │   │   │   │       ├── release-reservation/
│   │   │   │   │   │       ├── reserve/
│   │   │   │   │   │       ├── restock/
│   │   │   │   │   │       └── waste/
│   │   │   │   │   ├── manifest/
│   │   │   │   │   │   ├── dishes/
│   │   │   │   │   │   │   └── [dishId]/
│   │   │   │   │   │   │       └── pricing/
│   │   │   │   │   │   ├── prep-lists/
│   │   │   │   │   │   └── recipes/
│   │   │   │   │   │       └── [recipeId]/
│   │   │   │   │   │           ├── activate/
│   │   │   │   │   │           ├── deactivate/
│   │   │   │   │   │           ├── metadata/
│   │   │   │   │   │           ├── restore/
│   │   │   │   │   │           └── versions/
│   │   │   │   │   ├── menus/
│   │   │   │   │   │   └── commands/
│   │   │   │   │   │       ├── activate/
│   │   │   │   │   │       ├── deactivate/
│   │   │   │   │   │       └── update/
│   │   │   │   │   ├── overrides/
│   │   │   │   │   ├── prep-lists/
│   │   │   │   │   │   ├── [id]/
│   │   │   │   │   │   ├── autogenerate/
│   │   │   │   │   │   │   └── process/
│   │   │   │   │   │   ├── commands/
│   │   │   │   │   │   │   ├── activate/
│   │   │   │   │   │   │   ├── cancel/
│   │   │   │   │   │   │   ├── deactivate/
│   │   │   │   │   │   │   ├── finalize/
│   │   │   │   │   │   │   ├── mark-completed/
│   │   │   │   │   │   │   ├── update/
│   │   │   │   │   │   │   └── update-batch-multiplier/
│   │   │   │   │   │   ├── generate/
│   │   │   │   │   │   ├── items/
│   │   │   │   │   │   │   ├── [id]/
│   │   │   │   │   │   │   └── commands/
│   │   │   │   │   │   │       ├── mark-completed/
│   │   │   │   │   │   │       ├── mark-uncompleted/
│   │   │   │   │   │   │       ├── update-prep-notes/
│   │   │   │   │   │   │       ├── update-quantity/
│   │   │   │   │   │   │       └── update-station/
│   │   │   │   │   │   ├── save/
│   │   │   │   │   │   └── save-db/
│   │   │   │   │   ├── prep-tasks/
│   │   │   │   │   │   └── commands/
│   │   │   │   │   │       ├── cancel/
│   │   │   │   │   │       ├── claim/
│   │   │   │   │   │       ├── complete/
│   │   │   │   │   │       ├── reassign/
│   │   │   │   │   │       ├── release/
│   │   │   │   │   │       ├── start/
│   │   │   │   │   │       └── update-quantity/
│   │   │   │   │   ├── recipe-ingredients/
│   │   │   │   │   │   └── commands/
│   │   │   │   │   │       └── update-quantity/
│   │   │   │   │   ├── recipes/
│   │   │   │   │   │   ├── [recipeId]/
│   │   │   │   │   │   │   ├── cost/
│   │   │   │   │   │   │   ├── ingredients/
│   │   │   │   │   │   │   ├── scale/
│   │   │   │   │   │   │   ├── steps/
│   │   │   │   │   │   │   └── update-budgets/
│   │   │   │   │   │   ├── commands/
│   │   │   │   │   │   │   ├── activate/
│   │   │   │   │   │   │   ├── deactivate/
│   │   │   │   │   │   │   └── update/
│   │   │   │   │   │   └── versions/
│   │   │   │   │   │       └── commands/
│   │   │   │   │   │           └── create/
│   │   │   │   │   ├── stations/
│   │   │   │   │   │   └── commands/
│   │   │   │   │   │       ├── activate/
│   │   │   │   │   │       ├── assignTask/
│   │   │   │   │   │       ├── deactivate/
│   │   │   │   │   │       ├── removeTask/
│   │   │   │   │   │       ├── updateCapacity/
│   │   │   │   │   │       └── updateEquipment/
│   │   │   │   │   ├── tasks/
│   │   │   │   │   │   ├── [id]/
│   │   │   │   │   │   │   ├── claim/
│   │   │   │   │   │   │   ├── claim-shadow-manifest/
│   │   │   │   │   │   │   └── release/
│   │   │   │   │   │   ├── available/
│   │   │   │   │   │   ├── my-tasks/
│   │   │   │   │   │   └── sync-claims/
│   │   │   │   │   └── waste/
│   │   │   │   │       ├── entries/
│   │   │   │   │       │   └── [id]/
│   │   │   │   │       ├── reasons/
│   │   │   │   │       ├── reports/
│   │   │   │   │       ├── trends/
│   │   │   │   │       └── units/
│   │   │   │   ├── locations/
│   │   │   │   ├── payroll/
│   │   │   │   │   ├── approvals/
│   │   │   │   │   │   ├── [approvalId]/
│   │   │   │   │   │   └── history/
│   │   │   │   │   ├── deductions/
│   │   │   │   │   ├── export/
│   │   │   │   │   │   └── quickbooks/
│   │   │   │   │   ├── generate/
│   │   │   │   │   ├── periods/
│   │   │   │   │   ├── reports/
│   │   │   │   │   │   └── [periodId]/
│   │   │   │   │   └── runs/
│   │   │   │   │       └── [runId]/
│   │   │   │   ├── sales-reporting/
│   │   │   │   │   └── generate/
│   │   │   │   ├── shipments/
│   │   │   │   │   └── [id]/
│   │   │   │   │       ├── items/
│   │   │   │   │       │   └── [itemId]/
│   │   │   │   │       ├── pdf/
│   │   │   │   │       └── status/
│   │   │   │   ├── staff/
│   │   │   │   │   ├── availability/
│   │   │   │   │   │   ├── [id]/
│   │   │   │   │   │   ├── batch/
│   │   │   │   │   │   └── employees/
│   │   │   │   │   ├── budgets/
│   │   │   │   │   │   ├── [id]/
│   │   │   │   │   │   └── alerts/
│   │   │   │   │   ├── employees/
│   │   │   │   │   ├── schedules/
│   │   │   │   │   ├── shifts/
│   │   │   │   │   │   ├── [shiftId]/
│   │   │   │   │   │   │   └── assignment-suggestions/
│   │   │   │   │   │   ├── available-employees/
│   │   │   │   │   │   ├── bulk-assignment/
│   │   │   │   │   │   └── bulk-assignment-suggestions/
│   │   │   │   │   └── time-off/
│   │   │   │   │       └── requests/
│   │   │   │   │           └── [id]/
│   │   │   │   └── timecards/
│   │   │   │       ├── [id]/
│   │   │   │       └── bulk/
│   │   │   ├── apple-icon.png/
│   │   │   ├── conflicts/
│   │   │   │   └── detect/
│   │   │   ├── cron/
│   │   │   │   └── keep-alive/
│   │   │   ├── health/
│   │   │   ├── icon.png/
│   │   │   ├── opengraph-image.png/
│   │   │   ├── outbox/
│   │   │   │   └── publish/
│   │   │   └── webhooks/
│   │   │       ├── auth/
│   │   │       └── payments/
│   │   ├── chunks/
│   │   └── pages/
│   ├── static/
│   │   ├── RoWyyhFLydUSn6GNVqh4i/
│   │   └── chunks/
│   │       ├── app/
│   │       │   ├── ably/
│   │       │   │   └── auth/
│   │       │   ├── api/
│   │       │   │   ├── accounting/
│   │       │   │   │   └── accounts/
│   │       │   │   │       └── [id]/
│   │       │   │   ├── administrative/
│   │       │   │   │   └── chat/
│   │       │   │   │       └── threads/
│   │       │   │   │           └── [threadId]/
│   │       │   │   │               └── messages/
│   │       │   │   ├── ai/
│   │       │   │   │   ├── suggestions/
│   │       │   │   │   └── summaries/
│   │       │   │   │       └── [eventId]/
│   │       │   │   ├── analytics/
│   │       │   │   │   ├── events/
│   │       │   │   │   │   └── profitability/
│   │       │   │   │   ├── finance/
│   │       │   │   │   ├── kitchen/
│   │       │   │   │   └── staff/
│   │       │   │   │       ├── employees/
│   │       │   │   │       │   └── [employeeId]/
│   │       │   │   │       └── summary/
│   │       │   │   ├── collaboration/
│   │       │   │   │   └── auth/
│   │       │   │   ├── command-board/
│   │       │   │   │   ├── [boardId]/
│   │       │   │   │   │   ├── cards/
│   │       │   │   │   │   │   └── [cardId]/
│   │       │   │   │   │   ├── connections/
│   │       │   │   │   │   │   └── [connectionId]/
│   │       │   │   │   │   └── groups/
│   │       │   │   │   │       └── [groupId]/
│   │       │   │   │   │           └── cards/
│   │       │   │   │   └── layouts/
│   │       │   │   │       └── [layoutId]/
│   │       │   │   ├── conflicts/
│   │       │   │   │   └── detect/
│   │       │   │   ├── crm/
│   │       │   │   │   ├── clients/
│   │       │   │   │   │   └── [id]/
│   │       │   │   │   │       ├── contacts/
│   │       │   │   │   │       ├── events/
│   │       │   │   │   │       ├── interactions/
│   │       │   │   │   │       │   └── [interactionId]/
│   │       │   │   │   │       └── preferences/
│   │       │   │   │   ├── proposals/
│   │       │   │   │   │   └── [id]/
│   │       │   │   │   │       ├── pdf/
│   │       │   │   │   │       └── send/
│   │       │   │   │   └── venues/
│   │       │   │   │       └── [id]/
│   │       │   │   │           └── events/
│   │       │   │   ├── events/
│   │       │   │   │   ├── [eventId]/
│   │       │   │   │   │   ├── battle-board/
│   │       │   │   │   │   │   └── pdf/
│   │       │   │   │   │   ├── export/
│   │       │   │   │   │   │   ├── csv/
│   │       │   │   │   │   │   └── pdf/
│   │       │   │   │   │   ├── guests/
│   │       │   │   │   │   └── warnings/
│   │       │   │   │   ├── allergens/
│   │       │   │   │   │   ├── check/
│   │       │   │   │   │   └── warnings/
│   │       │   │   │   │       └── acknowledge/
│   │       │   │   │   ├── battle-boards/
│   │       │   │   │   │   └── [boardId]/
│   │       │   │   │   ├── budgets/
│   │       │   │   │   │   └── [id]/
│   │       │   │   │   │       └── line-items/
│   │       │   │   │   │           └── [lineItemId]/
│   │       │   │   │   ├── contracts/
│   │       │   │   │   │   ├── [id]/
│   │       │   │   │   │   │   ├── document/
│   │       │   │   │   │   │   ├── pdf/
│   │       │   │   │   │   │   ├── send/
│   │       │   │   │   │   │   ├── signature/
│   │       │   │   │   │   │   ├── signatures/
│   │       │   │   │   │   │   └── status/
│   │       │   │   │   │   └── expiring/
│   │       │   │   │   ├── documents/
│   │       │   │   │   │   └── parse/
│   │       │   │   │   ├── export/
│   │       │   │   │   │   └── csv/
│   │       │   │   │   ├── guests/
│   │       │   │   │   │   └── [guestId]/
│   │       │   │   │   ├── import/
│   │       │   │   │   │   └── server-to-server/
│   │       │   │   │   ├── imports/
│   │       │   │   │   │   └── [importId]/
│   │       │   │   │   └── reports/
│   │       │   │   │       └── [reportId]/
│   │       │   │   ├── inventory/
│   │       │   │   │   ├── alerts/
│   │       │   │   │   │   └── subscribe/
│   │       │   │   │   ├── cycle-count/
│   │       │   │   │   │   ├── audit-logs/
│   │       │   │   │   │   ├── records/
│   │       │   │   │   │   │   └── [id]/
│   │       │   │   │   │   └── sessions/
│   │       │   │   │   │       └── [sessionId]/
│   │       │   │   │   │           ├── finalize/
│   │       │   │   │   │           ├── records/
│   │       │   │   │   │           └── variance-reports/
│   │       │   │   │   ├── forecasts/
│   │       │   │   │   │   ├── alerts/
│   │       │   │   │   │   └── batch/
│   │       │   │   │   ├── items/
│   │       │   │   │   │   └── [id]/
│   │       │   │   │   ├── purchase-orders/
│   │       │   │   │   │   └── [id]/
│   │       │   │   │   │       ├── complete/
│   │       │   │   │   │       └── items/
│   │       │   │   │   │           └── [itemId]/
│   │       │   │   │   │               ├── quality/
│   │       │   │   │   │               └── quantity/
│   │       │   │   │   ├── reorder-suggestions/
│   │       │   │   │   └── stock-levels/
│   │       │   │   │       ├── adjust/
│   │       │   │   │       ├── locations/
│   │       │   │   │       └── transactions/
│   │       │   │   ├── kitchen/
│   │       │   │   │   ├── ai/
│   │       │   │   │   │   └── bulk-generate/
│   │       │   │   │   │       └── prep-tasks/
│   │       │   │   │   │           └── save/
│   │       │   │   │   ├── allergens/
│   │       │   │   │   │   ├── detect-conflicts/
│   │       │   │   │   │   ├── update-dish/
│   │       │   │   │   │   └── warnings/
│   │       │   │   │   ├── dishes/
│   │       │   │   │   │   └── commands/
│   │       │   │   │   │       ├── update-lead-time/
│   │       │   │   │   │       └── update-pricing/
│   │       │   │   │   ├── ingredients/
│   │       │   │   │   │   └── commands/
│   │       │   │   │   │       └── update-allergens/
│   │       │   │   │   ├── inventory/
│   │       │   │   │   │   └── commands/
│   │       │   │   │   │       ├── adjust/
│   │       │   │   │   │       ├── consume/
│   │       │   │   │   │       ├── release-reservation/
│   │       │   │   │   │       ├── reserve/
│   │       │   │   │   │       ├── restock/
│   │       │   │   │   │       └── waste/
│   │       │   │   │   ├── manifest/
│   │       │   │   │   │   ├── dishes/
│   │       │   │   │   │   │   └── [dishId]/
│   │       │   │   │   │   │       └── pricing/
│   │       │   │   │   │   ├── prep-lists/
│   │       │   │   │   │   └── recipes/
│   │       │   │   │   │       └── [recipeId]/
│   │       │   │   │   │           ├── activate/
│   │       │   │   │   │           ├── deactivate/
│   │       │   │   │   │           ├── metadata/
│   │       │   │   │   │           ├── restore/
│   │       │   │   │   │           └── versions/
│   │       │   │   │   ├── menus/
│   │       │   │   │   │   └── commands/
│   │       │   │   │   │       ├── activate/
│   │       │   │   │   │       ├── deactivate/
│   │       │   │   │   │       └── update/
│   │       │   │   │   ├── overrides/
│   │       │   │   │   ├── prep-lists/
│   │       │   │   │   │   ├── [id]/
│   │       │   │   │   │   ├── autogenerate/
│   │       │   │   │   │   │   └── process/
│   │       │   │   │   │   ├── commands/
│   │       │   │   │   │   │   ├── activate/
│   │       │   │   │   │   │   ├── cancel/
│   │       │   │   │   │   │   ├── deactivate/
│   │       │   │   │   │   │   ├── finalize/
│   │       │   │   │   │   │   ├── mark-completed/
│   │       │   │   │   │   │   ├── update/
│   │       │   │   │   │   │   └── update-batch-multiplier/
│   │       │   │   │   │   ├── generate/
│   │       │   │   │   │   ├── items/
│   │       │   │   │   │   │   ├── [id]/
│   │       │   │   │   │   │   └── commands/
│   │       │   │   │   │   │       ├── mark-completed/
│   │       │   │   │   │   │       ├── mark-uncompleted/
│   │       │   │   │   │   │       ├── update-prep-notes/
│   │       │   │   │   │   │       ├── update-quantity/
│   │       │   │   │   │   │       └── update-station/
│   │       │   │   │   │   ├── save/
│   │       │   │   │   │   └── save-db/
│   │       │   │   │   ├── prep-tasks/
│   │       │   │   │   │   └── commands/
│   │       │   │   │   │       ├── cancel/
│   │       │   │   │   │       ├── claim/
│   │       │   │   │   │       ├── complete/
│   │       │   │   │   │       ├── reassign/
│   │       │   │   │   │       ├── release/
│   │       │   │   │   │       ├── start/
│   │       │   │   │   │       └── update-quantity/
│   │       │   │   │   ├── recipe-ingredients/
│   │       │   │   │   │   └── commands/
│   │       │   │   │   │       └── update-quantity/
│   │       │   │   │   ├── recipes/
│   │       │   │   │   │   ├── [recipeId]/
│   │       │   │   │   │   │   ├── cost/
│   │       │   │   │   │   │   ├── ingredients/
│   │       │   │   │   │   │   ├── scale/
│   │       │   │   │   │   │   ├── steps/
│   │       │   │   │   │   │   └── update-budgets/
│   │       │   │   │   │   ├── commands/
│   │       │   │   │   │   │   ├── activate/
│   │       │   │   │   │   │   ├── deactivate/
│   │       │   │   │   │   │   └── update/
│   │       │   │   │   │   └── versions/
│   │       │   │   │   │       └── commands/
│   │       │   │   │   │           └── create/
│   │       │   │   │   ├── stations/
│   │       │   │   │   │   └── commands/
│   │       │   │   │   │       ├── activate/
│   │       │   │   │   │       ├── assignTask/
│   │       │   │   │   │       ├── deactivate/
│   │       │   │   │   │       ├── removeTask/
│   │       │   │   │   │       ├── updateCapacity/
│   │       │   │   │   │       └── updateEquipment/
│   │       │   │   │   ├── tasks/
│   │       │   │   │   │   ├── [id]/
│   │       │   │   │   │   │   ├── claim/
│   │       │   │   │   │   │   ├── claim-shadow-manifest/
│   │       │   │   │   │   │   └── release/
│   │       │   │   │   │   ├── available/
│   │       │   │   │   │   ├── my-tasks/
│   │       │   │   │   │   └── sync-claims/
│   │       │   │   │   └── waste/
│   │       │   │   │       ├── entries/
│   │       │   │   │       │   └── [id]/
│   │       │   │   │       ├── reasons/
│   │       │   │   │       ├── reports/
│   │       │   │   │       ├── trends/
│   │       │   │   │       └── units/
│   │       │   │   ├── locations/
│   │       │   │   ├── payroll/
│   │       │   │   │   ├── approvals/
│   │       │   │   │   │   ├── [approvalId]/
│   │       │   │   │   │   └── history/
│   │       │   │   │   ├── deductions/
│   │       │   │   │   ├── export/
│   │       │   │   │   │   └── quickbooks/
│   │       │   │   │   ├── generate/
│   │       │   │   │   ├── periods/
│   │       │   │   │   ├── reports/
│   │       │   │   │   │   └── [periodId]/
│   │       │   │   │   └── runs/
│   │       │   │   │       └── [runId]/
│   │       │   │   ├── sales-reporting/
│   │       │   │   │   └── generate/
│   │       │   │   ├── shipments/
│   │       │   │   │   └── [id]/
│   │       │   │   │       ├── items/
│   │       │   │   │       │   └── [itemId]/
│   │       │   │   │       ├── pdf/
│   │       │   │   │       └── status/
│   │       │   │   ├── staff/
│   │       │   │   │   ├── availability/
│   │       │   │   │   │   ├── [id]/
│   │       │   │   │   │   ├── batch/
│   │       │   │   │   │   └── employees/
│   │       │   │   │   ├── budgets/
│   │       │   │   │   │   ├── [id]/
│   │       │   │   │   │   └── alerts/
│   │       │   │   │   ├── employees/
│   │       │   │   │   ├── schedules/
│   │       │   │   │   ├── shifts/
│   │       │   │   │   │   ├── [shiftId]/
│   │       │   │   │   │   │   └── assignment-suggestions/
│   │       │   │   │   │   ├── available-employees/
│   │       │   │   │   │   ├── bulk-assignment/
│   │       │   │   │   │   └── bulk-assignment-suggestions/
│   │       │   │   │   └── time-off/
│   │       │   │   │       └── requests/
│   │       │   │   │           └── [id]/
│   │       │   │   └── timecards/
│   │       │   │       ├── [id]/
│   │       │   │       └── bulk/
│   │       │   ├── conflicts/
│   │       │   │   └── detect/
│   │       │   ├── cron/
│   │       │   │   └── keep-alive/
│   │       │   ├── health/
│   │       │   ├── outbox/
│   │       │   │   └── publish/
│   │       │   └── webhooks/
│   │       │       ├── auth/
│   │       │       └── payments/
│   │       └── pages/
│   └── types/
│       └── app/
│           ├── ably/
│           │   └── auth/
│           ├── api/
│           │   ├── accounting/
│           │   │   └── accounts/
│           │   │       └── [id]/
│           │   ├── administrative/
│           │   │   └── chat/
│           │   │       └── threads/
│           │   │           └── [threadId]/
│           │   │               └── messages/
│           │   ├── ai/
│           │   │   ├── suggestions/
│           │   │   └── summaries/
│           │   │       └── [eventId]/
│           │   ├── analytics/
│           │   │   ├── events/
│           │   │   │   └── profitability/
│           │   │   ├── finance/
│           │   │   ├── kitchen/
│           │   │   └── staff/
│           │   │       ├── employees/
│           │   │       │   └── [employeeId]/
│           │   │       └── summary/
│           │   ├── collaboration/
│           │   │   └── auth/
│           │   ├── command-board/
│           │   │   ├── [boardId]/
│           │   │   │   ├── cards/
│           │   │   │   │   └── [cardId]/
│           │   │   │   ├── connections/
│           │   │   │   │   └── [connectionId]/
│           │   │   │   └── groups/
│           │   │   │       └── [groupId]/
│           │   │   │           └── cards/
│           │   │   └── layouts/
│           │   │       └── [layoutId]/
│           │   ├── conflicts/
│           │   │   └── detect/
│           │   ├── crm/
│           │   │   ├── clients/
│           │   │   │   └── [id]/
│           │   │   │       ├── contacts/
│           │   │   │       ├── events/
│           │   │   │       ├── interactions/
│           │   │   │       │   └── [interactionId]/
│           │   │   │       └── preferences/
│           │   │   ├── proposals/
│           │   │   │   └── [id]/
│           │   │   │       ├── pdf/
│           │   │   │       └── send/
│           │   │   └── venues/
│           │   │       └── [id]/
│           │   │           └── events/
│           │   ├── events/
│           │   │   ├── [eventId]/
│           │   │   │   ├── battle-board/
│           │   │   │   │   └── pdf/
│           │   │   │   ├── export/
│           │   │   │   │   ├── csv/
│           │   │   │   │   └── pdf/
│           │   │   │   ├── guests/
│           │   │   │   └── warnings/
│           │   │   ├── allergens/
│           │   │   │   ├── check/
│           │   │   │   └── warnings/
│           │   │   │       └── acknowledge/
│           │   │   ├── battle-boards/
│           │   │   │   └── [boardId]/
│           │   │   ├── budgets/
│           │   │   │   └── [id]/
│           │   │   │       └── line-items/
│           │   │   │           └── [lineItemId]/
│           │   │   ├── contracts/
│           │   │   │   ├── [id]/
│           │   │   │   │   ├── document/
│           │   │   │   │   ├── pdf/
│           │   │   │   │   ├── send/
│           │   │   │   │   ├── signature/
│           │   │   │   │   ├── signatures/
│           │   │   │   │   └── status/
│           │   │   │   └── expiring/
│           │   │   ├── documents/
│           │   │   │   └── parse/
│           │   │   ├── export/
│           │   │   │   └── csv/
│           │   │   ├── guests/
│           │   │   │   └── [guestId]/
│           │   │   ├── import/
│           │   │   │   └── server-to-server/
│           │   │   ├── imports/
│           │   │   │   └── [importId]/
│           │   │   └── reports/
│           │   │       └── [reportId]/
│           │   ├── inventory/
│           │   │   ├── alerts/
│           │   │   │   └── subscribe/
│           │   │   ├── cycle-count/
│           │   │   │   ├── audit-logs/
│           │   │   │   ├── records/
│           │   │   │   │   └── [id]/
│           │   │   │   └── sessions/
│           │   │   │       └── [sessionId]/
│           │   │   │           ├── finalize/
│           │   │   │           ├── records/
│           │   │   │           └── variance-reports/
│           │   │   ├── forecasts/
│           │   │   │   ├── alerts/
│           │   │   │   └── batch/
│           │   │   ├── items/
│           │   │   │   └── [id]/
│           │   │   ├── purchase-orders/
│           │   │   │   └── [id]/
│           │   │   │       ├── complete/
│           │   │   │       └── items/
│           │   │   │           └── [itemId]/
│           │   │   │               ├── quality/
│           │   │   │               └── quantity/
│           │   │   ├── reorder-suggestions/
│           │   │   └── stock-levels/
│           │   │       ├── adjust/
│           │   │       ├── locations/
│           │   │       └── transactions/
│           │   ├── kitchen/
│           │   │   ├── ai/
│           │   │   │   └── bulk-generate/
│           │   │   │       └── prep-tasks/
│           │   │   │           └── save/
│           │   │   ├── allergens/
│           │   │   │   ├── detect-conflicts/
│           │   │   │   ├── update-dish/
│           │   │   │   └── warnings/
│           │   │   ├── dishes/
│           │   │   │   └── commands/
│           │   │   │       ├── update-lead-time/
│           │   │   │       └── update-pricing/
│           │   │   ├── ingredients/
│           │   │   │   └── commands/
│           │   │   │       └── update-allergens/
│           │   │   ├── inventory/
│           │   │   │   └── commands/
│           │   │   │       ├── adjust/
│           │   │   │       ├── consume/
│           │   │   │       ├── release-reservation/
│           │   │   │       ├── reserve/
│           │   │   │       ├── restock/
│           │   │   │       └── waste/
│           │   │   ├── manifest/
│           │   │   │   ├── dishes/
│           │   │   │   │   └── [dishId]/
│           │   │   │   │       └── pricing/
│           │   │   │   ├── prep-lists/
│           │   │   │   └── recipes/
│           │   │   │       └── [recipeId]/
│           │   │   │           ├── activate/
│           │   │   │           ├── deactivate/
│           │   │   │           ├── metadata/
│           │   │   │           ├── restore/
│           │   │   │           └── versions/
│           │   │   ├── menus/
│           │   │   │   └── commands/
│           │   │   │       ├── activate/
│           │   │   │       ├── deactivate/
│           │   │   │       └── update/
│           │   │   ├── overrides/
│           │   │   ├── prep-lists/
│           │   │   │   ├── [id]/
│           │   │   │   ├── autogenerate/
│           │   │   │   │   └── process/
│           │   │   │   ├── commands/
│           │   │   │   │   ├── activate/
│           │   │   │   │   ├── cancel/
│           │   │   │   │   ├── deactivate/
│           │   │   │   │   ├── finalize/
│           │   │   │   │   ├── mark-completed/
│           │   │   │   │   ├── update/
│           │   │   │   │   └── update-batch-multiplier/
│           │   │   │   ├── generate/
│           │   │   │   ├── items/
│           │   │   │   │   ├── [id]/
│           │   │   │   │   └── commands/
│           │   │   │   │       ├── mark-completed/
│           │   │   │   │       ├── mark-uncompleted/
│           │   │   │   │       ├── update-prep-notes/
│           │   │   │   │       ├── update-quantity/
│           │   │   │   │       └── update-station/
│           │   │   │   ├── save/
│           │   │   │   └── save-db/
│           │   │   ├── prep-tasks/
│           │   │   │   └── commands/
│           │   │   │       ├── cancel/
│           │   │   │       ├── claim/
│           │   │   │       ├── complete/
│           │   │   │       ├── reassign/
│           │   │   │       ├── release/
│           │   │   │       ├── start/
│           │   │   │       └── update-quantity/
│           │   │   ├── recipe-ingredients/
│           │   │   │   └── commands/
│           │   │   │       └── update-quantity/
│           │   │   ├── recipes/
│           │   │   │   ├── [recipeId]/
│           │   │   │   │   ├── cost/
│           │   │   │   │   ├── ingredients/
│           │   │   │   │   ├── scale/
│           │   │   │   │   ├── steps/
│           │   │   │   │   └── update-budgets/
│           │   │   │   ├── commands/
│           │   │   │   │   ├── activate/
│           │   │   │   │   ├── deactivate/
│           │   │   │   │   └── update/
│           │   │   │   └── versions/
│           │   │   │       └── commands/
│           │   │   │           └── create/
│           │   │   ├── stations/
│           │   │   │   └── commands/
│           │   │   │       ├── activate/
│           │   │   │       ├── assignTask/
│           │   │   │       ├── deactivate/
│           │   │   │       ├── removeTask/
│           │   │   │       ├── updateCapacity/
│           │   │   │       └── updateEquipment/
│           │   │   ├── tasks/
│           │   │   │   ├── [id]/
│           │   │   │   │   ├── claim/
│           │   │   │   │   ├── claim-shadow-manifest/
│           │   │   │   │   └── release/
│           │   │   │   ├── available/
│           │   │   │   ├── my-tasks/
│           │   │   │   └── sync-claims/
│           │   │   └── waste/
│           │   │       ├── entries/
│           │   │       │   └── [id]/
│           │   │       ├── reasons/
│           │   │       ├── reports/
│           │   │       ├── trends/
│           │   │       └── units/
│           │   ├── locations/
│           │   ├── payroll/
│           │   │   ├── approvals/
│           │   │   │   ├── [approvalId]/
│           │   │   │   └── history/
│           │   │   ├── deductions/
│           │   │   ├── export/
│           │   │   │   └── quickbooks/
│           │   │   ├── generate/
│           │   │   ├── periods/
│           │   │   ├── reports/
│           │   │   │   └── [periodId]/
│           │   │   └── runs/
│           │   │       └── [runId]/
│           │   ├── sales-reporting/
│           │   │   └── generate/
│           │   ├── shipments/
│           │   │   └── [id]/
│           │   │       ├── items/
│           │   │       │   └── [itemId]/
│           │   │       ├── pdf/
│           │   │       └── status/
│           │   ├── staff/
│           │   │   ├── availability/
│           │   │   │   ├── [id]/
│           │   │   │   ├── batch/
│           │   │   │   └── employees/
│           │   │   ├── budgets/
│           │   │   │   ├── [id]/
│           │   │   │   └── alerts/
│           │   │   ├── employees/
│           │   │   ├── schedules/
│           │   │   ├── shifts/
│           │   │   │   ├── [shiftId]/
│           │   │   │   │   └── assignment-suggestions/
│           │   │   │   ├── available-employees/
│           │   │   │   ├── bulk-assignment/
│           │   │   │   └── bulk-assignment-suggestions/
│           │   │   └── time-off/
│           │   │       └── requests/
│           │   │           └── [id]/
│           │   └── timecards/
│           │       ├── [id]/
│           │       └── bulk/
│           ├── conflicts/
│           │   └── detect/
│           ├── cron/
│           │   └── keep-alive/
│           ├── health/
│           ├── outbox/
│           │   └── publish/
│           └── webhooks/
│               ├── auth/
│               └── payments/
├── .next-dev/
│   ├── cache/
│   │   ├── swc/
│   │   │   └── plugins/
│   │   │       └── v7_windows_x86_64_17.0.0/
│   │   └── webpack/
│   │       ├── client-development/
│   │       ├── edge-server-development/
│   │       └── server-development/
│   ├── server/
│   │   ├── app/
│   │   │   └── api/
│   │   │       └── collaboration/
│   │   │           └── auth/
│   │   ├── static/
│   │   │   └── webpack/
│   │   └── vendor-chunks/
│   ├── static/
│   │   ├── chunks/
│   │   │   └── app/
│   │   │       └── api/
│   │   │           └── collaboration/
│   │   │               └── auth/
│   │   ├── development/
│   │   └── webpack/
│   └── types/
├── .turbo/
├── __tests__/
│   ├── api/
│   │   └── ably/
│   ├── command-board/
│   ├── kitchen/
│   │   ├── __snapshots__/
│   │   ├── __tsc__/
│   │   └── recipes/
│   ├── outbox/
│   ├── realtime/
│   ├── sales-reporting/
│   └── staff/
├── app/
│   ├── ably/
│   │   └── auth/
│   ├── api/
│   │   ├── accounting/
│   │   │   └── accounts/
│   │   │       └── [id]/
│   │   ├── administrative/
│   │   │   └── chat/
│   │   │       └── threads/
│   │   │           └── [threadId]/
│   │   │               └── messages/
│   │   ├── ai/
│   │   │   ├── suggestions/
│   │   │   └── summaries/
│   │   │       └── [eventId]/
│   │   ├── analytics/
│   │   │   ├── events/
│   │   │   │   └── profitability/
│   │   │   ├── finance/
│   │   │   ├── kitchen/
│   │   │   └── staff/
│   │   │       ├── employees/
│   │   │       │   └── [employeeId]/
│   │   │       └── summary/
│   │   ├── collaboration/
│   │   │   └── auth/
│   │   ├── command-board/
│   │   │   ├── [boardId]/
│   │   │   │   ├── cards/
│   │   │   │   │   └── [cardId]/
│   │   │   │   ├── connections/
│   │   │   │   │   └── [connectionId]/
│   │   │   │   └── groups/
│   │   │   │       └── [groupId]/
│   │   │   │           └── cards/
│   │   │   └── layouts/
│   │   │       └── [layoutId]/
│   │   ├── conflicts/
│   │   │   └── detect/
│   │   ├── crm/
│   │   │   ├── clients/
│   │   │   │   └── [id]/
│   │   │   │       ├── contacts/
│   │   │   │       ├── events/
│   │   │   │       ├── interactions/
│   │   │   │       │   └── [interactionId]/
│   │   │   │       └── preferences/
│   │   │   ├── proposals/
│   │   │   │   └── [id]/
│   │   │   │       ├── pdf/
│   │   │   │       └── send/
│   │   │   └── venues/
│   │   │       └── [id]/
│   │   │           └── events/
│   │   ├── events/
│   │   │   ├── [eventId]/
│   │   │   │   ├── battle-board/
│   │   │   │   │   └── pdf/
│   │   │   │   ├── export/
│   │   │   │   │   ├── csv/
│   │   │   │   │   └── pdf/
│   │   │   │   ├── guests/
│   │   │   │   └── warnings/
│   │   │   ├── allergens/
│   │   │   │   ├── check/
│   │   │   │   └── warnings/
│   │   │   │       └── acknowledge/
│   │   │   ├── battle-boards/
│   │   │   │   └── [boardId]/
│   │   │   ├── budgets/
│   │   │   │   └── [id]/
│   │   │   │       └── line-items/
│   │   │   │           └── [lineItemId]/
│   │   │   ├── contracts/
│   │   │   │   ├── [id]/
│   │   │   │   │   ├── document/
│   │   │   │   │   ├── pdf/
│   │   │   │   │   ├── send/
│   │   │   │   │   ├── signature/
│   │   │   │   │   ├── signatures/
│   │   │   │   │   └── status/
│   │   │   │   └── expiring/
│   │   │   ├── documents/
│   │   │   │   └── parse/
│   │   │   ├── export/
│   │   │   │   └── csv/
│   │   │   ├── guests/
│   │   │   │   └── [guestId]/
│   │   │   ├── import/
│   │   │   │   └── server-to-server/
│   │   │   ├── imports/
│   │   │   │   └── [importId]/
│   │   │   └── reports/
│   │   │       └── [reportId]/
│   │   ├── inventory/
│   │   │   ├── alerts/
│   │   │   │   └── subscribe/
│   │   │   ├── cycle-count/
│   │   │   │   ├── audit-logs/
│   │   │   │   ├── records/
│   │   │   │   │   └── [id]/
│   │   │   │   └── sessions/
│   │   │   │       └── [sessionId]/
│   │   │   │           ├── finalize/
│   │   │   │           ├── records/
│   │   │   │           └── variance-reports/
│   │   │   ├── forecasts/
│   │   │   │   ├── alerts/
│   │   │   │   └── batch/
│   │   │   ├── items/
│   │   │   │   └── [id]/
│   │   │   ├── purchase-orders/
│   │   │   │   └── [id]/
│   │   │   │       ├── complete/
│   │   │   │       └── items/
│   │   │   │           └── [itemId]/
│   │   │   │               ├── quality/
│   │   │   │               └── quantity/
│   │   │   ├── reorder-suggestions/
│   │   │   └── stock-levels/
│   │   │       ├── adjust/
│   │   │       ├── locations/
│   │   │       └── transactions/
│   │   ├── kitchen/
│   │   │   ├── ai/
│   │   │   │   └── bulk-generate/
│   │   │   │       └── prep-tasks/
│   │   │   │           └── save/
│   │   │   ├── allergens/
│   │   │   │   ├── detect-conflicts/
│   │   │   │   ├── update-dish/
│   │   │   │   └── warnings/
│   │   │   ├── dishes/
│   │   │   │   └── commands/
│   │   │   │       ├── update-lead-time/
│   │   │   │       └── update-pricing/
│   │   │   ├── ingredients/
│   │   │   │   └── commands/
│   │   │   │       └── update-allergens/
│   │   │   ├── inventory/
│   │   │   │   └── commands/
│   │   │   │       ├── adjust/
│   │   │   │       ├── consume/
│   │   │   │       ├── release-reservation/
│   │   │   │       ├── reserve/
│   │   │   │       ├── restock/
│   │   │   │       └── waste/
│   │   │   ├── manifest/
│   │   │   │   ├── dishes/
│   │   │   │   │   └── [dishId]/
│   │   │   │   │       └── pricing/
│   │   │   │   ├── prep-lists/
│   │   │   │   └── recipes/
│   │   │   │       └── [recipeId]/
│   │   │   │           ├── activate/
│   │   │   │           ├── deactivate/
│   │   │   │           ├── metadata/
│   │   │   │           ├── restore/
│   │   │   │           └── versions/
│   │   │   ├── menus/
│   │   │   │   └── commands/
│   │   │   │       ├── activate/
│   │   │   │       ├── deactivate/
│   │   │   │       └── update/
│   │   │   ├── overrides/
│   │   │   ├── prep-lists/
│   │   │   │   ├── [id]/
│   │   │   │   ├── autogenerate/
│   │   │   │   │   └── process/
│   │   │   │   ├── commands/
│   │   │   │   │   ├── activate/
│   │   │   │   │   ├── cancel/
│   │   │   │   │   ├── deactivate/
│   │   │   │   │   ├── finalize/
│   │   │   │   │   ├── mark-completed/
│   │   │   │   │   ├── update/
│   │   │   │   │   └── update-batch-multiplier/
│   │   │   │   ├── generate/
│   │   │   │   ├── items/
│   │   │   │   │   ├── [id]/
│   │   │   │   │   └── commands/
│   │   │   │   │       ├── mark-completed/
│   │   │   │   │       ├── mark-uncompleted/
│   │   │   │   │       ├── update-prep-notes/
│   │   │   │   │       ├── update-quantity/
│   │   │   │   │       └── update-station/
│   │   │   │   ├── save/
│   │   │   │   └── save-db/
│   │   │   ├── prep-tasks/
│   │   │   │   └── commands/
│   │   │   │       ├── cancel/
│   │   │   │       ├── claim/
│   │   │   │       ├── complete/
│   │   │   │       ├── reassign/
│   │   │   │       ├── release/
│   │   │   │       ├── start/
│   │   │   │       └── update-quantity/
│   │   │   ├── recipe-ingredients/
│   │   │   │   └── commands/
│   │   │   │       └── update-quantity/
│   │   │   ├── recipes/
│   │   │   │   ├── [recipeId]/
│   │   │   │   │   ├── cost/
│   │   │   │   │   ├── ingredients/
│   │   │   │   │   ├── scale/
│   │   │   │   │   ├── steps/
│   │   │   │   │   └── update-budgets/
│   │   │   │   ├── commands/
│   │   │   │   │   ├── activate/
│   │   │   │   │   ├── deactivate/
│   │   │   │   │   └── update/
│   │   │   │   └── versions/
│   │   │   │       └── commands/
│   │   │   │           └── create/
│   │   │   ├── stations/
│   │   │   │   └── commands/
│   │   │   │       ├── activate/
│   │   │   │       ├── assignTask/
│   │   │   │       ├── deactivate/
│   │   │   │       ├── removeTask/
│   │   │   │       ├── updateCapacity/
│   │   │   │       └── updateEquipment/
│   │   │   ├── tasks/
│   │   │   │   ├── [id]/
│   │   │   │   │   ├── claim/
│   │   │   │   │   ├── claim-shadow-manifest/
│   │   │   │   │   └── release/
│   │   │   │   ├── available/
│   │   │   │   ├── my-tasks/
│   │   │   │   └── sync-claims/
│   │   │   └── waste/
│   │   │       ├── entries/
│   │   │       │   └── [id]/
│   │   │       ├── reasons/
│   │   │       ├── reports/
│   │   │       ├── trends/
│   │   │       └── units/
│   │   ├── locations/
│   │   ├── payroll/
│   │   │   ├── approvals/
│   │   │   │   ├── [approvalId]/
│   │   │   │   └── history/
│   │   │   ├── deductions/
│   │   │   ├── export/
│   │   │   │   └── quickbooks/
│   │   │   ├── generate/
│   │   │   ├── periods/
│   │   │   ├── reports/
│   │   │   │   └── [periodId]/
│   │   │   └── runs/
│   │   │       └── [runId]/
│   │   ├── sales-reporting/
│   │   │   └── generate/
│   │   ├── shipments/
│   │   │   └── [id]/
│   │   │       ├── items/
│   │   │       │   └── [itemId]/
│   │   │       ├── pdf/
│   │   │       └── status/
│   │   ├── staff/
│   │   │   ├── availability/
│   │   │   │   ├── [id]/
│   │   │   │   ├── batch/
│   │   │   │   └── employees/
│   │   │   ├── budgets/
│   │   │   │   ├── [id]/
│   │   │   │   └── alerts/
│   │   │   ├── employees/
│   │   │   ├── schedules/
│   │   │   ├── shifts/
│   │   │   │   ├── [shiftId]/
│   │   │   │   │   └── assignment-suggestions/
│   │   │   │   ├── available-employees/
│   │   │   │   ├── bulk-assignment/
│   │   │   │   └── bulk-assignment-suggestions/
│   │   │   └── time-off/
│   │   │       └── requests/
│   │   │           └── [id]/
│   │   └── timecards/
│   │       ├── [id]/
│   │       └── bulk/
│   ├── conflicts/
│   │   └── detect/
│   ├── cron/
│   │   └── keep-alive/
│   ├── health/
│   ├── lib/
│   ├── outbox/
│   │   └── publish/
│   └── webhooks/
│       ├── auth/
│       └── payments/
├── lib/
│   ├── manifest/
│   └── staff/
├── scripts/
├── test/
│   └── mocks/
│       └── @repo/
│           └── generated/
└── test-scripts/
