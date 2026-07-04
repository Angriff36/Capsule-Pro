# UI overhaul: recipe detail + canonical DESIGN.md

(Replaces stale plan for feature-1781435713420-506r2pr8i — generated-client
partitioning — which shipped/stalled in a previous session.)

Problem: recipe detail page was styled against DESIGN-sanity.md (a *marketing-site*
design language, dark #0b0b0b canvas) and grafted into the light app shell as a
full-width black island; tabs card below it uses a different max-width (4xl vs 5xl).
Root DESIGN.md (the "Cohere" system globals.css tokens come from) no longer exists,
so agents keep forking design languages. User verdict: recipe page + site look bad.

## Plan

- [x] Parallel audit: app shell chrome, kitchen page patterns, design-system inventory, token adoption (workflow wf_76dd73e6-9e9, 5 agents)
- [x] Author canonical root DESIGN.md (light Cohere-editorial app system; Saniti = marketing only)
- [x] Redesign recipe detail page on app tokens (kill dark island, integrate tabs, fix widths)
- [x] Typecheck + visual verify in browser (localhost:2221)
- [x] Punch list of remaining site-wide offenders documented in DESIGN.md §8

## Review

- Root `DESIGN.md` authored — canonical product design system (tokens, page
  anatomy via page-shell blocks, color semantics, theming contract, debt list).
  Un-gitignored it (.gitignore:558 was how the original vanished).
- `recipe-cookbook-view.tsx` rewritten: CommandBand hero (Playfair headline,
  mono eyebrow, allergen coral pills, 4 MetricCells) + FilterRail
  (ingredients/equipment/at-a-glance) + phase-grouped checkable steps
  (CCP = coral spine + pill, deep-green progress/checkboxes, action-blue
  sub-recipe links). All features preserved: CCP >=135°F detection,
  localStorage progress, packaging modes, linked recipes, tips.
- `page.tsx`: tabs section integrated at canvas width under a "Records /
  Analysis & history" SectionHeader; extracted helpers (complexity 25 -> <=20,
  the file's only Biome warning, now zero).
- `DESIGN-sanity.md` scoped marketing-only (warning header);
  kitchen/tasks/DESIGN.md ("Verdana Health", orphaned) deleted.
- Verified: tsc clean on changed files (repo-wide backlog pre-existing),
  Biome clean, rendered page inspected in browser at localhost:2221.
- Not done (documented as DESIGN.md §8 debt): chrome-stack collapse (4 nav
  layers), active-state startsWith bug, 136 ad-hoc heading files, raw palette
  sweep (71 files), intake wizard #faf8f5, kitchen-dashboard hex benchmark.

---

# Follow-up (same session): /kitchen/import fails

- [x] Layer 1: apps/api (:2223) not running — started; AGENTS.md now documents both servers
- [x] Layer 2: stale manifest/runtime/src/generated delegate map — generators dual-write now
- [x] Layer 3: missing enum migration — 20260704094312_repair_drift applied (hand-stripped invalid uuid defaults + type changes)
- [x] E2E verified: POMODORO SAUCE CSV imports clean, renders in redesigned detail page
- [ ] UPSTREAM (Ryan): fix @angriff36/manifest Prisma projection — @db.Uuid @default("") (177 fields), TIMESTAMP(3) vs timestamptz(6), enum vs TEXT; then regenerate schema + one clean repair to zero drift
- [ ] Importer is non-atomic (Recipe.create → RecipeVersion.create; mid-failure leaves orphan recipe)

---

# Follow-up 2: design feedback + steps pipeline

- [x] Recipe detail: replaced deep-green CommandBand with light editorial header + compact time strip (mobile-friendly)
- [x] Nutrition/Costing/History un-tabbed -> visible sections grid (RecipeDetailTabs variant="sections"); dead overview/ingredients/steps tabs deleted (~450 lines); HistoryTabContent refactored (complexity 34->ok, window.confirm -> AlertDialog); file fully lint-clean
- [x] recipe-sheets importer now creates real RecipeStep rows (phase "method"); step count in summary = created rows
- [x] Detail view falls back to flat instructions text for legacy text-only imports
- [x] Versions/cost 500s root-caused: orphaned API dev server couldn't spawn compile workers (killed wrapper); restarted clean — version history works
- [x] DESIGN.md updated: rule 11 (no tabs when content fits), detail-page light header pattern
- [ ] Ingredient unit resolution: "5 POUNDS" imports as quantity 5 unit "g" with the real amount in notes — unit-resolver needs pounds/quarts/cups mapping

---

# Follow-up 3: editor presets, save pipeline, detail-page storage/media/steps (subagent wave)

- [x] CRITICAL: composite save routes passed property names (yieldQuantity...) where RecipeVersion.create expects params (yieldQty...) — EVERY recipe save failed on the yield guard. Fixed both routes (params + property seeds).
- [x] Guard messages: compiler drops DSL guard message strings (UPSTREAM @angriff36/manifest gap — noted in manifest/notes.md); added generate-guard-messages.mjs extraction (1772 msgs/993 cmds, index-aligned vs IR) + friendly-error-mapper wiring; composite routes now 422 with friendly text.
- [x] Edit modal: inline error panel (no more page-level "Something went wrong"), yield unit -> real unit Select (submits yieldUnitId), yieldQuantity required + validated, ingredient qty type=number + unit Select, CCP banner restyled informational; list-page buildUpdatePayload wrong-keys data loss fixed (shared recipe-update-payload.ts).
- [x] Allergen matrix API 500-on-every-call fixed (recipe_ingredients joins recipe_version_id via latest-version LATERAL; verified live against dev DB); getMenuById queries parallelized. "2-min menus load" = dev Turbopack compile on first visit (warm ~1-2s), not app code.
- [x] Detail page: Storage container Select in rail (governed Dish.update/clearDefaultContainer), finished-product photo in rail (upload via @repo/storage + governed Dish.update presentationImageUrl, or URL paste), Convert-to-checkable-steps button (parse-flat-instructions + /api/manifest/batch; 9/9 tests).
- [ ] BROWSER VERIFY (extension disconnected at the end): edit+save a recipe from list AND detail, storage select round-trip, photo upload, convert POMODORO text -> steps, /api/kitchen/allergens/matrix 200.
- [ ] FORK (Ryan): recipe-level (vs dish-level) container + hero image needs RecipeVersion IR/schema additions; compiler guard-message support (delete extraction seam when it lands).

---

# Follow-up 4: live-verify fallout (user's save attempt logs)

- [x] Recipe.update SAME param bug (buildRecipeUpdatePayload sent name/... where command wants newName/...) — fixed; friendly 422 pipeline confirmed working in user's logs
- [x] /kitchen crash "Value 'in-progress' not found in enum KitchenTaskStatus": 4 legacy TEXT rows normalized to in_progress (no live writer found; IR is underscore-only); list_kitchen_tasks AI tool description fixed + status filter normalized/validated
- [x] MIDDLEWARE_PIPELINE_NAMES (62) out of sync with pipeline (63): event-staff-active-guard was wired but undeclared — added to names + MIDDLEWARE_REGISTRY (24/24 registry tests pass)
- [x] param-audit swept 145 literal runCommand call sites vs IR: 1 LIVE bug (restore-version RecipeVersion.create — same 8-key mismatch; version restore 500'd) + 5 latent in exported zero-caller helpers (updateDishPricing/updateDishLeadTime/createInventoryItem/completePrepTask/createPrepTask) — ALL FIXED; bug-class rule documented in manifest/notes.md. Not auditable: AdminTask*/BoardConfig/Payment.* (absent from kitchen.ir.json)
- [ ] tool-registry.ts pre-existing debt: complexity 39/28, ~10 scoped regexes, ~20 strict TS errors (untouched legacy)
