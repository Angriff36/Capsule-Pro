# Employee Availability System

## Outcome
Employees can set their availability windows and time-off requests. Managers can view availability when creating schedules to ensure proper staffing.

## In Scope
- Employees set recurring availability (e.g., available Monday-Friday 9am-5pm)
- Employees request time off with dates and reason
- Managers view employee availability when creating shifts
- Show availability conflicts when scheduling shifts
- Support multiple availability patterns per employee
- Allow managers to override availability for specific shifts

## Out of Scope
- Automatic shift assignment based on availability (handled by separate feature)
- Availability approval workflows
- Integration with external calendar systems
- Historical availability analysis

## Invariants / Must Never Happen
- Availability must never be set for past dates
- Time-off requests must never overlap without explicit approval
- Availability data must never be visible to unauthorized users
- Shifts must never be automatically assigned outside availability without manager override
- Availability updates must never be lost due to concurrent edits
- Employees must never be able to modify other employees' availability

## Acceptance Checks
- Employee sets availability → availability saved and visible to managers
- Employee requests time off → request appears in manager view
- Manager creates shift → sees employee availability and conflicts
- Schedule shift outside availability → warning shown with override option
- View availability calendar → shows all availability windows and time-off requests
- Update availability → changes reflected immediately in scheduling interface
