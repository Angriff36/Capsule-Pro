# Task for crew-worker

# Task Assignment

**Task ID:** task-3
**Task Title:** Validate PurchaseOrder current-task claims against code
**PRD:** docs/SPEC.md


## Your Mission

Implement this task following the crew-worker protocol:
1. Join the mesh
2. Read task spec to understand requirements
3. Start task and reserve files
4. Implement the feature
5. Commit your changes
6. Release reservations and mark complete

## Progress from Prior Attempts

[2026-04-28T20:13:20.615Z] (system) Assigned to crew-worker (attempt 1)
[2026-04-28T20:18:06.149Z] (system) Assigned to crew-worker (attempt 1)

## Concurrent Tasks

These tasks are being worked on by other workers in this wave. Discover their agent names after joining the mesh via `pi_messenger({ action: "list" })`.

- task-1: Review IMPLEMENTATION_PLAN.md structure and archive discipline
- task-2: Validate Proposal current-task claims against code
- task-4: Review blockers, followups, and verification criteria

## Task Specification

# Validate PurchaseOrder current-task claims against code

Review IMPLEMENTATION_PLAN.md Step 2 — PurchaseOrder. Verify frontend entry paths/fetch URLs, canonical inventory/procurement API routes, PurchaseOrder/PurchaseOrderItem store claims, command route instanceId usage, and item PATCH route storage paths. Do not edit files. Output: route/storage matrix, any incorrect/stale plan text, and minimal proposed edits.


## Coordination

**Message budget: 10 messages this session.** The system enforces this — sends are rejected after the limit.

**Broadcasts go to the team feed — only the user sees them live.** Other workers see your broadcasts in their initial context only. Use DMs for time-sensitive peer coordination.

### Announce yourself
After joining the mesh and starting your task, announce what you're working on:

```typescript
pi_messenger({ action: "broadcast", message: "Starting <task-id> (<title>) — will create <files>" })
```

### Coordinate with peers
If a concurrent task involves files or interfaces related to yours, send a brief DM. Only message when there's a concrete coordination need — shared files, interfaces, or blocking questions.

```typescript
pi_messenger({ action: "send", to: "<peer-name>", message: "I'm exporting FormatOptions from types.ts — will you need it?" })
```

### Responding to messages
If a peer asks you a direct question, reply briefly. Ignore messages that don't require a response. Do NOT start casual conversations.

### On completion
Announce what you built:

```typescript
pi_messenger({ action: "broadcast", message: "Completed <task-id>: <file> exports <symbols>" })
```

### Reservations
Before editing files, check if another worker has reserved them via `pi_messenger({ action: "list" })`. If a file you need is reserved, message the owner to coordinate. Do NOT edit reserved files without coordinating first.

### Questions about dependencies
If your task depends on a completed task and something about its implementation is unclear, read the code and the task's progress log at `.pi/messenger/crew/tasks/<task-id>.progress.md`. Dependency authors are from previous waves and are no longer in the mesh.

### Claim next task
After completing your assigned task, check if there are ready tasks you can pick up:

```typescript
pi_messenger({ action: "task.ready" })
```

If a task is ready, claim and implement it. If `task.start` fails (another worker claimed it first), check for other ready tasks. Only claim if your current task completed cleanly and quickly.

