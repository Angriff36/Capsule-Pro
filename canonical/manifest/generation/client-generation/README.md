# Manifest Client Generation

Canonical ID: `manifest.generation.client-generation`

Type: `generator`

Owner decision status: `final` (2026-06-27 — see §0: scalar glue retired via `dateSerialization` [DONE, `bb84d673d`]; route remap kept as irreducible glue; routeDomain shelved)

Implementation status: `partial` — scalar/type glue retired + committed (`bb84d673d`); the `generate.mjs` route remap stays (routeSegments can't express the `commands/` infix + detail overrides — §0 step 2). Remaining: the optional react-query/ts.client read-path consolidation (Q002, deferred).

Last reviewed: `2026-06-27`

Last updated by: `agent`

---

## 0. FINAL DECISION (Ryan delegated, 2026-06-27) — supersedes all deliberation below

**Keep every route URL exactly as it is today. No regularizing, no `routeDomain`, no manifest-side change.**

Concrete migration, all on installed **2.18.6** (no upstream dependency):
1. **Scalars — DONE (commit `bb84d673d`).** Set `dateSerialization: iso-string` in `manifest.config.yaml → projections.nextjs.options`; dropped the `scalar-type-map.mjs` `toTsTypes()` post-process + the enum-prepend from `generate-capsule-client.mjs` (array/numeric/enum native in 2.18.6; `paramTsType` kept for command inputs). Verified: 0 raw leaks, datetime→string, enums once, typed arrays, no types dropped.
2. **Paths — NOT viable via `routeSegments` (corrected 2026-06-27; the earlier "wire routeSegments, retire the remap" was wrong).** `routeSegments` only overrides the per-entity URL *prefix*. Capsule's paths need two shapes it can't express: a **`commands/` infix** for per-command routes (e.g. `events/profitability/commands/recalculate`; 5+ exist) and **per-entity detail-segment overrides** (`ENTITY_DETAIL_SEGMENT_OVERRIDES[entity] ?? "id"` — not always `[id]`). So `generate.mjs`'s flat→domain remap is **irreducible glue** (same class as its accessor/field/entity-drop logic — the stock projection can't express these shapes) and **stays**. See route-generation §3a.
3. **Result:** the scalar/type glue retired (step 1, shipped). The route remap remains by necessity. URLs and app behavior unchanged throughout.

**Shelved:** `routeDomain` / native derivation / "regularize the 80 irregular URLs." Rationale: keeping URLs identical (chosen for zero risk) moots it — plain `routeSegments` is strictly simpler (188 facts, no 80 overrides, no compiler change). Revisit only if a future cleanup wants consistent URLs, accepting 80 internal-URL changes. The 108/80 analysis below is retained as the reason it's shelved.

---

## 0b. The migration, stated concretely (background — superseded by §0)

**First, the thing that's easy to over-dramatize:** the route paths below are **internal API URLs** the frontend calls (`/api/kitchen/prep-tasks/list`) — **not** user-facing pages (see route-generation: "API routes, not user-facing pages"). **No option here changes app behavior or anything an end user sees.** This is a code-maintenance decision, not a product one.

### Decision 1: who maintains the 188 read-URL list

Today a hand-written script (`generate.mjs`) builds 188 **domain-grouped** URLs by remapping the built-in generator's **flat, lowercased** output. Verified generator logic (2.18.5 `generator.js`): route path = `{appDir}/{segment}/list/route.ts` where `segment = routeSegments[entity] ?? entity.toLowerCase()` (`resolveRouteSegment` l.133, `toEntitySegment` l.107):

```
built-in default:   /api/preptask/list                (toLowerCase, ONE flat segment)
generate.mjs remap: /api/kitchen/prep-tasks/list      (PrepTask → "kitchen/prep-tasks")
```

The migration deletes the custom generators and uses the built-in generator directly. **By default that emits the flat lowercased URLs — which would 404 every data fetch** until 188 `next.config.ts` rewrites + every client call-site were also changed. The built-in `routeSegments?: Record<EntityName,string>` option (`interface.d.ts:257`, implemented at `generator.js:76/133/395`) makes it emit the **exact same domain URLs** instead, fed from `ENTITY_DOMAIN_MAP` (188 entities). So paths are the migration's **failure point**, not a feature choice. (Writes are unaffected — they all use the single dispatcher at `dispatcher.path`.)

