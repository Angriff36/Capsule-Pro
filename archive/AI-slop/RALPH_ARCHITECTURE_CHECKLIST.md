# Ralph Architecture — What MUST Be Preserved

> **TL;DR**: Ralph's genius is **subagent garbage collection** keeping the main agent at ~176kb effective context (sweet spot). This document ensures future Ralph setups preserve this architecture.

---

## The Core Genius: Context Window Management

### The Problem Ralph Solves

- Claude advertises 200K tokens, but only ~176K is **truly usable**
- 40-60% context utilization = "smart zone"
- **Bloated context = bad decisions, hallucinations, task drift**

### The Ralph Solution

```
Main Agent (~176kb effective context)
├── Acts as scheduler/coordinator ONLY
├── Spawns 200-500 Sonnet subagents per iteration
│   ├── Each subagent: ~156kb context
│   ├── Each subagent: Garbage collected after use
│   └── Fan out work to avoid polluting main context
└── Loads same files each iteration (deterministic setup)
    ├── PROMPT.md (~first 5,000 tokens)
    ├── AGENTS.md (operational only, ~60 lines)
    └── IMPLEMENTATION_PLAN.md (shared state)
```

**Result**: Main agent stays in sweet spot, 200-500 subagents do the heavy lifting, garbage collection prevents bloat.

---

## Critical Checklist for New Ralph Setups

### ✅ 1. Subagent Spawning Instructions

**MUST INCLUDE in PROMPT files:**

```markdown
# Planning Mode

Use up to 500 parallel Sonnet subagents to study existing source code

# Build Mode

Use up to 500 parallel Sonnet subagents for searches/reads
Use only 1 Sonnet subagent for build/tests (backpressure control)
```

**Why**: The prompt **explicitly tells** the agent to spawn subagents. Without this, the main agent does all the work and bloats.

### ✅ 2. "Don't Assume Not Implemented"

**MUST INCLUDE in PROMPT files:**

```markdown
Don't assume functionality is missing - search the codebase first
```

**Why**: This is **THE critical guardrail** that prevents Ralph from rebuilding existing functionality. Without it, Ralph wastes context re-implementing what already exists.

### ✅ 3. Deterministic File Loading

**MUST LOAD every iteration:**

- `PROMPT.md` — Instructions (first ~5,000 tokens)
- `AGENTS.md` — Operational guide (~60 lines)
- `IMPLEMENTATION_PLAN.md` — Shared state

**Why**: Every loop starts from **known state**. Same files = deterministic behavior.

### ✅ 4. AGENTS.md Bloat Prevention

**AGENTS.md should ONLY contain:**

- Build/run commands
- Test/validation commands
- Operational learnings (brief)

**NEVER put in AGENTS.md:**

- ❌ Status updates
- ❌ Progress tracking
- ❌ Task lists
- ❌ Detailed explanations

**Why**: AGENTS.md is loaded **every iteration**. Bloat = wasted context every loop.

### ✅ 5. 999-Numbered Guardrails

**MUST INCLUDE at end of PROMPT_build.md:**

```markdown
999. Don't assume not implemented - search first
1000. Use parallel subagents - 500 for searches, 1 for tests
1001. Keep IMPLEMENTATION_PLAN.md current
1002. Update AGENTS.md sparingly - only operational commands
1003. Complete implementations only - no placeholders
```

**Why**: Higher numbers = **more critical**. These are invariants that prevent common failure modes.

### ✅ 6. Plan-Driven Workflow

**Structure:**

```
PLANNING mode:
  Study specs → Study code → Generate/update plan → No implementation

BUILDING mode:
  Read plan → Pick task → Search codebase → Implement → Test → Commit → Update plan
```

**Why**: The plan is **shared state** between isolated loop executions. Each iteration is a fresh context window.

### ✅ 7. Fresh Context Per Iteration

**Loop structure:**

```bash
while true; do
  cat PROMPT.md | claude -p --dangerously-skip-permissions
  # Agent completes ONE task, commits, exits
  # Bash loop restarts → fresh context window
done
```

**Why**: Fresh context = no accumulation of cruft. Each task starts clean.

---

## How to Verify Ralph is Working Correctly

### ✅ Good Signs (Ralph in Sweet Spot):

