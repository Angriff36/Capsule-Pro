# AI Next Action Suggestions

## Outcome
The system analyzes current board state (task status, deadlines, team capacity) and suggests prioritized next actions for users. Suggestions help teams focus on the most important work.

## In Scope
- Analyze task status, deadlines, dependencies, and team capacity to suggest actions
- Prioritize suggestions based on: urgency, dependencies, team availability, and business impact
- Present suggestions in order of priority with reasoning
- Update suggestions in real-time as board state changes
- Allow users to accept suggestions (which triggers the action) or dismiss them
- Show suggestions for: task assignments, task creation, deadline adjustments, resource allocation

## Out of Scope
- Automatic execution of suggestions without user approval
- Historical analysis of suggestion effectiveness
- Custom suggestion algorithms per user or team
- Integration with external task management systems

## Invariants / Must Never Happen
- Suggestions must never recommend actions that violate business rules or constraints
- Suggestions must never recommend assigning tasks to unavailable employees
- Suggestions must never recommend actions on completed or canceled tasks
- Suggestions must never be based on stale data; they must reflect current board state
- Suggestions must never overwhelm users; limit to top 5-10 most relevant suggestions
- Suggestions must never recommend actions that create conflicts (double-booking, etc.)

## Acceptance Checks
- View board with multiple pending tasks → suggestions appear ordered by priority
- Accept a suggestion → corresponding action is executed
- Dismiss a suggestion → it disappears and doesn't reappear for same state
- Update board state → suggestions update to reflect changes
- View suggestions when team is at capacity → no suggestions for new assignments
- View suggestions for tasks with dependencies → suggestions respect dependency order
