# Command Board Entity Cards

## Outcome
The command board displays draggable card components for clients, events, tasks, employees, and inventory. Each card shows key status indicators and supports quick actions for efficient workflow.

## In Scope
- Display entity cards for: clients, events, tasks, employees, inventory items
- Show key information on cards: name, status, key metrics, status indicators
- Support dragging cards to reposition on board
- Provide quick actions on cards (edit, view details, change status)
- Color-code or style cards by type or status
- Support card selection (single or multiple)

## Out of Scope
- Card template customization UI
- Integration with external entity systems
- Card analytics or usage tracking
- Custom card layouts or designs

## Invariants / Must Never Happen
- Cards must never display incorrect or stale information
- Card drag operations must never lose entity data
- Cards must never be visible to users from other tenants
- Card quick actions must never fail silently; errors must be reported
- Cards must never overlap incorrectly or become unreadable
- Card updates must never be lost due to concurrent modifications

## Acceptance Checks
- View command board → entity cards displayed with correct information
- Drag card → card moves to new position, position saved
- Click card quick action → action executes correctly
- Select multiple cards → cards selected, bulk operations available
- View card details → full entity information displayed
- Update entity → card information updates immediately
