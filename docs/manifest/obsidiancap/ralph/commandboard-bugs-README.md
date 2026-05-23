# Ralph Wiggum Loop — Command Board Bug Fixes

> **Goal**: Autonomously fix P0/P1 bugs in the Command Board
>
> **Branch**: `fix/command-board-bugs`
>
> **Status**: Ready to run

## Overview

This Ralph loop is configured to fix critical and high-priority bugs in the Command Board feature. The bugs are well-documented with clear acceptance criteria and specific file locations.

## What Will Be Fixed

### Priority P0 (Critical)
- **BUG-01**: Wire up Entity Detail Panel — Component exists but not connected

### Priority P1 (High)
- **BUG-02**: Prevent duplicate entities on board
- **BUG-03**: Implement undo/redo functionality
- **BUG-04**: Fix Entity Browser staleness
- **BUG-05**: Add error boundary to board

### Priority P2 (Cosmetic)
- **BUG-06**: Smart entity placement algorithm
- **BUG-07**: Consistent card width
- **BUG-08**: MiniMap styling without !important

## Files

- `PROMPT_plan_commandboard_bugs.md` — Planning phase instructions
- `PROMPT_build_commandboard_bugs.md` — Implementation phase instructions
- `IMPLEMENTATION_PLAN_commandboard_bugs.md` — Task breakdown
- `specs/command-board/SPEC_bug-fixes.md` — Detailed bug specifications
- `loop-commandboard.sh` — Custom loop script

## How to Run

### Option 1: Planning Phase First (Recommended)

Start with planning to let Ralph study the codebase and refine the implementation plan:

```bash
./loop-commandboard.sh plan 3
```

This runs 3 planning iterations where Ralph will:
- Study the Command Board codebase
- Read existing implementations
- Update IMPLEMENTATION_PLAN_commandboard_bugs.md with specific changes
- Identify any gotchas or dependencies

After planning completes, review the plan and then run:

```bash
./loop-commandboard.sh 10
```

### Option 2: Jump Straight to Implementation

If you trust the existing implementation plan:

```bash
./loop-commandboard.sh 10
```

This runs up to 10 build iterations. Ralph will:
- Pick highest priority task from IMPLEMENTATION_PLAN_commandboard_bugs.md
- Implement the fix
- Test the changes
- Commit with conventional format
- Mark task as complete
- Move to next task

### Option 3: Unlimited Iterations

```bash
./loop-commandboard.sh
```

Runs until all tasks in the implementation plan are marked complete.

## Monitoring

The loop will:
- Log everything to `loop-commandboard-{mode}-{timestamp}.log`
- Show progress in terminal
- Push commits after each iteration
- Count remaining tasks
- Auto-stop when all tasks complete

## What to Expect

### Planning Phase
- 2-3 iterations
- No code changes
- Updates to IMPLEMENTATION_PLAN_commandboard_bugs.md
- Deep study of existing code patterns

### Build Phase
- 8-12 iterations (estimate)
- One bug fix per iteration
- Conventional commits per task
- Tests before committing
- Clear "Fixes BUG-XX" in commit messages

## File Structure

```
Command Board Files:
apps/app/app/(authenticated)/command-board/
├── components/
│   ├── board-shell.tsx          ← BUG-01, BUG-03, BUG-05
│   ├── entity-detail-panel.tsx  ← BUG-01 (already built, needs wiring)
│   ├── entity-browser.tsx       ← BUG-02, BUG-04, BUG-06
│   ├── board-flow.tsx           ← BUG-08
│   └── board-error-boundary.tsx ← BUG-05 (to be created)
├── actions/
│   └── projections.ts           ← BUG-02
├── hooks/
│   ├── use-board-sync.ts        ← BUG-04
│   └── use-board-history.ts     ← BUG-03 (to be created)
├── nodes/
│   ├── projection-node.tsx      ← BUG-07
│   └── cards/*.tsx              ← BUG-07
```

## Success Criteria

- [ ] All P0 bugs fixed (BUG-01)
- [ ] At least 3 P1 bugs fixed (BUG-02, BUG-04, BUG-05 recommended)
- [ ] No regressions in existing functionality
- [ ] All commits follow conventional format
- [ ] Tests passing
- [ ] Ready for PR

## Notes

- Ralph uses **Sonnet** model (faster for well-defined bug fixes)
- Loop auto-stops when all tasks complete
- Realtime collaboration (Liveblocks) must be preserved
- Each fix is tested before committing
- Small delay between iterations to prevent rate limiting

## Troubleshooting

### If Ralph gets stuck:
1. Check the log file for errors
2. Review the last commit
3. Manually fix blockers if needed
4. Re-run the loop

### If a bug fix doesn't work:
1. Ralph should catch it in testing phase
2. If not, stop the loop (Ctrl+C)
3. Review the changes manually
4. Either fix manually or adjust IMPLEMENTATION_PLAN and restart

### If you need to stop early:
- Press Ctrl+C
- Changes are already committed
- You can resume later by re-running the script

## Timeline Estimate

- **Planning**: 10-15 minutes
- **Build**: 1-2 hours (depending on bug complexity)
- **Total**: ~2 hours for all P0/P1 bugs

## Next Steps After Completion

1. Review all commits
2. Test the board manually
3. Create PR from `fix/command-board-bugs` branch
4. Run E2E tests
5. Deploy to staging
6. Verify in production-like environment

---

**Ready to start?** Run:

```bash
./loop-commandboard.sh plan 3
```
