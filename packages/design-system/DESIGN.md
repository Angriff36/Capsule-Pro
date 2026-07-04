# DESIGN.md — Anwe-derived web design system

Status: ready for implementation

Source basis: six supplied Android screenshots plus direct inspection of the supplied `Anwe.apk` bundle. The APK is a Capacitor application whose actual web bundle is shipped inside the app, so core colors, type, spacing, motion, navigation, and component classes below are recovered from the real CSS/JavaScript rather than guessed from screenshots.

## 1. Intent

Use the visual language of Anwe as the reference, but adapt it correctly for a responsive web application.

Preserve:

- near-black canvas
- warm muted gold accent
- oversized heavy headings
- thin outlined surfaces
- rounded icon containers
- restrained glow used only for focus and active navigation
- compact uppercase micro-labels
- strong dark-mode contrast
- a premium, private, deliberate feeling

Do not preserve mobile structure when it becomes awkward on desktop. Bottom navigation, two-column phone grids, and 85vh bottom sheets must become proper web patterns at larger widths.

## 2. Evidence levels

**EXACT** means recovered from APK CSS or rendered class values.

**OBSERVED** means directly visible in the supplied screenshots.

**ADAPTED** means a web-specific rule chosen to preserve the same design language.

When exact and adapted rules conflict, preserve the visual identity rather than the literal phone geometry.

## 3. Core design tokens

### Color

| Token | Value | Use |
|---|---:|---|
| `gold` | `#D9B356` | primary accent, active navigation, focus, selected states |
| `gold-bright` | `#F2D06B` | start of premium CTA gradient |
| `tan` | `#A89B8D` | secondary text and inactive navigation |
| `app-bg` | `#0D0D0D` | canonical dark page background |
| `card-bg` | `#18181A` | elevated panels, sheets, cards |
| `surface-lowest` | `#131313` | deep surfaces and nav shells |
| `gray-50-dark` | `#1E1E1E` | subtle fills |
| `gray-100-dark` | `#27272A` | secondary fills |
| `gray-200-dark` | `#333338` | borders and inactive tracks |
| `gray-300-dark` | `#44444A` | stronger separators |
| `on-surface` | `#E5E2E1` | primary dark-theme text |
| `on-surface-variant` | `#D0C5AF` | warm secondary text |
| `white` | `#FFFFFF` | highest-emphasis text |
| `black` | `#000000` | text on gold CTA |

Canonical dark theme:

```css
--color-primary-gold: #D9B356;
--color-gold-bright: #F2D06B;
--color-neutral-tan: #A89B8D;
--color-app-bg: #0D0D0D;
--color-card-bg: #18181A;
--color-surface-lowest: #131313;
--color-gray-50: #1E1E1E;
--color-gray-100: #27272A;
--color-gray-200: #333338;
--color-gray-300: #44444A;
--color-on-surface: #E5E2E1;
--color-on-surface-variant: #D0C5AF;
```

Use pure white sparingly. Most text should be `on-surface`, warm secondary text, or a reduced-opacity variant. Gold is an accent, not a page fill.

### Typography

**EXACT:** Inter is the source typeface. The APK imports Inter weights 400–900.

Use:

- Display/page title: Inter ExtraBold, 800, tight line height
- Primary labels: Inter Bold or ExtraBold, 700–800
- Micro-labels: Inter Black, 900, uppercase, wide tracking
- Body: Inter Medium, 500
- Secondary body: Inter Medium, 500, tan or reduced-opacity white
- Accent text: italic only for rare personalized or editorial moments

Source mobile scale:

| Role | Size | Weight | Notes |
|---|---:|---:|---|
| Page title | 30px | 800 | screenshots: “Vaults”, “Search”, “Settings” |
| Large onboarding display | 48px | 800 | use sparingly |
| Section headline | 20px | 800 | search empty state |
| Large body/subtitle | 18px | 500–700 | welcome line |
| Standard body | 14–16px | 500–700 | rows, descriptions |
| Strong compact label | 13–14px | 900 | CTA/tab text |
| Micro-label | 8–10px | 700–900 | uppercase, tracked |

