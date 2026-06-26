# canonical/INDEX.md — Decision Register

One row per canonical unit. Agents **append** a row when they create or update a unit. Ryan's column reflects `Ryan Final Decision` status only — it is not a place for agents to record their own conclusions.

| Canonical ID | Decision file | Type | Owner decision | Impl status | Last reviewed |
| --- | --- | --- | --- | --- | --- |
| `manifest.generation.type-generation` | [manifest/generation/type-generation/README.md](manifest/generation/type-generation/README.md) | generator | needs-ryan | working | 2026-06-26 |
| `manifest.generation.client-generation` | [manifest/generation/client-generation/README.md](manifest/generation/client-generation/README.md) | generator | needs-ryan | working | 2026-06-26 |
| `manifest.generation.route-generation` | [manifest/generation/route-generation/README.md](manifest/generation/route-generation/README.md) | generator | needs-ryan | working | 2026-06-26 |
| `manifest.generation.docs-generation` | [manifest/generation/docs-generation/README.md](manifest/generation/docs-generation/README.md) | generator | needs-ryan | working | 2026-06-26 |
| `manifest.language.entities` | [manifest/language/entities/README.md](manifest/language/entities/README.md) | manifest-capability | needs-ryan | working | 2026-06-26 |
| `manifest.language.commands` | [manifest/language/commands/README.md](manifest/language/commands/README.md) | manifest-capability | needs-ryan | working | 2026-06-26 |
| `manifest.language.events` | [manifest/language/events/README.md](manifest/language/events/README.md) | manifest-capability | needs-ryan | working | 2026-06-26 |
| `manifest.language.policies` | [manifest/language/policies/README.md](manifest/language/policies/README.md) | manifest-capability | needs-ryan | working | 2026-06-26 |
| `manifest.language.stores` | [manifest/language/stores/README.md](manifest/language/stores/README.md) | manifest-capability | needs-ryan | working | 2026-06-26 |
| `manifest.language.constraints` | [manifest/language/constraints/README.md](manifest/language/constraints/README.md) | manifest-capability | needs-ryan | working | 2026-06-26 |
| `manifest.language.computed-fields` | [manifest/language/computed-fields/README.md](manifest/language/computed-fields/README.md) | manifest-capability | needs-ryan | working | 2026-06-26 |
| `ui.design-system` | [ui/design-system/README.md](ui/design-system/README.md) | feature | needs-ryan | working | 2026-06-26 |
| `ui.components` | [ui/components/README.md](ui/components/README.md) | feature | needs-ryan | working | 2026-06-26 |
| `ui.client-rendering` | [ui/client-rendering/README.md](ui/client-rendering/README.md) | feature | needs-ryan | working | 2026-06-26 |

## How to add a row

1. Create the unit folder + `README.md` from [`_templates/canonical-unit.md`](_templates/canonical-unit.md).
2. Fill only provable sections; leave `Ryan Final Decision` as `NEEDS-RYAN`.
3. Append one row here, using the Canonical ID from the unit header.
4. If the decision is unresolved, also file a [`_templates/uncertainty.md`](_templates/uncertainty.md) under `canonical/unresolved/` and cross-link it from the unit.

## Status legend

- **Owner decision:** `final` · `tentative` · `needs-ryan` · `unknown`
- **Impl status:** `not-started` · `partial` · `working` · `broken` · `deprecated` · `removed` · `unknown`
