# Analytics Event Taxonomy

> Canonical reference for all PostHog events tracked in Capsule Pro.
> When adding a new event, add it here first, then implement.

## Conventions

- **Names:** `snake_case`, namespaced with `feature:action` (e.g. `auth:login`, `billing:plan_changed`)
- **Properties:** `snake_case`, always include `$current_url` (auto-captured by PostHog)
- **Consent:** All client-side events require analytics consent. Server-side events (server.ts) do not.
- **No PII in event names.** User identifiers use PostHog's `distinctId` only.

---

## Page Views

Auto-captured by `posthog-js/react` `PostHogProvider`. No custom code needed.

| Property | Source |
|----------|--------|
| `$current_url` | PostHog auto |
| `$pathname` | PostHog auto |
| `$referrer` | PostHog auto |

---

## Auth Events

| Event | Trigger | Properties |
|-------|---------|------------|
| `auth:sign_up_started` | User begins sign-up flow | `{ method: 'email' \| 'google' \| 'github' }` |
| `auth:sign_up_completed` | Account created successfully | `{ method: 'email' \| 'google' \| 'github' }` |
| `auth:login_started` | User begins login | `{ method: 'email' \| 'google' \| 'github' \| 'passkey' }` |
| `auth:login_completed` | User authenticated | `{ method: 'email' \| 'google' \| 'github' \| 'passkey' }` |
| `auth:logout` | User signs out | `{}` |
| `auth:password_reset_requested` | Password reset email sent | `{}` |
| `auth:password_reset_completed` | Password changed successfully | `{}` |

---

## Billing Events

| Event | Trigger | Properties |
|-------|---------|------------|
| `billing:checkout_started` | User enters checkout | `{ plan: 'starter' \| 'pro' \| 'enterprise', interval: 'monthly' \| 'yearly' }` |
| `billing:checkout_completed` | Payment succeeds | `{ plan, interval, amount_cents }` |
| `billing:checkout_failed` | Payment fails | `{ plan, interval, error_code }` |
| `billing:plan_changed` | Subscription plan changes | `{ from_plan, to_plan }` |
| `billing:subscription_cancelled` | User cancels | `{ plan, reason? }` |
| `billing:subscription_resumed` | User reactivates | `{ plan }` |

---

## Feature Events

| Event | Trigger | Properties |
|-------|---------|------------|
| `feature:manifest_created` | New manifest file created | `{ manifest_id }` |
| `feature:manifest_published` | Manifest published/activated | `{ manifest_id, version }` |
| `feature:manifest_deleted` | Manifest removed | `{ manifest_id }` |
| `studio:page_opened` | Studio editor opened | `{ page_type, page_id? }` |
| `studio:page_saved` | Studio page saved | `{ page_type, page_id, autosave: boolean }` |
| `studio:page_published` | Studio page published | `{ page_type, page_id }` |

---

## Error Events

| Event | Trigger | Properties |
|-------|---------|------------|
| `error:boundary_triggered` | React error boundary catches | `{ component_stack?, error_message }` |
| `error:api_request_failed` | Client API call fails | `{ endpoint, status_code, error_code? }` |

> **Note:** Error events are best-effort. Don't capture stack traces or full error messages in client events.

---

## Consent Events

| Event | Trigger | Properties |
|-------|---------|------------|
| `consent:granted` | User opts in to analytics | `{ source: 'banner' \| 'settings' }` |
| `consent:denied` | User opts out of analytics | `{ source: 'banner' \| 'settings' }` |
| `consent:reset` | User clears consent preference | `{}` |

---

## Usage Example

```tsx
"use client";

import { usePostHog } from "posthog-js/react";

export function SubscribeButton({ plan }: { plan: string }) {
  const posthog = usePostHog();

  const handleClick = () => {
    posthog?.capture("billing:checkout_started", {
      plan,
      interval: "monthly",
    });
    // ... navigate to checkout
  };

  return <button onClick={handleClick}>Subscribe to {plan}</button>;
}
```

## Consent Banner Example

```tsx
"use client";

import { useAnalyticsConsent } from "@repo/analytics";

export function CookieBanner() {
  const { consent, grant, deny, isUndecided } = useAnalyticsConsent();

  if (!isUndecided) return null;

  return (
    <div className="fixed bottom-4 right-4 bg-white p-4 rounded shadow-lg">
      <p>We use analytics to improve Capsule Pro.</p>
      <button onClick={grant}>Accept</button>
      <button onClick={deny}>Decline</button>
    </div>
  );
}
```
