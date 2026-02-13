# Bulk Edit Operations

## Outcome
Users can select multiple entities (tasks, events, etc.) on the command board and update common properties (status, assignments, dates) in a single action, reducing repetitive editing work.

## In Scope
- Select multiple entities on the command board
- Identify common properties that can be bulk edited (status, assignments, dates, tags, etc.)
- Apply bulk edits to all selected entities
- Show preview of changes before applying
- Support undo/redo for bulk operations
- Validate that bulk edits don't create conflicts or invalid states

## Out of Scope
- Bulk creation of new entities
- Bulk deletion of entities
- Custom bulk edit operations or scripts
- Integration with external systems for bulk operations

## Invariants / Must Never Happen
- Bulk edits must never be applied without user confirmation
- Bulk edits must never create invalid states (e.g., assigning tasks to unavailable employees)
- Bulk edits must never modify entities the user doesn't have permission to edit
- Bulk operations must never fail partially; either all succeed or all fail
- Bulk edits must never be applied to entities from other tenants
- Undo must never fail to restore previous state

## Acceptance Checks
- Select multiple tasks → bulk edit options available
- Apply bulk status change → all selected tasks updated
- Preview bulk changes → shows what will change before applying
- Attempt invalid bulk edit → validation error shown, no changes applied
- Undo bulk edit → all changes reverted
- Bulk edit with insufficient permissions → error shown for unauthorized entities
