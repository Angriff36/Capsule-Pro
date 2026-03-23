# Capsule Pro Test Report — SEL SDAC Lunch Event
**Tester:** Logan (AI agent, browser-only)
**Date:** 2026-03-22
**Event:** SEL SDAC Lunch - Schweitzer Engineering Labs (Invoice #5592)

## Event Creation
- ✅ "New event" button works
- ✅ Form fields populate correctly
- ✅ Event created successfully with EVT-2026-0001 ID
- ✅ Edit Event dialog opens and shows all data correctly
- ✅ Event Type dropdown works (Catering selected)
- ✅ Status dropdown works (Confirmed)
- ✅ Tags display correctly (corporate, lunch, teriyaki)
- ✅ Venue shows as "Verified venue"

## Issues Found

### 🐛 BUG: Date off by 1 day
- **Entered:** 04/15/2026
- **Displayed:** Apr 14, 2026
- **Likely cause:** Timezone conversion (UTC vs PDT). The date is being stored/displayed in UTC which shifts it back a day.
- **Severity:** Medium — will cause confusion for event planning

### 🐛 BUG: Duplicate events on Events list page
- "A real event" appears TWICE with identical data (Jul 20, 138 guests, The peragula)
- "AI Planned Event" appears TWICE (Mar 6, 50 guests, Draft)
- **Severity:** High — data integrity issue, confusing UX

### 🐛 BUG: Tab navigation doesn't work on event page
- Clicking "Menu" tab from Overview does not switch tabs
- Clicking "Menu" while on Overview page navigates BACK to Overview
- Need to test: does clicking the tab URL directly work?
- **Severity:** High — can't access Menu, Copilot, Guests, Operations, Explore tabs

### 📝 NOTE: "Time not set" on event
- Event shows "Time not set • PDT" — the event creation form doesn't have a time field
- Should there be a time field? For catering events, time is critical

### 📝 NOTE: "Ticketing not set" 
- Shows "Ticketing not set / Ticket tier not set" — this is a catering event, not a ticketed event
- The ticketing section might be confusing for catering users

### 📝 NOTE: Event IDs
- New event got EVT-2026-0001 but older events show "Unassigned" for the ID
- Inconsistent — should all events have IDs?

## Buttons Tested on Event Page
- ✅ Edit details — opens modal, shows correct data
- ❓ Battle Board — not tested yet
- ❓ Export — not tested yet
- ❓ RSVP / Join — not tested yet
- ❓ Save — not tested yet  
- ❓ Share — not tested yet
- ❓ Add to Board — not tested yet
- ❓ Add to Calendar — not tested yet
- ❓ Invite team — not tested yet
- ❓ Generate Briefing — not tested yet
- ❓ Delete event — not tested yet
- ❓ Menu tab — BLOCKED (tab doesn't switch)
- ❓ Copilot tab — not tested yet
- ❓ Guests tab — not tested yet
- ❓ Operations tab — not tested yet
- ❓ Explore tab — not tested yet

## Next Steps
- Try direct URL navigation to Menu tab
- Test all remaining buttons
- Enter menu items (Teriyaki Chicken, Tofu, Rice, Mac Salad)
- Test operations/prep list generation

### 📝 UX PAIN POINT: Can't create dishes inline from event menu
- "Add Dish to Event" only lets you SELECT from existing dishes
- If no dishes exist, you're stuck — dropdown is empty
- Must leave the event, go to Kitchen, create dishes, come back
- For first-time users entering their first event, this completely blocks menu entry
- **Suggestion:** Allow inline dish creation OR link to "Create new dish" from the dropdown

### 📝 NOTE: Tab navigation via click doesn't work reliably
- URL query params (?tab=menu) DOES work
- Clicking the tab text sometimes fails to navigate
- May be a React state issue vs URL-based routing

### 🐛 BUG: Dishes and Recipes tabs show same content
- In Kitchen → Recipes & Menus, clicking "Dishes" tab shows the exact same grid as "Recipes"
- The count changes (Recipes 25 vs Dishes 11) but the displayed cards appear identical
- Dishes and Recipes should be distinct: Dish = menu item for guests, Recipe = cooking instructions
- **Severity:** High — fundamental data model confusion

### 📝 NOTE: Kitchen section has rich structure
- Production Board with kanban tasks ✅
- Recipes with cards, images, difficulty ratings ✅  
- Sub-tabs: Recipes, Dishes, Menus, Ingredients, Costing Analysis
- Sidebar: Dashboard, Inbox, Production, Recipes, Prep Lists, Inventory, Waste Tracking
- Weather integration showing "Sunny 72° Kitchen temp normal" ✅
- AI Tips button ✅
- "Team activity tracking coming soon" placeholder

### 📝 NOTE: Recipe names are raw prep list text
- Recipe names like "FINISH AT EVENT GREEN BEANS" and "CENTER OF TABLE. (1) CHEESE BOARD SERVED AT SWEET HEART TABLE FOR BRIDE & GROOM..."
- These are prep list instructions, not clean recipe names
- Suggests the import tool brings in raw text without cleaning

### ✅ PASS: Edit event + Save changes works
- Changed guest count 129 → 150: saved correctly, displayed on page
- Changed notes: saved correctly
- "Saved" button changes state after save (heart icon)
- Warning banner correctly shows "Missing: Menu Items"

### 🐛 BUG: Battle Board crashes with Prisma error
- Clicking "Battle Board" from event page → "Something went wrong"
- Error: `prisma.$queryRawUnsafe()` Raw query failed. Code: "08P01"
- Message: "bind message supplies 1 parameters, but prepared statement requires 2"
- This is a SQL parameter binding bug — the query is missing a parameter
- **Severity:** Critical — Battle Board is a core feature for event operations
- Also shows "2 Issues" badge in bottom-left corner

### 🐛 BUG: Export button does nothing
- Clicking "Export" produces no visible response
- No download initiated, no modal, no toast notification
- **Severity:** Medium — feature appears non-functional

### 🐛 BUG: Share button does nothing
- Clicking "Share" produces no visible response
- No clipboard copy, no share modal, no toast
- **Severity:** Medium — feature appears non-functional

### ✅ PASS: Generate Briefing works
- AI generates a concise event summary
- Shows word count (29 words), generation timestamp
- Includes "Key Highlights" with venue info
- Has copy and refresh buttons
- Note: Says "April 15" in briefing but overview shows "Apr 14" — confirms the date timezone bug
- Disclaimer: "AI-generated content. Review before sharing." ✅ Good practice

### 📝 NOTE: Briefing confirms date bug
- Briefing says "Wednesday, April 15, 2026" (correct — what I entered)
- Overview shows "Apr 14, 2026"
- The AI briefing is using the raw data (correct), the UI is displaying wrong timezone conversion

### 📝 NOTE: "Featured media not set" placeholder
- Large empty area on right side of event
- Could show event photos, venue images, or prep list photos
- Currently just a placeholder with sparkle icon

### Summary of button tests:
| Button | Result |
|--------|--------|
| Edit details | ✅ Works, saves correctly |
| Battle Board | 🐛 Crashes (Prisma query error) |
| Export | 🐛 Does nothing |
| Share | 🐛 Does nothing |
| RSVP / Join | Not tested yet |
| Saved (heart) | ✅ Works (toggles save state) |
| Add to Board | Not tested yet |
| Add to Calendar | Not tested yet |
| Invite team | Not tested yet |
| View organizer | Not tested yet |
| Generate Briefing | ✅ Works |
| Delete event | Not tested yet |
| Update details (banner) | Not tested yet |

### 🐛 BUG: Add to Calendar does nothing
- No .ics download, no Google Calendar redirect, no modal
- **Severity:** Medium

### ✅ PASS: Add to Board works
- Opens modal with "Choose an existing board or create a new one"
- Shows loading spinner (fetching boards)
- Has "+ New Board" and "Add to Selected Board" buttons
- Properly structured modal UI

### Not yet verified: Invite team, View organizer, RSVP/Join
- These were clicked in rapid succession — need individual testing

### 🐛 BUG: "+ Add Recipe" button does nothing
- In Kitchen → Recipes & Menus, the green "+ Add Recipe" button in top right
- Clicking it produces no modal, no navigation, no response
- This completely blocks creating new recipes/dishes through the UI
- **Severity:** Critical — can't create recipes, which blocks adding menu items to events
- **Impact:** The entire event menu workflow is broken:
  1. Can't create dishes from event menu page (no inline create)
  2. Can't create recipes from Kitchen recipes page (button broken)
  3. Therefore can't populate any event's menu through normal UI
  
### 📝 NOTE: Existing recipes appear to be imported, not created via UI
- All 25 recipes have raw prep list names (all caps, instruction text)
- None appear to have been created through the "Add Recipe" button
- The import flow works but the manual creation flow is broken

### 📝 NOTE: Removed duplicate event bug from report
- Bill confirmed old events were AI-generated test data, not actual duplicates
- Not a bug — just test artifacts

### 🐛 CRITICAL BUG: New Recipe page crashes with Build Error
- Navigating to /kitchen/recipes/new causes a build-time crash
- Error: "x Expression expected" in task-breakdown-display.tsx:46:1
- This is a syntax error in the source code — broken import statement
- File: app/(authenticated)/events/components/task-breakdown-display.tsx
- **Severity:** CRITICAL — completely blocks recipe creation
- Also blocks accessing any page that imports this component
- "1 Issue" badge visible in bottom left
- This likely also explains why the Battle Board crashed earlier

### Updated: "+ Add Recipe" button DOES work
- It navigates to /kitchen/recipes/new
- But the page crashes due to the syntax error above
- The button itself is fine — the destination page is broken

### ✅ FIXED: New Recipe page loads after cache clear
- Previous build error was from stale .next-dev cache
- After clearing cache: /kitchen/recipes/new loads correctly
- Full form with: Recipe name, Category, Description, Yield, Timing, Difficulty, Tags, Ingredients, Steps, Image, Kitchen notes

### 🐛 BUG: Recipe creation fails with PostgreSQL transaction error
- Filled all fields for "Teriyaki Chicken" recipe
- Clicked "Create recipe" 
- Red error banner: "current transaction is aborted, commands ignored until end of transaction block"
- This is a Prisma/PostgreSQL transaction error — a preceding query in the batch failed
- Recipe was NOT saved
- **Severity:** Critical — can't create recipes, which blocks the entire menu workflow
- Yield unit dropdown defaults to "c - celsius" which is wrong (should be "servings" or "portions")

### 📝 UX Issues on Recipe Form
- Yield quantity defaults to "4" — should be empty or contextual
- Yield unit dropdown shows "c - celsius" as default — this is a temperature unit, not a yield unit
- Should default to "servings" or "portions" for recipes
- Category field is free text — should be a dropdown (Appetizer, Main Course, Side, Dessert, etc.)
- Ingredients format tip says "start with quantity and unit" but no structured ingredient entry (qty/unit/name columns)
