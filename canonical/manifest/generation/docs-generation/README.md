# Manifest Docs Generation (OpenAPI)

Canonical ID: `manifest.generation.docs-generation`

Type: `generator`

Owner decision status: `needs-ryan`

Implementation status: `working`

Last reviewed: `2026-06-26`

Last updated by: `agent`

---

## 1. What This Is

Plain-English purpose:

```text
Generates an OpenAPI 3.1.0 specification from the compiled Manifest IR. The spec covers
all entity list/detail GET endpoints and all command POST endpoints (via the singular
dispatcher pattern). The spec is committed to git (deterministic from IR — intentionally
no timestamp). Served at /api-docs (Scalar UI) and /api-docs/openapi.json (raw), both
auth-gated. CI enforces staleness via byte-level drift detection.
```

Real app impact:

```text
When correct:
- OpenAPI spec stays in sync with the Manifest IR automatically.
- CI fails if IR changes are not followed by a spec regeneration.
- Developers can explore the full API surface via the Scalar UI at /api-docs.
- MCP server and external tooling can consume the spec.

When wrong:
- OpenAPI spec drifts from IR — docs show commands/routes that no longer exist
  or miss new ones.
- CI silently passes with stale documentation.
- External consumers (MCP, Scalar) serve incorrect API information.
```

---

## 2. Ryan Final Decision

Decision:

```text
NEEDS-RYAN
```

Reason:

```text
Docs generation is working with a clear CI gate. Open questions remain around:
(1) whether the auth-gate on /api-docs should be relaxed for external consumers,
(2) whether the 4.4MB spec should be split or served differently,
(3) whether MCP server access should bypass auth.
```

Do not do:

```text
Do not hand-edit manifest/api-docs/openapi.json.
Do not add timestamps to the spec (breaks deterministic drift detection).
Do not serve the spec without auth without Ryan's explicit approval.
Do not create a second OpenAPI spec source (Manifest IR is the sole source).
```

---

## 3. Current Status

Current recorded status:

```text
OpenAPI generation is ACTIVE and fully wired.

Pipeline:
1. manifest:compile produces manifest/ir/kitchen.ir.json
2. manifest:openapi (generate-openapi.mjs) reads IR, applies OpenApiProjection,
   post-processes paths to match Next.js route structure, and writes openapi.json
3. manifest:openapi:check (check-openapi-drift.mjs) regenerates, diffs against
   committed, exits 1 if drift detected — restores working tree in finally block
4. manifest:ci runs manifest:openapi:check as 3rd step in the chain

Serving:
- GET /api-docs → Scalar interactive API reference UI (auth-gated, 401 if not logged in)
- GET /api-docs/openapi.json → raw spec JSON (auth-gated, in-memory cache, no-store)
- Both routes in apps/api/app/api-docs/

The spec is 4,431,789 bytes (~4.4MB), committed to git, and contains 212 entities worth
of paths covering all list/detail GETs and command POSTs.
```

Known gaps:

```text
1. UNKNOWN: whether MCP server reads openapi.json from disk or calls the /api-docs route.
   If from disk, auth-gate is irrelevant for MCP. If via route, MCP needs auth credentials.
2. Spec is 4.4MB — no splitting or lazy-loading exists.
3. No auto-generation of client SDKs from the spec (all client code is generated separately
   by generate-capsule-client.mjs, not from openapi.json).
```

Confidence: `high`

Evidence:

```text
- Generator script: manifest/scripts/generate-openapi.mjs
- Drift checker: manifest/scripts/check-openapi-drift.mjs
- Output file: manifest/api-docs/openapi.json (4,431,789 bytes)
- OpenAPI version: 3.1.0
- Scalar UI route: apps/api/app/api-docs/route.ts
- Spec serving route: apps/api/app/api-docs/openapi.json/route.ts
- Scalar package: @scalar/nextjs-api-reference ^0.11.3
- CLI command: pnpm manifest:openapi (generate)
- CI check: pnpm manifest:openapi:check (drift gate)
- CI chain position: 3rd in manifest:ci (after invariants + doctor)
- Manifest compiler: @angriff36/manifest 2.18.5
```

---

## 3a. Custom Glue & Why Manifest Can't Do It Natively

`generate-openapi.mjs` calls the stock `openapi` projection surface, then post-processes the emitted paths so the spec matches Capsule's **actual** route structure. Each glue piece:

| Glue | What stock OpenAPI projection emits | What Capsule needs | Why Manifest can't do it natively | Status |
|---|---|---|---|---|
| Collapse list suffix | `GET /{entity}/list` | `GET /{entity}` | Capsule's read routes resolve at `/{entity}` (and domain paths). The projection has no path-template option. | **REQUIRED** |
| Rebase command path | `POST /{entity}/{command}` | `POST /{entity}/commands/{command}` (canonical dispatcher) | Spec must document the path the live client actually calls. The projection emits a flat command path with no nesting option. | **REQUIRED** |
| Casing canonicalization | lowercased segments (`actionmilestone`, `mark-created`) | IR casing (`ActionMilestone`, `markCreated`) | The dispatcher routes on exact `[entity]`/`[command]` casing. Stock lowercases → Scalar's "Try it" 404s because documented paths don't match executable paths. No casing option. | **REQUIRED** |

All three are genuine projection gaps (no path-rewrite / casing options exist) — not retireable by config. The spec source (Manifest IR) and the byte-level drift gate (`check-openapi-drift.mjs` in `manifest:ci`) are native/first-party, not glue. Note these path rewrites mirror the same domain-routing decision that drives the `routeSegments` glue in [`route-generation`](../route-generation/README.md) §3a — if `routeSegments` lands upstream, a future Manifest could in principle emit matching OpenAPI paths and retire this too.

---

