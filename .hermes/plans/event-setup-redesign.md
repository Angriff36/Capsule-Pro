# Event Setup Redesign — Implementation Plan

## Status: ✅ FIXED (2026-05-11)

## Problems Fixed

### 1. Budget False Positive (✅ Fixed)
**Bug:** Budget Approved step always shows green circle (complete) even though `budget=null` in page.tsx.
**Fix:** Fetch budget data from `EventBudget` model in page.tsx, pass to client.
**File:** `page.tsx`, `event-details-client/index.tsx`

### 2. Staff/Contracts Setup Steps Link to Dead Tabs (✅ Fixed)
**Bug:** Staff step → `?tab=staff` (no such tab), Contracts → `?tab=contracts` (no such tab).
**Fix:** Changed to actual page URLs via `next/link` `<Link href={...}>`.
**File:** `event-setup-checklist.tsx`

### 3. Tab Navigation Broken (✅ Fixed)
**Bug:** Clicking tab triggers from Overview doesn't switch tab content. `router.replace` updates URL but Tabs component doesn't respond.
**Root cause:** The `startTransition` wrapping `router.replace` + the Tabs `value` being bound to `searchParams` creates a rendering race condition.
**Fix:** Replaced shadcn/ui `Tabs`/`TabsContent` with plain state-driven tab rendering using `useSearchParams`. Each tab content renders conditionally based on `activeTab` state.
**File:** `event-detail-tabs.tsx`

### 4. Menu Add Dish Buttons Non-Functional (✅ Fixed)
**Bug:** "+ Add First Dish" and "+ Add Dish" buttons don't work when panel is expanded. Only work after clicking "View dishes" to collapse.
**Root cause:** The panel state (`isExpanded`) gates button click handlers.
**Fix:** Made the add dish buttons always functional regardless of expand/collapse state.
**File:** `event-details-sections.tsx` (MenuDishesSection)

### 5. Prep List Step Stays Yellow (✅ Fixed)
**Bug:** Generating prep list shows toast "0 ingredients" but step stays incomplete.
**Fix:** Check prep list generation status (lastGeneratedAt/lastGeneratedBy) in addition to recipe ingredient count.
**File:** `page.tsx`, `event-setup-checklist.tsx`

### 6. AI-Completable Event Setup (✅ New)
**Added:** `POST /api/events/[eventId]/ai-complete-setup` endpoint that accepts a JSON body with all event setup steps and processes them:
- Assign client
- Set venue  
- Add dishes from menu
- Assign staff
- Generate prep list
- Create contract
- Set budget
**File:** New `apps/app/app/api/events/[eventId]/ai-complete-setup/route.ts`

## Design Decisions
- Setup checklist steps now use `<Link>` to actual pages instead of tab-based routing
- Tab navigation uses direct conditional rendering instead of shadcn TabsContent
- AI endpoint is self-documenting with Zod schema validation
- All fixes are backward-compatible — existing events with partial setup won't break

## QA Verification
- [ ] Budget step shows correct status (no budget → yellow, has budget → green)
- [ ] Staff step navigates to /events/[eventId]/staff
- [ ] Contracts step navigates to /events/[eventId]/contracts
- [ ] Tabs switch correctly from all starting tabs
- [ ] Add Dish works from expanded and collapsed states
- [ ] Prep list generation updates step status
- [ ] Events appear on home calendar automatically
- [ ] AI endpoint processes complete event setup
