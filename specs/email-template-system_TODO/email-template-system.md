# Email Template System

## Outcome
Users can create and manage branded email templates for proposals, confirmations, reminders, and follow-ups. Templates support merge fields and attachments for personalized communications.

## In Scope
- Create email templates with: subject, body, merge fields, attachments
- Edit and delete templates
- Use templates when sending emails (with merge field population)
- Support multiple template types (proposal, confirmation, reminder, follow-up)
- Preview templates with sample data
- Organize templates by category or type

## Out of Scope
- Email sending functionality (handled by separate feature)
- Integration with external email systems
- Template versioning or history
- Template analytics or usage tracking

## Invariants / Must Never Happen
- Templates must never be deleted if actively used in workflows
- Merge fields must never be rendered incorrectly (showing field names instead of values)
- Template content must never include invalid merge field syntax
- Templates must never be visible to users from other tenants
- Template attachments must never exceed size limits
- Template updates must never be lost due to concurrent edits

## Acceptance Checks
- Create email template → template saved and available for use
- Use template → merge fields populated with actual data
- Preview template → shows rendered template with sample data
- Edit template → changes saved and reflected in usage
- Delete template → template removed (if not in use)
- View template list → shows all templates organized by type
