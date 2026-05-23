# AI Employee Conflict Detection

## Outcome

The system automatically detects scheduling conflicts for employees before they
become operational issues. Users receive conflict warnings with suggested
resolutions.

## In Scope

- Detect double-booking of employees across overlapping shifts
- Provide conflict warnings with severity levels (warning, error, critical)
- Suggest resolution options (alternative employees)
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
- Double-booking of the same employee for overlapping shifts must always be
  detected

## Acceptance Checks

- Create two overlapping shifts for the same employee → conflict warning appears
- Modify a shift to create a conflict → warning appears immediately
- Attempt to save schedule with critical conflict → system requires explicit
  confirmation
- View conflict suggestions → alternatives are relevant and available
