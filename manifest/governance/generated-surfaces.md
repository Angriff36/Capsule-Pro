# Generated Surfaces Governance

Status: Binding reference for Capsule-Pro Manifest governance  
Applies to: IR, runtime registries, projected routes, generated clients/types, audit sidecars, and generated reports

## Rule

Generated surfaces are derived artifacts. They are not semantic authority.

The authority chain is:

1. Manifest source and upstream Manifest Tier A semantics.
2. Compiled IR accepted by Capsule-Pro runtime.
3. Runtime execution through the canonical dispatcher/wrapper.
4. Generated surfaces derived from IR/runtime.
5. UI/read projections and reports.

If a generated surface disagrees with compiled IR or runtime behavior, the generated surface is wrong. Fix the producer or projection, regenerate, and verify the output. Do not hand-edit generated files to make drift disappear.

## Generated surfaces

Generated surfaces include, at minimum:

- `manifest/ir/**` merged IR, command/entity data, provenance, and reports.
- `manifest/runtime/**` generated runtime registries, route manifests, command registries, and runtime sidecars.
- Any file marked `@generated`, `auto-generated`, or emitted by Manifest compile/generate/build scripts.
- Next.js Manifest dispatcher output and any Manifest-projected route shell.
- Generated TypeScript types, SDK/client helpers, MCP descriptors, OpenAPI-like descriptors, and agent-readable command/entity inventories.
- Audit baselines or reports emitted from IR/runtime registries.

## Disagreement handling

When a generated surface conflicts with IR/runtime:

1. Treat the generated surface as stale or projection-drifted.
2. Identify the producer script, projection, or package version that emitted it.
3. Prove whether the compiled IR is current.
4. Fix the producer or generation wrapper, not the generated artifact alone.
5. Regenerate with the canonical repo command.
6. Verify `git diff` shows expected generated changes only.
7. If the producer cannot be fixed in the same pass, record `MISSING ENFORCEMENT` or `PROJECTION DRIFT` with owner/risk/removal condition.

## Forbidden moves

- Do not cite generated output as proof that a command exists if compiled IR/runtime does not expose it.
- Do not let generated concrete command routes outrank the canonical dispatcher.
- Do not hand-edit generated files without a matching producer change.
- Do not copy generated route output into hand-written routes as a workaround.
- Do not create new generated output locations outside the canonical Manifest workspace layout.
- Do not make AI/MCP/tool surfaces authoritative by feeding them stale generated inventories.

## Required evidence

A generated surface is acceptable only when reviewers can see:

- the source or IR input used to generate it;
- the producer command or script;
- deterministic output from the same input;
- dispatcher/runtime alignment for command surfaces;
- drift verification after regeneration;
- no resurrection of retired Manifest workspace paths.
