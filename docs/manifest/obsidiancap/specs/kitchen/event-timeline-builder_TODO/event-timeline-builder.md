# Event Timeline Builder

## Outcome
Users can create visual timelines for event day schedules showing setup, service, and breakdown timing. Timelines link to tasks and shift assignments for complete event coordination.

## In Scope
- Create visual timeline with time blocks (setup, service, breakdown)
- Add timeline items with: description, start time, end time, assigned staff
- Link timeline items to tasks and shifts
- Edit timeline items (times, assignments, descriptions)
- View timeline in visual format (Gantt-style or calendar view)
- Export timeline as PDF or image

## Out of Scope
- Automatic timeline generation from event details
- Integration with external calendar systems
- Timeline templates or recurring patterns
- Timeline analytics or reporting

## Invariants / Must Never Happen
- Timeline items must never have end time before start time
- Timeline items must never overlap assigned staff without explicit override
- Timeline must never include items outside event date
- Timeline links to tasks/shifts must never be broken
- Timeline updates must never be lost due to concurrent edits
- Timeline visualization must never be unreadable or improperly formatted

## Acceptance Checks
- Create timeline → timeline created with time blocks
- Add timeline item → item appears in correct time position
- Link to task → timeline item linked, task visible in timeline
- Edit timeline → changes saved and reflected
- View timeline → visual representation shows all items correctly
- Export timeline → exported file includes all timeline information
