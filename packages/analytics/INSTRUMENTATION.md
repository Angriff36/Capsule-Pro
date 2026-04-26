# PostHog Event Instrumentation Guide

> Step-by-step implementation guide for adding PostHog event tracking to Capsule Pro.
> Reference: [EVENTS.md](./EVENTS.md) for the canonical event taxonomy.

## Architecture Overview

- **Provider:** `PostHogProvider` from `@repo/analytics/posthog-provider.tsx` wraps the app
- **Consent:** All client events gated by `useAnalyticsConsent()` — see `posthog-provider.tsx`
- **Page views:** Auto-captured by `posthog-js/react` router observer. No manual `$pageview` needed.
- **Custom events:** Use `usePostHog()` hook from `posthog-js/react` in client components
- **Server events:** Use `posthog.capture()` directly from `packages/analytics/server.ts` (no consent gate)

---

## Quick Reference: How to Add an Event

```tsx
"use client";

import { usePostHog } from "posthog-js/react";

export function MyComponent() {
  const posthog = usePostHog();

  const handleAction = () => {
    posthog?.capture("feature:event_name", {
      property_one: "value",
    });
    // ... rest of handler
  };

  return <button onClick={handleAction}>Do Thing</button>;
}
```

**Key points:**
- Always use optional chaining (`posthog?.capture`) — PostHog may not be initialized
- Event names must match the taxonomy in EVENTS.md exactly
- Properties must be `snake_case`
- Never include PII (emails, names) — use PostHog's `distinctId` for user identity

---

## 1. Auth Events

Auth uses Clerk's `<SignIn>` and `<SignUp>` components from `@repo/auth`. Clerk doesn't expose granular form callbacks, so we use Clerk's `useAuth()` and `useSignUp()` hooks plus custom wrappers.

### 1.1 Sign In

**File:** `packages/auth/components/sign-in.tsx`

The current component is a thin wrapper around Clerk's `<SignIn>`. To instrument, wrap it:

```tsx
"use client";

import { usePostHog } from "posthog-js/react";
import { useAuth, useSignUp } from "@clerk/nextjs";
import { useEffect, useRef } from "react";

function SignInWithAnalytics() {
  const posthog = usePostHog();
  const { isSignedIn } = useAuth();
  const hasFired = useRef(false);

  // Fire on mount — user arrived at sign-in page
  useEffect(() => {
    posthog?.capture("auth:login_started", {
      method: "clerk", // Clerk handles method selection internally
    });
  }, [posthog]);

  // Fire when sign-in completes (detected by auth state change)
  useEffect(() => {
    if (isSignedIn && !hasFired.current) {
      hasFired.current = true;
      posthog?.capture("auth:login_completed", {
        method: "clerk",
      });
    }
  }, [isSignedIn, posthog]);

  // ... render Clerk SignIn component
}
```

**Alternative (preferred):** Use Clerk's `afterSignIn` callback in middleware or a custom layout:

**File:** `app/(unauthenticated)/sign-in/[[...sign-in]]/page.tsx`

```tsx
"use client";

import { usePostHog } from "posthog-js/react";
import { useAuth } from "@clerk/nextjs";
import { useEffect } from "react";
import { SignIn } from "@repo/auth/components/sign-in";
import { createMetadata } from "@repo/seo/metadata";
import type { Metadata } from "next";

const title = "Welcome back";
const description = "Enter your details to sign in.";

export const metadata: Metadata = createMetadata({ title, description });

export default function SignInPage() {
  const posthog = usePostHog();
  const { isSignedIn } = useAuth();

  useEffect(() => {
    if (isSignedIn) {
      posthog?.capture("auth:login_completed", {
        method: "clerk",
      });
    }
  }, [isSignedIn, posthog]);

  return <SignIn />;
}
```

### 1.2 Sign Up

**File:** `app/(unauthenticated)/sign-up/[[...sign-up]]/page.tsx`

Same pattern — detect completion via `isSignedIn`:

```tsx
"use client";

import { usePostHog } from "posthog-js/react";
import { useAuth } from "@clerk/nextjs";
import { useEffect } from "react";
import { SignUp } from "@repo/auth/components/sign-up";
import { createMetadata } from "@repo/seo/metadata";
import type { Metadata } from "next";

export default function SignUpPage() {
  const posthog = usePostHog();
  const { isSignedIn } = useAuth();

  useEffect(() => {
    if (isSignedIn) {
      posthog?.capture("auth:sign_up_completed", {
        method: "clerk",
      });
    }
  }, [isSignedIn, posthog]);

  return <SignUp />;
}
```

### 1.3 Logout

