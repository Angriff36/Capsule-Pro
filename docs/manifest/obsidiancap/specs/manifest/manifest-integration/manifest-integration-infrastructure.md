Because you told me to “combine,” and I did the mechanical merge, then I trimmed duplicated/“implementation diary” sections to keep the spec focused on behavior + tests. That’s useful if you’re handing it to someone to execute. It’s not useful if your goal is “single canonical document that preserves every constraint, every file list, every known limitation, and every next step.”

So here’s the version you actually meant: one spec that retains basically everything from both, with the verification layer added, not replacing the infra layer. This is the “nothing important left behind” merge.

---

# Feature Specification: Manifest Integration Infrastructure + Production Verification

Feature Branch: `[manifest-integration-verification]`
Created: 2026-02-08
Status: Infrastructure Complete (Phases A–E), Verification Work In Progress
Input: “Integrate Manifest v0.3.8 projection system into Capsule-Pro to enable declarative command generation with guard/policy/constraint enforcement, and prove generated handlers are production-correct under real runtime, auth, and database conditions.”

## User Scenarios & Testing (mandatory)

### User Story 1 - Generate Command Handlers from Manifest Files (Priority: P1)

As a developer, I want to run a CLI command that generates Next.js API route handlers from `.manifest` files, so that I don’t have to manually write boilerplate command validation code. This matters because manual routes drift over time and create subtle mismatches in guard/policy behavior that users experience as “sometimes it works, sometimes it doesn’t.”

Why this priority: This is the core value proposition, eliminating manual route writing and enforcing consistent guard/policy/constraint behavior.

Independent Test: Fully testable by running `manifest-generate nextjs nextjs.command <manifest-file> <Entity> <Command>` and verifying the generated route exists at the output path with correct TypeScript types and validation logic.

Acceptance Scenarios:

1. Given a valid manifest defining `PrepTask.claim`, when running `manifest-generate nextjs nextjs.command prep-task-rules.manifest PrepTask claim --output route.ts`, then the generated POST handler:

   * Authenticates via Clerk (checks both `userId` and `orgId`)
   * Resolves `tenantId` from `orgId` using `getTenantIdForOrg`
   * Parses request body as JSON
   * Creates a Manifest runtime with user context
   * Calls `runtime.runCommand("claim", body, { entityName: "PrepTask" })`
   * Returns success response with result and emitted events
   * Returns policy denials as 403, guard failures as 422, general failures as 400, and unexpected errors as 500

2. Given a manifest with multiple commands, when running the CLI for each command, then each generated route is independent and can deploy without the others.

---

### User Story 2 - Runtime Bridge to Domain Logic (Priority: P1)

As a developer, I want generated handlers to automatically wire into existing domain logic (kitchen-ops) so that validation happens before business logic executes. If this isn’t correct, users will see state changes happen when they shouldn’t, or fail for reasons that don’t match the manifest rules.

Why this priority: Without this, generated handlers are just shells.

Independent Test: Call a generated endpoint and verify guards/policies/constraints are enforced and, if valid, domain logic executes with correct state transitions.

Acceptance Scenarios:

1. Given a PrepTask in `pending`, when calling generated `claim` with valid user context, then status changes to `claimed` and user is assigned.

2. Given a PrepTask already `in_progress`, when calling `claim`, then request is rejected with a guard failure (invalid state transition).

---

### User Story 3 - Declare Rules in Manifest Language (Priority: P2)

As a developer, I want to define business rules (guards, policies, constraints) in `.manifest` files rather than TypeScript, so rules are centralized, readable, and automatically enforced. This reduces the “hidden validation” problem where frontend and API disagree and users get confusing rejections.

Why this priority: Developer experience and maintainability.

Independent Test: Modify a manifest rule, regenerate, and verify behavior changes without writing TypeScript validation.

Acceptance Scenarios:

1. Given `prep-task-rules.manifest` with guards, when adding guard `self.quantity > 0`, then regenerated handlers reject zero/negative quantities.

2. Given policy definitions, when user lacks required role, then handler returns 403 with policy name.

---

### User Story 4 - Incremental Migration Path (Priority: P3)

As a developer, I want to migrate manual routes to Manifest-generated routes incrementally, so adoption doesn’t require a big-bang rewrite. This directly affects reliability because it reduces the risk of breaking existing user flows.

Why this priority: Enables gradual adoption.

Independent Test: Generate Manifest routes for one entity while other entities remain manual; both coexist.