Desktop adaptation:

- Page title: 44–56px depending on page density
- Section headline: 24–32px
- Standard body: 15–16px
- Micro-label: 10–12px

Do not scale every mobile text size up. Only page titles and major section headings should become materially larger on desktop.

### Tracking

Use wide tracking selectively:

- page titles: slight positive tracking
- section labels: `0.10em–0.30em`
- CTA labels: `0.15em–0.20em`
- tiny category labels: `0.20em–0.30em`

Never apply extreme tracking to paragraph text.

### Spacing

**EXACT:** the source uses a 4px base spacing unit.

Preferred scale:

`4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96`

Mobile page padding is usually 24px. Settings uses 16px on the outer container with larger internal card padding.

Desktop page padding:

- 24px at narrow tablet widths
- 32px at standard desktop widths
- 48px on wide desktop layouts

### Radius

Source values repeatedly used:

- 8px: small elements
- 12px: compact cards
- 16px: buttons and icon tiles
- 22–24px: primary cards, dialogs, search fields
- 32px: floating navigation shell
- full pill: tags, chips, status labels

Web rule: large application panels should generally use 20–24px, not arbitrary mixed radii.

### Borders

Default dark-theme border hierarchy:

- subtle: `1px solid rgba(255,255,255,0.05)`
- standard: `1px solid rgba(255,255,255,0.10)`
- stronger: `1px solid #333338`
- selected/accent: `1px solid #D9B356`
- vault/grid card: dashed gold at roughly 25–40% opacity

Borders carry more of the hierarchy than shadows.

### Focus

**EXACT:** visible focus uses a 2px gold outline with 2px offset.

```css
:focus-visible {
  outline: 2px solid #D9B356;
  outline-offset: 2px;
}
```

Do not remove focus outlines.

## 4. Surface and atmosphere

The app is visually dark but not flat black everywhere.

Use three layers:

1. `#0D0D0D` page canvas
2. `#131313–#18181A` controls and panels
3. `#27272A–#333338` separators, inactive tracks, and stronger boundaries

Gold ambient light appears mainly near the active navigation region and occasionally behind premium surfaces. Do not put a gold glow behind every card.

The top edge may use a very thin gold line/fade. The source uses a 1px horizontal gold gradient plus a 4px downward fade.

## 5. Iconography

**EXACT:** source iconography is Lucide-style outlined icons.

Rules:

- standard icon size: 18–24px
- compact icon size: 12–16px
- inactive stroke: 1.5–2px
- active stroke: 2.5px
- high-emphasis action stroke: up to 3px
- use outline icons by default
- use filled details only for tiny premium/crown accents

Icon containers:

- compact: 36×36px
- standard: 44–48px
- rounded 16px or full circle depending on role
- dark/black fill with subtle border
- selected icon may become gold with a restrained halo

## 6. Navigation

### Mobile

The source bottom navigation is a floating capsule.

**EXACT source geometry:**

- maximum width: 420px
- horizontal page inset: 24px
- shell radius: 32px
- shell padding: 12px vertical, 24px horizontal
- four equal items
- each navigation target: 48×48px
- backdrop blur: 12px
- dark shell: approximately `rgba(18,18,18,0.80)`
- border: white at roughly 8% opacity
- active item: gold icon plus soft circular gold glow

Do not place text labels under every mobile nav icon unless usability testing requires it. The source depends on clear icon recognition and strong active state.

### Desktop

**ADAPTED:** replace the bottom nav at 1024px and above.

Use one of these two responsive states:

- 1024–1279px: 88px left icon rail
- 1280px and above: 220–260px left sidebar with icon + label

Preserve:

