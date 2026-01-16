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

# Uptime Monitoring

How we've configured uptime monitoring in next-forge.

Uptime monitoring functionality is configured through BetterStack's dashboard.

## [Setting up monitoring](#setting-up-monitoring)

When you create your project, I recommend adding some specific URLs to monitor. Assuming we're using `next-forge.com` and it's subdomains, here's what you should add:

1. `next-forge.com` - the `web` project, should be up if the index page returns a successful response.
2. `app.next-forge.com` - the `app` project, should be up if the index page returns a successful response.
3. `api.next-forge.com/health` - the `api` project, should be up if the `health` route returns a successful response. This is a stub endpoint that runs on Edge runtime so it's very quick.

## [Usage in the UI](#usage-in-the-ui)

next-forge provides a `Status` component from `@repo/observability` that displays the current status of the application. You can see an example of this in the website footer.

The status component shows 3 potential states:

* `All systems normal` - 100% of the uptime monitors are reporting up
* `Partial outage` - at least one uptime monitor is reporting down
* `Degraded performance` - 0% of the uptime monitors are reporting up

This functionality relies on the `BETTERSTACK_API_KEY` and `BETTERSTACK_URL` environment variables.

### On this page

[Setting up monitoring](#setting-up-monitoring)[Usage in the UI](#usage-in-the-ui)

[GitHubEdit this page on GitHub](https://github.com/vercel/next-forge/edit/main/docs/content/docs/packages/observability/uptime.mdx)Scroll to topGive feedbackCopy pageAsk AI about this pageOpen in chat

Vercel

Copyright Vercel 2025. All rights reserved.

Select language[GitHub](https://github.com/vercel/next-forge)