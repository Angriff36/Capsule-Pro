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

# Web Analytics

Captures pageviews, pageleave and custom events.

next-forge comes with three web analytics libraries.

## [Vercel Web Analytics](#vercel-web-analytics)

Vercel's built-in analytics tool offers detailed insights into your website's visitors with new metrics like top pages, top referrers, and demographics. All you have to do to enable it is visit the Analytics tab in your Vercel project and click Enable from the dialog.

Read more about it [here](https://vercel.com/docs/analytics/quickstart).

## [Google Analytics](#google-analytics)

Google Analytics tracks user behavior, page views, session duration, and other engagement metrics to provide insights into user activity and marketing effectiveness. GA tracking code is injected using [@next/third-parties](https://nextjs.org/docs/app/building-your-application/optimizing/third-party-libraries#google-analytics) for performance reasons.

To enable it, simply add a `NEXT_PUBLIC_GA_MEASUREMENT_ID` environment variable to your project.

## [PostHog](#posthog)

PostHog is a single platform to analyze, test, observe, and deploy new features. It comes with lots of products, including a web analytics tool, event analytics, feature flagging, and more.

PostHog's web analytics tool is enabled by default and captures pageviews, pageleave and custom events.

### [Session Replay](#session-replay)

PostHog's session replays let you see exactly what users do on your site. It records console logs and network errors, and captures performance data like resource timings and blocked requests. This is disabled by default, so make sure you enable it in your project settings.

### On this page

[Vercel Web Analytics](#vercel-web-analytics)[Google Analytics](#google-analytics)[PostHog](#posthog)[Session Replay](#session-replay)

[GitHubEdit this page on GitHub](https://github.com/vercel/next-forge/edit/main/docs/content/docs/packages/analytics/web.mdx)Scroll to topGive feedbackCopy pageAsk AI about this pageOpen in chat

Vercel

Copyright Vercel 2025. All rights reserved.

Select language[GitHub](https://github.com/vercel/next-forge)