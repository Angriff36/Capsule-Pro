# Smart Ralph / SpecKit Workflow Documentation

## Overview

This document describes the **Smart Ralph / SpecKit** workflow as configured on this environment. This is a constitution-driven feature development system that uses autonomous AI agents and iterative loops to implement features with comprehensive verification.

**Key Difference from Documentation**: The official docs mention slash commands (e.g., `/speckit:specify`), but in this environment, these are invoked via **agents** through the Task tool instead.

## Core Components

### 1. Plugins Installed

| Plugin | Version | Purpose |
|--------|---------|---------|
| `smart-ralph/ralph-speckit` | 0.3.0 | SpecKit methodology for feature development |
| `claude-plugins-official/ralph-loop` | e30768372b41 | Ralph Wiggum loop for iterative execution |

### 2. Agent Ecosystem

| Agent | Purpose | Invoked By |
|-------|---------|------------|
| `ralph-speckit:constitution-architect` | Create/update project constitution | Constitution phase |
| `ralph-speckit:spec-analyst` | Generate feature specifications | Specify phase |
| `ralph-speckit:plan-architect` | Create technical design plans | Plan phase |
| `ralph-speckit:task-planner` | Break plans into executable tasks | Tasks phase |
| `ralph-speckit:spec-executor` | Execute single tasks autonomously | Implementation phase |
| `ralph-speckit:qa-engineer` | Verification and quality checkpoints | Implementation phase |

### 3. State Management

All feature state is tracked in `.specify/specs/<id>-<name>/.speckit-state.json`:

```json
{
  "featureId": "003",
  "name": "events-audit-and-fix",
  "basePath": ".specify/specs/003-events-audit-and-fix",
  "phase": "execution",
  "taskIndex": 0,
  "totalTasks": 15,
  "taskIteration": 1,
  "maxTaskIterations": 5,
  "globalIteration": 1,
  "maxGlobalIterations": 100,
  "awaitingApproval": false
}
```

## Directory Structure

```
.specify/
├── memory/
│   └── constitution.md           # Project principles and standards
├── .current-feature              # Pointer to active feature (contains ID)
├── templates/                    # Artifact templates
│   ├── spec-template.md
│   ├── plan-template.md
│   ├── tasks-template.md
│   └── checklist-template.md
├── scripts/                      # Bash scripts for setup
│   └── bash/
│       ├── check-prerequisites.sh
│       ├── create-new-feature.sh
│       └── setup-plan.sh
└── specs/
    └── <id>-<name>/              # Feature directories
        ├── .speckit-state.json   # State file
        ├── .progress.md          # Learnings and history
        ├── .coordinator-prompt.md # Ralph Loop coordinator instructions
        ├── spec.md               # Feature specification
        ├── plan.md               # Technical design
        ├── tasks.md              # Implementation tasks
        ├── research.md           # Research findings (optional)
        ├── data-model.md         # Entity definitions (optional)
        ├── contracts/            # API contracts (optional)
        └── checklists/           # Quality checklists (optional)
```

## The Ralph Loop Pattern

### What is Ralph Loop?

Ralph Loop is a **self-referential feedback loop** that:
1. Feeds a constant prompt to an AI agent
2. Agent executes work and tries to exit
3. Stop hook blocks exit and feeds the SAME prompt again
4. Agent sees its previous work in files and git history
5. Loop continues until completion signal

**Key Benefit**: Each iteration starts with fresh context but persistent state in files.

### How It Works in This Environment

