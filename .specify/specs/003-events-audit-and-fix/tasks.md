# Tasks: Events Audit and Fix

Feature ID: 003
Total Tasks: 9
Constitution: 1.0.0

## Phase 1: Setup

- [x] T001 [US1] Create event validation schema `apps/app/app/(authenticated)/events/validation.ts`
  - **Do**:
    1. Create validation.ts with Zod schema for event creation
    2. Include all required fields: title, eventType, eventDate, guestCount
    3. Add optional fields: status, venueName, venueAddress, notes, budget, tags
  - **Files**: `apps/app/app/(authenticated)/events/validation.ts`
  - **Done when**: Validation file created with createEventSchema
  - **Verify**: `test -f "C:/projects/capsule-pro/apps/app/app/(authenticated)/events/validation.ts" && echo "OK"`
  - **Commit**: `feat(events): add event creation validation schema`

## Phase 2: Core Implementation (POC)

- [x] T002 [US1] Fix EventEditorModal props type `apps/app/app/(authenticated)/events/event-editor-modal.tsx`
  - **Do**:
    1. Change line 42: `capacity?: number` to `guestCount?: number`
  - **Files**: `apps/app/app/(authenticated)/events/event-editor-modal.tsx`
  - **Done when**: Props type uses guestCount matching form field name
  - **Verify**: `grep -n "guestCount?: number" "C:/projects/capsule-pro/apps/app/app/(authenticated)/events/event-editor-modal.tsx"`
  - **Commit**: `fix(events): align EventEditorModal props with form field naming`

- [x] T003 [US2] Add battle_board auto-creation in createEvent `apps/app/app/(authenticated)/events/actions.ts`
  - **Do**:
    1. Import `randomUUID` (already imported at line 3)
    2. Modify createEvent function to use `$transaction` (lines 101-115)
    3. Add database.battle_boards.create inside transaction after event creation
    4. Set battle_board fields: event_id, board_name, board_type="event-specific", board_data={}
  - **Files**: `apps/app/app/(authenticated)/events/actions.ts`
  - **Done when**: createEvent creates both event and battle_board atomically
  - **Verify**: `grep -n "database.battle_boards.create" "C:/projects/capsule-pro/apps/app/app/(authenticated)/events/actions.ts"`
  - **Commit**: `feat(events): auto-create battle board on event creation`

- [x] T004 [VERIFY] Quality checkpoint
  - **Do**: Run lint and typecheck on modified files
  - **Verify**: `cd "C:/projects/capsule-pro" && npx ultracite@latest check apps/app/app/(authenticated)/events/validation.ts apps/app/app/(authenticated)/events/event-editor-modal.tsx apps/app/app/(authenticated)/events/actions.ts`
  - **Done when**: All checks pass with no errors
  - **Commit**: `chore(events): pass quality checkpoint`

- [x] T005 [US1] Update createEvent to use Zod validation
  - **Do**:
    1. Import `createEventSchema` from validation.ts
    2. Parse formData using schema in createEvent function
    3. Handle validation errors properly per C§4.3
  - **Files**: `apps/app/app/(authenticated)/events/actions.ts`
  - **Done when**: createEvent validates input with Zod schema
  - **Verify**: `grep -n "createEventSchema" "C:/projects/capsule-pro/apps/app/app/(authenticated)/events/actions.ts"`
  - **Commit**: `refactor(events): integrate Zod validation in createEvent`

## Phase 3: Refinement

- [x] T006 [US1] Add error handling per C§4.3
  - **Do**:
    1. Wrap validation parsing in try/catch
    2. Return user-friendly error messages for validation failures
  - **Files**: `apps/app/app/(authenticated)/events/actions.ts`
  - **Done when**: All error paths handled with proper messages
  - **Verify**: `npx tsc --noEmit "C:/projects/capsule-pro/apps/app/app/(authenticated)/events/actions.ts" 2>&1 | head -20`
  - **Commit**: `refactor(events): add error handling for validation`

## Phase 4: Testing

- [x] T007 [US1] Add unit tests for event validation `apps/app/app/(authenticated)/events/__tests__/validation.test.ts`
  - **Do**:
    1. Create tests directory if needed
    2. Test valid event data passes
    3. Test missing required fields fails
    4. Test guestCount minimum validation
  - **Files**: `apps/app/app/(authenticated)/events/__tests__/validation.test.ts`
  - **Done when**: Tests cover main validation scenarios
  - **Verify**: `cd "C:/projects/capsule-pro/apps/app" && npx vitest run __tests__/validation.test.ts`
  - **Commit**: `test(events): add validation unit tests`

- [x] T008 [US2] Add unit test for battle_board creation `apps/app/app/(authenticated)/events/__tests__/actions.test.ts`
  - **Do**:
    1. Test createEvent creates battle_board with correct event_id
    2. Test transaction atomicity (both succeed or fail together)
  - **Files**: `apps/app/app/(authenticated)/events/__tests__/actions.test.ts`
  - **Done when**: Tests verify battle_board auto-creation
  - **Verify**: `cd "C:/projects/capsule-pro/apps/app" && npx vitest run __tests__/actions.test.ts`
  - **Commit**: `test(events): add battle board creation test`

## Phase 5: Quality Gates

- [x] T009 [VERIFY] Full local CI
  - **Do**: Run complete local CI suite
  - **Verify**: `cd "C:/projects/capsule-pro" && npx ultracite@latest check && npx tsc --noEmit && cd apps/app && npx vitest run --reporter=verbose __tests__/events/`
  - **Done when**: All commands exit 0
  - **Commit**: `chore(events): pass local CI`

## Notes

### Key Findings

| Item | Status | Notes |
|------|--------|-------|
| EventEditorModal props | BROKEN | capacity -> guestCount mismatch |
| createEvent battle_board | MISSING | Only creates event record |
| Zod validation | MISSING | No validation schema exists |
| Budgets API | EXISTS | Routes already present at apps/api |

### POC Shortcuts
- Skipped E2E browser testing for battle_board creation
- Skipped manual verification of budgets API (exists in codebase)

### Constitution Alignment
- C§2.2 [SHOULD] Use Zod for runtime validation - Implemented via validation.ts
- C§4.3 Error handling - Added try/catch with user-friendly messages

### Technical Debt
- None - all fixes are proper implementations

### Files Modified Summary

| File | Changes |
|------|---------|
| `event-editor-modal.tsx` | Line 42: capacity -> guestCount |
| `actions.ts` | Add battle_board creation, import validation |
| `validation.ts` | New file with Zod schema |
