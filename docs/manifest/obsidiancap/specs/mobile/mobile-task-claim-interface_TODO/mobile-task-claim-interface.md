# Mobile Task Claiming Interface

## Outcome
Kitchen staff can view available tasks and claim them on mobile devices. The interface is optimized for quick interactions during production with minimal taps required.

## In Scope
- Display available tasks for the current user's location and role
- Show task details: description, due time, priority, station, and estimated duration
- Allow users to claim tasks with a single tap/action
- Show real-time updates when tasks are claimed by others
- Filter tasks by: station, priority, due time, or status
- Support offline viewing of previously loaded tasks (with sync when online)

## Out of Scope
- Task creation or editing from mobile interface
- Task assignment by managers (only claiming by staff)
- Integration with external task management systems
- Task completion tracking (handled by separate feature)

## Invariants / Must Never Happen
- A task must never be claimable by multiple users simultaneously
- Once claimed, a task must immediately show as unavailable to other users
- Tasks must never be claimable if the user lacks required role or permissions
- The interface must never show tasks from other tenants or locations
- Task claims must never be lost due to network issues; claims queue for sync when offline
- The interface must never require more than 2 taps to claim a task

## Acceptance Checks
- View available tasks → tasks are filtered to user's location and role
- Claim a task → task immediately shows as claimed and unavailable to others
- View tasks while offline → previously loaded tasks visible, claim queues for sync
- Filter tasks by station → only tasks for selected station shown
- Attempt to claim already-claimed task → error message shown
- Claim task with insufficient permissions → task not claimable, reason shown
