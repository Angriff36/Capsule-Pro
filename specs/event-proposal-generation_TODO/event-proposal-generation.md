# Event Proposal Generator

## Outcome
The system generates professional event proposals with menu options, pricing, terms, and branding. Proposals can be customized per client and support templates for consistent formatting.

## In Scope
- Generate proposals from event details (menu, pricing, terms)
- Include branding elements (logo, colors, fonts)
- Support proposal templates for different event types
- Customize proposals per client (pricing, terms, menu selections)
- Export proposals as PDF or shareable links
- Track proposal status (draft, sent, accepted, rejected)

## Out of Scope
- Proposal negotiation workflows
- Integration with external proposal systems
- Proposal analytics or conversion tracking
- Automatic proposal generation based on rules

## Invariants / Must Never Happen
- Proposals must never include incorrect pricing or menu information
- Proposal generation must never fail silently; errors must be reported
- Proposals must never be sent to wrong clients
- Proposal content must never be incomplete (missing menu, pricing, terms)
- Proposal PDFs must never be corrupted or unreadable
- Proposal updates must never be lost due to concurrent edits

## Acceptance Checks
- Generate proposal → proposal created with all event details
- Customize proposal → changes saved and reflected
- Export proposal PDF → PDF generated with correct formatting
- View proposal status → shows current status and history
- Send proposal → proposal sent to client, status updated
- Use proposal template → proposal formatted according to template
