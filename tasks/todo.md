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