```
┌─────────────────────────────────────────────────────────────────┐
│                    RALPH LOOP FLOW                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. Coordinator reads .speckit-state.json                       │
│     ↓                                                            │
│  2. Delegates ONE task to spec-executor agent                   │
│     ↓                                                            │
│  3. Spec-executor completes task                                │
│     ↓                                                            │
│  4. Spec-executor writes findings to .progress.md               │
│     ↓                                                            │
│  5. Spec-executor signals TASK_COMPLETE                         │
│     ↓                                                            │
│  6. Coordinator detects TASK_COMPLETE                           │
│     ↓                                                            │
│  7. Coordinator runs 4 verification layers                      │
│     ↓                                                            │
│  8. Coordinator updates state (taskIndex++, globalIteration++)  │
│     ↓                                                            │
│  9. LOOP BACK - Coordinator re-invoked with fresh context       │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### The 4 Verification Layers

Before advancing to the next task, the coordinator runs:

1. **Contradiction Detection**: Reject if "requires manual" + TASK_COMPLETE
2. **Uncommitted Files Check**: Reject if spec files not committed
3. **Checkmark Verification**: Validate task marked [x] in tasks.md
4. **Signal Verification**: Ensure TASK_COMPLETE explicitly present

## Workflow Phases

### Phase 1: Constitution

**Agent**: `ralph-speckit:constitution-architect`

Creates or updates `.specify/memory/constitution.md` with:
- **Identity**: Project name, purpose, core domain
- **Principles**: MUST/SHOULD/MAY rules
- **Technology Stack**: Languages, frameworks, tools
- **Patterns**: Architecture, naming, error handling
- **Quality Standards**: Testing, performance, security

**Invocation** (via Task tool):
```
Agent type: ralph-speckit:constitution-architect
Prompt: Create/update project constitution for [project context]
```

### Phase 2: Specify

**Agent**: `ralph-speckit:spec-analyst`

Creates `.specify/specs/<id>-<name>/spec.md` with:
- Feature overview and goals
- User stories with acceptance criteria
- Constitution alignment markers
- Out of scope items
- Dependencies and risks

**Auto-generated ID System**:
- Fetches all remote/local branches
- Finds highest feature number for the short-name
- Uses N+1 for the new branch

**Invocation** (via Task tool):
```
Agent type: ralph-speckit:spec-analyst
Prompt: Create spec for: [feature description]
```

### Phase 3: Clarify (Optional)

**Agent**: `ralph-speckit:spec-analyst` (same agent)

Resolves ambiguities through structured Q&A (max 3 questions).

### Phase 4: Plan

**Agent**: `ralph-speckit:plan-architect`

Generates `plan.md` with:
- Technical context
- Constitution compliance check
- Research findings (if any)
- Data models
- API contracts
- Integration points

**Invocation** (via Task tool):
```
Agent type: ralph-speckit:plan-architect
Prompt: Create technical plan for [feature]
```

### Phase 5: Tasks

**Agent**: `ralph-speckit:task-planner`

Breaks plan into dependency-ordered tasks organized by user story.

**Task Format**:
```markdown
- [ ] T001 [P] [US1] Create User model in src/models/user.py
  - **Do**: Implement User entity with fields...
  - **Files**: src/models/user.py
  - **Done when**: Type check passes
  - **Verify**: pnpm typecheck
  - **Commit**: feat(user): add User model
```

**Components**:
- `T001`: Sequential task ID
- `[P]`: Parallel marker (optional)
- `[US1]`: User story reference (optional)
- Description with file path

**Invocation** (via Task tool):
```
Agent type: ralph-speckit:task-planner
Prompt: Generate tasks for [feature]
```

### Phase 6: Implement (Ralph Loop)

**This is where the Ralph Loop activates.**

**Prerequisites**: `.coordinator-prompt.md` must exist in the feature directory.

Without this file:
- Feature executes in 1 pass only
- No verification layers run between tasks
- Global iterations stay at 1

With `.coordinator-prompt.md`:
- Coordinator agent orchestrates iteration
- 4 verification layers run before advancing
- Global iterations count up (30+, 50+, 100+)
- Feature fully refined through multiple passes

**Coordinator Prompt File** (`.coordinator-prompt.md`):

This file instructs the coordinator on:
1. Reading state and determining current task
2. Delegating to spec-executor via Task tool
3. Running 4 verification layers
4. Updating state (taskIndex++, globalIteration++)
5. Detecting completion

**Ralph Loop Invocation** (via Skill tool):

```
Skill: ralph-loop:ralph-loop
Args: Read .specify/specs/<feature>/.coordinator-prompt.md and follow instructions.
      Output ALL_TASKS_COMPLETE when done.
      --max-iterations <calculated>
      --completion-promise ALL_TASKS_COMPLETE
