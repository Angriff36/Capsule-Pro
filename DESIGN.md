# DESIGN.md — Capsule Pro product UI

**This is the canonical design system for `apps/app` (the product).** The
component docstrings in `packages/design-system` (`card.tsx`, `button.tsx`,
`page-shell.tsx`) that cite "DESIGN.md (Cohere)" refer to this document.

**Supersedes and scopes other design docs:**

- `DESIGN-sanity.md` (root) — a **marketing-site** design kit (dark `#0b0b0b`
  canvas, 112px display type, pricing tables). NEVER apply it to app surfaces.
  It produced the one dark-island regression this doc exists to prevent
  (`recipe-cookbook-view.tsx`, fixed 2026-07).
- `apps/app/.../kitchen/tasks/DESIGN.md` ("Verdana Health") — orphaned foreign
  design kit, zero code implemented it; deleted.

---

## 1. The language in one paragraph

Capsule Pro reads like a **printed kitchen operations journal**: a light paper
canvas (`#ffffff`) with warm-stone panels (`#eeece7`), hairline borders and
**no drop shadows** — depth comes from surface alternation, not elevation.
Each page opens with a **deep-green command band** (`#003c33`) carrying a
Geist Mono eyebrow, a **Playfair Display** headline, and oversized metric
cells. Body copy is **Source Sans 3**. Buttons are pills. Color is scarce and
semantic: deep green is the brand/positive anchor, **coral (`#ff7759`) is the
one attention accent** (allergens, CCP food-safety, taxonomy chips), action
blue (`#1863dc`) is for links and informational values. The content column is
**light even in dark mode** — dark mode recolors chrome only.

## 2. Non-negotiable rules

1. **No hex values in app code.** Use semantic classes (`bg-background`,
   `text-muted-foreground`) or palette utilities (`bg-deep-green`, `text-coral`,
   `border-hairline`, `bg-soft-stone`, `text-action-blue`, `bg-canvas`,
   `text-ink`). Inline `style={{ color: "#..." }}` breaks all four theme
   dimensions (§6) and is how the recipe-page dark island happened.
2. **No raw Tailwind palette colors** (`bg-blue-50`, `text-amber-700`,
   `text-slate-500`, `bg-gray-100`…). Every status color has a token (§5).
3. **No dark content surfaces.** `CommandBand` (deep-green/navy/ink) is the
   only sanctioned dark band, and only as a page hero or feature band. The
   editorial column is pinned light by `.editorial-surface-reset` — by design.
4. **Compose pages from `page-shell` blocks** (§4), not ad-hoc `<h1
   className="font-semibold text-2xl">` + generic Cards. The blocks ARE the
   design system's delivery mechanism (~150 files already use them).
5. **One container rhythm per page.** `PageCanvas` (provided by module
   layouts like `kitchen/layout.tsx`) is full-width with `gap-12`; never nest a
   second canvas, never wrap sections in differing `mx-auto max-w-*` islands.
6. **Playfair Display (`font-display`) only in `DisplayHeading`** (page/hero
   headlines). Section titles and below are Source Sans 3 at weight 400–600.
   Geist Mono (`font-mono`) is exclusively for eyebrows, labels, counts, and
   tabular figures — never running copy.
7. **Coral is scarce.** One attention signal per surface earns it (food
   safety, allergens, critical alerts, taxonomy chips). If everything is
   coral, nothing is.
