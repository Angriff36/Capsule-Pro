# SMS Notification System

## Outcome
The system sends SMS notifications for urgent updates, shift reminders, and task assignments. SMS integrates with notification infrastructure to ensure timely delivery of critical messages.

## In Scope
- Send SMS notifications for: urgent updates, shift reminders, task assignments
- Support SMS templates with merge fields
- Track SMS delivery status (sent, delivered, failed)
- Support opt-in/opt-out for SMS notifications
- Allow users to configure SMS notification preferences
- Support multiple recipients per SMS

## Out of Scope
- SMS template creation or editing (handled by separate feature)
- Two-way SMS conversations
- Integration with external SMS providers
- SMS analytics or reporting

## Invariants / Must Never Happen
- SMS must never be sent to invalid phone numbers
- SMS must never be sent without user opt-in
- SMS delivery failures must never be ignored; must be logged and reported
- SMS must never include sensitive information without proper authorization
- SMS sending must never fail silently
- Duplicate SMS must never be sent for the same notification

## Acceptance Checks
- Send SMS notification → SMS sent to recipient
- View SMS delivery status → shows sent, delivered, or failed
- Configure SMS preferences → preferences saved and respected
- Opt out of SMS → no SMS sent to opted-out number
- Send SMS with merge fields → fields populated correctly
- SMS sending fails → error logged, user notified