Acceptance Scenarios:

1. Given manual routes at `/api/kitchen/prep-tasks/[id]/claim`, when generating `/api/kitchen/prep-tasks/commands/claim`, then both work in parallel.

2. Given both routes, when frontend switches to the Manifest route, then manual route can later be removed without breaking the system.

---

## Production Verification Layer (added; mandatory for readiness)

### User Story 5 – Execute Generated Command Handler End-to-End (Priority: P1)

As a developer, I want to send real HTTP requests to a Manifest-generated Next.js handler and get correct HTTP responses, so I can trust it outside unit tests.

Why this priority: Static correctness is already proven. Runtime behavior is the remaining risk.

Independent Test: Boot Next.js test server, issue HTTP POST requests, assert status codes and response bodies.

Acceptance Scenarios:

1. Given generated `PrepTask.claim` route and a valid PrepTask instance, when POST is sent with valid input, then response is 200 with `{ result, events }`.

2. Given invalid JSON body, when POST is sent, then response is 400 with formatted error.

---

### User Story 6 – Enforce Guards, Policies, and Constraints via HTTP (Priority: P1)

As a developer, I want all Manifest validation failures to surface as correct HTTP responses, so frontend behavior is predictable instead of “random” from the user’s perspective.

Independent Test: Send requests that intentionally hit each branch.

Acceptance Scenarios:

1. Guard failure → 422 with guard message.
2. Policy denial → 403 with policy name.
3. Block-severity constraint failure → 400 and no state change.

---

### User Story 7 – Support Real Auth + Tenant Resolution (Priority: P1)

As a developer, I want generated handlers to run with real Clerk authentication and tenant resolution, so local/staging/prod behave the same.

Independent Test: Enable Clerk auth, pass real `userId`/`orgId`, assert tenant-scoped behavior.

Acceptance Scenarios:

1. Valid Clerk-auth request passes `{ userId, tenantId }` into runtime.
2. Unknown org mapping returns 400 “Tenant not found”.

---

### User Story 8 – Validate All Commands for One Entity (Priority: P2)

As a developer, I want every command for an entity generated and verified so one working command doesn’t hide generator bugs in others.

Independent Test: Generate and execute all commands for PrepTask.

Acceptance Scenarios:

1. Given all PrepTask commands, when invoked under valid conditions, then each succeeds with correct side effects.
2. Given invalid state transitions, failures match manifest rules.

---

### User Story 9 – Verify Multiple Entities (Priority: P2)

As a developer, I want verification beyond PrepTask so correctness is systemic, not entity-specific.

Independent Test: Repeat user stories 5–8 for at least one additional entity.

Acceptance Scenarios:

1. Given a second entity with commands, when routes are generated and executed, then behavior matches its manifest definitions.

---

### Edge Cases (combined)

* Manifest syntax errors → CLI outputs compilation diagnostics and exits non-zero
* Invalid manifest path → CLI exits non-zero with diagnostics
* Missing required fields → runtime rejection mapped to 422 (guard failure formatting)
* Tenant lookup null → 400 “Tenant not found”
* Unrecognized command name at runtime → handler catches and returns 500
* Multiple constraints failing → diagnostics surfaced (not silently dropped)
* Unexpected runtime throw → 500 with generic message

## Requirements (mandatory)

### Functional Requirements (merged)

* FR-001 System MUST provide `manifest-generate` CLI accepting target, surface, manifest path, entity, command
* FR-002 System MUST generate Next.js App Router route handlers (POST for commands, GET for queries) with proper TypeScript types
* FR-003 System MUST support Clerk auth with `userId` and `orgId`
* FR-004 System MUST resolve tenant ID via `getTenantIdForOrg`
* FR-005 System MUST create Manifest runtime with `{ userId, tenantId }` context
* FR-006 System MUST invoke Manifest RuntimeEngine command execution method (`runCommand`) and handle success/failure
* FR-007 Projection MUST map policy denials to HTTP 403 with policy name
* FR-008 Projection MUST map guard failures to HTTP 422 with formatted message
* FR-009 Projection MUST map general command failures to HTTP 400 with error message
* FR-010 Generated handlers MUST return HTTP 500 for unexpected errors with generic message
* FR-011 Success MUST include emitted events
* FR-012 System MUST cache compiled IR in memory at module level (per process)
* FR-013 System MUST load manifest files from `packages/kitchen-ops/manifests/`
* FR-014 System MUST execute generated handlers via real HTTP requests (verification harness)
* FR-015 System MUST verify all commands for at least one entity end-to-end
* FR-016 System MUST verify at least two entities end-to-end
* FR-017 System MUST operate without app-level stubs or fake adapters for “production correctness” verification
* FR-018 Generator/runtime contracts MUST be enforced at compile time
* FR-019 CLI MUST fail fast on invalid inputs with diagnostics

