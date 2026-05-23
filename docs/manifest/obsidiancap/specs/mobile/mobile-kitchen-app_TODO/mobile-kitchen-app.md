# Mobile Kitchen App

## Outcome

Kitchen staff have a fully-functional mobile-first app for their entire daily workflow:
seeing what prep is needed today, claiming tasks individually or in bundles, working
through event prep lists, marking items complete, and handing off cleanly to the next
person. Everything runs fast, works offline, and requires the fewest possible taps.

---

## Surfaces / Routes

All routes live under `/kitchen/mobile/` and use a bottom-nav shell:

| Tab | Route | Purpose |
|-----|-------|---------|
| **Today** | `/kitchen/mobile` | Daily overview — upcoming events, prep urgency |
| **Tasks** | `/kitchen/mobile/tasks` | Available + claimed kitchen tasks, bundling |
| **Prep Lists** | `/kitchen/mobile/prep-lists` | Event prep lists, item completion |
| **My Work** | `/kitchen/mobile/my-work` | Everything currently claimed by me |

The existing `/kitchen/mobile/page.tsx` becomes the **Today** tab or redirects there.

---

## Feature Specifications

### 1. Daily Overview (Today Tab)

- Shows events happening today and tomorrow with counts:
  - How many prep tasks remain unclaimed
  - How many prep list items are incomplete
  - Event name, date/time, headcount
- Color-coded urgency: red = event < 2h away with incomplete prep, amber = < 6h, green = OK
- Tapping an event deep-links to its prep list on the Prep Lists tab

### 2. Task Claiming (Tasks Tab)

Builds on the existing `/kitchen/mobile/page.tsx` foundation, adding:

#### 2a. Task Bundles
- Staff can select multiple available tasks (multi-select mode via long-press or select-all by station)
- "Bundle & Claim" button claims all selected at once in a single API call
- Bundle shows as a grouped card in My Work with progress (e.g. "3 of 5 done")
- Individual tasks within a bundle can be completed independently
- Releasing a bundle releases all uncompleted tasks in it

#### 2b. Station Filter
- Persistent bottom-sheet filter: station, priority range, event
- Filter state survives tab switches (stored in URL params)
- "My Station" quick-filter button (remembers last-used station)

#### 2c. Real-time updates
- Tasks refresh automatically every 30s (existing pattern from Command Board)
- Optimistic UI: claimed task moves to My Tasks instantly before server confirms
- If server rejects (already claimed), card snaps back with a toast

### 3. Event Prep Lists (Prep Lists Tab)

- Lists all active prep lists grouped by event, sorted by event date ASC
- Each prep list shows: event name, date, completion % progress bar, station breakdown
- Tapping opens the prep list detail:
  - Items grouped by station
  - Each item: name, quantity, unit, prep notes, station badge
  - Large checkbox / swipe-right to mark complete
  - Swipe-left to add a prep note / flag an issue
  - Items completed by others shown with their name and greyed out
  - Filter bar: All | Incomplete | Complete | My Station
- Completing all items in a station collapses that section with a ✅ header
- Offline: completions queue and sync on reconnect (same pattern as task claims)

### 4. My Work (My Work Tab)

- All tasks currently claimed by me (both kitchen tasks and prep tasks)
- Grouped into: Active (started), Claimed (not yet started), Bundles
- Start button on claimed tasks (sets status → in_progress)
- Complete button on in_progress tasks
- Release button on any claimed/in_progress task
- For bundles: progress ring showing X/Y completed
- Shows estimated time remaining based on task due dates

---

## API Endpoints Needed

These exist already and should be wired up:
- `GET /api/kitchen/tasks/available` — available kitchen tasks
- `GET /api/kitchen/tasks/my-tasks` — my claimed tasks
- `POST /api/kitchen/kitchen-tasks/commands/claim` — claim single task
- `POST /api/kitchen/kitchen-tasks/commands/release` — release task
- `POST /api/kitchen/kitchen-tasks/commands/start` — start task
- `POST /api/kitchen/kitchen-tasks/commands/complete` — complete task
- `GET /api/kitchen/prep-lists` — list prep lists
- `GET /api/kitchen/prep-lists/[id]` — prep list with items
- `POST /api/kitchen/prep-lists/items/commands/mark-completed` — complete prep list item
- `POST /api/kitchen/prep-lists/items/commands/mark-uncompleted` — un-complete prep list item
- `POST /api/kitchen/prep-lists/items/commands/update-prep-notes` — add note/flag to item
- `GET /api/kitchen/prep-tasks/` — prep tasks (distinct from kitchen tasks)
- `POST /api/kitchen/prep-tasks/commands/claim` — claim prep task
- `POST /api/kitchen/prep-tasks/commands/release` — release prep task
- `POST /api/kitchen/prep-tasks/commands/start` — start prep task
- `POST /api/kitchen/prep-tasks/commands/complete` — complete prep task

New endpoints needed:
- `POST /api/kitchen/tasks/bundle-claim` — claim multiple task IDs atomically
- `GET /api/kitchen/events/today` — events today/tomorrow with prep summary

---

## Invariants / Must Never Happen

- A task must never be claimable by two users simultaneously
- Claiming must never silently fail — optimistic updates must be confirmed or rolled back
- Prep list item completions must never be lost offline — queue + sync
- Mobile UI must never require more than 2 taps to claim a task or complete a prep item
- Bundle claim must be atomic — all succeed or none are claimed
- Staff must never see tasks or prep lists from other tenants

## Acceptance Checks

- Open Today tab → see events with prep urgency colors and counts
- Tap event → opens its prep list
- Open Tasks tab → see available tasks, filter by station
- Long-press tasks → multi-select mode activates, Bundle & Claim button appears
- Bundle & Claim → all selected tasks move to My Work as a bundle
- Open Prep Lists tab → see prep lists grouped by event with progress bars
- Tap prep list → see items by station, mark complete with single tap
- Swipe left on prep list item → add note or flag issue
- Go offline → can still view tasks and prep lists loaded previously
- Go offline, complete prep item → queued, syncs automatically when back online
- Open My Work → see all my claimed tasks and bundles with progress
- Start a task → status changes to in_progress
- Complete a task → removed from My Work, count decrements on Today tab
