# Command Board Layout Persistence

## Outcome
The system stores and retrieves command board layouts per user/tenant including entity positions, zoom levels, and view preferences. Users can maintain their custom board arrangements across sessions.

## In Scope
- Save entity positions on the command board per user
- Save zoom level and view preferences per user
- Restore saved layout when user returns to board
- Support multiple saved layouts per user (named views)
- Persist layout changes automatically as user arranges board
- Maintain layout separately for each tenant

## Out of Scope
- Sharing layouts between users
- Layout templates or default layouts
- Layout versioning or history
- Import/export of layouts

## Invariants / Must Never Happen
- Layout data must never be lost due to browser refresh or session timeout
- User layouts must never be visible or modifiable by other users
- Layout persistence must never fail silently; failures must be reported
- Layout data must never include entities from other tenants
- Layout restoration must never place entities in invalid positions
- Layout changes must never cause performance degradation

## Acceptance Checks
- Arrange entities on board → positions saved automatically
- Refresh page → board layout restored to saved positions
- Create named view → layout saved with name
- Switch between saved views → board updates to selected layout
- View board as different user → sees their own saved layout
- Layout save fails → error message shown, user can retry
