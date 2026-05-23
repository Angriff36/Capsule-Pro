# Mobile Time Clock

## Outcome
Field staff can clock in and out using mobile devices with geofencing, photo capture, and break tracking. This simplifies timecard creation and improves accuracy of time tracking.

## In Scope
- Clock in/out interface optimized for mobile devices
- Capture geolocation at clock in/out time
- Require photo verification for clock in/out
- Track breaks (start break, end break)
- Support multiple job sites/locations
- Work offline with sync when connection restored

## Out of Scope
- Automatic payroll calculation (handled by separate feature)
- Timecard approval workflows (handled by separate feature)
- Integration with external time tracking systems
- Biometric authentication

## Invariants / Must Never Happen
- Employees must never be able to clock in twice without clocking out first
- Clock out time must never be before clock in time
- Timecards must never be created without geolocation and photo
- Geolocation must never be too far from job site without warning
- Break time must never exceed total worked time
- Offline clock entries must never be lost; must sync when online

## Acceptance Checks
- Clock in on mobile → timecard created with location and photo
- Clock out → timecard completed with end time
- Start break → break time tracked separately
- Clock in at wrong location → warning shown, can override
- Clock in offline → entry queued, syncs when online
- View timecard history → shows all past timecards with details
