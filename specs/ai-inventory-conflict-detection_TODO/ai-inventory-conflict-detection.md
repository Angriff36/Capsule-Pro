# AI Inventory Conflict Detection

## Outcome

The system automatically detects scheduling conflicts for inventory before they
become operational issues. Users receive conflict warnings with suggested
resolutions.

## In Scope

- Detect inventory conflicts when required inventory exceeds available stock
- Provide conflict warnings with severity levels (warning, error, critical)
- Suggest resolution options (alternative inventory sources)
- Show conflicts in real-time as schedules are created or modified

## Out of Scope

- Automatic conflict resolution (only suggestions)
- Historical conflict analysis or reporting
- Conflict detection for past events
- Integration with external scheduling systems

## Invariants / Must Never Happen

- A conflict warning must never be suppressed or hidden from users
- The system must never allow saving a schedule that creates a critical conflict
  without explicit user override
- Conflict detection must consider all active shifts, not just those in the
  current view
- Inventory conflicts must consider all events using the same inventory items,
  not just the current event

## Acceptance Checks

- Require more inventory than available across all events → conflict shown with
  available quantity
- Modify a shift to create a conflict → warning appears immediately
- Attempt to save schedule with critical conflict → system requires explicit
  confirmation
- View conflict suggestions → alternatives are relevant and available
