# Client Segmentation and Tagging

## Outcome
Users can tag and segment clients by type, value tier, preferences, or custom categories. This enables targeted communications and filtered views on the command board.

## In Scope
- Create tags and segments for clients
- Assign multiple tags to clients
- Filter clients by tags on command board and in lists
- Use predefined segments (value tier, client type) or custom tags
- Show tag counts and segment sizes
- Support tag-based client groups

## Out of Scope
- Automatic client segmentation based on rules
- Integration with external segmentation systems
- Tag-based marketing campaigns
- Historical segmentation analysis

## Invariants / Must Never Happen
- Tags must never be assigned to clients from other tenants
- Tag assignments must never be lost due to concurrent edits
- Clients must never be visible in wrong segments
- Tag filtering must never exclude clients incorrectly
- Tags must never be deleted if assigned to clients without handling assignments
- Segmentation must never be based on stale client data

## Acceptance Checks
- Create tag → tag available for assignment
- Assign tag to client → client tagged, appears in filtered views
- Filter clients by tag → only tagged clients shown
- View segment sizes → shows count of clients per segment
- Remove tag from client → client no longer appears in tag filter
- Delete tag → tag removed, client assignments handled appropriately
