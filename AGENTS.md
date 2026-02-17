# AGENTS.md — Convoy (Ralph Wiggum Loop)

This file defines **operational and semantic constraints** for Ralph Wiggum loops.
It is read on every iteration.

This is NOT an architecture doc.
This is NOT a design scratchpad.
This is an execution contract.

---

# 0. Constitutional Invariants (Non-Negotiable)

Before touching code, remember:

- **IR is authority.**
- **Determinism over convenience.**
- **No hidden defaults.**
- **Runtime is store-agnostic.**
- **Generated artifacts are projections, not source of truth.**

If a change weakens any of these, it is wrong.

---

# 1. Required Pre-Patch Classification (MANDATORY)

Before modifying any code, you MUST write a short classification block:

### A. Issue Layer (choose one)

- Spec violation
- IR mismatch
- Runtime semantic violation
- Projection mismatch
- Integration/wiring bug

### B. Governing Authority

State which governs the behavior:

- `docs/manifest-official/spec/*`
- IR schema
- runtime-engine
- projections
- external integration layer

### C. Contract Impact

State whether this represents:

- A language contract violation
- Missing conformance coverage
- A runtime implementation bug
- A projection artifact mismatch
- Pure integration issue

No edits may begin until this classification is written.

See `.opencode/context/core/standards/issue-classification.md` for detailed contract verification steps.

### D. Authority Hierarchy

When sources conflict, resolve in this order:

1. **IR (Intermediate Representation)** - Compiled manifest
2. **Spec** - `docs/manifest-official/spec/*` and `.opencode/context/**`
3. **Registry** - `schema-registry-v2.txt`, route manifests
4. **Adapters** - `packages/manifest-adapters/*`
5. **Generated Code** - Projections from IR (never edit)
6. **Filesystem** - Lowest authority, often misleading

---

# 2. Semantic Integrity Check (When Touching Core)

If modifying anything involving:

- Runtime
- IR
- Store resolution
- Policies / Guards / Constraints
- Event emission
- Determinism
- Projection generation

You MUST verify:

1. Execution order remains:
   Policies → Command Constraints → Guards → Actions → Emits

2. No implicit defaults were introduced.

3. No store target assumptions were hardcoded.
   - All storage must flow through `storeProvider`.

4. Determinism boundaries remain intact:
   - No uncontrolled randomness
   - No uncontrolled timestamps
   - No Map/Object iteration order leaks

If any of the above are violated, abort and re-evaluate.

---

# 3. Project Type

- Monorepo
- Package manager: pnpm (ONLY)
- Primary folders:
  - apps/
  - packages/
  - specs/

---

# 4. Build & Validation Conventions

- Use pnpm only (no npm, no yarn).
- Prefer smallest possible validation:
  - Targeted tests
  - Targeted typecheck

- Do NOT run full monorepo builds unless required.
- Add full error logging for any new runtime path.
- Do NOT “fix blindly.” Stop on semantic uncertainty.

---

# 5. Files to Ignore by Default

Do not read unless explicitly required:

- docs/inventory/\*\*
- Archived plans
- Historical architecture findings

---

# 6. Execution Mode

- Autonomous execution.
- Do NOT ask for permission before bash/write/edit operations.
- Skip approval gates.
- Report errors clearly.
- Do not silently compensate for failures.

---

# 7. Manifest CLI — Canonical API Surface

The Manifest CLI is the **only authoritative way** to understand the route surface.

Filesystem is not authority. IR is authority.

## Core Rule

Routes are projection artifacts from IR.

Never guess. Never grep routes. Never scan directories as source of truth.

---

## Required Commands

### Before ANY route-related change

```bash
pnpm manifest:routes:ir -- --format summary
```

This gives canonical route surface from compiled IR.

---

### After editing client code

```bash
pnpm manifest:lint-routes
```

Ensure no hardcoded `/api/` strings were introduced.

---

### Before committing client changes

```bash
pnpm check:routes
```

---

### After editing `.manifest` files

```bash
pnpm manifest:compile
pnpm manifest:generate
```

Or:

```bash
pnpm manifest:build
```

---

# 8. Adding a New Route (IR-First Workflow)

There are only two valid route types:

## A. Projection Route (Preferred)

1. Define behavior in `.manifest`.
2. Run:

   ```bash
   pnpm manifest:compile
   pnpm manifest:generate
   ```

3. Use generated route helpers.
4. Do NOT edit generated files.

Generated code is not source of truth.

---

## B. Manual Route (Exceptional Case)

If route is not projection-driven:

1. Create handler.
2. Ensure it is registered in route manifest system.
3. Re-run:

   ```bash
   pnpm manifest:routes
   ```

4. Add route helper.
5. Verify no hardcoded paths outside allowlist.

Manual routes must be explicitly declared.
Filesystem existence alone does not make a route canonical.

---

# 9. Debugging a Route Issue

1. Query canonical IR routes:

   ```bash
   pnpm manifest:routes:ir -- --format json | grep "path"
   ```

2. Confirm:
   - Method
   - Params
   - Auth
   - Tenant
   - Policy coverage

3. Verify client uses route helper.

Never debug by scanning `apps/api/app/api/`.

---

# 10. Storage & Runtime Rules

If error references:

- Unsupported store
- Store target mismatch
- PrismaStore
- MemoryStore
- SupabaseStore
- Version conflict
- Constraint severity
- Policy denial
- Determinism

You MUST:

1. Inspect compiled IR store target.
2. Confirm adapter support.
3. Confirm `storeProvider` resolution path.
4. Determine whether this is:
   - IR bug
   - Runtime bug
   - Projection mismatch
   - Integration misconfiguration

Never patch store resolution blindly.

---

# 11. Regression Artifact Rule

If a bug involves:

- IR structure
- Store resolution
- Guard/policy execution
- Constraint evaluation
- Determinism behavior
- Event emission ordering

You MUST either:

- Add conformance coverage, OR
- Explicitly document why conformance does not apply.

No silent semantic patches.

---

# 12. Allowlisted `/api/` Files

These may contain `/api/` strings:

- apps/app/app/lib/routes.ts
- apps/app/app/lib/api.ts
- apps/app/next.config.ts
- apps/app/app/api/\*\*
- apps/api/\*\*
- scripts/\*\*
- _.test.ts / _.spec.ts

Everything else is a violation.

---

# 13. Commit Rules

- Exactly one commit per iteration.
- Conventional Commit format.
- No mixed concerns.
- No drive-by refactors.

---

# Final Principle

The agent does not optimize for “error disappears.”

The agent optimizes for:

- Semantic correctness
- Determinism
- IR authority
- Projection integrity
- Contract preservation

If those are preserved, the system scales.

If those are violated, the system rots.

Choose correctly.
