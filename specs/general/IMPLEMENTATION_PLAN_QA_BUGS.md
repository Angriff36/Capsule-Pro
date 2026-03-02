# QA Bugs — Implementation Plan

> Last updated: 2026-03-02

## Confirmed Production Bugs

### 1. Event Creation Silently Fails
- **Location**: `/events/new` form submission
- **Symptoms**: Form submits but no redirect, no error toast, no new event in DB
- **Spec**: Not documented
- **Status**: NOT STARTED
- **Priority**: P0 (blocking user workflow)
- **Effort**: 2-4 hours
- **Notes**: 
  - Appears to be Clerk ID mismatch: browser session uses `user_38kLgdxbUV67KQG5BCzfFTCklZg` but DB has different IDs
  - Event creation route may need to handle user lookup failures gracefully

### 2. Task Status Change Returns 422
- **Location**: `/kitchen` production board, "Mark as Completed" action
- **API**: `PATCH /api/kitchen/tasks/[id]` returns 422
- **Spec**: Not documented
- **Status**: NOT STARTED
- **Priority**: P0
- **Effort**: 2-3 hours
- **Notes**:
  - Manifest guard `guard self.status == "in_progress"` should pass (task IS in_progress)
  - Likely userId validation failing due to Clerk ID mismatch
  - Route calls `executeManifestCommand("complete", { id, userId })` but userId may be null/invalid

### 3. Search Doesn't Filter Events
- **Location**: Sidebar search box on `/events` page
- **Symptoms**: Typing query and pressing Enter doesn't filter the events list
- **Spec**: Not documented
- **Status**: NOT STARTED
- **Priority**: P1
- **Effort**: 1-2 hours

---

## Related Spec Items

From `specs/manifest/IMPLEMENTATION_PLAN.md`:
- **P1-3**: 42 routes bypass Manifest with direct Prisma - root cause of these bugs?
- **P1-5**: Delete commands pending for Manifest entities