### Key Entities (merged)

ProjectionTarget defines a code generation target with surfaces and options. ProjectionRegistry memoizes and manages projections and auto-registration. NextJsProjection generates Next.js handlers from Manifest IR with Capsule-Pro auth/tenant resolution. ManifestRuntime bridges generated handlers to domain logic and executes `runCommand()` with guard/policy/constraint enforcement. GeneratedRoute follows the standard pattern: auth → tenant lookup → runtime invocation → response formatting.

## Success Criteria (mandatory)

### Measurable Outcomes (merged)

* SC-001 Devs generate a command handler with a single CLI command and 5 arguments
* SC-002 Generated handlers pass Biome lint cleanly (excluding explicitly acceptable CLI complexity warnings)
* SC-003 Generated handlers build in Next.js without type errors
* SC-004 Calling generated command enforces all manifest guards
* SC-005 Calling generated command enforces all manifest policies
* SC-006 Generated routes return consistent response shape `{ success: boolean, result?, events?, message? }` (Manifest routes only; manual routes unchanged)
* SC-007 Manifest edit → regenerate → build → deploy under 5 minutes
* SC-008 Zero TypeScript compilation errors when running `pnpm --filter api build`
* SC-009 All existing tests pass after integration (manifest tests pass)
* SC-010 Generated handlers respond correctly to real HTTP requests
* SC-011 All failure modes return correct HTTP status codes
* SC-012 All commands for at least one entity verified end-to-end
* SC-013 At least two entities verified end-to-end
* SC-014 CI fails on any generator/runtime regression (golden snapshots + tsc validation where applicable)

## Implementation Notes (retained)

### Files Added

Projection System (`packages/manifest/src/manifest/projections/`):

* `interface.ts` — projection API interfaces
* `registry.ts` — registry with memoization and auto-registration
* `builtins.ts` — built-in projection registration (NextJsProjection)
* `nextjs/generator.ts` — Next.js route generator with Capsule-Pro auth/tenant config
* `index.ts` — barrel export

CLI (`packages/manifest/bin/`):

* `generate-projection.ts` — CLI entry point for `manifest-generate`

Runtime Bridge (`apps/api/lib/`):

* `manifest-runtime.ts` — runtime factory loading PrepTask IR directly (avoids transitive deps)
* `manifest-response.ts` — response helpers for generated handlers

Generated Handlers (`apps/api/app/api/kitchen/prep-tasks/commands/`):

* `claim/route.ts`
* `start/route.ts`
* `complete/route.ts`
* `release/route.ts`
* `reassign/route.ts`
* `update-quantity/route.ts`
* `cancel/route.ts`

### Configuration Changes

* `packages/manifest/package.json` — added `./projections` export and `manifest-generate` bin entry
* `packages/kitchen-ops/src/manifest-runtime.ts` — per-domain runtime adapters (currently unused due to transitive import issues)
* `packages/kitchen-ops/manifests/prep-task-rules.manifest` — syntax fixes (missing quotes)

### Known Limitations

1. Command-entity linkage: IR compiler does not populate `c.entity` for entity-nested commands; generator finds commands by name only.
2. kitchen-ops index imports: cannot import from kitchen-ops `index.ts` due to transitive supabase/prisma-store dependencies; `apps/api/lib/manifest-runtime.ts` loads IR directly.
3. Single-entity runtime: runtime currently loads PrepTask IR only; multi-entity support needs combined manifest or registry pattern.

## Next Steps (Not in Scope of Infra, Required for Verification Completion)

1. Build HTTP-level verification harness for generated routes (real Next.js server + real request execution).
2. Verify full PrepTask command suite end-to-end with correct failure mappings.
3. Add a second entity and repeat the full verification workflow.
4. Generate handlers for additional entities (Station, Inventory, Recipe, Menu, PrepList).
5. Incrementally replace manual routes, update frontend callers, then delete manual routes once stable.
6. Add projections for `nextjs.ts.types` and `nextjs.query` as follow-on surfaces.

