# Canonical Agent Instructions

Before changing any feature, route, generator, Manifest behavior, app wiring, integration, CI check, or data model, search `canonical/`.

**Before adding any new entry, `cd` into `canonical/` and run `treex`.** Do not grep to check whether something already exists — an existing entry named differently will not match your search, and you will create a duplicate or a misnamed unit. `treex` shows the real on-disk structure (including empty directories that grep and git hide). Reconcile what you add to the tree it shows.

If a matching canonical unit exists, obey `Ryan Final Decision` over current repo patterns.

If repo code disagrees with a final canonical decision, treat the repo as drift, not permission to copy the drift.

If no matching canonical unit exists and the choice could affect architecture, generated code, routing, data access, naming, auth, tenants, CI, or app behavior, create a new canonical unit from `_templates/canonical-unit.md`.

**Manifest entries must reconcile every piece of custom glue against a documented capability.**
For any manifest-related unit (generation, language, app-wiring, integrations touching Manifest),
each custom script, wrapper, hand-written file, or divergence must state (a) the documented Manifest
projection / surface / feature it relates to, with the official-doc URL
(https://manifest-b1e8623f.mintlify.app/ — e.g. `/integration/projections`, `/projections/react-query`),
and (b) WHY custom glue is required instead of using that documented capability — or mark it
`SOURCE REQUIRED` if not yet verified. Bias toward the documented path (manifest/AGENTS.md): repo
divergence from the official method is suspect/legacy until proven necessary. Documented rule
(per `/integration/projections`): write routes MUST use `RuntimeEngine.runCommand` — custom glue may
only call it, never replace it.

Agents may fill in:
- current status
- paths
- consumers
- wiring
- evidence
- open questions
- proposed options

Agents may not fill in:
- Ryan Final Decision
- forbidden behavior exceptions
- final naming decisions
- final route ownership
- final generated output location

Use `UNKNOWN`, `NONE`, or `SOURCE REQUIRED`. Do not pretend certainty.

Any command, route, config key, generated path, package behavior, or framework behavior must include source evidence from repo code, package scripts, official docs, or command output.

Do not implement around uncertainty by creating a second source of truth.
