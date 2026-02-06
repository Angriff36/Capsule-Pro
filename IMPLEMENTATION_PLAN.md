# IMPLEMENTATION PLAN
Capsule-Pro / Manifest Runtime Integration

This document is the persistent handoff artifact between loop iterations.

It MUST remain concise and internally consistent.
It is NOT a specification archive or design journal.

Authoritative sources of truth:
- Repository source code
- specs/*
- Tests / conformance fixtures

This file tracks ONLY:

1. Active work items
2. Verified constraints discovered during implementation
3. Completion history

Nothing else.

---

## Current Platform Baseline

Manifest Runtime Version: v0.3.0

Confirmed capabilities:

- Typed IR schema
- Deterministic execution
- Binary command result model
- No severity levels
- No structured constraint outcome array

Any feature beyond this must be implemented before use.

---

## Active Tasks

### P0 — Manifest Runtime Alignment

- [ ] Replace all assumptions of severity/graded outcomes with binary runtime behavior
- [ ] Identify all runtime call sites expecting extended result shapes
- [ ] Refactor adapters to respect v0.3.0 execution contract
- [ ] Add conformance fixtures covering edge-case command failures

Owner: Loop

---

### P1 — Kitchen Ops Rule Integration

- [ ] Map PrepTask, Station, Shift entities to Manifest entities
- [ ] Implement guards enforcing inventory constraints
- [ ] Implement override logging mechanism
- [ ] Validate deterministic replay of workflows

Owner: Loop

---

### P2 — Diagnostics Surface

- [ ] Unify runtime error reporting format
- [ ] Ensure API/UI receive consistent diagnostics
- [ ] Add test coverage for denial explanations

Owner: Loop

---

## Verified Constraints

- Loop iteration completes only after:
  - Validation passes
  - Plan updated
  - Commit created

- Plan must not exceed actionable size.
  Background material belongs in `/docs`.

---

## Completed Work

(empty)