**File:** `app/(authenticated)/components/sidebar.tsx`

The sidebar renders `<UserButton>` from `@repo/auth/client`. Wrap it to detect sign-out:

```tsx
import { usePostHog } from "posthog-js/react";
import { useClerk } from "@clerk/nextjs";
import { useEffect } from "react";

function TrackedUserButton() {
  const posthog = usePostHog();
  const { signOut } = useClerk();

  const handleSignOut = async () => {
    posthog?.capture("auth:logout", {});
    await signOut();
  };

  return (
    <UserButton
      afterSignOutUrl="/sign-in"
      // If UserButton supports signOut callback, use it here
    />
  );
}
```

**Note:** Clerk's `<UserButton>` handles sign-out internally. If Clerk doesn't expose a `beforeSignOut` callback, wrap the button in a component that uses `useClerk().signOut()` directly and fires the event before calling Clerk's sign-out.

### 1.4 Password Reset

Password reset flows are handled entirely by Clerk. If there's a custom password reset page, add:

```tsx
posthog?.capture("auth:password_reset_requested", {});
// After successful reset:
posthog?.capture("auth:password_reset_completed", {});
```

---

## 2. Billing Events

Billing uses Stripe (`packages/payments/`). Checkout/subscription events should fire at the point of user action.

### 2.1 Checkout Started

Wherever the checkout flow begins (subscribe button, pricing page CTA):

```tsx
posthog?.capture("billing:checkout_started", {
  plan: "pro",
  interval: "monthly",
});
```

### 2.2 Checkout Completed / Failed

These are best handled server-side via Stripe webhooks or after the redirect from Stripe Checkout:

**File:** `app/api/stripe/webhook/route.ts` (or wherever Stripe webhooks are handled)

```ts
// In the checkout.session.completed handler:
posthog.capture({
  distinctId: session.client_reference_id ?? session.customer as string,
  event: "billing:checkout_completed",
  properties: {
    plan: session.metadata?.plan ?? "unknown",
    interval: session.metadata?.interval ?? "monthly",
    amount_cents: session.amount_total,
  },
});
```

### 2.3 Plan Changed / Cancelled / Resumed

```tsx
// Plan change:
posthog?.capture("billing:plan_changed", {
  from_plan: "starter",
  to_plan: "pro",
});

// Cancellation:
posthog?.capture("billing:subscription_cancelled", {
  plan: "pro",
  reason: "too_expensive", // optional, from a cancellation survey
});

// Resume:
posthog?.capture("billing:subscription_resumed", {
  plan: "pro",
});
```

**Implementation location:** Add to the billing settings page or portal component that manages subscriptions.

---

## 3. Feature Events: Manifest Editor

### 3.1 Manifest Editor Page

**File:** `app/(authenticated)/settings/manifest-editor/manifest-editor-client.tsx`

```tsx
"use client";

import { usePostHog } from "posthog-js/react";

export function ManifestEditorClient() {
  const posthog = usePostHog();
  // ... existing state

  // Fire when manifest is created (find the create/save handler)
  const handleCreateManifest = async () => {
    posthog?.capture("feature:manifest_created", {
      manifest_id: newManifestId,
    });
    // ... existing create logic
  };

  const handlePublishManifest = async (manifestId: string, version: string) => {
    posthog?.capture("feature:manifest_published", {
      manifest_id: manifestId,
      version,
    });
    // ... existing publish logic
  };

  const handleDeleteManifest = async (manifestId: string) => {
    posthog?.capture("feature:manifest_deleted", {
      manifest_id: manifestId,
    });
    // ... existing delete logic
  };
}
```

---

## 4. Feature Events: Studio Pages

Studio runs at `apps/studio/` (port 2226). The EVENTS.md taxonomy defines:

- `studio:page_opened` — `{ page_type, page_id? }`
- `studio:page_saved` — `{ page_type, page_id, autosave: boolean }`
- `studio:page_published` — `{ page_type, page_id }`

**Implementation location:** Add to the Studio app's page editor components.

```tsx
// On page open:
useEffect(() => {
  posthog?.capture("studio:page_opened", {
    page_type: page.type,
    page_id: page.id,
  });
}, [posthog, page.id]);

// On save:
const handleSave = async (autosave: boolean) => {
  posthog?.capture("studio:page_saved", {
    page_type: page.type,
    page_id: page.id,
    autosave,
  });
  // ... save logic
};

// On publish:
const handlePublish = async () => {
  posthog?.capture("studio:page_published", {
    page_type: page.type,
    page_id: page.id,
  });
  // ... publish logic
};
```

---

## 5. Error Events

### 5.1 Error Boundary

