[Vercel](https://vercel.com/)Slash[next-forge](/en)

* [Docs](/en/docs)
* [Source](https://github.com/vercel/next-forge/)

Search...`⌘K`Ask AI

Ask AI

Introduction

[Overview](/docs)[Philosophy](/docs/philosophy)[Structure](/docs/structure)[Updates](/docs/updates)[FAQ](/docs/faq)

Usage

Setup

Apps

Packages

Deployment

Other

Addons

Examples

Migrations

On this page

# Environment Variables

How to configure environment variables in next-forge.

next-forge uses environment variables for configuration. This guide will help you set up the required variables to get started quickly, and optionally configure additional features.

## [Quick Start (Minimum Setup)](#quick-start-minimum-setup)

To get next-forge running locally with basic functionality, you only need to configure these **required** variables:

### [1. Database (Required)](#1-database-required)

Add to `packages/database/.env`:

```
DATABASE_URL="postgresql://user:password@localhost:5432/mydb"
```

For quick local development, we recommend [Neon](https://neon.tech) for a free PostgreSQL database. Sign up, create a project, and copy the connection string.

### [2. Authentication (Required)](#2-authentication-required)

Add to `apps/app/.env.local` and `apps/web/.env.local`:

```
# Server
CLERK_SECRET_KEY="sk_test_..."

# Client
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_..."
NEXT_PUBLIC_CLERK_SIGN_IN_URL="/sign-in"
NEXT_PUBLIC_CLERK_SIGN_UP_URL="/sign-up"
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL="/"
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL="/"
```

Sign up at [Clerk](https://clerk.com) and create an application

Go to **API Keys** in your Clerk dashboard

Copy the **Publishable key** (starts with `pk_`) and **Secret key** (starts with `sk_`)

### [3. Local URLs (Pre-configured)](#3-local-urls-pre-configured)

These are already set to sensible defaults for local development:

```
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NEXT_PUBLIC_WEB_URL="http://localhost:3001"
NEXT_PUBLIC_API_URL="http://localhost:3002"
NEXT_PUBLIC_DOCS_URL="http://localhost:3004"
VERCEL_PROJECT_PRODUCTION_URL="http://localhost:3000"
```

**That's it!** You can now run `npm run dev` and the app will work with basic authentication and database functionality.

## [Optional Features](#optional-features)

The following environment variables enable additional features. You can add them as needed:

### [Content Management (BaseHub)](#content-management-basehub)

Required for the CMS functionality in `packages/cms`.

```
BASEHUB_TOKEN="bshb_..."
```

Fork the [next-forge template](https://basehub.com/basehub/next-forge?fork=1) on BaseHub

Navigate to **Settings → API Tokens**

Copy your **Read Token** (starts with `bshb_`)

### [Email (Resend)](#email-resend)

Required for sending transactional emails.

```
RESEND_TOKEN="re_..."
RESEND_FROM="noreply@yourdomain.com"
```

[Get your API key from Resend](https://resend.com/api-keys)

### [Payments (Stripe)](#payments-stripe)

Required for subscription and payment functionality.

```
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
```

Get your keys from [Stripe Dashboard](https://dashboard.stripe.com/apikeys)

For webhooks, install the [Stripe CLI](https://stripe.com/docs/stripe-cli) and run:

```
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

### [Analytics](#analytics)

#### [Google Analytics](#google-analytics)

```
NEXT_PUBLIC_GA_MEASUREMENT_ID="G-..."
```

[Create a GA4 property](https://analytics.google.com/)

#### [PostHog](#posthog)

```
NEXT_PUBLIC_POSTHOG_KEY="phc_..."
NEXT_PUBLIC_POSTHOG_HOST="https://app.posthog.com"
```

[Get your keys from PostHog](https://app.posthog.com/project/settings)

### [Observability](#observability)

#### [Better Stack (Uptime monitoring)](#better-stack-uptime-monitoring)

```
BETTERSTACK_API_KEY="..."
BETTERSTACK_URL="..."
```

[Get your API key from Better Stack](https://betterstack.com/logs)

### [Security](#security)

#### [Arcjet (Rate limiting & security)](#arcjet-rate-limiting--security)

```
ARCJET_KEY="ajkey_..."
```

[Get your key from Arcjet](https://app.arcjet.com/)

### [Real-time Features](#real-time-features)

#### [Liveblocks (Collaboration)](#liveblocks-collaboration)

```
LIVEBLOCKS_SECRET="sk_..."
```

[Get your secret from Liveblocks](https://liveblocks.io/dashboard)

### [Notifications (Knock)](#notifications-knock)

```
KNOCK_API_KEY="..."
KNOCK_SECRET_API_KEY="..."
KNOCK_FEED_CHANNEL_ID="..."
NEXT_PUBLIC_KNOCK_API_KEY="..."
NEXT_PUBLIC_KNOCK_FEED_CHANNEL_ID="..."
```

[Get your keys from Knock](https://dashboard.knock.app/)

### [Feature Flags](#feature-flags)

```
FLAGS_SECRET="..."
```

Generate a random secret string for encrypting feature flag data.

### [Webhooks (Svix)](#webhooks-svix)

```
SVIX_TOKEN="..."
```

[Get your token from Svix](https://dashboard.svix.com/)

### [Clerk Webhooks](#clerk-webhooks)

```
CLERK_WEBHOOK_SECRET="whsec_..."
```

In your Clerk dashboard, go to **Webhooks**

Add a new endpoint pointing to `https://your-domain.com/api/webhooks/clerk`

Subscribe to the events you need (typically `user.created`, `user.updated`, etc.)

Copy the **Signing Secret**

## [Environment Variable Files](#environment-variable-files)

next-forge uses environment variables across multiple locations:

| File | Purpose |
| --- | --- |
| `apps/app/.env.local` | Main application variables |
| `apps/web/.env.local` | Marketing website variables |
| `apps/api/.env.local` | API server variables |
| `packages/database/.env` | Database connection string |
| `packages/cms/.env.local` | CMS configuration |
| `packages/internationalization/.env.local` | i18n configuration |

The setup script automatically creates these files from `.env.example` templates. You only need to fill in the values.

## [Type Safety](#type-safety)

Type safety is provided by [@t3-oss/env-nextjs](https://env.t3.gg/), which provides runtime validation and autocompletion for all environment variables. Each package defines its own environment variables in a `keys.ts` file with Zod validation schemas.

### [Validation Rules](#validation-rules)

Be as specific as possible with validation. For example, if a vendor secret starts with `sec_`, validate it as `z.string().min(1).startsWith('sec_')`. This makes your intent clearer and helps prevent errors at runtime.

## [Adding a New Environment Variable](#adding-a-new-environment-variable)

To add a new environment variable:

1. Add the variable to the relevant `.env.local` files
2. Add validation to the `server` or `client` object in the package's `keys.ts` file

Example in `packages/my-package/keys.ts`:

```
import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const keys = createEnv({
  server: {
    MY_NEW_SECRET: z.string().min(1),
  },
  client: {
    NEXT_PUBLIC_MY_VALUE: z.string().optional(),
  },
  runtimeEnv: {
    MY_NEW_SECRET: process.env.MY_NEW_SECRET,
    NEXT_PUBLIC_MY_VALUE: process.env.NEXT_PUBLIC_MY_VALUE,
  },
});
```

## [Deployment](#deployment)

When deploying to Vercel or other platforms:

1. Add all required environment variables to your deployment platform
2. Update URL variables (`NEXT_PUBLIC_APP_URL`, etc.) to production values
3. Some integrations (like Sentry) automatically inject their variables via marketplace integrations

Variables prefixed with `VERCEL_` are automatically available in Vercel deployments, such as `VERCEL_PROJECT_PRODUCTION_URL`.

### On this page

[Quick Start (Minimum Setup)](#quick-start-minimum-setup)[1. Database (Required)](#1-database-required)[2. Authentication (Required)](#2-authentication-required)[3. Local URLs (Pre-configured)](#3-local-urls-pre-configured)[Optional Features](#optional-features)[Content Management (BaseHub)](#content-management-basehub)[Email (Resend)](#email-resend)[Payments (Stripe)](#payments-stripe)[Analytics](#analytics)[Google Analytics](#google-analytics)[PostHog](#posthog)[Observability](#observability)[Better Stack (Uptime monitoring)](#better-stack-uptime-monitoring)[Security](#security)[Arcjet (Rate limiting & security)](#arcjet-rate-limiting--security)[Real-time Features](#real-time-features)[Liveblocks (Collaboration)](#liveblocks-collaboration)[Notifications (Knock)](#notifications-knock)[Feature Flags](#feature-flags)[Webhooks (Svix)](#webhooks-svix)[Clerk Webhooks](#clerk-webhooks)[Environment Variable Files](#environment-variable-files)[Type Safety](#type-safety)[Validation Rules](#validation-rules)[Adding a New Environment Variable](#adding-a-new-environment-variable)[Deployment](#deployment)

[GitHubEdit this page on GitHub](https://github.com/vercel/next-forge/edit/main/docs/content/docs/setup/env.mdx)Scroll to topGive feedbackCopy pageAsk AI about this pageOpen in chat

Vercel

Copyright Vercel 2025. All rights reserved.

Select language[GitHub](https://github.com/vercel/next-forge)