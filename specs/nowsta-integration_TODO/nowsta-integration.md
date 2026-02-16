# Nowsta Scheduling Integration

## Outcome
The system imports shifts and employee data from Nowsta scheduling platform. This enables a unified view of internal and external staffing across both systems.

## In Scope
- Import shifts from Nowsta (scheduled shifts, assignments, times)
- Import employee data from Nowsta (names, roles, contact info)
- Map Nowsta employees to Convoy employees (or create new records)
- Sync shift updates from Nowsta (changes, cancellations)
- Display Nowsta shifts alongside Convoy shifts in scheduling views
- Support one-way sync (Nowsta → Convoy) or bi-directional sync

## Out of Scope
- Nowsta account setup or authentication
- Custom field mapping between systems
- Sync scheduling or frequency configuration
- Historical sync analysis or reporting

## Invariants / Must Never Happen
- Imported shifts must never overwrite Convoy shifts without explicit mapping
- Employee data must never be duplicated; must map existing employees correctly
- Sync operations must never fail silently; errors must be logged and reported
- Nowsta shifts must never be editable in Convoy if sync is one-way
- Sync must never import data from other tenants' Nowsta accounts
- Imported shifts must never conflict with existing Convoy shifts without user resolution

## Acceptance Checks
- Import shifts from Nowsta → shifts appear in Convoy scheduling view
- Map Nowsta employee to Convoy employee → shifts linked correctly
- Update shift in Nowsta → change reflected in Convoy
- View unified schedule → shows both Convoy and Nowsta shifts
- Sync fails → error logged, user notified, retry scheduled
- Disable sync → no data imported while disabled
