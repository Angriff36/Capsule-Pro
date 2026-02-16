# Visual Relationship Connectors

## Outcome
The command board displays visual lines or arrows connecting related entities (client to events, events to tasks, tasks to employees). Lines update dynamically as cards are dragged to maintain relationships.

## In Scope
- Display relationship lines between connected entities
- Show different line styles for different relationship types
- Update line positions automatically when cards are dragged
- Support multiple relationships per entity
- Highlight relationships on hover or selection
- Allow toggling relationship visibility

## Out of Scope
- Relationship creation or editing (only visualization)
- Relationship analytics or reporting
- Integration with external relationship systems
- Custom relationship line styles or animations

## Invariants / Must Never Happen
- Relationship lines must never connect incorrect entities
- Lines must never overlap or become unreadable
- Line updates must never cause performance issues
- Relationships must never be shown for entities from other tenants
- Lines must never be drawn for non-existent relationships
- Relationship visualization must never fail silently

## Acceptance Checks
- View command board → relationship lines displayed between connected entities
- Drag connected card → relationship line updates position
- Hover over relationship → relationship highlighted
- Toggle relationship visibility → lines shown/hidden
- View multiple relationships → all relationships displayed correctly
- Create new relationship → line appears immediately
