# Theme Migration Strategy for event-details-client.tsx

## Executive Summary
This document provides a comprehensive mapping strategy for migrating 150+ instances of hardcoded dark theme colors in `event-details-client.tsx` to theme-aware CSS custom properties.

## Available Theme Tokens

Based on `packages/design-system/styles/globals.css`:

| Token | Dark Mode Value | Light Mode Value | Purpose |
|-------|-----------------|------------------|---------|
| `--background` | #1e1c1a | #f7f4ef | Main page background |
| `--foreground` | #f7f4ef | #1e1c1a | Primary text |
| `--card` | #262321 | #ffffff | Card/panel backgrounds |
| `--muted` | #2b2826 | #efe9e0 | Muted/surface elements |
| `--muted-foreground` | #c5bfb4 | #6d685f | Secondary text |
| `--border` | #332f2c | #e0d7cc | Borders and dividers |

## Complete Pattern Mappings

### 1. Background Colors

| Original Pattern | Theme Replacement | Count (est) | Context |
|------------------|-------------------|-------------|---------|
| `bg-\[#0b0f1a\]` | `bg-background` | 1 | Main page wrapper |
| `bg-slate-900` | `bg-card` | ~20 | Card backgrounds |
| `bg-slate-900/70` | `bg-card/70` | ~15 | Semi-transparent cards |
| `bg-slate-900/60` | `bg-card/60` | ~5 | Lower opacity cards |
| `bg-slate-950` | `bg-muted` | ~25 | Muted surfaces |
| `bg-slate-950/40` | `bg-muted/40` | ~30 | Badge backgrounds |
| `bg-slate-950/30` | `bg-muted/30` | ~10 | Subtle badges |
| `bg-slate-950/60` | `bg-muted/60` | ~8 | Medium opacity |
| `bg-slate-950/80` | `bg-muted/80` | ~3 | High opacity overlays |
| `bg-slate-950/95` | `bg-muted/95` | 2 | Near-solid backgrounds |
| `bg-slate-800` | `bg-card` | ~5 | Alternative card bg |

### 2. Text Colors

| Original Pattern | Theme Replacement | Count (est) | Context |
|------------------|-------------------|-------------|---------|
| `text-slate-50` | `text-foreground` | ~15 | Primary text (brightest) |
| `text-slate-100` | `text-foreground` | ~5 | Primary text |
| `text-slate-200` | `text-foreground` | ~25 | Primary text (slightly dim) |
| `text-slate-300` | `text-muted-foreground` | ~40 | Secondary text |
| `text-slate-400` | `text-muted-foreground` | ~35 | Labels and metadata |
| `text-slate-500` | `text-muted-foreground` | ~15 | Dimmed text |
| `text-slate-600` | `text-muted-foreground` | ~5 | Lower priority |

### 3. Border Colors

| Original Pattern | Theme Replacement | Count (est) | Context |
|------------------|-------------------|-------------|---------|
| `border-slate-800` | `border-border` | ~10 | Standard borders |
| `border-slate-800/60` | `border-border/60` | ~20 | With opacity |
| `border-slate-800/70` | `border-border/70` | ~25 | Medium opacity |
| `border-slate-700/70` | `border-border/70` | ~15 | Alternative |
| `border-slate-600/60` | `border-border/60` | ~8 | Lower opacity |

### 4. Gradient Patterns

| Original Pattern | Theme Replacement | Count | Context |
|------------------|-------------------|-------|---------|
| `from-slate-900` | `from-card` | 2 | Gradient start |
| `via-slate-950` | `via-muted` | 2 | Gradient middle |
| `to-slate-900` | `to-card` | 2 | Gradient end |
| `from-slate-800` | `from-card` | 1 | Darker gradient |
| `to-slate-950` | `to-muted` | 1 | Darker gradient end |

### 5. Gradient Overlay Patterns