```

**How the Loop Executes**:

```
Each iteration:
1. Fresh Claude context (no accumulated tokens)
2. Coordinator reads state from files
3. Delegates ONE task to spec-executor agent
4. Spec-executor works autonomously
5. Spec-executor commits changes
6. Spec-executor signals TASK_COMPLETE
7. Coordinator detects signal
8. Coordinator runs 4 verification layers
9. Coordinator updates state file
10. Loop repeats (new Claude context, reads updated state)
```

**Max Iterations Calculation**:
```
maxIterations = (totalTasks * maxTaskIterations) + buffer
```

Where:
- `totalTasks` from state file
- `maxTaskIterations` from args (default 5)
- `buffer` = 10 (coordinator overhead)

## Agent Details

### spec-executor

**Role**: Autonomous task execution

**Key Behaviors**:
- Fully autonomous - NEVER uses AskUserQuestion
- Executes Do section exactly as specified
- Modifies only Files listed in task
- Runs Verify command before completing
- Commits with exact message from task
- Updates progress file with learnings

**Special Handling: [VERIFY] Tasks**

[VERIFY] tasks are delegated to `qa-engineer` instead of executing directly.

**Progress File Parameter** (Parallel Execution):

When `progressFile` is provided (e.g., `.progress-task-1.md`):
- Write learnings to temp file instead of .progress.md
- Enables parallel execution without write conflicts
- Coordinator merges temp files after batch completes

**File Locking** (Parallel Mode):

Uses `flock` to prevent race conditions:
```bash
(
  flock -x 200
  # Update tasks.md checkmark
) 200>".tasks.lock"
```

### qa-engineer

**Role**: Verification and quality checkpoints

**Signals**:
- `VERIFICATION_PASS`: Verification succeeded
- `VERIFICATION_FAIL`: Verification failed, needs retry

**Behavior**:
- Executes verification as specified
- Attempts to fix issues if found
- Outputs clear pass/fail signal
- Documents specific failures

### Coordinator

**Role**: Orchestrate Ralph Loop (defined in `.coordinator-prompt.md`)

**Key Responsibilities**:
1. Read state from `.speckit-state.json`
2. Parse current task from `tasks.md`
3. Detect parallel groups (consecutive [P] tasks)
4. Delegate to spec-executor or qa-engineer
5. Run 4 verification layers
6. Update state
7. Signal ALL_TASKS_COMPLETE when done

**Parallel Group Detection**:

Scans for consecutive [P] tasks and executes them in parallel:

```
Tasks:
- [ ] T003 [P] Task A  ┐
- [ ] T004 [P] Task B  ├─ Parallel batch
- [ ] T005 [P] Task C  ┘
- [ ] T006 Task D (sequential)

Batch: indices [3, 4, 5]
All execute simultaneously
Wait for ALL to complete
Advance to task 6
```

## Task Format

### Standard Task

```markdown
- [ ] T001 Create project structure
  - **Do**: Create directories and config files
  - **Files**: package.json, tsconfig.json, src/
  - **Done when**: All files exist
  - **Verify**: ls -la src/
  - **Commit**: chore: initialize project structure
```

### Parallel Task

```markdown
- [ ] T005 [P] Implement auth middleware
  - **Do**: Create JWT verification middleware
  - **Files**: src/middleware/auth.ts
  - **Done when**: Type check passes
  - **Verify**: pnpm typecheck
  - **Commit**: feat(auth): add JWT middleware
```

### Verification Task

```markdown
- [ ] T010 [VERIFY] Quality checkpoint
  - **Do**: Run lint, typecheck, tests
  - **Files**: (read-only verification)
  - **Done when**: All checks pass
  - **Verify**: (delegated to qa-engineer)
  - **Commit**: chore(qa): pass quality checkpoint
```

## Execution Rules

### Phase-Specific Rules

**Phase 1 (POC)**:
- Skip tests, accept hardcoded values
- Only type check must pass

**Phase 2 (Refactoring)**:
- Clean up code, add error handling
- Follow project patterns

**Phase 3 (Testing)**:
- Write tests as specified
- All tests must pass

**Phase 4 (Quality Gates)**:
- All local checks must pass
- Create PR, verify CI

### Commit Discipline

**CRITICAL**: Always commit spec files with every task:

```bash
# Sequential execution:
git add ./.specify/specs/<feature>/tasks.md
git add ./.specify/specs/<feature>/.progress.md

