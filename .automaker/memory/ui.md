---
tags: [ui]
summary: ui implementation decisions and patterns
relevantTo: [ui]
importance: 0.7
relatedFiles: []
usageStats:
  loaded: 0
  referenced: 0
  successfulFeatures: 0
---
# ui

#### [Pattern] Progressive disclosure via dropdown containment for admin actions (2026-01-17)
- **Problem solved:** Header had multiple action buttons (cleanup imports, global search) creating visual noise
- **Why this works:** Reduces cognitive load by hiding power-user features while keeping them accessible via single settings icon. Follows 'common actions visible, advanced actions discoverable' pattern
- **Trade-offs:** Requires extra click to access admin features, but significantly improves primary use experience. Power users must discover settings dropdown

### Simultaneous typography hierarchy adjustment (title up, breadcrumb down) (2026-01-17)
- **Context:** Recipe/dish/ingredient cards had same font weight as navigation breadcrumbs
- **Why:** Increasing card titles to text-lg font-semibold while making breadcrumbs text-sm text-muted-foreground/70 creates clear visual priority. Scanning works faster when eyes are drawn to content titles, not navigation chrome
- **Rejected:** Only increasing card titles without reducing breadcrumbs would create competing visual weight and increase overall page noise
- **Trade-offs:** More design coordination required (multiple changes must ship together), but creates cohesive visual system
- **Breaking if changed:** If breadcrumbs regain prominence, they compete with content titles and reduce scanning efficiency

#### [Pattern] Dropzone affordance through dashed border + icon combo, not just text (2026-01-17)
- **Problem solved:** Image upload area needed to communicate it accepts paste/drop without requiring users to read instructions
- **Why this works:** Dashed border (border-2 border-dashed) + UploadIcon creates universal 'drop zone' affordance recognized across apps. Visual pattern is faster to recognize than reading 'Paste from clipboard' label
- **Trade-offs:** Requires icon import and more CSS, but significantly reduces onboarding friction for paste actions

#### [Pattern] Component flexibility through optional icon props rather than separate components (2026-01-17)
- **Problem solved:** ClipboardImageButton needed to work as standard button and as dropzone with icon
- **Why this works:** Adding showUploadIcon prop keeps one component instead of creating DropzoneButton + ClipboardButton variants. Props-based conditional rendering is simpler than component duplication
- **Trade-offs:** Component gains one prop, but eliminates code duplication. Maintains single source of truth for clipboard paste logic