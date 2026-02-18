# Command Board Bug Fixes — Ralph Loop Setup Complete ✅

> **Status**: Ralph loop running in planning mode (3 iterations)
>
> **Branch**: `fix/command-board-bugs`
>
> **Started**: 2026-02-16

## What Was Set Up

### 1. Spec Documentation

- ✅ `specs/command-board/SPEC_bug-fixes.md` — Detailed bug specifications with 8 bugs (P0/P1/P2)
- ✅ `specs/command-board/BUGS.md` — Original bug documentation (already existed)
- ✅ `specs/command-board/STATUS.md` — Command Board current state (already existed)

### 2. Ralph Wiggum Loop Files

- ✅ `PROMPT_plan_commandboard_bugs.md` — Planning phase instructions
- ✅ `PROMPT_build_commandboard_bugs.md` — Implementation phase instructions
- ✅ `IMPLEMENTATION_PLAN_commandboard_bugs.md` — Initial task breakdown with 8 tasks
- ✅ `loop-commandboard.sh` — Custom loop script with auto-stop and progress tracking

### 3. Git Branch

- ✅ Created branch: `fix/command-board-bugs`
- ✅ Pushed to remote
- ✅ All setup files committed

## Bugs to Be Fixed

### Priority P0 (Critical)

1. **BUG-01**: Entity Detail Panel Not Wired Up
   - Component exists but not connected in `board-shell.tsx`
   - Just needs wiring, no new code required

### Priority P1 (High)

2. **BUG-02**: Duplicate Entities on Board
   - Need to prevent or indicate duplicates
3. **BUG-03**: Undo/Redo Disconnected
   - Need to implement history system (larger effort)
4. **BUG-04**: Entity Browser Stale After Board Changes
   - Need realtime sync for browser state
5. **BUG-05**: No Error Boundary on Board
   - Need to add error boundary component

### Priority P2 (Cosmetic)

6. **BUG-06**: Random Placement Offset
   - Need smart placement algorithm
7. **BUG-07**: Card Width Not Constrained
   - Need consistent card sizing
8. **BUG-08**: MiniMap/Controls Styling
   - Need to remove `!important` overrides

## Current Status

### Planning Phase (In Progress)

- 🏃 **Running**: `./loop-commandboard.sh plan 3`
- 📋 **Iteration**: 1 of 3
- 🎯 **Goal**: Study codebase, refine implementation plan
- 📝 **Log**: `loop-commandboard-plan-{timestamp}.log`

Ralph is currently:

- Reading Command Board component files
- Understanding existing patterns
- Identifying implementation details
- Will update `IMPLEMENTATION_PLAN_commandboard_bugs.md` with specific changes

## What Happens Next

### After Planning (10-15 minutes)

1. Review updated `IMPLEMENTATION_PLAN_commandboard_bugs.md`
2. Check for any identified gotchas or dependencies
3. Start build phase: `./loop-commandboard.sh 10`

### During Build Phase (1-2 hours)

- Ralph will fix bugs in priority order
- One commit per bug fix
- Conventional commit format
- Auto-stops when all tasks complete

### Expected Commits

```
fix(command-board): wire up entity detail panel

- Connected EntityDetailPanel component in board-shell
- Panel now shows actual entity details on click
- Loading and error states working

Fixes BUG-01
```

## How to Monitor

### Check Loop Status

```bash
# View live log
tail -f loop-commandboard-plan-*.log

# Check remaining tasks
grep "Pending" IMPLEMENTATION_PLAN_commandboard_bugs.md | wc -l

# Check git log
git log --oneline -10
```

### Stop Loop Early

```bash
# Press Ctrl+C
# Changes are already committed
# Can resume by re-running script
```

## Files Being Modified

Ralph will modify these files:

- `apps/app/app/(authenticated)/command-board/components/board-shell.tsx`
- `apps/app/app/(authenticated)/command-board/components/entity-browser.tsx`
- `apps/app/app/(authenticated)/command-board/components/board-flow.tsx`
- `apps/app/app/(authenticated)/command-board/actions/projections.ts`
- `apps/app/app/(authenticated)/command-board/nodes/projection-node.tsx`

Ralph will create these files:

- `apps/app/app/(authenticated)/command-board/components/board-error-boundary.tsx`
- `apps/app/app/(authenticated)/command-board/hooks/use-board-history.ts`

## Timeline Estimate

- ✅ **Setup**: Complete (5 minutes)
- 🏃 **Planning**: In progress (10-15 minutes)
- ⏳ **Build**: Coming next (1-2 hours)
- ⏳ **Total**: ~2 hours for all P0/P1 bugs

## Success Criteria

- [ ] All P0 bugs fixed (BUG-01)
- [ ] At least 3 P1 bugs fixed (BUG-02, BUG-04, BUG-05 recommended)
- [ ] No regressions in existing functionality
- [ ] All commits follow conventional format
- [ ] Ready for PR

## Commands Reference

```bash
# Planning phase (currently running)
./loop-commandboard.sh plan 3

# Build phase (after planning)
./loop-commandboard.sh 10

# Unlimited iterations (auto-stops when complete)
./loop-commandboard.sh

# Monitor progress
tail -f loop-commandboard-*.log

# Check tasks
grep -E "Status.*Pending|Status.*Complete" IMPLEMENTATION_PLAN_commandboard_bugs.md
```

## Notes

- Loop uses **Sonnet** model (faster for well-defined bugs)
- Auto-stops when all tasks marked complete
- Pushes after each iteration
- Preserves Liveblocks realtime collaboration
- Tests before committing

---

**Status**: Planning phase running — check back in 10-15 minutes to start build phase!
