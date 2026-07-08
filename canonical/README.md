# canonical/ — Decision Control System

This is a **control system**, not documentation. Every architectural decision in Capsule-Pro lives in exactly one place. Agents gather evidence; **Ryan owns the decisions.**

It exists because Manifest generation, app wiring, generated surfaces, and naming drift independently across the repo. Without a register, every hidden assumption becomes silent drift. Here, every assumption becomes either **evidence**, **drift**, or **a decision waiting for Ryan**.

## The one rule

**One folder per decision area.** Not one giant doc.

If you are unsure where a decision lives, resolve it by area. Example — "where do Manifest types generate?":

```text
canonical/manifest/generation/type-generation/README.md
```

If that folder does not exist yet, **create it from the template** (`canonical/_templates/canonical-unit.md`) and leave the decision for Ryan.

## Directory taxonomy

```text
canonical/
  README.md                      ← you are here
  INDEX.md                       ← live register of every unit (one row each)

  _templates/
    canonical-unit.md            ← master decision template (copy this)
    uncertainty.md               ← open-question / unknown template
    agent-instructions.md        ← what agents may/may not fill
    agent-dispatch-prompt.json   ← the dispatch contract for subagents

  features/                      ← product features
    events/
    battle-board/
    inventory/
    staff/
    training/

  manifest/                      ← Manifest DSL, IR, projections, governance
    generation/
      type-generation/
      client-generation/
      route-generation/
      docs-generation/
    language/
      entities/
      commands/
      events/
      policies/
      stores/
      constraints/
      computed-fields/

  ui/                            ← UI layer: components, design system, client rendering

  app-wiring/                    ← how the Next.js app consumes Manifest
    routes/
    pages/
    forms/
    api-boundaries/
    data-access/

  integrations/                  ← external systems + infra
    database/
    auth/
    ci/
    deployment/

  unresolved/                    ← uncertainty.md files for open questions
```

Leaf folders are created **on demand** from the templates — by design. Git does not track empty directories, and a folder with no decision yet has no content. An agent that needs a decision area creates the folder + `README.md` from the template in one step.

## Knowledge maintenance (mandatory)

Agents **must** update authoritative docs when they learn something — not only when creating decisions. Internal/infra → amend the relevant canonical unit (or create one). Feature/public → `docs/`. Active plans → live-amend like [`manifest/NATIVE-REWRITE-PLAN.md`](../manifest/NATIVE-REWRITE-PLAN.md). Full spec: [`knowledge-maintenance/README.md`](knowledge-maintenance/README.md).

## How agents use this

Full rules: [`canonical/_templates/agent-instructions.md`](_templates/agent-instructions.md). Summary:

> **Before adding any new entry: `cd canonical && treex`.** Do not grep to check whether something already exists — an existing entry named differently won't match your search, so you'd create a duplicate or a misnamed unit. `treex` shows the real structure (empty dirs included, which grep and git hide); reconcile to it.

1. **Search `canonical/` first** before changing features, routes, generators, Manifest behavior, app wiring, integrations, CI, auth, tenants, or data models.
2. **Obey `Ryan Final Decision`** over current repo patterns. If repo code disagrees with a final decision, that is **drift to report**, not a pattern to copy.
3. **No match + architecture-affecting choice?** Create a unit from [`canonical-unit.md`](_templates/canonical-unit.md).
4. **Fill only what you can prove** from repo evidence (paths, scripts, command output, docs, CI). Leave `Ryan Final Decision` as `NEEDS-RYAN`.
5. **Use `UNKNOWN`, `NONE`, or `SOURCE REQUIRED`.** Never pretend certainty. Never build a second source of truth to work around an unknown.

### Agents may fill

current status · paths · consumers · wiring · evidence · open questions · proposed options

### Agents may NOT fill

Ryan Final Decision · forbidden-behavior exceptions · final naming · final route ownership · final generated-output location

## Dispatch contract (Phase 2)

The exact JSON prompt used to send subagents to fill these templates:

```text
canonical/_templates/agent-dispatch-prompt.json
```

Subagents return: files created/updated, decisions needed from Ryan, repo drift found, safe work completed, blocked work.

## Relationship to the rest of the repo

Canonical is the **human/agent-facing decision layer**. It is subordinate to the binding sources, not a rival authority.

- **`constitution.md`** — the binding Manifest Integration Charter. It defines *how decisions must conform*: governed writes go through `RuntimeEngine.runCommand`, reads bypass the runtime (§10), and there is no second source of truth. Canonical records *what was decided* and *what still needs deciding*. **If a canonical unit conflicts with the constitution, the constitution wins — fix the unit.**
- **`AGENTS.md` / `manifest/AGENTS.md`** — board-taxonomy disambiguation + Manifest doc-first rules (read official docs, do not reason from `dist/*.js`).
- **`manifest/governance/`** — machine-readable registries (entities, bypasses, baselines) enforced in CI. Canonical is the decision layer over the same governed surface; when a canonical decision lands, it should reconcile with these registries.

## Current state

- ✅ **Scaffolded:** templates + root register + dispatch contract.
- ✅ **One worked example:** [`manifest/generation/type-generation/`](manifest/generation/type-generation/README.md) (status `needs-ryan`).
- ✅ **Six top-level areas approved (2026-06-26):** `features/`, `manifest/`, `ui/`, `app-wiring/`, `integrations/`, `unresolved/`. More may be added over time; each new area gets a stub `README.md` so it is git-tracked and `treex`-visible (empty dirs are not tracked by git).
- ⏳ **Fill-out (Phase 2):** subagents populate areas with evidence via the dispatch prompt. Every agent runs `treex` on the area before adding anything.
