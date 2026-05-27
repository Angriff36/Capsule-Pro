# Manifest Governance Audit Checklist

Use this lightweight checklist for governance/doc/code review passes. It is not a new CI system; it is the minimum human/agent review surface until more gates exist.

## Generated surface drift

- [ ] Generated files changed only with the producer/projection or an explicit regeneration step.
- [ ] Generated surface output agrees with compiled IR and runtime registries.
- [ ] Disagreements are recorded as `PROJECTION DRIFT`, not treated as implementation authority.
- [ ] No generated output was hand-edited as the sole fix.

## AI bypass paths

- [ ] Agent SDK, MCP, and automation write paths invoke Manifest runtime commands for governed mutations.
- [ ] Read-only tools remain read-only and do not synthesize command semantics.
- [ ] Tool availability is not used as proof of bypass approval.
- [ ] Runtime policy/guard failures are not retried through direct Prisma or raw SQL writes.

## Projection dispatcher alignment

- [ ] Command projections delegate to the canonical dispatcher/wrapper.
- [ ] No generated concrete command route owns command resolution, runtime creation, command execution, or response/event mapping.
- [ ] Command/entity resolution uses the generated runtime registry.
- [ ] Projection output is deterministic from the same IR/config/package version.

## Migration boundary misuse

- [ ] Migrations and Prisma schema changes are not cited as command semantics.
- [ ] Persistence additions needed by runtime adapters do not create new out-of-runtime write paths.
- [ ] Migration repair scripts do not mutate governed state unless bypass-approved.
- [ ] `.manifest` source/IR/runtime/conformance evidence exists before claiming governed behavior is covered.

## Relocation and route guardrails

- [ ] No retired Manifest workspace paths were reintroduced outside historical docs.
- [ ] No new concrete governed command routes were created.
- [ ] New governance data lives under `manifest/governance/`; generated runtime artifacts live under `manifest/runtime/` or `manifest/ir/` as appropriate.
