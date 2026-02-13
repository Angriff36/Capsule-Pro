# Real-time Command Board Sync

## Outcome
Multiple users can collaborate on the command board simultaneously. Changes made by one user (entity movements, updates, cursor positions) are visible to all other users in real-time without page refresh.

## In Scope
- Synchronize entity positions when cards are dragged and dropped
- Show cursor positions of other active users on the board
- Sync entity updates (status changes, property edits) across all connected users
- Handle concurrent edits gracefully (last-write-wins or conflict resolution)
- Show presence indicators for users currently viewing the board
- Maintain sync state during network interruptions with reconnection

## Out of Scope
- Offline editing with sync on reconnect (only real-time sync)
- Conflict resolution UI for manual merge decisions
- Historical playback of board changes
- Integration with external collaboration tools

## Invariants / Must Never Happen
- Changes must never be lost due to network issues; they queue and sync when connection restored
- Two users must never see conflicting entity positions simultaneously
- Cursor positions must never persist after user disconnects
- Entity updates must never be applied out of order (causality must be preserved)
- Sync must never cause infinite update loops
- Users must never see changes from other tenants

## Acceptance Checks
- Two users move same entity → both see final position, no conflicts
- User updates entity property → other users see change immediately
- User disconnects and reconnects → sees current board state
- Multiple users edit same entity → last change wins, no data loss
- View board with other users → see their cursors and presence indicators
- Network interruption → changes queue and sync when connection restored
