# AGENTS.md - AI Agent Coordination System

**Version:** 2.0.0
**Last Updated:** 2026-01-05
**Project:** Enterprise Catering Management System

---
										 # Convoy repo instructions (entrypoint)

Before doing any work, read:
"C:\Users\Ryan\Home\agent-scripts\AGENTS.MD"
"C:\Users\Ryan\Home\agent-scripts\docs" relevant docs only

Repo specifics:
- Use pnpm.

## Guardrails (Do Not Drift)
- Stack: Prisma + Neon; no Supabase RLS.
- Multi-tenant: shared DB with `tenant_id`.
- Realtime: Ably via outbox pipeline.
- Priority order: kitchen tasks, then events, then scheduling.
- Clerk
- Mint docs at http://localhost:2232/introduction


## Planning With Files (Required)

- Create `task_plan.md` and `notes.md` at task start for complex work.
- Update `task_plan.md` after each phase.
- Archive completed `task_plan.md` under `docs/task-plans/`.
- Treat `notes.md` as a scratch pad:
  - Keep a static Guardrails section at the top.
  - Keep a short Handoff section after each task.
  - Clear the scratch content when a task is complete (do not delete the file)
  
---


**THE FOLLOWING IS FOR CLAUDE CODE NOT CODEX**
  
## Table of Contents

1. [Overview](#overview)
2. [Agentic Development Workflow](#agentic-development-workflow)
3. [Agent Architecture](#agent-architecture)
4. [Specialist Agents](#specialist-agents)
5. [Coordination Patterns](#coordination-patterns)
6. [Delegation Rules](#delegation-rules)
7. [Verification & Quality Gates](#verification--quality-gates)
8. [Workflows](#workflows)
9. [Skills System](#skills-system)
10. [Best Practices](#best-practices)
11. [Guardrails & Constraints](#guardrails--constraints)
12. [Performance Optimization](#performance-optimization)

---

## Overview

The Enterprise Catering Management System uses a **multi-agent orchestration architecture** where the main thread acts as an **Orchestrator** that delegates work to specialist subagents. This pattern prevents the common failure mode where AI models collapse into single-agent blob behavior and start improvising without proper oversight.

### Core Principle

> **"The main thread is the Orchestrator, not the Implementer"**

The Orchestrator's job is to:
- Restate goals as explicit acceptance criteria
- Choose the correct specialist subagent(s)
- Delegate work to those subagents
- Merge outcomes into a final plan
- Only then proceed to controlled execution



**Full documentation continues at:** C:/Projects/capsule/AGENTS_FULL.md

[Note: This is a condensed version. The full comprehensive AGENTS documentation has been created and is ready for deployment.]
