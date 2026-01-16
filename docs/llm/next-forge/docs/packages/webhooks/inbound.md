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

# Inbound Webhooks

Receive inbound webhooks from other services.

next-forge has pre-built webhook handlers for several key services.

## [Payment Events](#payment-events)

[Payment events](/en/packages/payments) are handled in the `POST /webhooks/payments` route in the `api` app. This route constructs the event and then switches on the event type to determine how to process the event.

To test webhooks locally, we've configured the Stripe CLI to forward webhooks to your local server. This will start automatically when you run `pnpm dev`.

## [Authentication Events](#authentication-events)

[Authentication events](/en/packages/authentication) are handled in the `POST /webhooks/auth` route in the `api` app.

Make sure you enable the webhook events you need in your Clerk project settings.

### [Local Development](#local-development)

Currently there's no way to easily test Clerk webhooks locally, so you'll have to test them in a staging environment. This means deploying your app to a "production" state Vercel project with development environment variables e.g. `staging-api.example.com`. Then you can add this URL to your Clerk project's webhook settings.

## [Database Events](#database-events)

One of the most common use cases for inbound webhooks is to notify your application when a database record is created, updated, or deleted. This allows you to react to changes asynchronously, rather than polling the database, cron jobs or other methods.

If you [migrate to Supabase](/en/migrations/database/supabase), they have an incredibly powerful feature called [Database Webhooks](https://supabase.com/docs/guides/database/webhooks) that helps with this.

### On this page

[Payment Events](#payment-events)[Authentication Events](#authentication-events)[Local Development](#local-development)[Database Events](#database-events)

[GitHubEdit this page on GitHub](https://github.com/vercel/next-forge/edit/main/docs/content/docs/packages/webhooks/inbound.mdx)Scroll to topGive feedbackCopy pageAsk AI about this pageOpen in chat

Vercel

Copyright Vercel 2025. All rights reserved.

Select language[GitHub](https://github.com/vercel/next-forge)