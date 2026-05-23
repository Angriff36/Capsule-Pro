# Kitchen Prep List Generation

## Outcome
The system generates prep lists from event menus with quantities, recipes, and timing. Lists are grouped by station and prep date to enable efficient production workflow.

## In Scope
- Generate prep lists from event menu items and guest counts
- Calculate required quantities based on recipes and serving sizes
- Group prep items by kitchen station or work area
- Organize items by prep date (when items need to be prepared)
- Include recipe references, quantities, units, and timing for each item
- Support multiple events in the same prep list
- Allow manual editing of generated prep lists

## Out of Scope
- Automatic prep list execution or tracking
- Integration with inventory systems for automatic ordering
- Prep list templates or saved configurations
- Historical prep list analysis

## Invariants / Must Never Happen
- Prep lists must never include items without recipes or quantity calculations
- Quantities must never be zero or negative
- Prep dates must never be set after the event date
- Items must never appear in multiple stations without explicit reason
- Prep lists must never omit items that are part of the event menu
- Generated quantities must never exceed reasonable production capacity without warning

## Acceptance Checks
- Generate prep list for event with menu → list includes all menu items with quantities
- View prep list → items grouped by station and sorted by prep date
- Edit prep list quantities → changes persist and recalculate totals
- Generate prep list for multiple events → items from all events included
- Generate prep list with missing recipes → items without recipes flagged
- View prep list timing → prep dates are before event date
