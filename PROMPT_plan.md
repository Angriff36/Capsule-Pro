0a. Study `specs/mobile/native-mobile-app_TODO/native-mobile-app.md` using up to 200 parallel Sonnet subagents to fully understand the native mobile app spec.
0b. Study `specs/mobile/native-mobile-app_TODO/IMPLEMENTATION_PLAN.md` (if present) to understand what's already done.
0c. Study existing code using up to 300 parallel Sonnet subagents: - `apps/mobile/` — existing Expo scaffold (App.tsx, package.json, app.json) - `apps/app/app/(mobile-kitchen)/kitchen/mobile/` — web mobile reference implementation (reuse patterns) - `apps/api/app/api/kitchen/tasks/` — task APIs to connect to - `apps/api/app/api/kitchen/prep-lists/` — prep list APIs to connect to - `apps/api/app/api/kitchen/events/today/` — events API to connect to - React Native best practices for navigation, offline-first, gesture handlers

1. Study `specs/mobile/native-mobile-app_TODO/IMPLEMENTATION_PLAN.md` (it may be incomplete) and use up to 500 Sonnet subagents to map existing code against the spec. Use an Opus subagent to analyze findings, identify gaps, and create/update the IMPLEMENTATION_PLAN with a prioritized list of what remains. Ultrathink. Confirm before claiming anything is missing — search first.

IMPORTANT: Plan only. Do NOT implement anything. This is a React Native (Expo) app, not a web app. Use React Native components (View, Text, FlatList, TouchableOpacity) not HTML/DOM. Use React Navigation not Next.js routing. Use AsyncStorage not localStorage. Use Expo Secure Store not browser storage.

ULTIMATE GOAL: A complete **native mobile app** (iOS + Android) for kitchen staff at `apps/mobile/` with:

- Bottom tab navigation: Today | Tasks | Prep Lists | My Work
- 5 screens fully implemented and wired to existing kitchen API
- Offline-first with AsyncStorage queue + sync on reconnect
- Native gestures (swipe to complete prep items)
- Optimistic UI updates for instant feedback
- Can be installed from App Store / Play Store
- Works via Expo Go for instant dev testing on physical devices

Key capabilities:

- React Navigation tab + stack navigators
- React Query for API state + caching
- Offline action queue (claim/complete/release tasks while offline)
- Swipe gestures for prep list item completion
- Bundle task claiming (select multiple → claim atomically)
- Pull-to-refresh on all list views