- floating dark nav surface
- 20–24px radius
- subtle glass treatment
- gold active icon
- soft active halo

Do not put the mobile bottom bar across a 1440px desktop viewport.

## 7. Page shell

### Mobile

- content width: full viewport
- common horizontal padding: 24px
- top spacing: safe-area aware, visually about 48px before content
- bottom content padding: enough to clear floating navigation; source reserves roughly 128px plus safe-area inset

### Desktop

**ADAPTED:**

- navigation occupies the left edge
- content max width: 1440px
- reading/forms max width: 760–960px
- settings max width: 960px
- dashboard/grid content may use the full remaining workspace
- large page title aligns with the content grid, not the browser edge

Prefer generous empty space around the title, then denser content beneath.

## 8. Core components

### 8.1 Page title

Use an oversized, left-aligned title with no decorative underline.

Mobile:

- 30px
- 800 weight
- slight positive tracking
- 24–32px bottom spacing

Desktop:

- 48px typical
- 800 weight
- 32–48px bottom spacing

### 8.2 Micro section label

Examples in the source include account groups, recent searches, discovery fields, and capability dividers.

Style:

- 9–11px mobile; 10–12px desktop
- 800–900 weight
- uppercase
- tracking `0.15em–0.30em`
- gold for interactive/create-flow labels
- tan/gray for category grouping

These labels should feel like engraved metadata, not ordinary headings.

### 8.3 Vault/grid card

**EXACT source mobile pattern:**

- two-column grid
- 16px gap
- card height: 192px
- padding: 24px
- 12px radius
- dashed gold border at reduced opacity
- icon container: 36×36px
- title: 14px bold
- metadata: 10px uppercase, wide tracking

Web adaptation:

```text
mobile:   2 columns
small tablet: 3 columns
large tablet: 3–4 columns
desktop: repeat(auto-fill, minmax(220px, 1fr))
wide desktop: cap at 5 columns where practical
```

Recommended desktop card height: 220–260px.

Hover:

- border moves toward full gold
- background gains at most a 2–3% gold tint
- icon becomes brighter
- card must not jump vertically

Selected state should be stronger than hover and remain persistent.

### 8.4 Settings group

The source groups related rows inside one rounded outlined container.

Rules:

- outer card: 24px radius
- rows share one outer shell
- 1px separators between rows
- row icon sits in a dark rounded tile
- label is bold and high contrast
- optional description is smaller and muted
- chevron sits at far right with low contrast

Desktop:

- keep a maximum content width
- use two columns only for independent setting groups
- never stretch a single settings list edge-to-edge across a huge monitor

### 8.5 Search field

**EXACT source mobile pattern:**

- full width
- 24px radius
- approximately 16px vertical padding
- leading search icon in gold
- dark card surface
- 1px border
- large muted placeholder
- focused border becomes gold
- focus adds a broad, faint gold shadow

Desktop:

- max width 760–900px
- 18–20px text allowed for prominent global search
- keep the icon and focus treatment identical

### 8.6 Search/recent pill

- full pill radius
- gold border
- dark fill
- leading small icon
- bold 12–14px label
- optional trailing close icon
- compact horizontal padding

Use for saved filters, recent searches, tags, and lightweight state—not primary actions.

### 8.7 Primary CTA

Source premium CTA:

- gradient `#F2D06B → #D9B356`
- black text
- uppercase
- 900 weight
- 13–14px
- tracking around `0.15em–0.18em`
- 16–18px vertical padding
- 16–22px radius
- active press scale: 0.98

Disabled CTA:

- no gradient
- dark neutral fill
- low-contrast text
- no glow
- no shimmer

Do not use the gold gradient for routine secondary actions.

### 8.8 Secondary button

- dark or faint neutral fill
- high-contrast text
- 14–16px radius
- no gold unless selected or focused

### 8.9 Icon choice tile

Observed in the New Vault flow:

- square or rounded-square tile
- about 88–96px touch target on mobile
- selected tile uses a bright light fill with thin gold border
- unselected tile uses a black/dark fill with subtle border
- premium options add a small crown badge

Desktop adaptation:

- 72–88px tiles
- visible hover state
- keyboard selectable
- selected state must not depend on color alone

### 8.10 Toggle

Source toggle:

- compact 48px × 26px track
- full pill radius
- neutral gray track when off
- gold track when on
- light circular thumb
- 300ms transition

### 8.11 Divider with centered label

Used for “PRO CAPABILITIES”.

- thin lines on both sides
- tiny uppercase gold label centered
- generous vertical spacing

Use only when separating a major capability tier. Do not use between every form section.

## 9. Dialogs, drawers, and sheets

### Mobile

**EXACT source create flow:**

- enters from bottom
- height: 85vh
- top corners: 24px
- dimmed backdrop with blur
- drag handle: 48×4px
- tabs across top
- content scrolls independently
- footer actions remain fixed at bottom

### Desktop

**ADAPTED:** never keep the 85vh bottom sheet shape as the default desktop pattern.

Convert based on complexity:

- quick action: centered dialog, 520–640px width
- multi-step creation flow: centered modal, 720–900px width, max-height 80–88vh
- contextual editing: right-side drawer, 520–680px width

Preserve the top tabs and fixed action footer for complex creation flows.

The desktop modal should still use the same dark card surface, 24px radius, thin border, and gold active tab underline.

## 10. Tabs

Source create-flow tabs:

- uppercase
- 13px
- 900 weight
- tracking around `0.10em`
- active text gold
- inactive text gray
- active underline: 2px gold

Desktop adaptation:

- allow more horizontal breathing room
- retain underline rather than converting to filled pills unless the product already uses segmented controls elsewhere

## 11. Motion

Motion is restrained and functional.

Recovered source behavior:

- standard transitions: about 150–300ms
- nav state change: 300ms
- active nav movement: spring-based
- button press: scale to 0.98
- card press: scale to about 0.98
- card entrance: fade + 20px upward movement with short stagger
- sheet: spring from bottom
- slide-up utility: 500ms with `cubic-bezier(.16,1,.3,1)`
- ambient nav glow pulse: 6 seconds

Web rules:

- hover: 150–200ms
- focus/selection: 200–300ms
- dialog/drawer: 250–400ms
- never animate large layout shifts continuously
- honor `prefers-reduced-motion`

Ambient glow may pulse only in a low-attention area. Do not animate every decorative background.

## 12. Screen pattern: library/home

Source feel:

- large page title
- optional personalized subtitle
- content list beneath
- small refresh/utility action aligned to the right
- recent-search/tag content lower on the page
- floating primary action near lower-right on mobile

Web adaptation:

- title and utility actions share a top toolbar
- main content can use a masonry/list grid
- recent searches may move into a right rail on wide screens
- primary action becomes an explicit top-right button on desktop

Do not leave a floating circular `+` as the only create affordance on desktop.

## 13. Screen pattern: vaults/collections

Mobile source:

- 2-column tall-card grid
- each card has a small icon at top and title/meta at bottom
- create-new uses the same card shape

Web adaptation:

- auto-fill responsive grid
- keep cards visually tall rather than converting to shallow table rows
- add hover actions only when pointer input exists
- keyboard users must reach any rename/delete controls without hover

## 14. Screen pattern: search

Mobile source:

- title
- one dominant search input
- recent-search chips
- centered empty-state illustration
- centered headline and short supporting text

Web adaptation:

- keep the page narrow and intentional
- max content width around 900px
- empty state remains centered, but avoid huge blank vertical gaps
- search results may widen to 1000–1200px when displaying richer cards

## 15. Screen pattern: settings

Mobile source:

- title
- premium banner
- grouped settings sections
- one rounded container per group

Web adaptation:

