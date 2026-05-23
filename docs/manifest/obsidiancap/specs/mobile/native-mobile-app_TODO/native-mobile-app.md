# Native Mobile App (React Native / Expo)

## Outcome

Kitchen staff have a **native iOS and Android app** (not a web app) for their daily workflow.  
The app can be downloaded from the App Store / Play Store, works fully offline, and provides a native mobile experience with:
- Camera access for barcode scanning / photo verification
- Push notifications for task assignments
- Background sync
- Native gestures and interactions
- Home screen installation

---

## Tech Stack

- **React Native** via Expo SDK 54
- **React Navigation** (bottom tabs + stack navigators)
- **React Query** for API state + caching
- **AsyncStorage** for offline persistence
- **Expo Secure Store** for auth tokens
- **Expo Camera** for photo/barcode features
- **Expo Notifications** for push
- **Expo Updates** for over-the-air updates without app store approval

---

## App Structure

```
apps/mobile/
├── src/
│   ├── screens/
│   │   ├── TodayScreen.tsx       # Event overview with urgency
│   │   ├── TasksScreen.tsx       # Available + my tasks, bundle claim
│   │   ├── PrepListsScreen.tsx   # Event prep lists index
│   │   ├── PrepListDetailScreen.tsx  # Prep list items with swipe actions
│   │   └── MyWorkScreen.tsx      # All claimed work
│   ├── navigation/
│   │   ├── AppNavigator.tsx      # Root tab navigator
│   │   └── index.tsx
│   ├── api/
│   │   ├── client.ts             # API fetch wrapper
│   │   ├── queries.ts            # React Query hooks
│   │   └── mutations.ts
│   ├── store/
│   │   ├── offline-queue.ts      # AsyncStorage-based action queue
│   │   └── auth.ts               # Secure token storage
│   ├── components/
│   │   ├── TaskCard.tsx
│   │   ├── PrepListItem.tsx
│   │   └── ...
│   └── types.ts
├── App.tsx
├── app.json
└── package.json
```

---

## Screens

### 1. Today Screen
- Shows events today + tomorrow
- Color-coded urgency borders (red < 2h, amber < 6h, green OK)
- Tap event → navigate to its prep list detail

### 2. Tasks Screen
- **Available Tab**
  - List of claimable tasks
  - Long-press → multi-select mode
  - "Claim X Tasks" FAB (floating action button)
  - Atomic bundle claim

- **My Tasks Tab**
  - Claimed tasks only
  - Start / Complete / Release buttons per task

### 3. Prep Lists Screen
- Index view: event-grouped prep lists
- Shows completion % progress bar
- Tap → navigate to detail

### 4. Prep List Detail Screen
- Items grouped by station
- **Swipe right → mark complete**
- **Swipe left → add note**
- Filter: Incomplete | All | Complete

### 5. My Work Screen
- Unified view: kitchen tasks + prep tasks
- Grouped: Active | Claimed
- Start / Complete / Release actions

---

## API Integration

Connects to the existing Convoy API at `/api/kitchen/*`:

- `GET /api/kitchen/events/today` → today's events
- `POST /api/kitchen/tasks/bundle-claim` → atomic bundle claim
- `GET /api/kitchen/tasks/available` → available tasks
- `GET /api/kitchen/tasks/my-tasks` → my claimed tasks
- `POST /api/kitchen/kitchen-tasks/commands/claim` → claim task
- `POST /api/kitchen/kitchen-tasks/commands/start` → start task
- `POST /api/kitchen/kitchen-tasks/commands/complete` → complete task
- `POST /api/kitchen/kitchen-tasks/commands/release` → release task
- `GET /api/kitchen/prep-lists` → prep lists
- `GET /api/kitchen/prep-lists/[id]` → prep list detail
- `POST /api/kitchen/prep-lists/items/commands/mark-completed`
- `POST /api/kitchen/prep-lists/items/commands/update-prep-notes`

**Auth:** Uses Clerk session tokens (stored in Expo Secure Store).  
**Base URL:** `http://localhost:2223` (dev) → production URL (configurable via env vars).

---

## Offline Support

1. **Actions Queue** (AsyncStorage)
   - Claim, release, start, complete actions queue when offline
   - Background sync when connection restores
   - Optimistic UI updates (instant feedback)

2. **Data Cache** (React Query)
   - Cache task lists, prep lists, events
   - Show stale data when offline
   - Refetch on reconnect

---

## Native Features (Future Enhancements)

- **Camera:** Barcode scanning for inventory, photo verification for clock-in
- **Push Notifications:** Task assignment alerts, event reminders
- **Background Sync:** Sync offline queue in background
- **Biometric Auth:** Face ID / Fingerprint login

---

## Development

```bash
# Install dependencies
pnpm --filter @capsule/mobile install

# Start Expo dev server
pnpm --filter @capsule/mobile start

# Run on Android (requires Android emulator or physical device)
pnpm --filter @capsule/mobile android

# Run on iOS (macOS only, requires Xcode + iOS simulator)
pnpm --filter @capsule/mobile ios

# Run on web (for quick testing UI, not production)
pnpm --filter @capsule/mobile web
```

---

## Deployment

### Android (Google Play Store)
1. Build: `eas build --platform android`
2. Submit: `eas submit --platform android`

### iOS (App Store)
1. Build: `eas build --platform ios`
2. Submit: `eas submit --platform ios`

### OTA Updates (Expo Updates)
- Push fixes/features without app store approval
- `eas update --branch production`

---

## Acceptance Checks

- [ ] Install app on Android device → opens to Today screen
- [ ] Install app on iOS device → opens to Today screen
- [ ] Today screen shows events with urgency colors
- [ ] Tap event → navigates to prep list detail
- [ ] Tasks screen: long-press task → multi-select mode activates
- [ ] Bundle claim: select 3 tasks → "Claim 3 Tasks" button → claims atomically
- [ ] Swipe right on prep item → marks complete
- [ ] Swipe left on prep item → opens note input
- [ ] Go offline → claim task → action queues
- [ ] Go online → queued action syncs automatically
- [ ] My Work screen shows all claimed tasks with start/complete buttons
- [ ] Push notification received when task assigned (future)
- [ ] Camera opens for barcode scan (future)