| Original Pattern | Theme Replacement | Count | Context |
|------------------|-------------------|-------|---------|
| `from-slate-950/80` | `from-muted/80` | 1 | High opacity overlay |
| `via-slate-950/20` | `via-muted/20` | 1 | Low opacity middle |
| `from-slate-950/70` | `from-muted/70` | 1 | Medium-high overlay |
| `via-transparent` | `via-transparent` | 2 | Unchanged |

### 6. Compound Badge Patterns

These are multi-property replacements:

**Format Badges:**
```
FROM: border-slate-600/60 bg-slate-950/30 text-slate-200
TO:   border-border/60 bg-muted/30 text-foreground
```

**Tag Badges:**
```
FROM: border-slate-700/70 bg-slate-950/40 text-slate-200
TO:   border-border/70 bg-muted/40 text-foreground
```

**Ingredient Badges:**
```
FROM: border-slate-700/70 bg-slate-900/70 text-slate-200
TO:   border-border/70 bg-card/70 text-foreground
```

**Inventory Badges:**
```
FROM: border-slate-600/60 bg-slate-900/70 text-slate-200
TO:   border-border/60 bg-card/70 text-foreground
```

### 7. Preserved Semantic Colors

These should NOT be changed as they convey meaning:

```
border-emerald-400/40 bg-emerald-500/20 text-emerald-200  (success/live)
border-emerald-400/40 bg-emerald-500/10 text-emerald-200  (success dim)
text-emerald-300                                          (success links)
text-emerald-200                                          (success text)
border-rose-500/40 bg-rose-500/20 text-rose-100          (error/sold out)
border-amber-400/40 bg-amber-500/20 text-amber-100       (warning/limited)
border-sky-400/40 bg-sky-500/10 text-sky-200             (info/upcoming)
border-slate-500/40 bg-slate-500/10 text-slate-200       (past/neutral)
bg-emerald-400 text-slate-950                             (CTA buttons)
```

## Implementation Phases

### Phase 1: Core Backgrounds (Highest Impact)
1. `bg-\[#0b0f1a\]` → `bg-background`
2. `bg-slate-900` → `bg-card`
3. `bg-slate-900/70` → `bg-card/70`
4. `bg-slate-950` → `bg-muted`

### Phase 2: Primary Text (Most Frequent)
1. `text-slate-50` → `text-foreground`
2. `text-slate-200` → `text-foreground`
3. `text-slate-300` → `text-muted-foreground`
4. `text-slate-400` → `text-muted-foreground`

### Phase 3: Borders and Dividers
1. `border-slate-800/60` → `border-border/60`
2. `border-slate-800/70` → `border-border/70`
3. `border-slate-700/70` → `border-border/70`

### Phase 4: Remaining Backgrounds with Opacity
1. `bg-slate-950/40` → `bg-muted/40`
2. `bg-slate-900/60` → `bg-card/60`
3. `bg-slate-950/30` → `bg-muted/30`

### Phase 5: Gradients
1. `from-slate-900` → `from-card`
2. `via-slate-950` → `via-muted`
3. `to-slate-900` → `to-card`
4. Overlay patterns with opacity

### Phase 6: Compound Patterns
Replace multi-property badge classes in single operations

### Phase 7: Verification
Test both light and dark modes

## Common Code Patterns

### Pattern 1: Info Card
```tsx
// BEFORE
<div className="rounded-2xl border border-slate-800/70 bg-slate-950/40 p-4">
  <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-slate-400">
    <Icon className="size-3" />
    Label
  </div>
  <div className="mt-2 text-lg font-semibold">Value</div>
  <div className="text-sm text-slate-300">Description</div>
</div>

// AFTER
<div className="rounded-2xl border border-border/70 bg-muted/40 p-4">
  <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
    <Icon className="size-3" />
    Label
  </div>
  <div className="mt-2 text-lg font-semibold">Value</div>
  <div className="text-sm text-muted-foreground">Description</div>
</div>
```

