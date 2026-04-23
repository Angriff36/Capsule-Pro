# Auth Implementation Status — Clerk GitHub OAuth

**Task:** cp-095 | **Date:** 2026-04-13 | **Agent:** Forge

## TL;DR

**Clerk is already fully implemented.** The cookie-export workaround described in the task context is either outdated or refers to a separate concern (e.g., Browserless testing). Production auth uses Clerk end-to-end.

## What Exists

### 1. Package: `@repo/auth` (`packages/auth/`)
- `@clerk/nextjs` v6.37.2 + `@clerk/themes` v2.4.51
- `client.ts` — re-exports `@clerk/nextjs` (useUser, useAuth, etc.)
- `server.ts` — re-exports `@clerk/nextjs/server` (auth(), currentUser(), etc.)
- `proxy.ts` — exports `clerkMiddleware` as `authMiddleware` + `ClerkMiddlewareAuth` type
- `keys.ts` — t3-oss/env-nextjs validation for all Clerk env vars
- `provider.tsx` — ClerkProvider wrapper
- `components/sign-in.tsx`, `sign-up.tsx` — Clerk sign-in/sign-up components

### 2. App Middleware (`apps/app/proxy.ts`)
- Uses `clerkMiddleware` with route matching
- **Public routes:** `/sign-in(.*)`, `/sign-up(.*)`, `/plasmic(.*)`
- **API routes:** Returns JSON 401 if no userId (not HTML redirect)
- **Protected routes:** `auth.protect()` with loop detection (Sentry-tracked)
- Matcher covers all non-static routes + explicit `/api` + `/trpc`

### 3. API Middleware (`apps/api/proxy.ts`)
- Uses `clerkMiddleware` from `@repo/auth/server`
- **Public routes:** `/webhooks(.*)`, `/outbox/publish`, `/api/health(.*)`, `/api/sentry-fixer/process`
- All other routes: checks userId → 401 if missing → then global rate limit
- ⚠️ Has a merge conflict marker (`<<<<<<< Updated upstream`) that should be cleaned up

### 4. ClerkProvider (`apps/app/app/clerk-provider.client.tsx`)
- Wraps app in `<ClerkProvider>` with dark/light theme support
- Mounted in `apps/app/app/layout.tsx`

### 5. User Data Linking
- `apps/api/app/lib/tenant.ts` — links Clerk user to local User record via `authUserId` field
- On first login: creates User record with Clerk email, first/last name
- Supports soft-delete restoration (finds deleted user by `authUserId`)
- Prisma schema: `authUserId` on User model with unique index on `[tenantId, authUserId]`

### 6. Environment Variables (all set in `.env`)
```
CLERK_SECRET_KEY=sk_...
CLERK_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/...
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/...
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/...
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/...
NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/...
NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL=/...
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...  (for mobile)
```

## What's Missing / Issues

### Merge Conflict in API Middleware
`apps/api/proxy.ts` has an unresolved merge conflict marker at the error handling section. Should be cleaned up — the `throw error` line should win (let Next.js handle auth errors rather than silently swallowing).

### Cookie-Export Workaround (Browserless Testing)
The TOOLS.md mentions `capsule-pro-cookies.json` for Browserless testing. This is a **testing convenience**, not production auth. Production auth is fully Clerk-based. If Browserless testing is still needed, consider:
- Using `@clerk/testing` (Clerk's test utilities) instead of cookie export
- Or documenting this as a dev-only tool

### GitHub OAuth Provider
Clerk is initialized but the OAuth provider configuration is in the Clerk Dashboard, not in code. To use GitHub OAuth:
1. **Clerk Dashboard → User & Authentication → Social Connections → GitHub**
2. Add GitHub OAuth App credentials (Client ID/Secret from GitHub Settings → Developer settings → OAuth Apps)
3. No code changes needed — Clerk handles the OAuth flow

### No Webhook Handler Verification
The `/webhooks(.*)` route is public but I didn't verify a Clerk webhook route exists (e.g., `/webhooks/clerk` for `svix` verification). Worth confirming.

## Action Items

| Priority | Item | Effort |
|----------|------|--------|
| 🔴 High | Fix merge conflict in `apps/api/proxy.ts` | 2 min |
| 🟡 Medium | Verify Clerk webhook handler exists at `/webhooks/clerk` | 10 min |
| 🟢 Low | Replace Browserless cookie export with `@clerk/testing` | 30 min |
| ℹ️ Info | GitHub OAuth is a Clerk Dashboard config, not a code change | — |

## Architecture Summary

```
Browser → ClerkProvider (client) → clerkMiddleware (edge) → auth() check
                                                          ↓
                                              userId → Prisma User.authUserId
                                                          ↓
                                              Rate limit → Route handler
```

Session is managed by Clerk's own `__client` cookie (httpOnly, secure, SameSite=Lax). No custom session handling needed.
