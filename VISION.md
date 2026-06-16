So for Capsule-Pro’s domain layer, the desired end state is:

.manifest source → compiled IR → Convex projection → Convex backend

not:

.manifest source → IR → generated Convex backend → Next route.ts wrapper → frontend

Manifest + Convex would be genuinely nasty. Here's why:

The core value proposition: You write the domain once. Entities, commands, events, policies, constraints, reactions. From that single source you get schema, API surface, types, client hooks, validation rules, audit trails, and cross-domain automation — all generated, all verified by drift gates. You literally cannot ship schema/API/code that disagree.

What makes it different from "just use a framework":

1. Reactions are the killer feature. In Capsule Pro, when an event's guest count changes, a reaction fires that rescales every prep task. When a payment records, a reaction updates the invoice. When a vendor gets blacklisted, a reaction cancels their purchase orders. That's 50+ cross-domain automations that live in the domain model, not in glue code. Add a new entity + reaction, it just works — no integration spaghetti.

2. Governed writes eliminate an entire class of bugs. Every mutation goes through RuntimeEngine.runCommand(). The runtime enforces policies, checks constraints, emits events, writes audit entries, runs reactions. You can't bypass it. No more "someone called prisma.X.create() directly and skipped the business rules."

3. Projection-driven everything. Want Prisma? Next.js routes? OpenAPI? React Query hooks? Zod schemas? All projections off the same IR. Switch from Prisma to something else? Write a new projection, not rewrite your app.

With Convex specifically:

The fit is almost too clean. Convex gives you real-time reactive queries, schema, functions, and the database. Manifest gives you domain governance on top:

- Convex as a new projection target — manifest emits Convex schema + mutation/query functions instead of Prisma + Next.js routes
- Reactions become Convex schedulers/triggers — manifest's event bus maps directly to Convex's reactive system. No outbox pattern needed because Convex is already reactive
- Real-time by default — manifest commands produce events, Convex pushes the changes to every connected client instantly. The "refresh to see updates" problem just... doesn't exist
- Zero infra glue — no Prisma migrations, no API route files, no outbox table, no cron for sync. Manifest says what the domain does, Convex handles making it reactive and persistent
- Type safety end-to-end — manifest generates the types, Convex uses them in functions, the client gets them via React Query or Convex's own hooks

Where I'd start greenfield:

A catering/event platform with maybe 30 entities instead of 212. Same domain logic — events, prep, inventory, staffing, invoicing — but you get the reaction system from day one with zero legacy migration pain. Event created → kitchen prep auto-seeded → inventory demand calculated → staffing estimated → invoice draft created. All from reactions, all reactive, all governed.

The thing that sold me is that we went from 30+ errors per session to zero, and the fix wasn't writing more code — it was ripping out the custom glue and letting the system work as designed. That's the whole pitch: write less, govern more, let the machinery handle the plumbing.

This is the part where the vision and the mechanics finally line up — and it resolves the Hermes disagreement cleanly. Let me check one thing so I describe the reaction wiring accurately, not from the brochure.

  Searched for 1 pattern

Read the reaction codegen (functions.ts:242, 376). Now the whole thing resolves, and the resolution is in your favor: the vision you were sold is the projection path — which means you never need a store adapter. Hermes was answering a different architecture than the one you described.

Your vision and my "Path 2" are the same thing

Look at your own bullet: "Convex as a new projection target — manifest emits Convex schema + mutation/query functions instead of Prisma + Next.js routes." That's literally src/manifest/projections/convex/. No JS runtime in the request path → no Store interface to implement → no store adapter. Your "zero infra glue, no outbox, Convex handles persistent + reactive" is only true on the projection path. Hermes's adapter is the other architecture (keep the live engine, bridge it to Convex), which your vision explicitly rejects.

Resolving the one apparent contradiction

- runCommand is the invariant, not a literal call you must keep at runtime.
- The Convex projection compiles that exact pipeline — policies → guards → constraints (fail-closed) → mutate → event row → reactions — into each generated Convex mutation (functions.ts:4-10, 222-235). The governance isn't executed by the engine at request time; it's baked into the only write door Convex exposes.

So "you cannot bypass the business rules" survives intact — not because the engine is present, but because the generated mutation is the governed door. The guarantee is structural, not runtime-dependent. (One human guardrail remains: nobody hand-writes a Convex mutation that calls ctx.db.insert directly — same discipline as "nobody calls prisma.x.create() directly." The projection gives you the governed door; review/lint keeps it the only door.)

