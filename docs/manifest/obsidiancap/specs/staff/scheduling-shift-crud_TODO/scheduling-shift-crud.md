# Shift Management CRUD

## Outcome
Users can create, edit, and delete shifts with start/end times, required roles, assigned employees, and locations. Shifts form the foundation for all scheduling operations.

## In Scope
- Create shifts with: start time, end time, required roles, location, and assigned employees
- Edit existing shifts (times, roles, assignments, location)
- Delete shifts (with appropriate permissions)
- View shifts in calendar or list format
- Filter shifts by: date range, location, role, or assigned employee
- Validate shift data (end time after start time, valid employees, etc.)

## Out of Scope
- Automatic shift assignment (handled by separate feature)
- Shift templates or recurring shifts
- Integration with external scheduling systems
- Shift approval workflows

## Invariants / Must Never Happen
- Shift end time must never be before start time
- Shifts must never be assigned to employees who don't have required role
- Deleted shifts must never be recoverable without admin intervention
- Shifts must never overlap for the same employee without explicit override
- Shifts must never be created in the past (except for historical data entry)
- Required roles must never be empty for a shift

## Acceptance Checks
- Create shift with valid data → shift created and appears in schedule
- Edit shift times → changes saved and reflected in schedule
- Delete shift → shift removed from schedule
- Attempt to create shift with end time before start → validation error shown
- Assign employee without required role → validation error shown
- View shifts filtered by date → only shifts in date range shown
