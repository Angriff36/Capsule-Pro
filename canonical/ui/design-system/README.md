# Design System

Canonical ID: `ui.design-system`

Type: `feature`

Owner decision status: `needs-ryan`

Implementation status: `working`

Last reviewed: 2026-06-26

Last updated by: `agent`

---

## 1. What This Is

Plain-English purpose:

```text
The shared component library, design tokens, and theming infrastructure consumed by the Next.js app. It provides shadcn/ui primitives, higher-level block components, shared hooks, and the root provider tree (theme / high-contrast / display preferences / auth / tooltip / toaster).
```

Real app impact:

```text
When correct:
- All pages render with consistent tokens, spacing, typography, and color palette.
- Shared components (buttons, cards, empty states, etc.) are imported from one canonical package.
- Theming (dark mode, high-contrast WCAG AAA, font-size density) works app-wide via the provider tree.

When wrong:
- Pages import raw Radix or hand-crafted UI components that drift from the design system.
- Brand tokens defined in two places (design-system globals vs app overrides) cause visual inconsistency.
- New shadcn primitives added to the wrong location become orphaned or duplicated.
```

---

## 2. Ryan Final Decision

Decision:

```text
NEEDS-RYAN
```

Reason:

```text
The design system exists and is working, but several decisions remain: whether app-level brand overrides in styles.css should be canonical or migrated into the design-system package; whether blocks (higher-level composites) should live in the design system or the app; and how to handle shadcn upgrades.
```

Do not do:

```text
Do not install shadcn components directly into the app (apps/app/app/components/ui/).
Do not create a second design token file outside packages/design-system/styles/globals.css.
Do not import Radix primitives directly in the app — always go through @repo/design-system.
Do not add new brand tokens to apps/app/app/styles.css instead of the design system.
```

---

## 3. Current Status

Current recorded status:

```text
Working. @repo/design-system is the single shared component package. It is configured with shadcn/ui (new-york style, RSC enabled, CSS variables). The app mounts DesignSystemProvider at its root layout and imports all UI primitives from this package. App-level brand color overrides exist in apps/app/app/styles.css as a :root block.
```

Known gaps:

```text
1. App-level brand overrides in styles.css duplicate/override design-system tokens — unclear if intentional or technical debt.
2. Some components in apps/app/app/components/ (bulk-actions, inline-edit-field, status-transition-badge, permission-gate, print-view, auth-header) are domain-specific, NOT design-system primitives — no canonical rule governs which level owns what.
3. No shadcn/ui directory exists at the app level (apps/app/app/components/ui/ does NOT exist) — good, but not codified as a rule.
4. Tailwind v4 CSS-first config — no tailwind.config.ts file exists anywhere.
```

Confidence: `high`

Evidence:

```text
- packages/design-system/package.json — package name @repo/design-system
- packages/design-system/components.json — shadcn config (new-york style, RSC, CSS variables)
- packages/design-system/components/ui/ — 66 shadcn primitive components
- packages/design-system/components/blocks/ — ~50 higher-level block components
- packages/design-system/hooks/ — use-empty-state-tour, use-mobile, use-toast, use-user-role
- packages/design-system/styles/globals.css — 687-line design token file (--ds-* palette, shadcn semantic tokens, dark/high-contrast overrides, typography hierarchy, @theme inline block, @utility classes)
- packages/design-system/index.tsx — DesignSystemProvider (ThemeProvider > HighContrastProvider > DisplayPreferencesProvider > AuthProvider > TooltipProvider > Toaster)
- packages/design-system/postcss.config.mjs — delegates to @tailwindcss/postcss
- packages/design-system/lib/utils.ts — cn() helper (clsx + tailwind-merge)
- apps/app/postcss.config.mjs — re-exports design-system PostCSS config
- apps/app/app/styles.css — imports tailwindcss + design-system globals, defines :root brand overrides
- apps/app/app/layout.tsx — mounts DesignSystemProvider at root
- apps/app/app/components/ui/ — DOES NOT EXIST (verified)
```

---

## 4. Where It Lives

Canonical decision file:

```text
canonical/ui/design-system/README.md
```

Source location:

```text
packages/design-system/
```

Generated output location:

```text
NONE
```

Runtime location:

```text
@repo/design-system (workspace package, consumed by apps/app)
```

UI location:

```text
ALL pages via DesignSystemProvider in apps/app/app/layout.tsx
```

Test location:

```text
packages/design-system/components/blocks/ — .stories.tsx and .test.tsx files for select blocks (ambient-animation, micro-tour)
```

Docs location:

```text
NONE
```

---

## 5. Entry Points

User-facing route:

```text
NONE (infrastructure layer consumed by all routes)
```

Route file:

```text
NONE
```

API route / dispatcher:

