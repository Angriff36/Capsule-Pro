# AI Bulk Task Generation

## Outcome
Given an event with menu items, staff, timing, and location, the system generates kitchen prep, setup, and follow-up tasks that are grouped by station, have explicit due times, and can be reviewed before activation.

## In Scope
- Analyze event details (menu items, guest count, service time, location) to generate relevant tasks
- Group generated tasks by kitchen station or work area
- Assign explicit due times based on event timing and prep requirements
- Generate tasks for: kitchen prep work, event setup, service support, and post-event follow-up
- Present generated tasks in a review interface before activation
- Allow users to accept, edit, or reject generated tasks individually or in bulk
- Never overwrite or modify existing manually-created tasks

## Out of Scope
- Automatic task assignment to specific employees (only task creation)
- Task generation for events without menu or timing information
- Integration with external task management systems
- Historical analysis of task patterns for learning

## Invariants / Must Never Happen
- Generated tasks must never overwrite or modify existing manual tasks
- Tasks must never be auto-activated without user review and approval
- Task due times must never be set in the past
- Generated tasks must never duplicate existing tasks for the same event
- Task generation must never fail silently; errors must be reported to the user
- Generated tasks must always have at least a station/group assignment and due time

## Acceptance Checks
- Create event with menu items and timing → system generates prep tasks grouped by station
- Review generated tasks → can accept all, edit individual tasks, or reject all
- Generate tasks for event with existing manual tasks → manual tasks remain unchanged
- Generate tasks with invalid timing → error message shown, no tasks created
- Edit generated task → changes persist when accepted
- Reject generated tasks → no tasks are created, event remains unchanged
