# Manifest Client Generation

Canonical ID: `manifest.generation.client-generation`

Type: `generator`

Owner decision status: `needs-ryan`

Implementation status: `working`

Last reviewed: `2026-06-26`

Last updated by: `agent`

---

## 1. What This Is (plain English)

This builds the typed functions your screens call to talk to the API. Instead of a screen hand-writing "fetch this URL with this body," it calls a typed function like `eventCreate(...)` or `listClients()` that already knows the right URL and the right shape, and is checked by TypeScript before it ever runs.

**Manifest already ships this for free** — `ts.types` + `ts.client` (Next.js projection surfaces) and the `react-query` hooks projection. We built a custom version anyway. This entry exists to explain **why**, piece by piece, and whether each piece is justified glue or removable "bullshit."

Real app impact:

```text
When correct:
- Screens call one typed function; payloads are type-checked before the network call.
- Changing a Manifest command updates the function automatically on regenerate.

When wrong:
- Screens hand-write fetches; payloads compile but fail at runtime.
- Duplicate hand-written clients spread across feature folders.
```

---

## 2. Ryan Final Decision

Decision:

```text
NEEDS-RYAN
```

Reason:

```text
The entire custom stack traces back to ONE choice: domain-routed URLs
(/api/events/...) vs Manifest's generic /api/manifest/Event. That single
decision forces the custom client, the custom hooks, and the domain map.
Before keeping any of it, Ryan decides: keep domain routes, switch to
generic Manifest routes, or get domain routing supported officially.
Everything below hinges on that.
```

Do not do:

```text
Do not hand-write new client or hook wrappers in feature folders.
Do not call executeCommand with string entity/command names when a typed
  function already exists for that entity/command.
Do not replace RuntimeEngine.runCommand — the client only CALLS it through
  the dispatcher. That is the documented rule, not just our charter.
```

---

## 3. Current Status & Reconciliation (documented Manifest vs. our glue)

> **This is the important part.** Per the agent rule, every custom piece below is reconciled against a documented Manifest capability, with the doc link and the verified reason it exists. Bias is toward the documented path; our divergence is suspect until proven necessary.

