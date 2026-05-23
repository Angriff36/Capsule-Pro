# Digital Timecard System

## Outcome
Employees can clock in and clock out with geolocation and photo verification. The system creates timecard records that are ready for payroll processing.

## In Scope
- Clock in/out interface with timestamp recording
- Capture geolocation at clock in/out time
- Require photo verification for clock in/out
- Create timecard records with start time, end time, breaks, and total hours
- Support multiple locations/job sites
- Allow employees to view their own timecard history
- Prevent clocking in if already clocked in (and vice versa)

## Out of Scope
- Automatic payroll calculation (handled by separate feature)
- Timecard approval workflow (handled by separate feature)
- Integration with external time tracking systems
- Offline clock in/out with sync

## Invariants / Must Never Happen
- Employees must never be able to clock in twice without clocking out first
- Clock out time must never be before clock in time
- Timecards must never be created without geolocation and photo verification
- Employees must never be able to edit their own timecards after submission
- Timecards must never be created for future dates
- Break time must never exceed total worked time

## Acceptance Checks
- Clock in → timecard created with timestamp, location, and photo
- Clock out → timecard completed with end time and total hours calculated
- Attempt to clock in while already clocked in → error message shown
- View timecard history → shows all past timecards with details
- Clock in at different location → location recorded correctly
- Calculate hours with breaks → total hours exclude break time