8. **Radius comes from the scale**: `rounded-sm` 8 · `rounded-card` 16 ·
   `rounded-media`/`rounded-[22px]` 22 · `rounded-full` pills. (Existing
   `rounded-[22px]`/`rounded-[16px]` arbitraries in page-shell are equivalent
   legacy spellings; don't introduce new off-scale values like 5/12px.)
9. **No new empty-state styles.** Use `illustrated-empty-states.tsx`
   (role-aware; remember it hides CTAs when `userRole` is undefined) or the
   `Empty*` primitives, or the soft-stone panel idiom from
   `kitchen/recipes/page.tsx`.
10. **Match the exemplars** before inventing: `events/page.tsx`,
    `kitchen/recipes/page.tsx` (list), `events/kitchen-dashboard` (the visual
    benchmark), `staff/page.tsx` (ModuleLanding).

## 3. Tokens (source of truth: `packages/design-system/styles/globals.css`)

### Color

| Token | Value | Role |
|---|---|---|
| `--ds-canvas` / `bg-canvas` | `#ffffff` | page + card surface |
| `--ds-soft-stone` / `bg-soft-stone` | `#eeece7` | warm secondary panels, filter rails |
| `--ds-ink` / `text-ink` | `#212121` | body text |
| `--ds-primary` | `#17171c` | primary buttons, active pills |
| `--ds-deep-green` / `bg-deep-green` | `#003c33` | command bands, sidebar, positive/brand anchor |
| `--ds-dark-navy` / `bg-dark-navy` | `#071829` | alternate dark band |
| `--ds-coral` / `text-coral` | `#ff7759` | THE attention accent (scarce) |
| `--ds-coral-soft` / `border-coral-soft` | `#ffad9b` | coral chip borders |
| `--ds-action-blue` / `text-action-blue` | `#1863dc` | links, informational values |
| `--ds-hairline` / `border-hairline` | `#d1d5db` | list rules, card borders |
| `--ds-muted` / `text-muted-foreground`* | `#6b7280` / `#616161` | metadata (WCAG AA on canvas) |
| `--ds-severity-critical/high/medium/low` | `#ef4444/#f97316/#eab308/#3b82f6` | alert borders ONLY |
| `--ds-calendar-event/shift/timeoff` (+`-light`) | blue/green/amber pairs | calendar entry pills (FR-103) |
| `--chart-1…5` | green/blue/coral/navy/muted | dataviz series order |

*`--muted-foreground` resolves to `--ds-body-muted #616161`; `--ds-muted
#6b7280` backs `ds-meta`. Both clear AA.

Pale washes `--ds-pale-green #edfce9` / `--ds-pale-blue #f1f5ff` exist for
subtle success/info fills. Legacy `--brand-*` aliases are kept for
compatibility — do not use in new code.

### Type

Fonts are loaded in `apps/app/lib/fonts.ts` and mapped in `globals.css`
`@theme`: `font-sans` → **Source Sans 3**, `font-display` → **Playfair
Display**, `font-mono` → **Geist Mono**.

The ramp lives as `ds-*` utilities (available everywhere, adopted in ~7 app
files + design-system blocks): `ds-hero-display` 96 · `ds-product-display` 72 ·
`ds-section-display` 60 · `ds-section-heading` 48 · `ds-card-heading` 32 ·
`ds-feature-heading` 24 · `ds-body-large` 18 · `ds-body` 16 · `ds-button`
14/500 · `ds-caption` 14 · `ds-micro` 12. In practice, product pages use the
**block components** instead: `DisplayHeading` (4xl–5xl Playfair) and
`SectionHeader` (3xl sans + mono eyebrow).

**Eyebrow standard:** `font-mono text-[11-12px] uppercase tracking-[0.28em]`
— what `MonoLabel` renders and 115+ shipped pages use. This is canonical. The
older `ds-mono-label` (0.08em) and `ds-section-eyebrow` (0.12em) utilities are
legacy spellings; prefer `MonoLabel`/`FilterRailLabel`.

## 4. Page anatomy

Module layouts (e.g. `kitchen/layout.tsx`) already provide `PageCanvas`
(light shell, `gap-12`, generous bottom padding). A page renders:

```tsx
import {
  CommandBand, CommandBandHeader, CommandBandBody, CommandBandLede,
  MonoLabel, DisplayHeading, MetricBand, MetricCell, MetricLabel, MetricValue,
  PageBody, FilterRail, FilterRailGroup, FilterRailLabel,
  OperationalColumn, SectionHeader, OperationalRow, StatusPill,
} from "@repo/design-system/components/blocks/page-shell";

<CommandBand>                        {/* deep-green hero, 22px radius */}
  <CommandBandHeader>
    <div className="space-y-4">
      <MonoLabel tone="dark">Kitchen / Library</MonoLabel>
      <DisplayHeading size="md">Recipes, dishes & menus</DisplayHeading>
      <CommandBandLede>One sentence of purpose.</CommandBandLede>
    </div>
  </CommandBandHeader>
  <CommandBandBody>
    <MetricBand>{/* 2–4 MetricCell: MetricLabel + MetricValue */}</MetricBand>
  </CommandBandBody>
</CommandBand>

<PageBody variant="rail">            {/* or "single" */}
  <FilterRail>…</FilterRail>         {/* sticky soft-stone aside */}
  <OperationalColumn>
    <SectionHeader eyebrow="Roster" title="Events" count="12 total" actions={…} />
    <OperationalRow interactive>…</OperationalRow>
  </OperationalColumn>
</PageBody>
```

- **Detail pages** are the same shape: hero band = the record's identity
  (name, category eyebrow, status pills, headline metrics), then rail
  (context: ingredients, meta, filters) + column (the record's body in
  `SectionHeader`-led sections). Reference: `kitchen/recipes/[recipeId]`.
- **Module roots** use `ModuleLanding`.
- **Do not** use the `KitchenOperational*` exports for new work — they are a
  hex-hardcoded parity duplicate of `CommandBand`/`MetricBand` kept for the
  kitchen-dashboard page; `CommandBand` et al. are canonical.

## 5. Color semantics for state

| Meaning | Treatment |
|---|---|
| Positive / on-track / brand | `text-deep-green`, `bg-deep-green` fills, `--ds-pale-green` wash |
| Needs attention / safety (CCP, allergens) | coral: `text-coral`, `border-coral-soft`, `bg-coral/10` |
| Link / informational metric | `text-action-blue` |
| Destructive / error | `--destructive` (`#b30000`), Button `destructive` |
| Alert severity borders | `border-[var(--ds-severity-*)]` |
| Neutral status chips | `StatusPill` (mono hairline pill) or Badge `secondary` |

## 6. Theming contract (why inline hex is banned)

Four orthogonal dimensions, all driven by classes on `<html>`:

1. **`.dark`** — recolors *chrome only* (sidebar, popovers). Content columns
   carry `.editorial-surface-reset` (via `PageCanvas`/`SidebarInset`) which
   re-pins light paper tokens. Never fight this with manual dark styling.
2. **`.high-contrast`(`.dark`)** — WCAG-AAA palette swap.
3. **`.font-large` / `.font-x-large`** — scales the rem base; prefer rem-based
   sizes; pixel literals (`text-[15px]`) are tolerated for meta/labels only.
4. **`.density-compact` / `.density-spacious`** — table cell padding via
   `data-slot` hooks.

Plus a global `:focus-visible` ring (3px `var(--ring)`) on all interactives —
don't suppress outlines.

## 7. Components

- **Button** (`ui/button.tsx`): pill by default. `default` (near-black),
  `outline`/`pill-outline` (hairline pill), `secondary` (soft-stone), `ghost`,
  `text` (underline, hover action-blue), `on-dark` (white pill for
  CommandBands), `coral` (scarce). Icon buttons: `size="icon"` or `square`.
- **Card** (`ui/card.tsx`): `tone` prop = `canvas` (default) | `soft-stone` |
  `ink` | `deep-green` | `navy` | `media`. 16–22px radius, hairline border,
  no shadow.
- **Badge**: `default/outline/secondary/solid/destructive/success/warning/info/coral`.
- **Empty states**: `illustrated-empty-states.tsx` (role-aware, 11
  illustrations, `secondaryAction` slot) or `ui/empty.tsx` primitives.
- **Tables/lists**: editorial flex-rows (`OperationalRow`/`OperationalLine`)
  for browsable lists; shadcn `Table` with mono uppercase column heads for
  dense data (see recipes costing tab); `ResearchTable` powers the events list.

## 8. Known debt (punch list — fix opportunistically, don't copy)

1. **Chrome stack**: on kitchen subpages 4 layers stack (ModuleHeader 20-pill
   bar → BreadcrumbBar → KitchenNavigation 14-pill bar → legacy per-page
   `Header`), ~228–320px before content, two breadcrumb systems, duplicate
   SidebarTrigger, three different active-pill treatments. Target: collapse
   `Header` into `BreadcrumbBar` (keep it as an actions slot), derive the
   kitchen pill bar from `module-nav.ts`, make ModuleHeader an overflow menu.
2. **Active-state bug**: `startsWith` matching lights `/kitchen` items on
   every kitchen subpage (kitchen-navigation.tsx, sidebar.tsx).
3. **~136 files** with ad-hoc `font-semibold text-2xl/3xl` headings instead of
   `DisplayHeading`/`SectionHeader`; **71 files** with raw gray/slate/zinc
   classes; `events-list.tsx` STATUS_COLORS uses blue-50/amber-100 (should be
   §5 tokens); `inventory-items` uses text-yellow-600/text-red-600.
4. **Hex hardcodes on-palette**: `kitchen-dashboard-client.tsx` (~20 arbitrary
   hexes), `page-shell.tsx` KitchenOperational* set, intake wizard `#faf8f5`
   canvas (3 files; nearest token is soft-stone).
5. **Dead sidebar items**: href-less "Inbox"/"Events" in module-nav.ts kitchen
   section render permanently disabled.
6. **module-nav fallback**: unmatched routes activate "calendar" module.

---

*Grounded in a 5-agent code audit (2026-07-04) of the shell, page patterns,
design-system inventory, and token adoption. Update this file when tokens or
page-shell APIs change — component docstrings point here.*
