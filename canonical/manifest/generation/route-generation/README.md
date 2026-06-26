# Manifest Route Generation

Canonical ID: `manifest.generation.route-generation`

Type: `generator`

Owner decision status: `needs-ryan`

Implementation status: `working`

Last reviewed: `2026-06-26`

Last updated by: `agent`

---

## 1. What This Is

Plain-English purpose:

```text
Generates Next.js API routes for list (GET), detail (GET), and command (POST) operations.
List/detail routes are per-entity physical files generated to domain-specific paths
(e.g., /api/kitchen/dishes/list, /api/events/event/[id]). Command routes use a SINGLE
dynamic dispatcher at /api/manifest/[entity]/commands/[command] — no per-command files.
A transitions read route provides FSM state data per entity.
```

Real app impact:

```text
When correct:
- Adding a new Manifest entity automatically creates list/detail routes.
- All commands route through one governed dispatcher (runManifestCommand).
- Route structure matches the app's domain navigation (kitchen/, events/, crm/, etc.).

When wrong:
- Agents create hand-written route files that duplicate generated ones.
- Per-command route files proliferate (legacy pattern) alongside the dispatcher.
- Routes exist in the app but lack a corresponding rewrite in next.config.ts → 404.
- New entities have no read routes until generation is re-run.
```

---

## 2. Ryan Final Decision

Decision:

```text
NEEDS-RYAN
```

Reason:

```text
Route generation is working with a clear pattern (dispatcher + generated list/detail).
Open questions remain around:
(1) whether all entities should get generated routes or only a subset,
(2) whether middleware/reaction routes should be generated,
(3) whether the transitions endpoint is the canonical FSM API or a stopgap.
```

Do not do:

```text
Do not create per-command route files under manifest/[entity]/commands/.
Do not hand-write list/detail routes for entities covered by generation.
Do not add new API routes without a matching rewrite in apps/app/next.config.ts.
Do not create raw-Prisma read routes that bypass entity-accessor resolution.
```

---

## 3. Current Status

Current recorded status:

```text
Route generation is ACTIVE. manifest:generate (generate.mjs) produces:
- Per-entity list routes: /api/{domain}/{entity-plural}/list (189+ routes)
- Per-entity detail routes: /api/{domain}/{entity-plural}/[id]
- Single dynamic command dispatcher: /api/manifest/[entity]/commands/[command]
- Transitions read endpoint: /api/manifest/[entity]/transitions

The dispatcher is a GENERATED file (marked @generated). It calls runManifestCommand()
which delegates to RuntimeEngine.runCommand() per constitution.

Legacy per-command route files are pruned by pruneLegacyCommandRoutes() in generate.mjs.

The entity-domain-map.mjs maps 189+ entities to domain paths for both route generation
and client code-splitting.
```

Known gaps:

```text
1. UNKNOWN: whether all 212 entities get generated routes or only the 189+ mapped ones.
2. Transitions route exists but is UNKNOWN whether it is auto-generated or hand-written template.
3. Middleware/reaction routes (e.g., /api/async-reactions/drain) are hand-written, not generated.
4. No CI gate specifically for route staleness — routes are regenerated as part of manifest:generate
   but no committed-artifact diff exists (unlike openapi.json).
```

Confidence: `high`

Evidence:

```text
- Generator script: manifest/scripts/generate.mjs
- Domain map: manifest/scripts/entity-domain-map.mjs (189+ entity mappings)
- Command dispatcher: apps/api/app/api/manifest/[entity]/commands/[command]/route.ts (@generated)
- Transitions route: apps/api/app/api/manifest/[entity]/transitions/route.ts
- Generic entity route: apps/api/app/api/manifest/[entity]/route.ts (GET list + GET detail)
- Next.js rewrite: apps/app/next.config.ts line 127-129
  source: "/api/manifest/:path*" → destination: "${apiBaseUrl}/api/manifest/:path*"
- CLI command: pnpm manifest:generate
- Execution function: apps/api/app/lib/manifest/execute-command.ts
- Manifest runtime: @repo/manifest-runtime (via audit-contract-imports allowlist)
```

---

## 4. Where It Lives

Canonical decision file:

```text
canonical/manifest/generation/route-generation/README.md
```

Source location:

```text
manifest/scripts/generate.mjs
manifest/scripts/entity-domain-map.mjs
```

Generated output location:

```text
apps/api/app/api/manifest/[entity]/commands/[command]/route.ts (dispatcher)
apps/api/app/api/manifest/[entity]/transitions/route.ts
apps/api/app/api/manifest/[entity]/route.ts
apps/api/app/api/{domain}/{entity-plural}/list/route.ts (189+ routes)
apps/api/app/api/{domain}/{entity-plural}/[id]/route.ts
```

Runtime location:

```text
apps/api/app/lib/manifest/execute-command.ts
```

UI location:

```text
NONE
```

Test location:

```text
UNKNOWN
```

Docs location:

```text
NONE
```

---

## 5. Entry Points

User-facing route:

```text
NONE (API routes, not user-facing pages)
```

Route file:

```text
apps/api/app/api/manifest/[entity]/commands/[command]/route.ts
```

API route / dispatcher:

```text
POST /api/manifest/{entity}/commands/{command} (all commands)
GET /api/manifest/{entity} (generic list/detail)
GET /api/manifest/{entity}/transitions (FSM states)
GET /api/{domain}/{entity-plural}/list (domain-specific list)
GET /api/{domain}/{entity-plural}/{id} (domain-specific detail)
```