| Option | URLs | User/app impact | What you're really choosing |
|---|---|---|---|
| **A (recommended)** Feed the existing 188-path map into `routeSegments` (in `manifest.config.yaml`, mirroring `entityToPrismaModel`/`accessorNames`). | **identical** | **none** | delete the custom remap script; URL list lives in config |
| **B** Let URLs flatten to `/api/preptask/list` (the lowercased default). | all 188 change | **none once finished**, but real 404 risk mid-migration | same end state as A via much more work (rewrite 188 rewrites + every client path) — no upside |
| **C** Keep `generate.mjs`'s remap. | identical | **none** | don't migrate; keep the ~200-line custom script (the glue) |

Net: the real call is **A (retire the script, map → config)** vs **C (keep the script)**. B is A done the hard way. I recommend **A**: identical app, less custom code.

> **A casing knob does NOT replace the map.** Verified against `ENTITY_DOMAIN_MAP`: current URLs carry (a) a **domain prefix** — 19 distinct ones (`accounting`, `crm`, `kitchen`, `inventory`, …), none derivable from the entity name (`Invoice → accounting/invoices`, `Client → crm/clients`); and (b) **irregular segments** that aren't kebab-of-name (`InventoryItem → kitchen/inventory`, `Event → events/event`). A casing/pluralization option only fixes the single-segment form (`PrepTask → prep-task`) — a worthwhile upstream addition, but orthogonal. To KEEP the domain-grouped URLs you still need the per-entity `routeSegments` map. A casing knob alone suffices ONLY if you abandon domain grouping and accept flat URLs.

> **The map CANNOT be derived from the manifest sources (verified 2026-06-27).** Tested every candidate signal for the 19-domain URL taxonomy: **source folder** = 13 coarse engineering modules, only 4/13 map to a single URL prefix (`staff/`→8 prefixes, `core/`→6, `platform/`→6, `operations/`→4); **`entity.module`** = absent (0/188 entities carry it); **`IR.modules`** = empty (0 entries). The business-domain grouping was never written into the sources — it lives only in `ENTITY_DOMAIN_MAP`. So `routeSegments` is **irreducible config**, not derivable, UNLESS the source is first enriched. Do not re-propose "just derive it from the folder tree" — the information isn't there.

### DECISION (Ryan, 2026-06-27): Option 2 — put the domain on the entity in the source

Ryan chose to make the URL domain a real source-of-truth on each entity, so the generator derives paths from the source (no side map, no remap script).

**Verified mechanism (2026-06-27):** this is a **cross-repo** change; the first step is manifest-side.
- `module` is the name of the `module "x" {}` block an entity sits in (`ir-compiler.js:284`); it feeds Prisma `@@schema` (reusing it for routes risks the schema) and uses the 13-folder taxonomy, not the 19 URL domains. **Not reusable for routing.**
- The entity DSL body is `property/computed/relationship/constraint/key/timestamps/mixin` — **no generic metadata facility**, so a route-only `routeDomain` attribute does not exist yet.

**Plan:**
1. **Manifest-side:** add a per-entity `routeDomain` attribute (grammar + IR, route-only, no Prisma coupling). Cleanest: have the `nextjs` projection build `routeSegments` from `routeDomain` + `routeCasing` (shipped) + `pluralize` (`projections/shared/naming.js`) natively.
2. **Capsule-side:** set `routeDomain` on all 188 entities (lifted from `ENTITY_DOMAIN_MAP`) + the irregular overrides (`InventoryItem → kitchen/inventory`, `Event → events/event`); then delete `ENTITY_DOMAIN_MAP` **and** the `generate.mjs` remap.

Capsule cannot start until the `routeDomain` attribute ships in the compiler. (`ENTITY_DOMAIN_MAP` = 188 entries is the data to migrate.)