Two corrections to the brochure (both make it stronger, not weaker)

1. Reactions are compiled as inline transactional fan-out inside the emitting mutation (functions.ts:242-280, 376

Not vaporware — the projection already emits six surfaces (schema, queries, mutations, crons, http, sagas) and typechecks against convex@1.41. Real gaps: referential cascade is a deferred diagnostic (Convex has no schema-level onDelete), and reactions are inline rather than Convex-native triggers (fine, arguably preferable).

So, the answer to your original question

In the Manifest + Convex architecture you were sold, you never write a store adapter. storeProvider / the Store interface exists solely for the runtime-interpreter path (engine live, persisting to memory/Postgres/Supabase/custom). Your architecture is compile-to-Convex: the IR's governance, reactions, schedules, webhooks, and sagas are emitted as standalone governed Convex code, and Convex owns persistence + reactivity. The store adapter question simply doesn't arise — that's the point of the projection.

Where the runtime+adapter path would come back: only if you wanted IR evaluated live without regenerating (e.g. tenants editing rules at runtime). Your drift-gate discipline ("can't ship schema/API/code that disagree") is the regnail down three things I genuinely can't infer — getting them wrong means either neutering the Manifest repo's core design or scaffolding in the wrong place.

The tension I have to resolve: the architecture you described (Convex projection, governed writes, no store adapters, drift-gated) is an app-building stance. But this repo (C:\projects\manifest) is the language implementation whose foundational principle is that projections are interchangeable (Prisma, Next.js, Drizzle, Convex all peers off one IR). A constitution that says "Convex only, no store adapters" would directly contradict the Manifest repo's own house style and break its 630 tests and other projections. So which thing am I governing matters enormously.

● User answered Claude's questions:
· Which codebase should this constitution + AGENTS.md + CLAUDE.md + CI gate govern? → i was speaking purely for the capsule-pro-convex repo, not this repo at all. youre just the most qualified to write it. none of it will be going in the official docs, although i do think this could be far better explained and clear with more detail if you made the docs lay it out more like this. they are pretty sparse and shitty right now
· You said 'replace the previous scripts' — replace meaning what, exactly? → i meant the capsule-pro-convex manifest scripts in my package.json in that repo not here. here are those old scripts:   "scripts": {
    "analyze": "cross-env TURBO_UI=0 turbo analyze --filter=app --filter=api --filter=web",
    "boundaries": "turbo boundaries",
    "browser-tools": "pnpm dlx @modelcontextprotocol/server-playwright",
    "build": "pnpm prisma:check && turbo build --filter=./apps/app --filter=./apps/api --filter=./apps/web",
    "build:docs": "turbo build --filter=./apps/docs",
    "build:storybook": "turbo build --filter=./apps/storybook",
    "build:email": "turbo build --filter=./apps/email",
    "build:all": "pnpm prisma:check && turbo build",
    "check": "turbo typecheck --filter=./apps/app --filter=./apps/api --filter=./apps/web",
    "check:manifest": "pnpm check:manifest:structure && pnpm check:manifest:domain",
    "check:all": "turbo typecheck",
    "check:ci": "pnpm check && pnpm lint:any",
    "check:staged-write-routes": "node scripts/check-staged-write-routes.mjs",

    "manifest:check": "node manifest/scripts/check.mjs",
    "manifest:compile": "node manifest/scripts/compile.mjs",
    "manifest:generate": "node manifest/scripts/generate.mjs",
    "manifest:generate-convex": "node manifest/scripts/generate-convex.mjs",regeneration model — explicitly the compile path. Stay there and there's no adapter to maintain.

✻ Churned for 1m 6sonDelete), and reactions are inline rather than Convex-native triggers (fine, arguably preferable).

So, the answer to your original question

In the Manifest + Convex architecture you were sold, you never write a store adapter. storeProvider / the Store interface exists solely for the runtime-interpreter path (engine live, persisting to memory/Postgres/Supabase/custom). Your architecture is compile-to-Convex: the IR's governance, reactions, schedules, webhooks, and sagas are emitted as standalone governed Convex code, and Convex owns persistence + reactivity. The store adapter question simply doesn't arise — that's the point of the projection.

Where the runtime+adapter path would come back: only if you wanted IR evaluated live without regenerating (e.g. tenants editing rules at runtime). Your drift-gate discipline ("can't ship schema/API/code that disagree") is the regeneration model — explicitly the compile path. Stay there and there's no adapter to maintain.

✻ Churned for 1m 6s

❯ i need this whole thing written into a new constitution.md AGENTS.md and CLAUDE.md and all new scripts to replace the previous ones and a ci gate that enforces this architecture and setup and locks it down in stone.

This is a big, lock-it-in-stone change, and before I write a single governance file or delete any scripts I need to nail down three things I genuinely can't infer — getting them wrong means either neutering the Manifest repo's core design or scaffolding in the wrong place.

The tension I have to resolve: the architecture you described (Convex projection, governed writes, no store adapters, drift-gated) is an app-building stance. But this repo (C:\projects\manifest) is the language implementation whose foundational principle is that projections are interchangeable (Prisma, Next.js, Drizzle, Convex all peers off one IR). A constitution that says "Convex only, no store adapters" would directly contradict the Manifest repo's own house style and break its 630 tests and other projections. So which thing am I governing matters enormously.

● User answered Claude's questions:
· Which codebase should this constitution + AGENTS.md + CLAUDE.md + CI gate govern? → i was speaking purely for the capsule-pro-convex repo, not this repo at all. youre just the most qualified to write it. none of it will be going in the official docs, although i do think this could be far better explained and clear with more detail if you made the docs lay it out more like this. they are pretty sparse and shitty right now
· You said 'replace the previous scripts' — replace meaning what, exactly? → i meant the capsule-pro-convex manifest scripts in my package.json in that repo not here. here are those old scripts:   "scripts": {
    "analyze": "cross-env TURBO_UI=0 turbo analyze --filter=app --filter=api --filter=web",
    "boundaries": "turbo boundaries",
    "browser-tools": "pnpm dlx @modelcontextprotocol/server-playwright",
    "build": "pnpm prisma:check && turbo build --filter=./apps/app --filter=./apps/api --filter=./apps/web",
    "build:docs": "turbo build --filter=./apps/docs",
    "build:storybook": "turbo build --filter=./apps/storybook",
    "build:email": "turbo build --filter=./apps/email",
    "build:all": "pnpm prisma:check && turbo build",
    "check": "turbo typecheck --filter=./apps/app --filter=./apps/api --filter=./apps/web",
    "check:manifest": "pnpm check:manifest:structure && pnpm check:manifest:domain",
    "check:all": "turbo typecheck",
    "check:ci": "pnpm check && pnpm lint:any",
    "check:staged-write-routes": "node scripts/check-staged-write-routes.mjs",
    "manifest:client": "node manifest/scripts/generate-capsule-client.mjs",
    "manifest:try-prisma": "node manifest/scripts/try-prisma.mjs",
    "manifest:generate-metadata": "node manifest/scripts/generate-prisma-model-metadata.mjs && node manifest/scripts/generate-entity-accessor.mjs && node manifest/scripts/build-prisma-store-options.mjs && node manifest/scripts/generate-prisma-store-projection.mjs",
    "manifest:generate-zod": "node manifest/scripts/generate-zod-schemas.mjs",
    "manifest:generate-hooks": "node manifest/scripts/generate-react-query-hooks.mjs",
    "manifest:generate-schema": "node manifest/scripts/generate-full-schema.mjs",
    "manifest:schema:full": "node manifest/scripts/generate-full-schema.mjs",
    "manifest:check-accessor-config": "node manifest/scripts/check-accessor-config.mjs",
    "manifest:check-accessor-config:strict": "node manifest/scripts/check-accessor-config.mjs --strict",
    "manifest:schema:check": "node manifest/scripts/check-schema-drift.mjs",
    "manifest:schema:check:self-test": "node manifest/scripts/check-schema-drift.mjs --self-test",
    "manifest:openapi": "node manifest/scripts/generate-openapi.mjs",
    "manifest:openapi:check": "node manifest/scripts/check-openapi-drift.mjs",
    "manifest:openapi:check:self-test": "node manifest/scripts/check-openapi-drift.mjs --self-test",
    "manifest:react-query:check": "node manifest/scripts/check-react-query-drift.mjs",
    "manifest:react-query:check:self-test": "node manifest/scripts/check-react-query-drift.mjs --self-test",
    "manifest:kysely": "node manifest/scripts/generate-kysely.mjs",
    "manifest:materialized-views": "node manifest/scripts/generate-materialized-views.mjs",
    "manifest:llm-context": "node manifest/scripts/generate-llm-context.mjs",
    "manifest:drizzle": "node manifest/scripts/generate-drizzle.mjs",
    "manifest:analytics": "node manifest/scripts/generate-analytics.mjs",
    "manifest:doctor": "pnpm exec manifest doctor",
    "manifest:routes:ir": "tsx manifest/scripts/generate-route-manifest.ts",
    "manifest:validate": "pnpm exec manifest validate manifest/ir/kitchen.ir.json",
    "manifest:validate-ai": "pnpm exec manifest validate-ai manifest/ir/kitchen.ir.json --min-score 100",
    "manifest:verify-invariants": "node manifest/scripts/verify-invariants.mjs",
    "manifest:ci": "pnpm manifest:verify-invariants && pnpm manifest:doctor && pnpm manifest:openapi:check && pnpm manifest:react-query:check && pnpm manifest:audit:strict && pnpm manifest:coverage:ci",
    "manifest:registries": "node manifest/scripts/emit-registries.mjs",
    "manifest:audit-ir-drift": "node manifest/scripts/audit-ir-drift.mjs",
    "manifest:audit-ir-drift:strict": "node manifest/scripts/audit-ir-drift.mjs --strict",
    "bump-deps": "pnpm dlx npm-check-updates --deep -u --reject recharts && pnpm install",
    "bump-ui": "cd packages/design-system && pnpm dlx shadcn@latest add --all --overwrite",
    "clean:hard": "git clean -xdf",
    "clean:node_modules": "git clean -xdf node_modules",
    "clean:preview": "git clean -ndx",
    "ports": "pwsh -Command \"2221..2226 | ForEach-Object { $port = $_; Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction 

"Convex as a new projection target — manifest emits Convex schema + mutation/query functions instead of Prisma + Next.js routes." That's literally src/manifest/projections/convex/. No JS runtime in the request path → no Store interface to implement → no store adapter. Your "zero infra glue, no outbox, Convex handles persistent + reactive" is only true on the projection path. 

Your pitch says both "every mutation goes through RuntimeEngine.runCommand()" and "Convex emits mutation functions." Those sound like they fight. They don't:

- runCommand is the invariant, not a literal call you must keep at runtime.
- The Convex projection compiles that exact pipeline — policies → guards → constraints (fail-closed) → mutate → event row → reactions — into each generated Convex mutation (functions.ts:4-10, 222-235). The governance isn't executed by the engine at request time; it's baked into the only write door Convex exposes.

So "you cannot bypass the business rules" survives intact — not because the engine is present, but because the generated mutation is the governed door. The guarantee is structural, not runtime-dependent. (One human guardrail remains: nobody hand-writes a Convex mutation that calls ctx.db.insert directly — same discipline as "nobody calls prisma.x.create() directly." The projection gives you the governed door; review/lint keeps it the only door.)

Two corrections to the brochure (both make it stronger, not weaker)

1. Reactions are compiled as inline transactional fan-out inside the emitting mutation (functions.ts:242-280, 376-378), not as separate Convex schedulers/triggers. When event.guestCountChanged fires, the generated updateEvent mutation directly runs the matched reaction's target command in the same transaction, with tenant propagation. That's better than the pitch — the prep-task rescale is atomic with the guest-count write, no outbox, no eventual-consistency window. "No outbox needed" = true. "Schedulers/triggers" = wrong mechanism word for reactions.
2. cronJobs() is for IR schedules, not reactions (convex.crons surface). Time-based things become crons; event-driven things become inline fan-out. Two different mechanisms, correctly split.

What's actually built vs. aspirational

Not vaporware — the projection already emits six surfaces (schema, queries, mutations, crons, http, sagas) and typechecks against convex@1.41. Real gaps: referential cascade is a deferred diagnostic (Convex has no schema-level onDelete), and reactions are inline rather than Convex-native triggers (fine, arguably preferable).
typechecks against convex@1.41. Real gaps: referential cascade is a deferred diagnostic (Convex has no schema-level onDelete), and reactions are inline rather than Convex-native triggers (fine, arguably preferable).


In the Manifest + Convex architecture you were sold, you never write a store adapter. storeProvider / the Store interface exists solely for the runtime-interpreter path (engine live, persisting to memory/Postgres/Supabase/custom). Your architecture is compile-to-Convex: the IR's governance, reactions, schedules, webhooks, and sagas are emitted as standalone governed Convex code, and Convex owns persistence + reactivity. The store adapter question simply doesn't arise — that's the point of the projection.

Where the runtime+adapter path would come back: only if you wanted IR evaluated live without regenerating (e.g. tenants editing rules at runtime). Your drift-gate discipline ("can't ship schema/API/code that disagree") is the regeneration model — explicitly the compile path. Stay there and there's no adapter to maintain.



  "scripts": {
    "analyze": "cross-env TURBO_UI=0 turbo analyze --filter=app --filter=api --filter=web",
    "boundaries": "turbo boundaries",
    "browser-tools": "pnpm dlx @modelcontextprotocol/server-playwright",
    "build": "pnpm prisma:check && turbo build --filter=./apps/app --filter=./apps/api --filter=./apps/web",
    "build:docs": "turbo build --filter=./apps/docs",
    "build:storybook": "turbo build --filter=./apps/storybook",
    "build:email": "turbo build --filter=./apps/email",
    "build:all": "pnpm prisma:check && turbo build",
    "check": "turbo typecheck --filter=./apps/app --filter=./apps/api --filter=./apps/web",
    "check:manifest": "pnpm check:manifest:structure && pnpm check:manifest:domain",
    "check:all": "turbo typecheck",
    "check:ci": "pnpm check && pnpm lint:any",
    "manifest:client": "node manifest/scripts/generate-capsule-client.mjs",
    "manifest:try-prisma": "node manifest/scripts/try-prisma.mjs",
    "manifest:generate-metadata": "node manifest/scripts/generate-prisma-model-metadata.mjs && node manifest/scripts/generate-entity-accessor.mjs && node manifest/scripts/build-prisma-store-options.mjs && node manifest/scripts/generate-prisma-store-projection.mjs",
    "manifest:generate-zod": "node manifest/scripts/generate-zod-schemas.mjs",
    "manifest:generate-hooks": "node manifest/scripts/generate-react-query-hooks.mjs",
    "manifest:generate-schema": "node manifest/scripts/generate-full-schema.mjs",
    "manifest:schema:full": "node manifest/scripts/generate-full-schema.mjs",
    "manifest:check-accessor-config": "node manifest/scripts/check-accessor-config.mjs",
    "manifest:check-accessor-config:strict": "node manifest/scripts/check-accessor-config.mjs --strict",
    "manifest:schema:check": "node manifest/scripts/check-schema-drift.mjs",
    "manifest:schema:check:self-test": "node manifest/scripts/check-schema-drift.mjs --self-test",
    "manifest:openapi": "node manifest/scripts/generate-openapi.mjs",
    "manifest:validate": "pnpm exec manifest validate manifest/ir/kitchen.ir.json",
    "manifest:validate-ai": "pnpm exec manifest validate-ai manifest/ir/kitchen.ir.json --min-score 100",
    "manifest:verify-invariants": "node manifest/scripts/verify-invariants.mjs",
    "manifest:ci": "pnpm manifest:verify-invariants && pnpm manifest:doctor && pnpm manifest:openapi:check && pnpm manifest:react-query:check && pnpm manifest:audit:strict && pnpm manifest:coverage:ci",
    "manifest:registries": "node manifest/scripts/emit-registries.mjs",
    "manifest:audit-ir-drift": "node manifest/scripts/audit-ir-drift.mjs",
    "manifest:audit-ir-drift:strict": "node manifest/scripts/audit-ir-drift.mjs --strict",
    "bump-deps": "pnpm dlx npm-check-updates --deep -u --reject recharts && pnpm install",
    "bump-ui": "cd packages/design-system && pnpm dlx shadcn@latest add --all --overwrite",
    "clean:hard": "git clean -xdf",
    "clean:node_modules": "git clean -xdf node_modules",
    "db:validate-migrations:test": "node --test scripts/__tests__/validate-migration-table-schemas.test.mjs",
    "db:neon-shadow": "node scripts/neon-shadow-database-setup.mjs",
    "db:neon-backup-schema": "node scripts/neon-schema-backup-pgdump.mjs",
    "db:neon-audit": "node scripts/neon-audit-readonly.mjs",