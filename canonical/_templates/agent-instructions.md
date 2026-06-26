# Canonical Agent Instructions

Before changing any feature, route, generator, Manifest behavior, app wiring, integration, CI check, or data model, search `canonical/`.

**Before adding any new entry, `cd` into `canonical/` and run `treex`.** Do not grep to check whether something already exists — an existing entry named differently will not match your search, and you will create a duplicate or a misnamed unit. `treex` shows the real on-disk structure (including empty directories that grep and git hide). Reconcile what you add to the tree it shows.

If a matching canonical unit exists, obey `Ryan Final Decision` over current repo patterns.

If repo code disagrees with a final canonical decision, treat the repo as drift, not permission to copy the drift.

If no matching canonical unit exists and the choice could affect architecture, generated code, routing, data access, naming, auth, tenants, CI, or app behavior, create a new canonical unit from `_templates/canonical-unit.md`.

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
