The factory assembles the engine with { storeProvider, idempotencyStore, customBuiltins } — but never passes the documented middleware option. Before I assert that, let me verify the installed
  @angriff36/manifest version actually ships middleware in RuntimeOptions and the Middleware type — the docs are public, the repo pins a specific version.

● Bash(PKG=$(node -e 'const p=require.resolve("@angriff36/manifest/package.json",{paths:["manifest/runtime"]});console.log(p)' 2>/dev/null); echo "pkg.json: $PKG"; nod…)
  ⎿  pkg.json: C:\Projects\capsule-pro\node_modules\.pnpm\@angriff36+manifest@2.1.0_@_3aadf1eceb48be60c43a3cddf6159636\node_modules\@angriff36\manifest\package.json
     dir: C:\Projects\capsule-pro\node_modules\.pnpm\@angriff36+manifest@2.1.0_@_3aadf1eceb48be60c43a3cddf6159636\node_modules\@angriff36\manifest
     === grep middleware / Middleware in dist .d.ts ===

● @angriff36/manifest is now 2.1.0 (notes say 1.5/1.6 — stale). And grep found no Middleware in the .d.ts. Let me confirm — check the actual RuntimeOptions type and whether middleware exists anywhere in the package.

● Bash(DIR="C:/Projects/capsule-pro/node_modules/.pnpm/@angriff36+manifest@2.1.0_@_3aadf1eceb48be60c43a3cddf6159636/node_modules/@angriff36/manifest"
      echo "=== any 'mi…)
  ⎿  === any 'middleware' anywhere in package (js+dts) ===
     C:/Projects/capsule-pro/node_modules/.pnpm/@angriff36+manifest@2.1.0_@_3aadf1eceb48be60c43a3cddf6159636/node_modules/@angriff36/manifest/dist/manifest/parser.js
     C:/Projects/capsule-pro/node_modules/.pnpm/@angriff36+manifest@2.1.0_@_3aadf1eceb48be60c43a3cddf6159636/node_modules/@angriff36/manifest/dist/manifest/projections/express/generator.d.ts
     … +75 lines (ctrl+o to expand)

● Confirmed against the installed package — this is the actual diagnosis. Let me read the exact RuntimeOptions + Middleware definitions from 2.1.0's type defs so I'm citing real surface, not just the docs.

  Read 1 file (ctrl+o to expand)

● Verified against the installed package — here's the actual diagnosis.

  The manifest integration isn't using the documented extensibility surface

  The installed @angriff36/manifest is 2.1.0 (the planning corpus says 1.0.32/1.5.0/1.6.0 — stale). 2.1.0 ships the runtime-middleware pipeline exactly as the docs page describes — confirmed in runtime-engine.d.ts:

  - MiddlewareHook = 'before-policy' | 'before-guard' | 'before-action' | 'after-emit' (line 53)
  - interface Middleware { hooks; handler } (line 90)
  - RuntimeOptions.middleware?: Middleware[] (line 101), run by private runMiddleware (line 639)

  The repo's factory never passes it. manifest-runtime-factory.ts:503 constructs the engine with only:

  new ManifestRuntimeEngine(ir, { user, eventCollector, telemetry },
    { storeProvider, idempotencyStore, customBuiltins })   // ← no middleware, no auditSink, no requireTenantContext

  Instead, every cross-cutting concern that the four middleware hooks are built to carry is hand-rolled outside the engine's command lifecycle:

  ┌───────────────────────┬──────────────────────────────────────────────────────────────────────────────────────────────┬────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
  │        Concern        │                          What the repo does (outside the lifecycle)                          │                                    Documented in-lifecycle hook (2.1.0)                                    │
  ├───────────────────────┼──────────────────────────────────────────────────────────────────────────────────────────────┼────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
  │ RBAC                  │ createPermissionGuard(engine) proxy wraps runCommand (factory.ts:516)                        │ before-guard middleware + shortCircuit — and unlike the proxy, it can read ctx.evalContext.self (the docs' │
  │                       │                                                                                              │  archiveGuard example does exactly this)                                                                   │
  ├───────────────────────┼──────────────────────────────────────────────────────────────────────────────────────────────┼────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
  │ Identity/role         │ resolveUserRole() DB lookup mutates ctx.user before engine construction (factory.ts:261-317) │ before-policy + contextPatch: { 'context.userRole': … } — verbatim the docs' authEnrichment example        │
  │ enrichment            │                                                                                              │                                                                                                            │
  ├───────────────────────┼──────────────────────────────────────────────────────────────────────────────────────────────┼────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
  │ Audit / outbox        │ telemetry.onCommandExecuted writes events to outbox (factory.ts:420-478)                     │ after-emit (gets ctx.emittedEvents), or the new first-class auditSink / outboxStore options                │
  ├───────────────────────┼──────────────────────────────────────────────────────────────────────────────────────────────┼────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
  │ Bootstrap-create      │ bootstrapCreateCommand patched to seed full body in run-manifest-command-core.ts (notes      │ before-policy/before-action + contextPatch to seed/validate inside the lifecycle                           │
  │ gotcha                │ §15a, called "load-bearing" in §15b)                                                         │                                                                                                            │
  ├───────────────────────┼──────────────────────────────────────────────────────────────────────────────────────────────┼────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
  │ Tenant enforcement    │ per-entity hand-written requireName/tenantId invariants                                      │ requireTenantContext: true → fail-closed MISSING_TENANT_CONTEXT (RuntimeOptions:161)                       │
  └───────────────────────┴──────────────────────────────────────────────────────────────────────────────────────────────┴────────────────────────────────────────────────────────────────────────────────────────────────────────────┘

  Why this is the finding

  The "bootstrap wrapper is load-bearing, not gratuitous" conclusion in notes.md §15b is a symptom, not a justification. The wrapper is load-bearing because the integration fights the command lifecycle from the outside — pre-seeding
  context, proxying runCommand, post-hoc telemetry — instead of injecting into it at the four deterministic points the engine exposes. The permission guard literally can't see the loaded instance (evalContext.self) that a before-guard
  middleware gets handed; the bootstrap seed problem only exists because there's no before-policy patch point in use to populate context before constraints evaluate.

  This is also why my earlier Fallow pass found a structurally clean graph but a D health grade: nothing is broken-imported, it's just ~15k LOC of hand-rolled lifecycle plumbing reinventing shipped, documented options (middleware,
  auditSink, outboxStore, approvalStore, requireTenantContext, flagProvider — all present in 2.1.0, none wired).

  Next step

  The single highest-leverage change: wire a middleware: [...] array into the factory and migrate RBAC → before-guard, role/identity → before-policy contextPatch, audit → after-emit, and fold the bootstrap seed into a before-policy
  patch — then delete the createPermissionGuard proxy and the bootstrapCreateCommand workaround