**File:** `app/(authenticated)/error.tsx`

The existing error boundary uses Sentry. Add PostHog alongside:

```tsx
"use client";

import { captureException } from "@sentry/nextjs";
import { usePostHog } from "posthog-js/react";
import { useEffect } from "react";

export default function AuthenticatedError({ error, reset }: { ... }) {
  const posthog = usePostHog();
  const message = error?.message ?? "Something went wrong";
  const isDbError = DB_ERROR_PATTERN.test(message);

  useEffect(() => {
    if (isNextHTTPErrorFallback(error)) return;

    // Existing Sentry capture
    captureException(error, { ... });

    // Add PostHog error event
    posthog?.capture("error:boundary_triggered", {
      error_message: message.slice(0, 200), // Truncate for safety
      // Don't send component_stack — it can contain PII
    });
  }, [error, message, isDbError, posthog]);

  // ... rest of component
}
```

### 5.2 API Request Failed

Create a utility wrapper in `packages/analytics/`:

**File:** `packages/analytics/error-tracking.ts`

```ts
import posthog from "posthog-js";

export function trackApiError(endpoint: string, status: number, errorCode?: string) {
  posthog.capture("error:api_request_failed", {
    endpoint,
    status_code: status,
    error_code: errorCode,
  });
}
```

Use in `app/lib/api.ts` (`apiFetch` function):

```ts
async function apiFetch(url: string, options?: RequestInit) {
  const res = await fetch(url, options);
  if (!res.ok) {
    trackApiError(url, res.status);
  }
  return res;
}
```

---

## 6. Consent Events

### 6.1 Cookie Banner / Settings

**File:** Wherever `useAnalyticsConsent()` is consumed (cookie banner, settings page):

```tsx
import { useAnalyticsConsent } from "@repo/analytics";
import { usePostHog } from "posthog-js/react";

export function ConsentBanner() {
  const posthog = usePostHog();
  const { consent, grant, deny, reset, isUndecided } = useAnalyticsConsent();

  const handleGrant = () => {
    posthog?.capture("consent:granted", { source: "banner" });
    grant();
  };

  const handleDeny = () => {
    posthog?.capture("consent:denied", { source: "banner" });
    deny();
  };

  // ... render banner
}
```

In Settings:

```tsx
const handleGrant = () => {
  posthog?.capture("consent:granted", { source: "settings" });
  grant();
};
```

---

## 7. CRM Clients Page

**File:** `app/(authenticated)/crm/clients/components/clients-client.tsx`

No specific CRM events in the current EVENTS.md taxonomy, but page views are auto-captured. If CRM events are added later:

```tsx
// Example: client created
posthog?.capture("crm:client_created", { client_id: newClient.id });

// Example: proposal sent
posthog?.capture("crm:proposal_sent", { client_id, proposal_id });
```

---

## Implementation Priority

| Priority | Events | Effort | Impact |
|----------|--------|--------|--------|
| P0 | Auth (login/signup/logout) | Low — Clerk hooks | High — conversion funnel |
| P0 | Error boundary | Low — one file | High — reliability visibility |
| P1 | Billing (checkout) | Medium — Stripe webhook | High — revenue tracking |
| P1 | Consent | Low — existing hook | Required — compliance |
| P2 | Manifest editor | Medium — multiple handlers | Medium — feature adoption |
| P2 | API errors | Medium — wrapper utility | Medium — error monitoring |
| P3 | Studio pages | Medium — separate app | Medium — content tracking |

---

## Testing Events

1. Open PostHog Live Events (`https://app.posthog.com/project/<id>/events`)
2. Navigate to each instrumented page
3. Perform the action (sign in, create manifest, etc.)
4. Verify the event appears with correct properties
5. Check that events do NOT fire when consent is denied

---

## Checklist

- [ ] Auth: sign-in page fires `auth:login_started` on mount
- [ ] Auth: sign-in page fires `auth:login_completed` after Clerk confirms sign-in
- [ ] Auth: sign-up page fires `auth:sign_up_completed` after Clerk confirms
- [ ] Auth: logout fires `auth:logout`
- [ ] Billing: checkout started/completed/failed wired to Stripe flow
- [ ] Billing: plan_changed/subscription_cancelled/subscription_resumed wired
- [ ] Feature: manifest_created/published/deleted in manifest editor
- [ ] Studio: page_opened/page_saved/page_published in studio app
- [ ] Error: boundary_triggered in error.tsx
- [ ] Error: api_request_failed in apiFetch wrapper
- [ ] Consent: granted/denied/reset in cookie banner and settings
- [ ] All events respect consent gate (no events when denied)
- [ ] No PII in any event properties