```text
NONE
```

CLI command:

```text
shadcn CLI (via components.json config)
```

Background job / cron / worker:

```text
NONE
```

---

## 6. What It Consumes It

Direct consumers:

```text
- apps/app/app/layout.tsx (DesignSystemProvider mount)
- apps/app/app/components/inline-edit-field.tsx (imports Button, Input from @repo/design-system)
- apps/app/app/components/status-transition-badge.tsx (imports Badge, DropdownMenu from @repo/design-system)
- All page components importing from @repo/design-system/components/ui/*
- All page components importing cn() from @repo/design-system/lib/utils
```

Indirect consumers:

```text
Every page in the Next.js app (via the root layout provider tree and imported styles).
```

Generated consumers:

```text
NONE
```

Human consumers:

```text
Ryan, frontend developers, coding agents.
```

---

## 7. What It Is Wired To

Manifest entities:

```text
NONE (design system is domain-agnostic)
```

Manifest commands:

```text
NONE
```

Manifest events:

```text
NONE
```

Manifest policies / access rules:

```text
NONE (AuthProvider is Clerk-based, not Manifest-governed)
```

Database tables / collections:

```text
NONE
```

Generated types:

```text
NONE
```

Generated client/hooks:

```text
NONE
```

Forms/pages/components:

```text
- packages/design-system/components/blocks/ — ~50 block-level components (page-shell, dashboard-header-block, empty-state-block, illustrated-empty-states, metric-card-block, filter-bar-block, etc.)
- packages/design-system/components/ui/ — 66 shadcn primitives
```

---

## 8. Canonical Behavior

Happy path:

```text
All UI primitives come from @repo/design-system/components/ui/*. Higher-level composites come from @repo/design-system/components/blocks/*. The app imports cn() from @repo/design-system/lib/utils. Theming, dark mode, high-contrast, and density preferences are controlled via the provider tree in DesignSystemProvider.
```

Failure behavior:

```text
If a needed primitive or block does not exist in the design system, it should be added there (via shadcn CLI for primitives, or manually for blocks) rather than hand-crafted in the app. If the design system cannot express a domain-specific pattern, the component lives in apps/app/app/components/ with documented justification.
```

Forbidden behavior:

```text
No shadcn components installed at the app level (apps/app/app/components/ui/ must not exist).
No direct Radix UI imports in the app — always through @repo/design-system.
No duplicate cn() utility in the app.
No brand token definitions outside packages/design-system/styles/globals.css (pending Ryan decision on app-level overrides).
```

---

## 9. Naming Rules

Canonical name:

```text
Design System (@repo/design-system)
```

Allowed aliases:

```text
design-system package
@repo/design-system
DS (internal shorthand)
```

Forbidden aliases:

```text
@capsule/ui
packages/ui
ui-components
```

Casing / slug rules:

```text
Package: @repo/design-system
Directory: packages/design-system/
Import: @repo/design-system/components/ui/<Component>
Blocks: @repo/design-system/components/blocks/<Component>
Canonical ID: ui.design-system
```

---

## 10. Open Questions

Agents may add rows. Agents may not decide for Ryan.

| ID   | Question | Why it matters | Evidence found | Options | Ryan decision |
| ---- | -------- | -------------- | -------------- | ------- | ------------- |
| Q001 | Should app-level brand overrides in styles.css be migrated into the design system globals? | apps/app/app/styles.css defines :root brand tokens that override the design-system palette. Two sources of truth for brand color is drift-prone. | apps/app/app/styles.css lines 3+: :root { --brand-charcoal: #1e1c1a; ... } | A: Migrate brand tokens into design-system globals and remove app overrides. B: Keep app overrides as intentional tenant-level theming. C: SOURCE REQUIRED — need brand design spec. | NEEDS-RYAN |
| Q002 | Where do domain-specific block components belong — design-system or app? | Some blocks (illustrated-empty-states, entity-details-sheet, filter-bar) are domain-aware. Unclear if they should live in the shared package or the app. | ~50 blocks in packages/design-system/components/blocks/ include domain-specific ones (e.g. client-quick-stats-block, recipe-optimization-card). | A: All blocks in design-system (current state). B: Domain-aware blocks move to app. C: Split by layer (generic in DS, domain in app). | NEEDS-RYAN |
| Q003 | How should shadcn upgrades be managed? | shadcn CLI adds/updates individual primitives. Without a process, the design-system can drift from latest shadcn. | components.json references shadcn schema. No documented upgrade cadence. | A: Pin shadcn version, upgrade on schedule. B: Always use latest. C: SOURCE REQUIRED. | NEEDS-RYAN |

---

## 11. Decision History

| Date       | Decision | Made by | Reason |
| ---------- | -------- | ------- | ------ |
