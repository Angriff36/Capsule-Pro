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