### Pattern 2: Badge
```tsx
// BEFORE
<Badge className="border-slate-700/70 bg-slate-950/40 text-slate-200" variant="outline">
  Tag
</Badge>

// AFTER
<Badge className="border-border/70 bg-muted/40 text-foreground" variant="outline">
  Tag
</Badge>
```

### Pattern 3: Section Header
```tsx
// BEFORE
<div className="mb-4 flex items-center gap-2">
  <p className="text-xs uppercase tracking-[0.25em] text-slate-400">
    Section Title
  </p>
</div>

// AFTER
<div className="mb-4 flex items-center gap-2">
  <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
    Section Title
  </p>
</div>
```

### Pattern 4: Card with Gradient
```tsx
// BEFORE
<Card className="border-slate-800/60 bg-slate-900/70 text-slate-50">

// AFTER
<Card className="border-border/60 bg-card/70 text-foreground">
```

### Pattern 5: Gradient Overlay
```tsx
// BEFORE
<div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/20 to-transparent" />

// AFTER
<div className="absolute inset-0 bg-gradient-to-t from-muted/80 via-muted/20 to-transparent" />
```

## Testing Checklist

After migration, verify:

### Visual Testing
- [ ] All cards have proper contrast in dark mode
- [ ] All text is readable in both modes
- [ ] Borders are visible but not distracting
- [ ] Gradients look smooth and natural
- [ ] Hover states provide clear feedback
- [ ] Semantic colors (success/error/warning) still convey meaning

### Functional Testing
- [ ] All links are clickable
- [ ] All buttons work
- [ ] Form inputs are usable
- [ ] Modals open and close correctly
- [ ] Responsive breakpoints work
- [ ] Animations play smoothly

### Edge Cases
- [ ] Long text doesn't break layout
- [ ] Empty states look good
- [ ] Loading states are visible
- [ ] Error states are clear
- [ ] Disabled states are obvious
- [ ] Overflow content scrolls properly

## Troubleshooting

### Issue: Text not visible in light mode
**Cause:** Used `text-foreground` when should be `text-muted-foreground`
**Fix:** Check contrast ratio, adjust to muted variant if needed

### Issue: Borders too dark in light mode
**Cause:** Used wrong opacity modifier
**Fix:** Adjust `/60` to `/40` or similar

### Issue: Cards blend into background
**Cause:** Missing opacity or wrong token
**Fix:** Ensure proper contrast between `card` and `background`

### Issue: Gradients look flat
**Cause:** All gradient stops use same token
**Fix:** Mix `from-card` with `via-muted` and `to-card`

## File-Specific Notes

### High-Frequency Patterns
- `border-slate-800/70 bg-slate-950/40` appears 30+ times (info boxes)
- `text-slate-400` appears 35+ times (labels)
- `text-slate-300` appears 40+ times (secondary text)
- `bg-slate-950/40` appears 30+ times (badge backgrounds)

### Critical Paths
- Event overview card (lines ~1449-1652)
- Menu intelligence section (lines ~1772-1967)
- Event explorer grid (lines ~2547-2661)
- Timeline view (lines ~2663-2747)

### Special Components
- Featured media gradient overlay (line ~1669)
- Badge compound patterns (multiple locations)
- Recipe drawer sheet (lines ~2846-3021)
- RSVP dialog (lines ~2806-2844)

## Related Files

If this migration is successful, apply the same strategy to:
- `apps/app/app/(authenticated)/events/events.tsx`
- `apps/app/app/(authenticated)/events/[eventId]/event-details-sections.tsx`
- Other event-related components

## Maintenance

After migration:
1. Run `pnpm lint` to check for issues
2. Run `pnpm format` to ensure consistent formatting
3. Test in both light and dark modes
4. Check accessibility with dev tools
5. Update any component documentation

## Success Criteria

Migration is complete when:
- ✅ All hardcoded slate colors are replaced
- ✅ Component works in light mode
- ✅ Component works in dark mode
- ✅ No visual regressions
- ✅ All tests pass
- ✅ Linting passes
- ✅ Accessibility standards met
