# Convoy Feature Specifications

This directory contains behavioral specifications for Convoy features. These specs define **what exists when done**, **what must be true**, and **what must never happen** - without implementation details, library choices, or architecture speculation.

## Specification Format

Each spec follows this structure:

- **Outcome**: What exists when the feature is complete
- **In Scope**: Key behaviors the feature provides
- **Out of Scope**: Explicit non-goals
- **Invariants / Must Never Happen**: Safety and correctness rules
- **Acceptance Checks**: How to verify the feature works

## Feature Specifications

### AI Features
- [`ai-conflict-detection.md`](ai-conflict-detection.md) → `.automaker/features/ai-conflict-detection`
- [`ai-bulk-task-generation.md`](ai-bulk-task-generation.md) → `.automaker/features/ai-bulk-task-generation`
- [`ai-event-summaries.md`](ai-event-summaries.md) → `.automaker/features/ai-event-summaries`
- [`ai-suggested-next-actions.md`](ai-suggested-next-actions.md) → `.automaker/features/ai-suggested-next-actions`

### Analytics Features
- [`analytics-client-lifetime-value.md`](analytics-client-lifetime-value.md) → `.automaker/features/analytics-client-lifetime-value`
- [`analytics-employee-performance.md`](analytics-employee-performance.md) → `.automaker/features/analytics-employee-performance`
- [`analytics-profitability-dashboard.md`](analytics-profitability-dashboard.md) → `.automaker/features/analytics-profitability-dashboard`

### Command Board Features
- [`strategic-command-board-foundation.md`](strategic-command-board-foundation.md) → `.automaker/features/strategic-command-board-foundation`
- [`command-board-entity-cards.md`](command-board-entity-cards.md) → `.automaker/features/command-board-entity-cards`
- [`command-board-persistence.md`](command-board-persistence.md) → `.automaker/features/command-board-persistence`
- [`command-board-realtime-sync.md`](command-board-realtime-sync.md) → `.automaker/features/command-board-realtime-sync`
- [`command-board-relationship-lines.md`](command-board-relationship-lines.md) → `.automaker/features/command-board-relationship-lines`
- [`bulk-edit-operations.md`](bulk-edit-operations.md) → `.automaker/features/bulk-edit-operations`
- [`bulk-grouping-operations.md`](bulk-grouping-operations.md) → `.automaker/features/bulk-grouping-operations`

### Communication Features
- [`email-template-system.md`](email-template-system.md) → `.automaker/features/email-template-system`
- [`automated-email-workflows.md`](automated-email-workflows.md) → `.automaker/features/automated-email-workflows`
- [`sms-notification-system.md`](sms-notification-system.md) → `.automaker/features/sms-notification-system`

### CRM Features
- [`crm-client-detail-view.md`](crm-client-detail-view.md) → `.automaker/features/crm-client-detail-view`
- [`crm-client-communication-log.md`](crm-client-communication-log.md) → `.automaker/features/crm-client-communication-log`
- [`crm-client-segmentation.md`](crm-client-segmentation.md) → `.automaker/features/crm-client-segmentation`
- [`crm-venue-management.md`](crm-venue-management.md) → `.automaker/features/crm-venue-management`

### Event Features
- [`event-budget-tracking.md`](event-budget-tracking.md) → `.automaker/features/event-budget-tracking`
- [`event-contract-management.md`](event-contract-management.md) → `.automaker/features/event-contract-management`
- [`event-proposal-generation.md`](event-proposal-generation.md) → `.automaker/features/event-proposal-generation`
- [`event-timeline-builder.md`](event-timeline-builder.md) → `.automaker/features/event-timeline-builder`
- [`battle-board-pdf-export.md`](battle-board-pdf-export.md) → `.automaker/features/battle-board-pdf-export`

### Integration Features
- [`goodshuffle-integration.md`](goodshuffle-integration.md) → `.automaker/features/goodshuffle-integration`
- [`nowsta-integration.md`](nowsta-integration.md) → `.automaker/features/nowsta-integration`
- [`quickbooks-export.md`](quickbooks-export.md) → `.automaker/features/quickbooks-export`
- [`webhook-outbound-integrations.md`](webhook-outbound-integrations.md) → `.automaker/features/webhook-outbound-integrations`

### Inventory Features
- [`inventory-item-management.md`](inventory-item-management.md) → `.automaker/features/inventory-item-management`
- [`inventory-stock-levels.md`](inventory-stock-levels.md) → `.automaker/features/inventory-stock-levels`
- [`inventory-recipe-costing.md`](inventory-recipe-costing.md) → `.automaker/features/inventory-recipe-costing`
- [`inventory-depletion-forecasting.md`](inventory-depletion-forecasting.md) → `.automaker/features/inventory-depletion-forecasting`

### Kitchen Features
- [`kitchen-prep-list-generation.md`](kitchen-prep-list-generation.md) → `.automaker/features/kitchen-prep-list-generation`
- [`kitchen-allergen-tracking.md`](kitchen-allergen-tracking.md) → `.automaker/features/kitchen-allergen-tracking`
- [`kitchen-waste-tracking.md`](kitchen-waste-tracking.md) → `.automaker/features/kitchen-waste-tracking`

### Mobile Features
- [`mobile-task-claim-interface.md`](mobile-task-claim-interface.md) → `.automaker/features/mobile-task-claim-interface`
- [`mobile-recipe-viewer.md`](mobile-recipe-viewer.md) → `.automaker/features/mobile-recipe-viewer`
- [`mobile-time-clock.md`](mobile-time-clock.md) → `.automaker/features/mobile-time-clock`

### Payroll Features
- [`payroll-timecard-system.md`](payroll-timecard-system.md) → `.automaker/features/payroll-timecard-system`
- [`payroll-approval-workflow.md`](payroll-approval-workflow.md) → `.automaker/features/payroll-approval-workflow`
- [`payroll-calculation-engine.md`](payroll-calculation-engine.md) → `.automaker/features/payroll-calculation-engine`

### Scheduling Features
- [`scheduling-shift-crud.md`](scheduling-shift-crud.md) → `.automaker/features/scheduling-shift-crud`
- [`scheduling-availability-tracking.md`](scheduling-availability-tracking.md) → `.automaker/features/scheduling-availability-tracking`
- [`scheduling-auto-assignment.md`](scheduling-auto-assignment.md) → `.automaker/features/scheduling-auto-assignment`
- [`scheduling-labor-budget-tracking.md`](scheduling-labor-budget-tracking.md) → `.automaker/features/scheduling-labor-budget-tracking`

### Warehouse Features
- [`warehouse-receiving-workflow.md`](warehouse-receiving-workflow.md) → `.automaker/features/warehouse-receiving-workflow`
- [`warehouse-cycle-counting.md`](warehouse-cycle-counting.md) → `.automaker/features/warehouse-cycle-counting`
- [`warehouse-shipment-tracking.md`](warehouse-shipment-tracking.md) → `.automaker/features/warehouse-shipment-tracking`

## Usage

These specifications are used by the Ralph build prompt as the source of truth for requirements. Each spec is attached to its corresponding Automaker feature via the `feature.json` file's `textFilePaths` array.

## Specification Guidelines

- **Behavioral, not implementation**: Specs describe what the system does, not how it's built
- **Short and focused**: Target 20-80 lines per spec
- **Invariants first**: Safety and correctness rules are critical
- **Testable**: Acceptance checks should be verifiable by humans
- **No library choices**: No mentions of Prisma, React, or other implementation details
