# Convoy Mobile - Native Kitchen App

React Native (Expo) mobile app for kitchen staff daily workflow.

## Features

- **Today Tab:** Event overview with prep urgency indicators
- **Tasks Tab:** Claim tasks individually or in bundles, offline sync
- **Prep Lists Tab:** Event prep lists with swipe-to-complete items
- **My Work Tab:** All claimed tasks with start/complete/release actions

## Tech Stack

- **React Native** (Expo SDK 54)
- **React Navigation** (tab + stack navigators)
- **React Query** for API state management
- **AsyncStorage** for offline queue
- **Expo Updates** for OTA updates

## Development

```bash
# Start Expo dev server
pnpm --filter mobile start

# Run on Android
pnpm --filter mobile android

# Run on iOS (macOS only)
pnpm --filter mobile ios

# Run on web (for testing)
pnpm --filter mobile web
```

## API Integration

Connects to `http://localhost:2223` (API server) in dev.  
Uses `@repo/auth` session tokens for authentication.

## Offline Support

- Actions queue in AsyncStorage when offline
- Auto-sync when connection restores
- Optimistic UI updates for instant feedback
