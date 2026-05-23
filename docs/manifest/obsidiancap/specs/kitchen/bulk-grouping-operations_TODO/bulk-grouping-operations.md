# Bulk Grouping and Combining

## Outcome
Users can group related entities into visual clusters on the command board. This supports creating event packages, task batches, or team groupings with automatic layout for better organization.

## In Scope
- Select multiple entities and group them into a cluster
- Create named groups (event packages, task batches, team groupings)
- Visual clustering with automatic layout within groups
- Expand/collapse groups to show/hide contained entities
- Move groups as a unit on the board
- Ungroup entities to return them to individual items

## Out of Scope
- Automatic grouping based on rules or AI
- Group templates or saved group configurations
- Integration with external grouping systems
- Group analytics or reporting

## Invariants / Must Never Happen
- Grouped entities must never be lost or orphaned
- Groups must never contain entities from other tenants
- Group operations must never fail partially; either all succeed or all fail
- Grouped entities must never be inaccessible (must be expandable)
- Groups must never be created without at least one entity
- Group layouts must never cause entities to overlap incorrectly

## Acceptance Checks
- Create group from selected entities → group created, entities clustered
- Expand group → contained entities visible
- Collapse group → entities hidden, group icon shown
- Move group → all entities move together
- Ungroup entities → entities return to individual items
- View group list → shows all groups with entity counts
