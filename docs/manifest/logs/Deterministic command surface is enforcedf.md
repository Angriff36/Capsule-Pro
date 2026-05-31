(IR → commands.json → routes)

Capsule-Pro has settled the command-surface contract by making IR the source and kitchen.commands.json the canonical derived manifest for ownership and generation checks. Compile now deterministically emits command entries, and generate validates staged command routes against that manifest instead of inferring ownership from filesystem shape or comments. This made route ownership reproducible and projection-aware without turning compile into a path-mapping layer.

Enforcement exists through generator behavior and tests, not documentation alone. scripts/manifest/compile.mjs and scripts/manifest/build.mjs emit the commands manifest from IR, scripts/manifest/generate.mjs performs forward/method validation and controlled overwrite behavior, and apps/api/__tests__/kitchen/manifest-build-determinism.test.ts verifies determinism, mirror integrity, and manual-route non-overwrite invariants. The program is therefore both executable and test-anchored.

Debt remains in the last mile of full command-route materialization and mapping hygiene. The mirror path is intentionally conservative in places and still warns about expected gaps depending on generation mode, but this is implementation debt, not a missing boundary decision.


Summary:
This log records a settled governance boundary; remaining findings represent migration debt, not ambiguity. The command surface is now derived deterministically from IR into kitchen.commands.json, and generation validates against that manifest instead of guessing from filesystem layout. This settled the “what is owned” question at the artifact level and made route ownership reproducible across runs and environments. Compile remains projection-agnostic while generate enforces route-surface correctness.

Meaning links:
C:\Projects\obsidian\Obsidian\invariants\Generated Code Rules.md, C:\Projects\obsidian\Obsidian\specs\IR as Canonical Interface.md, C:\projects\capsule-pro\tasks\manifest-route-ownership-plan.md.  

Enforcement links: C:\projects\capsule-pro\scripts\manifest\compile.mjs, C:\projects\capsule-pro\scripts\manifest\generate.mjs, C:\projects\capsule-pro\packages\manifest-ir\ir\kitchen\kitchen.commands.json, C:\projects\capsule-pro\apps\api\__tests__\kitchen\manifest-build-determinism.test.ts.

In plain terms: IR defines the command map, the map drives generation checks, and tests prove it stays deterministic.