1. **200-500 subagents spawned per iteration**
   - Check logs: `grep -c "parallel.*subagent" loop-*.log`
2. **Subagents complete and garbage collect**
   - Look for: "subagent finished" messages
3. **Concise summaries, not full dumps**
   - Subagents return 2-3 sentence summaries
4. **Parallel file operations**
   - Multiple files modified per task using subagents
5. **One commit per task**
   - Clean git log with conventional commits

### 🚨 Warning Signs (Ralph Bloated):

1. **<200 subagents per iteration**
   - Main agent doing too much work directly
2. **Subagents not completing**
   - Hanging, context leak
3. **Full file dumps in responses**
   - Context bloat, not using subagents properly
4. **No parallelization**
   - Sequential execution instead of fan-out
5. **Multiple retries on same task**
   - Agent confused, losing context

---

## Model Selection Guidelines

### When to Use Opus:

- ✅ **Complex reasoning** (task prioritization, architectural decisions)
- ✅ **Planning mode** (gap analysis, plan generation)
- ✅ **Unclear requirements** (needs interpretation)

### When to Use Sonnet:

- ✅ **Well-defined tasks** (clear acceptance criteria)
- ✅ **Bug fixes** (known problem, known solution)
- ✅ **Speed > reasoning** (simple implementations)

**Important**: The subagent spawning is **prompted behavior**, not model-specific. Both Opus and Sonnet will spawn subagents if instructed.

---

## Common Mistakes to Avoid

### ❌ Mistake 1: Forgetting Subagent Instructions

**Bad:**

```markdown
Study the codebase and understand the implementation
```

**Good:**

```markdown
Use up to 500 parallel Sonnet subagents to study the codebase
```

### ❌ Mistake 2: Bloating AGENTS.md

**Bad:**

```markdown
## Progress

- Task 1: Complete
- Task 2: In progress
- Found issue in X, will fix in Y
```

**Good:**

```markdown
## Validation

- Tests: `pnpm test`
- Build: `pnpm build`
```

### ❌ Mistake 3: No "Don't Assume" Guardrail

**Result**: Ralph rebuilds existing functionality, wastes context

### ❌ Mistake 4: Prescriptive Implementation Instructions

**Bad:**

```markdown
Use K-means clustering with 3 iterations
```

**Good:**

```markdown
Extract 5-10 dominant colors (how is up to Ralph)
```

**Why**: "Let Ralph Ralph" — specify WHAT (outcomes), not HOW (implementation).

---

## Quick Reference: Prompt Template

```markdown
# PROMPT_plan.md

0a. Study specs/_ with up to 250 parallel Sonnet subagents
0b. Study IMPLEMENTATION_PLAN.md (if present)
0c. Study src/lib/_ with up to 250 parallel Sonnet subagents

1. Use up to 500 Sonnet subagents to study src/_ and compare against specs/_
   Use Opus subagent to analyze findings and update IMPLEMENTATION_PLAN.md

IMPORTANT: Plan only. Don't assume not implemented - search first.

# PROMPT_build.md

0a. Study specs/\* with up to 500 parallel Sonnet subagents
0b. Study IMPLEMENTATION_PLAN.md

1. Use up to 500 parallel Sonnet subagents for searches/reads
   Use only 1 Sonnet subagent for build/tests
   Don't assume not implemented - search first

2. Run tests after implementation
3. Update IMPLEMENTATION_PLAN.md when done
4. Commit when tests pass

5. Don't assume not implemented
6. Use parallel subagents
7. Keep IMPLEMENTATION_PLAN.md current
8. Update AGENTS.md sparingly
9. Complete implementations only
```

---

## Summary: The Non-Negotiables

1. ✅ **Spawn 200-500 subagents per iteration** (explicit in PROMPT)
2. ✅ **"Don't assume not implemented"** (critical guardrail)
3. ✅ **Load same files each iteration** (deterministic setup)
4. ✅ **Keep AGENTS.md operational only** (no bloat)
5. ✅ **Fresh context per iteration** (loop structure)
6. ✅ **999-numbered guardrails** (critical invariants)
7. ✅ **Plan-driven workflow** (shared state via file)

**If any of these are missing, Ralph loses the genius of staying in the sweet spot.**

---

**Last Updated**: 2026-02-16
**Verified Against**: Original Ralph Playbook (ralphwiggum.txt)
