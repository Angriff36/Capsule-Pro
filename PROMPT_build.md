0a. Study `specs/mobile/native-mobile-app_TODO/native-mobile-app.md` using up to 200 parallel Sonnet subagents to understand the full native mobile app spec.
0b. Study `specs/mobile/native-mobile-app_TODO/IMPLEMENTATION_PLAN.md` — this is your task list. Follow it strictly. Pick the highest-priority incomplete item.
0c. Before writing any code, use up to 300 parallel Sonnet subagents to study relevant existing code: - `apps/mobile/` — existing Expo scaffold (build on this, don't replace) - `apps/app/app/(mobile-kitchen)/kitchen/mobile/` — web mobile reference (reuse API patterns, data shapes, offline queue logic) - `apps/api/app/api/kitchen/` — API endpoints to connect to - React Native docs for Navigation, Gesture Handler, AsyncStorage, Expo Secure Store

1. Implement the highest-priority incomplete item from `specs/mobile/native-mobile-app_TODO/IMPLEMENTATION_PLAN.md` using parallel subagents for research, a single subagent for writing code. Do not implement multiple items in one iteration — focus and finish one thing completely.

2. After implementing, test on Expo Go:

   ```bash
   pnpm --filter @capsule/mobile start
   # Scan QR with Expo Go app on phone
   # Test the feature you just built
   ```

   Also run type check:

   ```bash
   pnpm --filter @capsule/mobile exec tsc --noEmit
   ```

   Fix all errors before committing.

3. When tests pass: update `specs/mobile/native-mobile-app_TODO/IMPLEMENTATION_PLAN.md` (mark item complete, note any new findings), then:
   `git add -A && git commit -m "feat(mobile): <concise description>"`
   `git push`

4. After commit: bump the git tag (patch increment from current highest tag).

5. **CRITICAL: This is React Native, NOT a web app.** Use React Native components:

- `View` not `div`
- `Text` not `p` / `span` / `h1`
- `FlatList` / `SectionList` not `map()`
- `TouchableOpacity` / `Pressable` not `button`
- `StyleSheet.create()` for styles, not CSS classes
- `react-navigation` not Next.js routing
- `AsyncStorage` not `localStorage`
- `expo-secure-store` not browser storage
- `react-native-gesture-handler` for swipe gestures

999999. Implement completely — no stubs, no TODOs. Every screen must connect to real API endpoints using React Query.

1000000. API client pattern:

- Base URL from env: `process.env.EXPO_PUBLIC_API_URL` (default: `http://localhost:2223`)
- Auth header: `Authorization: Bearer <token from Expo Secure Store>`
- Use React Query's `queryClient` for cache management
- Optimistic updates: update cache before mutation, rollback on error

99999999. Offline queue pattern (copy from web mobile):

- Store actions in AsyncStorage as array: `[{ id, type, payload, timestamp }, ...]`
- On mutation: if offline, add to queue; if online, execute + remove from queue
- Use NetInfo to detect online/offline state
- Process queue on reconnect in order (FIFO)

999999999. Navigation structure:

- Root: `createBottomTabNavigator()` with 4 tabs
- Each tab can have a stack navigator if needed (e.g., PrepLists → PrepListDetail)
- Use `useNavigation()` hook for programmatic navigation
- Pass params via `navigation.navigate('ScreenName', { paramKey: value })`

9999999999. Swipe gestures (prep list items):

- Use `react-native-gesture-handler` Swipeable component
- Swipe right → reveal "Complete" action (green background)
- Swipe left → reveal "Add Note" action (blue background)
- Trigger mutation on swipe threshold (e.g., 80% of width)

99999999999. Keep `specs/mobile/native-mobile-app_TODO/IMPLEMENTATION_PLAN.md` current — progress notes go there, not in code comments.

100000000000. When IMPLEMENTATION_PLAN gets large, prune completed items.

100000000001. If you discover bugs in existing code, add them to IMPLEMENTATION_PLAN under "Bugs" — do not fix unless blocking your current task.

100000000002. CRITICAL: The web mobile implementation at `apps/app/app/(mobile-kitchen)/` is a REFERENCE ONLY for API patterns and data shapes. Do NOT copy its React/Next.js code. Write proper React Native code.

ULTIMATE GOAL: Kitchen staff download the app from App Store/Play Store, open it on their phone, and see:

- Today tab with event urgency indicators
- Tasks tab where they can claim tasks in bundles
- Prep Lists tab with swipe-to-complete items
- My Work tab showing all their claimed work
- Everything works offline with automatic sync when connection restores
- Native mobile UX with gestures, haptics, smooth animations
