# Implementation Plan (Scoped)

Scope: SMS notification system (urgent updates, shift reminders, task assignments)

Non-goals:
- SMS template creation/editing UI
- Two-way SMS conversations
- SMS analytics or reporting
- Integration with external SMS providers beyond Twilio

## Blockers / Decisions

- [ ] Twilio API key configuration (devops/platform)

## Tasks (max 12, ordered)

- [ ] T1: Add Twilio client package and environment variable configuration (spec: specs/sms-notification-system.md)
- [ ] T2: Create SMS service wrapper with send(), validatePhone(), and formatNumber() methods (spec: specs/sms-notification-system.md)
- [ ] T3: Add SMS channel to notification_preferences (seed data: 'sms' channel option) (spec: specs/sms-notification-system.md)
- [ ] T4: Create SMS notification templates for urgent updates, shift reminders, task assignments (spec: specs/sms-notification-system.md)
- [ ] T5: Implement SMS opt-in/opt-out toggle in user notification preferences UI (spec: specs/sms-notification-system.md)
- [ ] T6: Add SMS delivery tracking table/model (sent, delivered, failed status) (spec: specs/sms-notification-system.md)
- [ ] T7: Create Knock integration to trigger SMS sends via notification workflows (spec: specs/sms-notification-system.md)
- [ ] T8: Implement phone validation before SMS send (E.164 format, invalid check) (spec: specs/sms-notification-system.md)
- [ ] T9: Add deduplication logic to prevent duplicate SMS for same notification (spec: specs/sms-notification-system.md)
- [ ] T10: Implement error handling and logging for failed SMS deliveries (spec: specs/sms-notification-system.md)

## Exit Criteria

- [ ] SMS sent for urgent updates, shift reminders, task assignments
- [ ] SMS delivery status tracked (sent/delivered/failed)
- [ ] User can opt-in/opt-out of SMS notifications
- [ ] Invalid phone numbers rejected before send
- [ ] Duplicate SMS not sent for same notification
- [ ] SMS sending failures logged and reported

## Notes

- Knock provider already configured in packages/notifications/
- User.phone field exists in database (schema.prisma:104)
- notification_preferences table supports channel-based preferences
- Use E.164 phone format validation
