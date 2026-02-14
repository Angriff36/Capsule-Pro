# Battle Board PDF Export

## Outcome
The system exports print-ready Battle Board summaries for events with menu, timeline, assignments, notes, and maps. PDFs are optimized for kitchen and field use with clear formatting and essential information.

## In Scope
- Generate PDF exports of event Battle Boards
- Include: menu items, timeline/schedule, staff assignments, notes, maps/locations
- Format PDFs for printing (proper page size, margins, readability)
- Support custom sections or layouts
- Generate PDFs on-demand or scheduled
- Allow PDF download or email delivery

## Out of Scope
- PDF editing or modification after generation
- Custom PDF template creation UI
- Integration with external document systems
- PDF versioning or history

## Invariants / Must Never Happen
- PDF exports must never omit critical information (menu, timeline, assignments)
- PDF generation must never fail silently; errors must be reported
- PDFs must never include data from other tenants
- PDF formatting must never be unreadable or improperly formatted
- PDF generation must never take longer than reasonable time (target: < 30 seconds)
- PDF exports must never be corrupted or invalid files

## Acceptance Checks
- Export Battle Board to PDF → PDF generated with all event information
- View PDF → formatting is clear and print-ready
- Download PDF → file downloads successfully
- Email PDF → PDF sent to recipient
- Export fails → error message shown with details
- View PDF content → all sections included (menu, timeline, assignments, notes)