CLI command:

```text
pnpm manifest:generate
```

Background job / cron / worker:

```text
POST /api/async-reactions/drain (hand-written cron endpoint, not generated)
```

---

## 6. What Consumes It

Direct consumers:

```text
- Generated manifest-client functions (call /api/manifest/{entity}/commands/{command})
- Generated domain list/detail reads (call /api/{domain}/{entity-plural}/list)
- StatusTransitionBadge component (calls /api/manifest/{entity}/transitions)
```

Indirect consumers:

```text
- All pages that submit commands via executeCommand()
- All pages that list or display entity data
- Next.js app (proxies via rewrites in next.config.ts)
```

Generated consumers:

```text
- manifest-client/*.generated.ts (generated client functions call these routes)
- manifest-hooks/*.generated.ts (TanStack Query hooks call generated client functions)
```

Human consumers:

```text
Ryan, coding agents, external API consumers.
```

---

## 7. What It Is Wired To

Manifest entities:

```text
All entities in entity-domain-map.mjs (189+ mapped). Each gets list + detail routes.
```

Manifest commands:

```text
All commands — routed through the singular dispatcher.
```

Manifest events:

```text
Events emitted by runManifestCommand after command execution. Not routed, emitted in-band.
```

Manifest policies / access rules:

```text
Enforced server-side by runManifestCommand before action execution.
```

Database tables / collections:

```text
Read routes use Prisma via entity-accessor resolution.
Command routes use RuntimeEngine → Prisma via governed stores.
```

Generated types:

```text
Route handlers return typed JSON matching manifest-types.generated.ts interfaces.
```

Generated client/hooks:

```text
manifest-client/*.generated.ts provides typed wrappers for each route.
manifest-hooks/*.generated.ts provides TanStack Query hooks for reads.
```

Forms/pages/components:

```text
All components that submit commands or display entity data.
```

---

## 8. Canonical Behavior

Happy path:

```text
1. pnpm manifest:generate reads IR + entity-domain-map.
2. Generates list routes per entity to domain paths (e.g., /api/kitchen/dishes/list).
3. Generates detail routes per entity (e.g., /api/kitchen/dishes/[id]).
4. Singular command dispatcher handles all POST /api/manifest/{entity}/commands/{command}.
5. Next.js app rewrites /api/manifest/* to API server at localhost:2223.
6. Dispatcher calls runManifestCommand → RuntimeEngine.runCommand().
7. Response follows CommandSuccess<T> envelope.
```

Failure behavior:

```text
If entity not in domain map, no list/detail routes generated — reads fall back to
generic /api/manifest/{entity} route. If command fails validation/guards, dispatcher
returns CommandError with error details. If rewrite missing in next.config.ts,
app returns 404 even when API route exists.
```

Forbidden behavior:

```text
No per-command physical route files.
No hand-written list/detail routes for generated entities.
No API routes without matching next.config.ts rewrite.
No raw-Prisma reads bypassing entity-accessor resolution.
```

---

## 9. Naming Rules

Canonical name:

```text
Manifest Route Generation
```

Allowed aliases:

```text
Generated API routes
Manifest dispatcher
Domain routes
```

Forbidden aliases:

```text
Command routes (ambiguous — implies per-command files)
CRUD routes (ambiguous — reads are not governed CRUD)
```

Casing / slug rules:

```text
Folder: route-generation
Canonical ID: manifest.generation.route-generation
Command dispatcher path: /api/manifest/{PascalCase entity}/commands/{camelCase command}
List route path: /api/{domain}/{kebab-case-plural}/list
Detail route path: /api/{domain}/{kebab-case-plural}/[id]
Domain map key: PascalCase entity name (e.g., PrepTask, Event, Client)
```

---

## 10. Open Questions

| ID   | Question | Why it matters | Evidence found | Options | Ryan decision |
| ---- | -------- | -------------- | -------------- | ------- | ------------- |
| Q001 | Should there be a CI gate for route staleness? | Routes are regenerated on-demand but no committed-artifact diff exists (unlike openapi.json). Routes could silently go missing if generation isn't re-run after IR changes. | No route-staleness check in manifest:ci. generate.mjs runs but output isn't diffed against committed baseline. | A: Commit generated routes + add diff gate; B: Rely on manifest:generate in CI; C: Current approach (generate, no committed diff) | NEEDS-RYAN |
| Q002 | Should middleware/reaction routes be generated? | Currently all middleware and reaction routes are hand-written. As more reactions are added, hand-writing becomes error-prone. | /api/async-reactions/drain is hand-written. All reaction middleware registered in engine config. | A: Generate reaction route stubs from IR; B: Keep hand-written (reactions are complex); C: Hybrid (generate stubs, hand-fill logic) | NEEDS-RYAN |
| Q003 | Is the transitions endpoint the canonical FSM API? | Provides available transitions for a given entity status. Could be a stopgap or the intended long-term API. | apps/api/app/api/manifest/[entity]/transitions/route.ts exists. Returns FSM state data from IR. | A: Canonical FSM read API; B: Stopgap, replace with generated component; C: Keep as-is | NEEDS-RYAN |

---

## 11. Decision History

| Date       | Decision | Made by | Reason |
| ---------- | -------- | ------- | ------ |