**Derivation home (Ryan, 2026-06-27): native in the nextjs projection** — the projection builds the full path from `routeDomain + '/' + pluralize(applyRouteCasing(name, 'kebab-case'))`. (`routeCasing` accepts `lowercase | kebab-case | snake_case | preserve`; the projection does NOT pluralize today — that's part of the manifest-side work.)

**⚠️ Coverage of native derivation = 57% (verified 2026-06-27).** Ran the real `pluralize`/`applyRouteCasing` against the map: **108/188 derive exactly**; **80/188 are irregular** — bespoke segments that don't follow `domain/pluralize(kebab(name))`: domain-word stripped (`EventBudget→budgets`, `EventStaff→staff`, `PurchaseRequisition→requisitions`), renamed (`User→employees`, `StaffMember→staff/members`), singular (`Event→event`, `Shipment→shipment`), or sub-pathed (`CycleCountSession→cycle-count/sessions`, `AdminChatParticipant→chat/participants`). The current URL scheme is **inconsistent** (e.g. `EventStaff→events/staff` vs `StaffMember→staff/members`) — accreted in the hand-map.

**Sub-decision (NEEDS-RYAN):**
- **Keep the 80** → add a per-entity `routeSegment` override for them (option 2 = 188 `routeDomain` + 80 `routeSegment`; no side map, URLs all preserved).
- **Regularize** → all 188 derive; the 80 irregular **URLs change** to the consistent form; **zero overrides, map fully dies**; cost = update `next.config.ts` rewrites + client paths for the 80 (internal API URLs, zero UX impact). Only this path fully delivers "derived from source, no map."

### Decision 2 (small, independent): the datetime fix

Confirmed config home: **`manifest.config.yaml`** (root) — already authoritative for projection options. The `datetime → string` issue is solved by **one line** added under `projections.nextjs.options`:

```yaml
projections:
  nextjs:
    options:
      dateSerialization: iso-string   # default is 'date' (emits `Date`); 'iso-string' emits `string`
```

With that set, `scalar-type-map.mjs` deletes entirely (array is already native in 2.18.5, numeric+enum native, enum-prepend redundant). **Verified token** (`interface.d.ts:264` → `'date' | 'iso-string'`, installed 2.18.5). This needs no path decision — it can land independently of Decision 1.

### Config mechanism — settled by the official docs + installed package (not open)

- **One file, no directory.** The CLI loads a single config from project root, search order `manifest.config.yaml` → `.yml` → `.manifestrc.yaml` → `.yml` (first found wins). There is **no config directory** and **no `$ref`/`!include`/anchor/file-splitting** — verified against the official [`/cli/configuration`](https://manifest-b1e8623f.mintlify.app/cli/configuration) doc. Multi-environment is overlay files (`manifest.config.<env>.yaml`) selected by `MANIFEST_ENV`, shallow-merged. Resolution precedence: CLI flag > config file > built-in default.
- So both knobs below go **inline** in the existing `manifest.config.yaml` under `projections.nextjs.options`. `routeSegments` can't point at an external file — it's either inlined (188 entries, mirroring `entityToPrismaModel`/`accessorNames` already there) or the wrapper passes it programmatically from `ENTITY_DOMAIN_MAP` via the option object (CLI/programmatic options outrank the file).
- **⚠️ Stale upstream docs (flag for Ryan — he owns the docs):** the published `/cli/configuration` page lists the nextjs options but **omits `routeSegments` and `dateSerialization`**, both of which exist in installed 2.18.5 (`NextJsProjectionOptions`, `interface.d.ts:257` and `:264`). The page should add them. Until it does, the `.d.ts` is the source of truth.
- `routeSegments` docstring (verbatim): *"per-entity URL path segment overrides for generated routes and the client SDK's fetch paths… `{ OrderLine: 'order-lines' }` → `app/api/order-lines/list/route.ts` + `fetch('/api/order-lines/list')`."* — i.e. it drives **both** the route file path and the `ts.client` fetch path from one map, which is exactly what `generate.mjs` hand-does today.

### What I am NOT deciding for you
- The exact `routeSegments` placement (inline 188 YAML entries vs. wrapper-derived from `ENTITY_DOMAIN_MAP`) — a sub-choice under A.
- Whether reads route through react-query hooks vs `ts.client` (Q002).

---

## 1. What This Is (plain English)

This is how Capsule's frontend talks to the Manifest API: **typed client functions and data hooks, generated by Manifest's own projections** — the Next.js projection (`nextjs`) for routes/types/client, and the `react-query` projection for hooks. Screens call typed functions like `eventCreate()` or `useEventList()` instead of hand-writing fetches.

Manifest ships all of it. Capsule's only job is to **configure** the projections — point them at our domain routes and response envelopes. We do **not** hand-build a parallel client/hooks stack.

Real app impact:

```text
When correct: one typed call per screen action; payloads type-checked before the network;
  changing a Manifest command updates everything on regenerate; zero hand-maintained client code.
When wrong: hand-written fetches scattered across features; payloads compile but fail at runtime;
  duplicate clients drift from the API.
```

---

## 2. Ryan Final Decision

Decision:

```text
NEEDS-RYAN
```

Reason:

```text
The target implementation (documented projections + config maps) is verified feasible.
Ryan signs off the migration: retire the custom generators, wire the projections with
routeSegments / entityRoutes / readEnvelope, and update the data layer.
```

Do not do:

```text
Do not hand-write client or hook wrappers in feature folders.
Do not call executeCommand with string entity/command names when a typed function exists.
Do not replace RuntimeEngine.runCommand — the client only CALLS it via the dispatcher (documented rule).
Do not re-introduce a custom client/hooks generator when the documented projection already covers it.
```

---

## 3. The correct implementation (the baseline agents build against)

### Documented projections Capsule consumes
- **Next.js projection** (`nextjs`) — surfaces: `nextjs.route` (read route files), `nextjs.dispatcher` (writes), `ts.types` (entity interfaces), `ts.client` (typed fetch wrappers). ([/integration/projections](https://manifest-b1e8623f.mintlify.app/integration/projections))
- **react-query projection** (`react-query`) — surfaces: `react-query.hooks` (typed list/detail/mutation hooks + automatic cache invalidation), `react-query.provider` (QueryClient). ([/projections/react-query](https://manifest-b1e8623f.mintlify.app/projections/react-query))

### The config that makes them Capsule-shaped (verified 2026-06-26)
Our domain routing (`/api/events/event/...`) and response envelopes are passed to the projections as **config maps**, derived from the existing `ENTITY_DOMAIN_MAP` (`manifest/scripts/entity-domain-map.mjs`):

| Output | Projection / surface | Config knob | Verified result |
|---|---|---|---|
| Route **files** | `nextjs.route` | `routeSegments: { Event: 'events/event' }` | `app/api/events/event/list/route.ts` ✓ |
| **Client** fetch paths | `ts.client` | `routeSegments` | `fetch('/api/events/event/list')` ✓ |
| **Hooks** (list/detail/mutation) | `react-query.hooks` | `entityRoutes` + `readEnvelope` | `/api/events/event/list` + `events` envelope key ✓ |
| **Writes** | `nextjs.dispatcher` | (canonical path) | `/api/manifest/<entity>/commands/<command>` ✓ (flat — already correct) |

Pattern verified on `Event`; per-entity verification happens during migration. All four knobs honored the config and produced Capsule-shaped output directly from the projections.

### Scalar glue is now fully retireable as of 2.18.5 (re-verified empirically 2026-06-27)
As of installed **2.18.5**, **no scalar `ts.types` glue is required any more** — both gaps are closed upstream. Verified by running stock `--surface types` on the live `manifest/ir/kitchen.ir.json`:

| Former glue | 2.18.3 (old) | 2.18.5 (now) | How it retires |
|---|---|---|---|
| `array → unknown[]` (`toTsTypes`) | raw `array` leaked (36×, invalid TS) | **0 leaks — fixed natively.** `irTypeToTsType` recurses arrays/lists to typed `T[]` (better than the glue's blanket `unknown[]`). | **REDUNDANT** — delete it. |
| `datetime → string` (`toTsTypes`) | `Date` (830×), no knob | still `Date` (830×) **by default**, but the `nextjs` projection now has `dateSerialization?: 'date' \| 'iso-string'` (default `'date'`). Setting **`dateSerialization: 'iso-string'`** emits `string`. | **RETIREABLE via config** — set `dateSerialization: 'iso-string'` in the projection options; drop the post-process. |

So `scalar-type-map.mjs` / `toTsTypes` retires entirely in the migration: array is native, datetime is config (`dateSerialization: 'iso-string'`). The only catch: the option must be **wired** — by default datetime still emits `Date`, so don't delete the glue until the projection is configured with `'iso-string'`. (Ryan added `dateSerialization` in manifest `main` `5dfa675`; array+date both shipped in published **2.18.5**, now installed.)

### Retired glue (genuinely redundant as of 2.18.5)
- **Numeric scalars** — `money`/`decimal`/`int`/`bigint`/`float` → `number`, native (`irTypeToTsType`). Verified zero numeric leaks.
- **`array`** — native typed `T[]` as of 2.18.5 (verified 0 leaks).
- **Enum emission** (`generate-capsule-client.mjs` lines 88–95) — stock `ts.types` emits enums as string-literal unions (`generateEnumType`). The hand-rolled enum prepend is redundant **and harmful**: regenerating now would emit each enum **twice** → duplicate-identifier error. Drop it. (The committed `manifest-types.generated.ts` predates the bump — enums appear once — so a regen must drop the prepend.)

> History: 2.18.0 leaked money/decimal + omitted enums → 2.18.1 fixed money/decimal/int/enum → 2.18.3 added float+bigint + enum unions → **2.18.5 added native `array`/`list` → `T[]` and the `dateSerialization: 'iso-string'` option**, closing the last two scalar gaps. After 2.18.5 there is no required scalar glue (datetime is config, not glue).

### What gets retired (the migration)
The custom generators that hand-built what the projections now produce are deleted:
- `generate.mjs` domain-remap → replaced by `routeSegments`.
- `generate-react-query-hooks.mjs` → replaced by the `react-query` projection.
- `generate-capsule-client.mjs` domain/envelope logic → replaced (domain/envelope by `ts.client` + `routeSegments`). **`scalar-type-map.mjs` post-process — DELETE:** array is native (2.18.5), datetime via `dateSerialization: 'iso-string'`, numeric+enum native. Wire `dateSerialization: 'iso-string'` in the projection config as part of the swap.

Evidence (verified this pass):

```text
- Projections ship in: node_modules/@angriff36/manifest/dist/manifest/projections/{nextjs,react-query}/
- Options: .../projections/interface.d.ts (NextJsProjectionOptions.routeSegments); .../react-query/generator.d.ts (ReactQueryProjectionOptions: entityRoutes/readEnvelope/fetchAdapter/commandEnvelope)
- Domain-map source: manifest/scripts/entity-domain-map.mjs (ENTITY_DOMAIN_MAP → routeSegments/entityRoutes/readEnvelope)
- Scalar/enum handling (installed **2.18.5**): numeric + enum native; `array`/`list` → typed `T[]` native (verified 0 leaks); `datetime → string` via `dateSerialization: 'iso-string'` option (default `'date'` still emits `Date`, 830×) → `scalar-type-map.mjs` fully retireable once the projection is configured with `'iso-string'`
- Docs: https://manifest-b1e8623f.mintlify.app/integration/projections  ·  .../projections/react-query
- Confidence: high — config knobs + Capsule-shaped output verified empirically (Event across all four surfaces)
```

---

## 4. Where It Lives

```text
Canonical decision file: canonical/manifest/generation/client-generation/README.md
Projections (shipped):   node_modules/@angriff36/manifest/dist/manifest/projections/{nextjs,react-query}/
Config-map source:       manifest/scripts/entity-domain-map.mjs
Generated output (target): apps/app/app/lib/manifest-types.generated.ts (stock ts.types with `dateSerialization: 'iso-string'`; no post-process needed as of 2.18.5 — array native, numeric+enum native);
                           manifest-client (ts.client via routeSegments);
                           manifest-hooks (react-query via entityRoutes/readEnvelope)
Custom generators (retiring): manifest/scripts/{generate-capsule-client,generate-react-query-hooks}.mjs, generate.mjs remap
```

---

## 5. Entry Points

```text
CLI (target): manifest generate --projection nextjs --surface {route|client|types}
              react-query projection invoked programmatically via getProjection('react-query') (no CLI yet)
Writes: POST /api/manifest/{entity}/commands/{command}   (→ dispatcher → RuntimeEngine.runCommand)
Reads:  GET  /api/{domain}/{entity}/{list|{id}}           (domain-routed via routeSegments)
```

---

## 6. What Consumes It

```text
Direct: every screen that creates/updates/lists/reads entity data; form components; bulk actions.
Human:  Ryan, coding agents.
```

---

## 7. What It Is Wired To

```text
Manifest entities/commands: all — each gets typed client functions + hooks.
Manifest events / policies: not consumed client-side (enforced server-side by the dispatcher/runtime).
Database tables: NONE (client → API routes, never the DB).
```

---

## 8. Canonical Behavior

```text
Happy path:
  IR → projections (configured with routeSegments / entityRoutes / readEnvelope)
     → typed client + hooks → screens → dispatcher → RuntimeEngine.runCommand.

Failure behavior:
  Stale generation drifts; CI gates (manifest:contract:check, manifest:react-query:check) catch it.

Forbidden behavior:
  No hand-written client/hook wrappers. No raw executeCommand strings when a typed fn exists.
  No replacing RuntimeEngine.runCommand. No re-introducing custom generators the projections cover.
```

---

## 9. Naming Rules

```text
Canonical name: Manifest Client Generation
Folder / ID: client-generation · manifest.generation.client-generation
Function naming: camelCase entity + PascalCase command (clientCreate, eventUpdate)
```

---

## 10. Open Questions

| ID | Question | Why it matters | Evidence | Options | Ryan decision |
|---|---|---|---|---|---|
| Q001 | Approve the migration: retire the custom generators? | Removes hand-built glue; uses Manifest as built. | Scalars: native in 2.18.6. Routes: `routeSegments` can't express `commands/` infix + detail overrides. | **RESOLVED 2026-06-27:** scalar/type glue retired via `dateSerialization: iso-string` (DONE, `bb84d673d`); `generate.mjs` route remap KEPT (irreducible — §0 step 2). | RESOLVED — scalars done; route remap stays |
| Q002 | Route reads through react-query hooks vs `ts.client`? | If hooks, the custom client fully retires. | `react-query` `entityRoutes` verified; `ts.client` has no envelope knob. | Defer — independent of the path/scalar decision; revisit when wiring reads. | DEFERRED (not blocking) |
| Q003 | Fix the `ts.types` scalar/enum gaps upstream and drop the post-processing? **RESOLVED 2026-06-27 (2.18.5).** | Determines whether scalar glue retires. | 2.18.5 closes all four: numeric → `number`, enum → unions, `array`/`list` → typed `T[]` (verified 0 leaks), and `dateSerialization: 'iso-string'` for `datetime → string`. Verified empirically on the kitchen IR. | Outcome: delete `scalar-type-map.mjs` + the enum-prepend; wire `dateSerialization: 'iso-string'` in the projection config. | RESOLVED — fixed upstream in 2.18.5 (array native + `dateSerialization` option) |
| Q004 | Verify the pattern on a 2nd entity before rollout? | De-risks the migration. | Moot under §0: `routeSegments` takes the full segment per entity straight from the existing map, so all 188 URLs are preserved verbatim (no per-entity derivation to de-risk). | RESOLVED — moot (URLs preserved verbatim) |

---

## 11. Decision History

| Date | Decision | Made by | Reason |
|---|---|---|---|
| 2026-06-27 | **2.18.5 closes the scalar glue entirely.** Ryan shipped `array`/`list` → typed `T[]` natively + a `dateSerialization: 'date' \| 'iso-string'` nextjs option (commit `5dfa675`), published as 2.18.5 and installed (verified across all 4 package.json; stock `--surface types` now shows 0 `array` leaks; datetime → `string` when `dateSerialization: 'iso-string'`). `scalar-type-map.mjs` fully retires; migration must wire `dateSerialization: 'iso-string'`. Q003 → RESOLVED. | Ryan | Upstream fixes landed; verified empirically on the kitchen IR |
| 2026-06-27 | **Corrected the 2026-06-26 "fully redundant" claim** (interim, pre-2.18.5). Re-ran stock `--surface types`: numeric + enum native, but on 2.18.3 `datetime`→`Date` (830×) and `array` leaked raw (36×). At that point `scalar-type-map.mjs` was still required. *(Superseded same day by the 2.18.5 entry above.)* | agent | Stale-info discipline: the prior claim would have an agent delete then-required glue |
| 2026-06-26 | Ryan upgraded to **2.18.3**; verified numeric scalars (money/decimal/int/bigint/float → `number`) + enum unions are native. *(This pass over-claimed "fully redundant" — see 2026-06-27 correction; datetime/array were not checked.)* | agent | Empirical re-test of `ts.types` on the kitchen IR after each bump |
| 2026-06-26 | Entry rewritten to the **correct target implementation** (projections + config maps); custom generators framed as retiring, not as the baseline | agent | Ryan: canonical describes the right way; don't confuse agents with the old maze |
| 2026-06-26 | Verified `routeSegments`/`entityRoutes` unwind the domain-routing maze — `nextjs.route`, `ts.client`, and `react-query.hooks` all honor per-entity config (tested on `Event`) | agent | Empirical: Capsule-shaped output produced from projection config, not custom code |
