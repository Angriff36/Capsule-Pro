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

# Product Analytics

Captures product events and metrics.

next-forge has support for product analytics via PostHog — a single platform to analyze, test, observe, and deploy new features.

## [Usage](#usage)

To capture product events, you can use the `analytics` object exported from the `@repo/analytics` package.

Start by importing the `analytics` object for the relevant environment:

```
// For server-side code
import { analytics } from '@repo/analytics/server';

// For client-side code
import { analytics } from '@repo/analytics/posthog/client';
```

Then, you can use the `capture` method to send events:

```
analytics.capture({
  event: 'Product Purchased',
  distinctId: 'user_123',
});
```

## [Webhooks](#webhooks)

To automatically capture authentication and payment events, we've combined PostHog's Node.js server-side library with Clerk and Stripe webhooks to wire it up as follows:

## [Reverse Proxy](#reverse-proxy)

We've also setup Next.js rewrites to reverse proxy PostHog requests, meaning your client-side analytics events won't be blocked by ad blockers.

### On this page

[Usage](#usage)[Webhooks](#webhooks)[Reverse Proxy](#reverse-proxy)

[GitHubEdit this page on GitHub](https://github.com/vercel/next-forge/edit/main/docs/content/docs/packages/analytics/product.mdx)Scroll to topGive feedbackCopy pageAsk AI about this pageOpen in chat

Vercel

Copyright Vercel 2025. All rights reserved.

Select language[GitHub](https://github.com/vercel/next-forge)