## 4. Where It Lives

Canonical decision file:

```text
canonical/manifest/generation/docs-generation/README.md
```

Source location:

```text
manifest/scripts/generate-openapi.mjs
manifest/scripts/check-openapi-drift.mjs
```

Generated output location:

```text
manifest/api-docs/openapi.json
```

Runtime location:

```text
apps/api/app/api-docs/route.ts (Scalar UI)
apps/api/app/api-docs/openapi.json/route.ts (raw spec)
```

UI location:

```text
https://localhost:2223/api-docs (Scalar interactive UI, auth-gated)
```

Test location:

```text
check-openapi-drift.mjs has --self-test flag for diff-logic verification.
```

Docs location:

```text
manifest/api-docs/openapi.json is itself the documentation.
```

---

## 5. Entry Points

User-facing route:

```text
/api-docs (Scalar interactive API reference)
/api-docs/openapi.json (raw OpenAPI spec)
```

Route file:

```text
apps/api/app/api-docs/route.ts
apps/api/app/api-docs/openapi.json/route.ts
```

API route / dispatcher:

```text
NONE (these ARE the API routes serving docs)
```

CLI command:

```text
pnpm manifest:openapi (generate spec)
pnpm manifest:openapi:check (drift detection)
```

Background job / cron / worker:

```text
NONE
```

---

## 6. What Consumes It

Direct consumers:

```text
- Scalar UI (apps/api/app/api-docs/route.ts renders interactive docs from spec)
- check-openapi-drift.mjs (CI drift detection)
```

Indirect consumers:

```text
- Developers exploring the API surface manually
- MCP server (@repo/mcp-server uses OpenAPI tools — reads from disk, not via route)
```

Generated consumers:

```text
NONE — the OpenAPI spec is NOT used as input for client generation.
Client code is generated directly from IR by generate-capsule-client.mjs.
```

Human consumers:

```text
Ryan, developers, API consumers (all auth-gated).
```

---

## 7. What It Is Wired To

Manifest entities:

```text
All 212 entities — each appears in paths as list GET + detail GET.
```

Manifest commands:

```text
All commands — each appears in paths as POST /api/manifest/{entity}/commands/{command}.
```

Manifest events:

```text
Not represented in OpenAPI paths (events are emitted in-band, not API endpoints).
```

Manifest policies / access rules:

```text
Not represented in OpenAPI spec (enforced server-side).
```

Database tables / collections:

```text
NONE
```

Generated types:

```text
Request/response schemas in OpenAPI match manifest-types.generated.ts interfaces.
```

Generated client/hooks:

```text
NONE — spec is not used to generate client code.
```

Forms/pages/components:

```text
Scalar UI (/api-docs) renders the spec as interactive documentation.
```

---

## 8. Canonical Behavior

Happy path:

```text
1. IR compiled from .manifest sources.
2. pnpm manifest:openapi reads IR, applies OpenApiProjection, post-processes paths.
3. Writes deterministic openapi.json (no timestamp).
4. Committed to git.
5. CI runs manifest:openapi:check → regenerates → diffs → passes if no drift.
6. Dev server serves Scalar UI + raw spec at /api-docs, both auth-gated.
```

Failure behavior:

```text
If spec drifts from IR, manifest:openapi:check exits 1 → manifest:ci fails.
Agent must run pnpm manifest:openapi + commit the updated spec.
Drift checker always restores working tree in finally block (no dirty state left).
```

Forbidden behavior:

```text
No hand-edits to openapi.json.
No timestamps in output (breaks deterministic diff).
No second OpenAPI spec source.
No unauthenticated access to /api-docs without Ryan's approval.
```

---

## 9. Naming Rules

Canonical name:

```text
Manifest Docs Generation (OpenAPI)
```

Allowed aliases:

```text
OpenAPI generation
API docs generation
Spec generation
```

Forbidden aliases:

```text
Swagger (incorrect spec version)
API documentation (ambiguous — could mean user-facing docs)
```

Casing / slug rules:

```text
Folder: docs-generation
Canonical ID: manifest.generation.docs-generation
Output file: openapi.json
Script: generate-openapi.mjs
Drift checker: check-openapi-drift.mjs
CLI: manifest:openapi (generate), manifest:openapi:check (drift)
```

---

## 10. Open Questions

| ID   | Question | Why it matters | Evidence found | Options | Ryan decision |
| ---- | -------- | -------------- | -------------- | ------- | ------------- |
| Q001 | Should /api-docs be accessible without auth for external consumers? | Currently both Scalar UI and raw spec require authenticated session (401). External tooling or collaborators cannot access docs without logging in. | apps/api/app/api-docs/route.ts checks auth. apps/api/app/api-docs/openapi.json/route.ts checks auth. | A: Keep auth-gated (current); B: Public read-only access to spec; C: Public UI + auth-gated spec | NEEDS-RYAN |
| Q002 | Should the 4.4MB spec be split or lazily loaded? | Large spec may slow Scalar UI rendering and spec serving. No splitting exists today. | openapi.json is 4,431,789 bytes. Single file. In-memory cache on first request. | A: Keep single file (current); B: Split by domain; C: Lazy-load paths on demand | NEEDS-RYAN |
| Q003 | Should the OpenAPI spec be used as input for client generation? | Currently client code is generated directly from IR, not from openapi.json. Using the spec could unify the generation pipeline but may lose type information not in OpenAPI. | generate-capsule-client.mjs reads IR directly. openapi.json is only consumed by Scalar UI + drift check. | A: Keep separate generation paths; B: Generate client from OpenAPI; C: Generate OpenAPI from generated client (circular) | NEEDS-RYAN |

---

## 11. Decision History

| Date       | Decision | Made by | Reason |
| ---------- | -------- | ------- | ------ |
