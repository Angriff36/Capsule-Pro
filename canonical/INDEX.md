# canonical/INDEX.md — Decision Register

One row per canonical unit. Agents **append** a row when they create or update a unit. Ryan's column reflects `Ryan Final Decision` status only — it is not a place for agents to record their own conclusions.

| Canonical ID | Decision file | Type | Owner decision | Impl status | Last reviewed |
| --- | --- | --- | --- | --- | --- |
| `manifest.generation.type-generation` | [manifest/generation/type-generation/README.md](manifest/generation/type-generation/README.md) | generator | needs-ryan | unknown | 2026-06-26 |

## How to add a row

1. Create the unit folder + `README.md` from [`_templates/canonical-unit.md`](_templates/canonical-unit.md).
2. Fill only provable sections; leave `Ryan Final Decision` as `NEEDS-RYAN`.
3. Append one row here, using the Canonical ID from the unit header.
4. If the decision is unresolved, also file a [`_templates/uncertainty.md`](_templates/uncertainty.md) under `canonical/unresolved/` and cross-link it from the unit.

## Status legend

- **Owner decision:** `final` · `tentative` · `needs-ryan` · `unknown`
- **Impl status:** `not-started` · `partial` · `working` · `broken` · `deprecated` · `removed` · `unknown`
