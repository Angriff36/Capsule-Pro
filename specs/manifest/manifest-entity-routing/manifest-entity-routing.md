Auto-generating routes to “recipe versions” in `apps/app` comes from one thing: you have a compiled IR that can be treated like a source-of-truth API surface, and Next.js App Router routing is just files in `app/` with conventions you can emit deterministically. Next literally defines routes by folder/file names (`page.tsx` for pages, `[param]` for dynamic segments, and `route.ts` for Route Handlers).

Here’s a concrete implementation spec you can drop into your repo as `docs/manifest/ROUTE_GENERATION_SPEC.md` (or wherever you keep binding specs). It’s written to match the reality you described: `apps/api/app/api` for API handlers, and `apps/app/app` for UI pages.

1. Goals and non-goals
   Goal: Every entity in Manifest IR can optionally produce a UI route family in `apps/app/app/(authenticated)/…` and an API route family in `apps/api/app/api/…`, generated from IR and kept in sync by `pnpm exec manifest compile` (or a dedicated `manifest generate` step). The point is that adding `RecipeVersion` to the manifest produces the routes for it, without a human resurrecting random directories.

Non-goals: This does not attempt to auto-design your UI. It generates scaffolds (server page, client component placeholder, loaders/actions wrappers) and stable typed hooks so you can build the real UX on top.

2. Inputs
   The generator consumes compiled IR JSON plus provenance (content hash, compiler version, schema version) as the only required input. The generator must be deterministic: same IR → identical emitted files (byte-for-byte), so Turbo caching and CI diffs behave like sane engineering. (Humans hate sanity, but you don’t.) 

3. Output layout
   Generated outrly marked “generated only” directories so humans stop editing it and then crying.

For UI (Next.js App Router):
`apps/app/app/(authenticated)/__manifest__/entities/<entityName>/…`

For API (Route Handlers):
`apps/api/app/api/__manifest__/entities/<entityName>/…`

This uses Next’s file routing conventions: `page.tsx` for pages, `route.ts` for HTTP handlers, dynamic segments like `[id]` for entity instance pages. ([Next.js][1])

Example for `RecipeVersion`:
UI:
`apps/app/app/(authenticated)/__manifest__/entities/recipe-version/page.tsx` (index/list)
`apps/app/app/(authenticated)/__manifest__/entities/recipe-version/[recipeVersionId]/page.tsx` (detail)

API:
`apps/api/app/api/__manifest__/entities/recipe-version/route.ts` (collection: GET list, POST create)
`apps/api/app/api/__manifest__/entities/recipe-version/[recipeVersionId]/route.ts` (instance: GET read, PATCH update, DELETE archive)

4. Naming and routing rules
   Entity route slug: kebab-case of entity name (`RecipeVersion` → `recipe-version`).
   ID param name: default `<entitySlug>Id` unless overridden by IR metadata (so you can standardize on `recipeVersionId` vs `id` and not suffer). Dynamic segment directories must match Next’s `[param]` convention. ([Next.js][2])

5. Command-to-endpoint mapping
   Commands in IR map to REST-like endpoints beneath the entity:

Option A (simple and predictable):
`POST /api/__manifest__/entities/recipe-version/commands/<commandName>`
This avoids overloading PATCH semantics and keeps commands first-class.

Option B (resource-ish):
Create/update/delete commands map to collection/instance handlers (POST/PATCH/DELETE) and everything else goes under `/commands/…`.

Route handlers are generated as Next Route Handlers (`route.ts`) exporting HTTP methods. ([Next.js][3])

6. Generated file contents
   Every generated file must include:

A) “DO NOT EDIT” header + provenance comment (IR content hash + generator version)
B) Stable imports that point to handwritten “implementation hooks” (so generated code is thin and your real business logic lives in owned files)
C) Minimal, compilable scaffolds

For API route handlers, the generated `route.ts` should:

* Parse params from `context.params` (Next convention)
* Call into a shared manifest runtime invocation module, e.g. `@repo/manifest-runtime/runCommand`
* Return `Response`/`NextResponse` consistently (your choice, but pick one and enforce)

For UI pages, generated `page.tsx` should:

* Provide a server component that loads data via the generated API or direct store (depending on your architecture)
* Render a thin client component placeholder that you own and can customize

7. Ownership split (generated vs handwritten)
   Generated code must never contain business decisions. It only wires. All “real behavior” lives in:
   `apps/app/app/(authenticated)/entities/<entitySlug>/…` (handwritten UI)
   `apps/api/app/api/entities/<entitySlug>/…` (handwritten API overrides if needed)

Generator supports an override pattern: if a handwritten file exists at a documented override path, the generated route imports and delegates to it, instead of emitting logic inline. This prevents merge hell and “regen nuked my edits.”

8. Build integration in Capsule-Pro
   Add a root script:
   `pnpm manifest:generate:routes` that runs after IR compilation.

In Turbo, treat generation as a first-class task with cached outputs so CI doesn’t rebuild when IR hasn’t changed. Turborepo explicitly supports code generation workflows; don’t duct-tape it. ([Turborepo][4])

9. Safety and determinism requirements
   Generator must:

* Write files in a stable order
* Normalize line endings (important for Windows vs Linux diffs, which you’ve already suffered through)
* Fail if it would overwrite a handwritten file outside the generated directories
* Emit a manifest of outputs (JSON list) for auditing

10. Acceptance criteria
    When you add `RecipeVersion` to the manifest and run the compile+generate pipeline:

* UI routes appear under `apps/app/app/(authenticated)/__manifest__/entities/recipe-version/...`
* API handlers appear under `apps/api/app/api/__manifest__/entities/recipe-version/...`
* Types build, lint passes, and there are no route collisions
* Re-running generation produces no diffs if IR unchanged


[1]: https://nextjs.org/docs/app/getting-started/project-structure?utm_source=chatgpt.com "Getting Started: Project Structure"
[2]: https://nextjs.org/docs/pages/building-your-application/routing/dynamic-routes?utm_source=chatgpt.com "Dynamic Routes"
[3]: https://nextjs.org/docs/app/getting-started/route-handlers?utm_source=chatgpt.com "Getting Started: Route Handlers"
[4]: https://turborepo.dev/docs/guides/generating-code?utm_source=chatgpt.com "Generating code"