# Parallel execution:
git add ./.specify/specs/<feature>/tasks.md
git add ./.specify/specs/<feature>/.progress-task-N.md
```

### Default Branch Protection

NEVER push directly to main/master:
1. Verify current branch: `git branch --show-current`
2. If on default branch, STOP and alert
3. Only push to feature branches

## Completion Signals

### spec-executor Signals

| Signal | Meaning |
|--------|---------|
| `TASK_COMPLETE` | Task finished successfully |

### qa-engineer Signals

| Signal | Meaning |
|--------|---------|
| `VERIFICATION_PASS` | Verification succeeded |
| `VERIFICATION_FAIL` | Verification failed |

### Coordinator Signals

| Signal | Meaning |
|--------|---------|
| `ALL_TASKS_COMPLETE` | All tasks done, end loop |

## Error Handling

### Max Retries Reached

When `taskIteration > maxTaskIterations`:
1. Output error with task index and attempt count
2. Include last failure reason
3. Suggest manual intervention
4. Do NOT output ALL_TASKS_COMPLETE
5. Loop continues but task stays blocked

### State Corruption

If state file missing or invalid:
1. Output error with state file path
2. Suggest re-running implement command
3. Do NOT continue execution

### Contradiction Detection

If spec-executor claims completion while admitting failure:
1. REJECT the completion
2. Log contradiction
3. Increment taskIteration and retry

## Best Practices

### Starting New Features

1. Ensure constitution exists and is current
2. Use descriptive feature names (kebab-case)
3. Include clear success criteria in spec
4. Reference related features if applicable

### During Implementation

1. Follow task order (dependencies matter)
2. Commit after each task
3. Update progress with learnings
4. Run verification checkpoints

### Maintaining Constitution

1. Version constitution changes semantically
2. Run sync impact analysis after updates
3. Update affected features if needed
4. Document rationale for changes

## Command Reference

### In This Environment

| Agent Type | Purpose | Phase |
|------------|---------|-------|
| `ralph-speckit:constitution-architect` | Create/update constitution | Constitution |
| `ralph-speckit:spec-analyst` | Generate specifications | Specify |
| `ralph-speckit:plan-architect` | Technical design | Plan |
| `ralph-speckit:task-planner` | Task breakdown | Tasks |
| `ralph-speckit:spec-executor` | Execute single task | Implement |
| `ralph-speckit:qa-engineer` | Verification tasks | Implement |

### Skills

| Skill | Purpose |
|-------|---------|
| `ralph-loop:ralph-loop` | Execute Ralph Loop with coordinator prompt |

## Common Patterns

### User Story Organization

Tasks are organized by user story to enable independent implementation:

```
Phase 1: Setup
Phase 2: Foundational (blocking prerequisites)
Phase 3: User Story 1 (P1 priority)
Phase 4: User Story 2 (P2 priority)
Phase 5: User Story 3 (P3 priority)
Phase 6: Polish & Cross-Cutting Concerns
```

### Constitution Markers

Reference constitution in artifacts:
- `[C§3.1]`: References constitution section 3.1
- `[MUST]`: Required by constitution
- `[SHOULD]`: Recommended by constitution
- `[MAY]`: Optional per constitution

## Troubleshooting

### Feature Not Iterating

**Problem**: Global iteration stays at 1

**Solution**: Create `.coordinator-prompt.md` in feature directory

### Tasks Not Advancing

**Problem**: taskIndex not incrementing

**Check**:
1. Are all 4 verification layers passing?
2. Is TASK_COMPLETE signal present?
3. Are spec files committed?
4. Is task marked [x] in tasks.md?

### Parallel Execution Issues

**Problem**: Conflicts in tasks.md updates

**Solution**: Ensure `flock` is used for file locking in parallel mode

## Additional Resources

- **Original Ralph Loop**: https://ghuntley.com/ralph/
- **Ralph Orchestrator**: https://github.com/mikeyobrien/ralph-orchestrator
- **Smart Ralph Plugin**: https://github.com/tzachbon/smart-ralph
