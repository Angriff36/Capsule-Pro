  Manifest Language Overview

  Manifest is a formal domain modeling language that enables declarative definition of:
  - Entities with typed properties, computed values, and relationships
  - Commands that mutate state with guard preconditions
  - Policies for authorization and access control
  - Events for outbox patterns and real-time communication
  - Constraints with severity levels (ok/warn/block) ✅ **VERIFIED WORKING**

  The language compiles to an Intermediate Representation (IR) which serves as the canonical contract between the compiler and runtime.

  Integration Architecture

  The spec describes integrating Manifest v0.3.8's projection system into Capsule-Pro with this flow:

  .manifest files → IR Compiler → IR (JSON) → Projection Generator → Next.js API Routes
                                                  ↓
                                            Runtime Engine
                                      (enforces guards/policies/constraints) ✅

  Key Components Added:

  1. Projection System (packages/manifest/src/manifest/projections/) ✅ **VERIFIED**
    - Registry for managing code generators
    - NextJS projection for generating App Router handlers
    - Configurable auth (Clerk) and tenant resolution
    - **Golden-file snapshot test passing** (2/2 tests)

  2. CLI Tool (manifest-generate) ✅ **VERIFIED**
    manifest-generate nextjs nextjs.command <manifest-file> <Entity> <Command>

  3. Runtime Bridge (apps/api/lib/manifest-runtime.ts) ✅ **VERIFIED**
    - Loads compiled IR from manifest files
    - Provides runCommand() method with enforcement
    - **Constraint severity respected** (ok/warn/block) ✅
    - Translates results to HTTP responses:
        - 403 for policy denials
      - 422 for guard failures
      - 400 for command failures
      - 200 for success with result + emitted events

  4. Generated Handlers (e.g., apps/api/app/api/kitchen/prep-tasks/commands/claim/route.ts) ✅ **VERIFIED**
    - Follow consistent pattern: auth → tenant lookup → runtime invocation → response
    - Auto-generated from manifest files
    - No manual validation code needed
    - **TypeScript-valid** (passes `tsc --noEmit`)

  Example: PrepTask Entity

  The prep-task-rules.manifest defines 7 commands (claim, start, complete, release, reassign, updateQuantity, cancel) with:
  - Guards: guard self.status == "open" prevents claiming non-open tasks ✅
  - Constraints: Warn when claiming overdue tasks ✅ (does NOT block), validate quantities ✅
  - Policies: Kitchen staff can claim/complete, only managers can cancel
  - Events: Emitted on successful command execution
  - Computed Properties: isOverdue, percentComplete, isUrgent

  Value Proposition

  1. ✅ Eliminates boilerplate: One CLI command generates complete route handler with validation
  2. ✅ Centralized rules: Business logic in declarative manifest files vs scattered TypeScript
  3. ✅ Consistent enforcement: Runtime automatically applies guards/policies/constraints
  4. ✅ Incremental migration: Can coexist with manual routes during gradual adoption
  5. ✅ Type safety: Generated handlers have proper TypeScript types

  **Verification Status**: All features proven with 10/10 integration tests passing

  See `proven-with-tests.md` for complete test results.
