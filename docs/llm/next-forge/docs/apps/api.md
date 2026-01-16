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

# API

How the "API" application works in next-forge.

The `api` application runs on port 3002. We recommend deploying it to `api.{yourdomain}.com`.

next-forge exports the API from the `apps/api` directory. It is designed to be run separately from the main app, and is used to run isolate functions that are not part of the main user-facing application e.g. webhooks, cron jobs, etc.

## [Overview](#overview)

The API is designed to run serverless functions, and is not intended to be used as a traditional Node.js server. However, it is designed to be as flexible as possible, and you can switch to running a traditional server if you need to.

Functionally speaking, splitting the API from the main app doesn't matter if you're running these projects on Vercel. Serverless functions are all independent pieces of infrastructure and can scale independently. However, having it run independently provides a dedicated endpoint for non-web applications e.g. mobile apps, smart home devices, etc.

## [Features](#features)

* **Cron jobs**: The API is used to run [cron jobs](/en/packages/cron). These are defined in the `apps/api/app/cron` directory. Each cron job is a `.ts` file that exports a route handler.
* **Webhooks**: The API is used to run [inbound webhooks](/en/packages/webhooks/inbound). These are defined in the `apps/api/app/webhooks` directory. Each webhook is a `.ts` file that exports a route handler.

### On this page

[Overview](#overview)[Features](#features)

[GitHubEdit this page on GitHub](https://github.com/vercel/next-forge/edit/main/docs/content/docs/apps/api.mdx)Scroll to topGive feedbackCopy pageAsk AI about this pageOpen in chat

Vercel

Copyright Vercel 2025. All rights reserved.

Select language[GitHub](https://github.com/vercel/next-forge)