- max width 960px
- use a two-column arrangement only when groups are independent
- premium banner may span full settings width
- do not stretch row dividers over the entire browser width

## 16. Screen pattern: create/edit flow

The source New Vault flow combines:

- top tabs
- compact section labels
- horizontal icon picker
- accent color picker
- privacy card with toggle
- pro feature divider
- premium capability card
- fixed CTA footer

Web adaptation:

- use a 2-column internal layout where appropriate:
  - left: identity, icon, color
  - right: privacy and advanced capabilities
- keep primary CTA in a fixed modal footer
- stack back to one column below 760px

The interaction hierarchy must stay obvious: identity first, behavior second, premium extras last, commit action at the end.

## 17. Responsive breakpoints

Use these implementation breakpoints unless the product already has established ones:

```text
0–639px      mobile
640–1023px   tablet
1024–1279px  desktop compact
1280px+      desktop wide
```

At 1024px:

- bottom navigation becomes left navigation
- mobile bottom sheets become desktop dialogs/drawers
- page title size increases
- floating create button becomes a visible labeled action

At 1280px:

- left rail may expand into a labeled sidebar
- collection grids may add another column
- secondary content may occupy a right rail

## 18. Accessibility

Required:

- WCAG-compliant contrast for body text and controls
- 44×44px minimum interactive target on touch
- visible gold keyboard focus
- selected states communicated by shape/border/icon, not gold alone
- meaningful labels for icon-only controls
- hover-only actions must also be keyboard accessible
- reduced-motion support

Tan text is decorative/secondary. Do not use low-opacity tan for critical instructions or required form labels.

## 19. Web-specific do-not-copy rules

Do not copy these mobile behaviors literally onto desktop:

- bottom nav across a wide screen
- 2-column phone grid fixed at desktop
- full-width 85vh bottom sheet for every modal
- floating `+` as the sole create action
- touch-sized 96px icon tiles when mouse/keyboard is primary
- extremely tall empty states that force unnecessary scrolling
- mobile safe-area padding on desktop

Also avoid visual overuse:

- gold glow on every interactive element
- gradients on routine buttons
- uppercase on paragraph text
- filled gold cards
- large shadows where a 1px border is sufficient

## 20. Implementation acceptance criteria

A screen is visually compliant only when all of the following are true:

1. Dark canvas uses `#0D0D0D`, not arbitrary near-black variants.
2. Primary accent is `#D9B356`.
3. Inter is the default UI typeface.
4. Page titles are heavy, left aligned, and clearly larger than content labels.
5. Gold is reserved for active, selected, focused, premium, or primary-action states.
6. Cards rely primarily on thin borders and dark surface separation.
7. Repeated groups use consistent 20–24px rounding.
8. Desktop navigation is not a stretched mobile bottom bar.
9. Desktop create flows are dialogs/drawers rather than permanent bottom sheets.
10. Focus is visible with a gold outline.
11. Motion remains subtle and reduced-motion safe.
12. The page still feels spacious without leaving mobile-sized content stranded in the center of a wide viewport.

## 21. Reference evidence

Supplied screenshots documented these states:

- New Vault creation sheet
- Settings page
- Vaults grid
- Add Link sheet
- Search empty state
- Your Quests/home state

APK evidence confirmed:

- Capacitor app ID: `com.app.anwe`
- shipped web bundle under `assets/public`
- Inter font import, weights 400–900
- Tailwind-based 4px spacing scale
- exact dark-theme token values
- gold gradient CTA values
- fixed floating navigation geometry
- 85vh mobile sheet geometry
- Lucide-style icon system
- active-navigation glow and background-light effects
- focus ring and motion timings

## 22. Final visual test

Before accepting an implementation, compare it against this sentence:

> A premium dark utility interface built from near-black surfaces, warm gold state changes, heavy editorial headings, fine outlined geometry, and restrained light—not a generic black dashboard with yellow buttons.

If the result looks like a standard admin template, it has missed the design.