### What Manifest gives you for free
- `ts.types` surface → entity `interface` declarations. ([/integration/projections](https://manifest-b1e8623f.mintlify.app/integration/projections))
- `ts.client` surface → typed fetch wrappers (client SDK). (same)
- `react-query` projection → typed hooks + `QueryClient` provider + automatic cache invalidation, **with D23 override knobs** (`entityRoutes` for domain routes, `readEnvelope` for response keys, `fetchAdapter`, `commandEnvelope`). ([/projections/react-query](https://manifest-b1e8623f.mintlify.app/projections/react-query)) — **SHIPPED in 2.18.0** (verified: `dist/manifest/projections/react-query/generator.js` exists; options at `generator.d.ts:44–80`).

### What we built instead, and why
| Piece | Manifest ships this (doc) | We built this instead | Why — verified from the scripts | Verdict |
|---|---|---|---|---|
| **Types** (entity shapes) | `--surface types` | Uses it, then post-processes | Stock output emits scalar names (`int`/`money`/`decimal`) that **don't compile**, and **omits enum definitions**. We fix both. (`generate-capsule-client.mjs:57–101`) | Glue forced by **upstream bugs**. Justified — but should be fixed in Manifest itself. |
| **Client** (typed call fns) | `--surface client` (`ts.client`) | Hand-built, split into 6 domain files | `ts.client` in 2.18.0 has **no override knobs** (D23 reached react-query only) — stock URLs 404 vs our domain routes, wrong envelopes. (`generate-capsule-client.mjs:3–13, 106+`) | **Partially justified** — needed only while reads go through `ts.client`; likely unnecessary once reads move to react-query hooks (which have `entityRoutes`/`readEnvelope`). |
| **Hooks** (data fetching) | `react-query` projection — **shipped in 2.18.0 WITH the D23 knobs** (`entityRoutes`/`readEnvelope`/`commandEnvelope`/`fetchAdapter`; `generator.d.ts:44–80`) | Hand-built `generate-react-query-hooks.mjs` wrapping our custom client | The documented projection already does everything ours does — domain routes via `entityRoutes`, correct envelopes via `readEnvelope`, auth via `fetchAdapter`, write envelope via `commandEnvelope`. Ours is a **redundant reinvention**, not a gap-fill. | **REDUNDANT — migrate to the projection; delete the custom generator + the pilot.** |
| **Pilot file** | (none — projection emits all hooks) | `manifest-hooks-pilot.ts` hand-selects a subset | Transitional adoption shim from the gradual hooks rollout. | **Cruft.** Candidate to delete. |
| **`executeCommand` core** | (transport only; doc: writes MUST use `RuntimeEngine.runCommand`) | Hand-written POST → dispatcher | The browser has to call the API somehow. This is the thin wire. | **Legit.** Routes to the dispatcher, which calls `runCommand`. Does NOT replace it. ✅ |
| **`executeCommandBatch`** | (no documented batch surface) | Hand-written generic batch in the core | App needed bulk operations. | Custom; may be removable if not load-bearing. |
| **Domain partitioning** | (projections emit single files) | Split into 6–7 chunks | Bundle size — avoid shipping a ~1054-command monolith to every page. | Real concern. Only justifies the glue IF domain routing stays. |

### The root cause, in plain English
Not a version gap — **we hand-built custom generators that reimplement projections Manifest 2.18.0 already ships.** Verified: 2.18.0's `dist/manifest/projections/` ships ~27 projections including `react-query` (with the full D23 knob set — `entityRoutes`/`readEnvelope`/`commandEnvelope`/`fetchAdapter`, `generator.d.ts:44–80`), plus `drizzle`, `openapi`, `zod`, `mermaid`, `llm-context`, `prisma`, `kysely`, `materialized-views`, and more.

What IS genuinely unfixed in 2.18.0 (justifies *some* glue):
- `ts.types` emits non-compiling `money`/`decimal` + omits enums → our types post-processing is justified.
- `ts.client` has no override knobs (D23 reached react-query only) → custom client is justified *only while reads go through ts.client*.

The lever is **migrate to the shipped projections**, not publish/upgrade (2.18.0 already has them): configure `react-query` with our domain routes + envelopes, delete the custom hooks generator + pilot; then re-examine whether the custom client is still needed once reads flow through hooks. The same audit should cover the other custom generators vs their shipped counterparts.

### Bigger picture (flagged, not solved here)
This unit is one of **~19 custom generators** in `manifest/scripts/generate-*.mjs`. Several reimplement other documented projections (`generate-drizzle`, `generate-openapi`, `generate-zod-schemas`, `generate-mermaid`, `generate-llm-context`, `generate-full-schema` ≈ Prisma). That parallel stack is the "mass maze" at scale — a separate audit should reconcile each, same way.

### Documented rule honored here
Per [/integration/projections](https://manifest-b1e8623f.mintlify.app/integration/projections): *write routes MUST use `RuntimeEngine.runCommand`.* Our client is transport only — it POSTs to the canonical dispatcher, which calls `runCommand`. It never replaces it.

### Evidence (verified this pass)
```text
- Client generator:  manifest/scripts/generate-capsule-client.mjs (uses --surface types, hand-builds client)
- Hooks generator:   manifest/scripts/generate-react-query-hooks.mjs (hand-builds hooks over the custom client)
- Domain map (shared): manifest/scripts/entity-domain-map.mjs (CLIENT_CHUNKS / ENTITY_DOMAIN_MAP)
- Scalar fix:        manifest/scripts/scalar-type-map.mjs
- Conventions:       manifest/capsule-conventions.json (domain read paths + read envelopes)
- Hand-written core: apps/app/app/lib/manifest-client.ts (executeCommand / executeCommandBatch)
- Generated output:  apps/app/app/lib/manifest-types.generated.ts, manifest-client.{ts,<domain>.generated.ts}, manifest-hooks.{ts,<domain>.generated.ts}, index.generated.ts
- Pilot (cruft):     apps/app/app/lib/manifest-hooks-pilot.ts
- Official docs:      https://manifest-b1e8623f.mintlify.app/integration/projections  (ts.types, ts.client, reads-vs-writes rule)
                      https://manifest-b1e8623f.mintlify.app/projections/react-query  (hooks projection)
- CLI:               pnpm manifest:client · pnpm manifest:generate-hooks · pnpm manifest:field-hints
- Confidence:        high (every claim read from the script or the official doc this pass)
```

Known gaps:

```text
1. No dedicated client-function staleness CI gate (hooks are covered indirectly by manifest:react-query:check).
2. Whether pages still call raw executeCommand() vs typed fns — not counted this pass.
3. Field-hints (generate-field-hints.mjs) has no documented projection equivalent — custom may be justified; not verified.
```

---

## 4. Where It Lives

```text
Canonical decision file: canonical/manifest/generation/client-generation/README.md
Source (scripts):        manifest/scripts/generate-capsule-client.mjs, generate-react-query-hooks.mjs, entity-domain-map.mjs, scalar-type-map.mjs
Generated output:        apps/app/app/lib/manifest-{types,client,client/*,hooks,hooks/*}.generated.ts, index.generated.ts
Runtime (hand-written):  apps/app/app/lib/manifest-client.ts (executeCommand/executeCommandBatch), manifest-field-hints.ts
UI / Test / Docs:        NONE / UNKNOWN (no dedicated test) / official docs linked in §3
```

---

## 5. Entry Points

```text
User-facing route: NONE (consumed by UI)
CLI:               pnpm manifest:client · pnpm manifest:generate-hooks · pnpm manifest:field-hints
Writes:            POST /api/manifest/{entity}/commands/{command}   (→ dispatcher → RuntimeEngine.runCommand)
Reads:             GET  /api/{domain}/{entity-plural}/list and /{id} (domain-routed — the root-cause convention)
```

---

## 6. What Consumes It

```text
Direct:   apps/app/app/lib/budgets.ts, leads.ts; apps/app/app/components/bulk-actions.tsx (executeCommandBatch); the pilot file; all pages importing typed fns or hooks.
Indirect: every page/form that creates, updates, lists, or reads entity data.
Human:    Ryan, coding agents.
```

---

## 7. What It Is Wired To

```text
Manifest entities:  all 200+ — each gets create/update/remove/get/list functions.
Manifest commands:  all — each gets a typed function (e.g. clientCreate, eventUpdate).
Manifest events / policies: not consumed client-side (enforced server-side by the dispatcher/runtime).
Generated types:    manifest-types.generated.ts (entity interfaces + enums).
DB tables:          NONE (client talks to API routes, never the DB).
```

---

## 8. Canonical Behavior

```text
Happy path:
  IR → manifest:client (typed fns) + manifest:generate-hooks (useQuery/useMutation)
  → screen calls typed fn → executeCommand POSTs to dispatcher → RuntimeEngine.runCommand.

Failure behavior:
  If generation is stale, function signatures drift from IR. Hooks caught indirectly by
  manifest:react-query:check; client functions have no direct gate (gap).

Forbidden behavior:
  No hand-written domain client/hook wrappers. No raw executeCommand("Entity","command",body)
  when a typed fn exists. No replacing RuntimeEngine.runCommand. No direct imports from
  manifest/generated/ or manifest/ir/.
```

---

## 9. Naming Rules

```text
Canonical name:   Manifest Client Generation
Allowed aliases:  Generated manifest client; Capsule client; domain client chunks
Forbidden:        "API client" (ambiguous); per-feature hand-written clients
Casing/slug:      folder client-generation; core file manifest-client.ts; chunk manifest-client/<domain>.generated.ts;
                  fn camelCase entity + PascalCase command (clientCreate, eventUpdate)
```

---

## 10. Open Questions

| ID | Question | Why it matters | Evidence found | Options | Ryan decision |
|---|---|---|---|---|---|
| Q001 | **Domain routing**: keep `/api/{domain}/...` vs switch to generic `/api/manifest/{entity}`? | This ONE decision is why the custom client + hooks + domain map exist. Switching deletes most of the maze. | Frontend has 95+ hardcoded `/api/<domain>/` URLs; documented client/hooks emit generic paths that 404 against them. | A: keep domain routes (keep the custom stack); B: migrate frontend to generic Manifest routes (delete custom client/hooks, use `ts.client` + `react-query` projection); C: get domain routing added as an official projection option | NEEDS-RYAN |
| Q002 | Fix the upstream type bugs (`int`/`money` don't compile; enums missing) in `@angriff36/manifest` and drop our post-processing? | Removes custom glue; types come straight from `--surface types`. | `generate-capsule-client.mjs:79–95` works around both. | A: upstream PR then drop the glue; B: keep the glue | NEEDS-RYAN |
| Q003 | Delete `manifest-hooks-pilot.ts` (transitional)? | Hand-written selective re-export = cruft once adoption is direct. | Pilot exists; `manifest-hooks.generated.ts` already re-exports all hooks. | A: delete, import generated directly; B: keep | NEEDS-RYAN |
| Q004 | Is `executeCommandBatch` (hand-written) load-bearing, or can batching go through a documented surface? | Extra custom surface in the core. | `apps/app/app/lib/manifest-client.ts`. | A: keep; B: remove if a documented path covers it | NEEDS-RYAN |
| Q005 | Add a dedicated client-function staleness CI gate? | Hooks have `react-query:check`; client fns have no direct gate. | See §3 gaps. | A: add `manifest:client:check`; B: rely on indirect coverage | NEEDS-RYAN |
| Q006 | **Migrate to the shipped `react-query` projection** (configure `entityRoutes`/`readEnvelope`/`commandEnvelope`/`fetchAdapter` for our domain routes + envelopes) and **delete the custom hooks generator + pilot**? | The documented projection ships in 2.18.0 with every override we need — the custom hooks generator is redundant. | Verified: `dist/manifest/projections/react-query/generator.js` exists; options at `generator.d.ts:44–80`. (Prior commits claiming "react-query not shipped in 2.18.0" were wrong — based on a flawed node_modules content-grep; corrected.) | A: migrate to the projection + delete custom hooks + pilot; B: keep custom (state why); C: migrate incrementally | NEEDS-RYAN |
| Q007 | Audit the other ~18 custom generators vs **shipped** projections (`drizzle`/`openapi`/`zod`/`mermaid`/`llm-context`/`prisma`/`kysely`/`materialized-views`…) — which reimplement a shipped projection (delete) vs fill a real gap (keep)? | 2.18.0 ships ~27 projections; many of our `generate-*.mjs` likely reimplement them. Quantifies the real "maze." | `ls dist/manifest/projections/` shows all shipped projections. | A: full audit matrix; B: pick one generator; C: defer | NEEDS-RYAN |

---

## 11. Decision History

| Date | Decision | Made by | Reason |
|---|---|---|---|
| 2026-06-26 | Entry rewritten: plain-English lead + glue-vs-documented-capability reconciliation | agent | Ryan: every manifest entry must justify custom glue against documented Manifest capabilities, in language a non-dev can follow |
| 2026-06-26 | **Corrected false "react-query not shipped in 2.18.0" claim** — it IS shipped, with all D23 override knobs (`generator.d.ts:44–80`). Hooks row flipped from "justified" to **redundant**; root cause reframed from "version pin" to "reinvention of shipped projections"; Q006 reframed from "publish new release" to "migrate to the shipped projection." Prior wrong commits: `f97324a3c`, `73fc6de03`. | agent | A cross-check (other agent + `ls`/`generator.d.ts`) caught a flawed node_modules content-grep that I had over-claimed as "verified." Lesson: existence checks need `ls`/`test -f`/`Read`, not content-grep on node_modules (ripgrep skips it). |
