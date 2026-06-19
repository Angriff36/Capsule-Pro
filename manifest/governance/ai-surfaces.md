# AI Surfaces Governance

Status: Binding reference for Capsule-Pro Manifest governance  
Applies to: Agent SDK usage, MCP tools, AI assistants, generated command inventories, agent-readable docs, and automation that can mutate Capsule-Pro state

## Rule

AI surfaces may discover, explain, plan, and invoke approved commands. They must not bypass Manifest authority.

An AI surface is any agent, MCP tool, Agent SDK workflow, scripted assistant, prompt-generated action, or model-facing schema that can read Capsule-Pro state, propose changes, or trigger writes.

## Allowed behavior

AI surfaces may:

- Read compiled IR, governance registries, runtime command registries, and approved docs.
- Inspect command definitions, parameters, guards, constraints, events, and conformance evidence.
- Invoke governed mutations only through the canonical Manifest runtime command path.
- Use read-only MCP/API tools for list/query/inspect operations.
- Produce diagnostics that classify gaps as authoring error, projection drift, missing runtime coverage, missing enforcement, or approved bypass.
- Draft Manifest source changes for human/reviewed code paths when explicitly requested.
- Record reproduction steps and audit findings without mutating governed domain state.

## Required command path

For governed writes, AI surfaces must resolve intent to a Manifest entity/command and execute through the same runtime path as application code:

```txt
AI intent → command/entity resolution → canonical dispatcher/wrapper → RuntimeEngine.runCommand → approved adapters/effects
```

Any AI path that writes governed state outside this chain is a bypass.

## Forbidden AI bypasses

AI surfaces must not:

- Directly call Prisma writes for governed entities.
- Execute raw SQL mutations for governed state.
- Use generated concrete command routes as semantic authority.
- Invent commands because a route name, UI label, or old doc suggests one exists.
- Treat MCP tool availability as permission to mutate state.
- Treat Agent SDK orchestration as a replacement for Manifest policy, guard, constraint, transition, or event semantics.
- Fabricate semantic events, audit records, or outbox records outside runtime execution.
- Suppress runtime policy/guard failures and retry through direct database access.
- Use stale generated command inventories when compiled IR/runtime disagree.
- Create migrations or projection changes that make AI-only behavior authoritative.

## MCP/tooling boundary

Read tools may expose derived views. Write tools must either:

- call a Manifest runtime command; or
- be listed in the approved bypass registry with owner, reason, tenant/security boundary, and review/expiry.

A tool named like a domain action is not automatically safe. The proof is the runtime call path.

## Failure handling

When an AI surface cannot find a valid command path, it must fail closed and report:

```txt
NONCONFORMANCE or MISSING ENFORCEMENT:
- requested action:
- missing/invalid command path:
- attempted surface:
- required Manifest entity/command evidence:
- safer replacement:
```

No AI assistant gets a special emergency tunnel. That is how systems become haunted houses with invoices.

## Runtime is the authority on required inputs (Event-tree chat agent, 2026-06-18)

The Event-tree chat agent at `apps/app/app/api/command-board/chat/` (legacy route name) lets a logged-in user invoke manifest commands via natural language on an Event-tree board (`boardId` context). It MUST defer to the runtime for what a command actually requires, never pre-guess from the route surface. See **`VISION.md`** for how this agent differs from global AI and from Battle Board execution.

- The route surface (`routes.manifest.json`) marks every command-signature param `required: true`, but the runtime fills each property's declared default for omitted params (`prepareCreateData`: `{ ...defaults, ...body }`). So the agent **omits** params the model left blank (it must NOT send `null`, which clobbers the default) and lets guards/constraints be the sole authority on genuinely-required values. A missing value comes back as a real runtime error, not a fabricated "missing required args" pre-block (`agent-loop.ts` `materializeStepArgs` + `validateStepArgs`).
- Generated/contextual ids the user can't know are injected at the dispatch chokepoint from session context — `boardId ← context.boardId`, `userId ← context.userId` (`tool-registry.ts` `executeManifestCommandRoute`). The planning model is instructed to set these to `null`.
- Probe/test intent ("does this command work", "fill with test data") deterministically fills otherwise-unresolved params with type/name-keyed sample values so commands run end-to-end for smoke-testing and bug reports (`buildTestArgValue`). Context-injected ids are excluded from fabrication.

This keeps every AI-triggered write on the canonical dispatcher → `RuntimeEngine.runCommand` path (constitution §10): the agent resolves and invokes; the runtime governs.

### Targeting an existing record (instance resolution)

Commands that act on an existing record (everything except `create`) target the instance via `body.id` (`run-manifest-command-core` `deriveInstanceIdFromBody`). The agent resolves which record the user meant from the **name or id they referenced** — independent of any board: the entity being edited is the Event/Invoice/etc., never a board.

- The planner emits a `targetRef` (the user's reference — e.g. an event's title "Smith Wedding" or its id) per non-create step; `create` steps set it null.
- `tool-registry` `resolveInstanceId` resolves it: a bare id passes through; otherwise the entity's tenant-scoped read surface (`GET /api/manifest/<entity>`) is scanned by `selectInstanceByRef` for an exact then a unique partial name match. Ambiguous/no match returns an actionable error rather than mutating the wrong row — it never guesses which record to edit. The resolved id is passed as `instanceId` → `body.id`.

This is a read-to-resolve + governed-write pattern: the lookup is a §10 read, the mutation still flows through the dispatcher.
