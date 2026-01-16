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

# Outbound Webhooks

Send webhooks to your users using Svix.

next-forge supports sending webhooks to your users using [Svix](https://www.svix.com/). Svix is an enterprise-ready webhooks sending service.

Webhooks are automatically enabled by the existence of the `SVIX_TOKEN` environment variable.

## [How it works](#how-it-works)

next-forge uses the Svix API in a stateless manner. The organization ID from the authenticated user is used as the Svix application UID, which is created automatically when the first message is sent.

## [Usage](#usage)

### [Send a webhook](#send-a-webhook)

To send a webhook, simply use the `send` function from the `@repo/webhooks` package:

```
import { webhooks } from '@repo/webhooks';

await webhooks.send('invoice.created', {
  data: {
    id: 'inv_1234567890',
  },
});
```

### [Add webhook endpoints](#add-webhook-endpoints)

Svix provides a pre-built [consumer application portal](https://docs.svix.com/app-portal), where users add endpoints and manage everything related to their webhooks subscriptions. App portal access is based on short-lived sessions using special magic links, and can be [embed in an iframe in your dashboard](https://docs.svix.com/app-portal#embedding-in-a-react-application).

To get access to the application portal, use the `getAppPortal` function from `@repo/webhooks` and use the returned URL in an `iframe` on your dashboard.

```
import { webhooks } from '@repo/webhooks';

const { url } = await webhooks.getAppPortal();

return (
  <iframe src={url} style="width: 100%; height: 100%; border: none;" allow="clipboard-write" loading="lazy" />
);
```

We have a prebuilt page at `/webhooks` that you can use as a starting point.

### On this page

[How it works](#how-it-works)[Usage](#usage)[Send a webhook](#send-a-webhook)[Add webhook endpoints](#add-webhook-endpoints)

[GitHubEdit this page on GitHub](https://github.com/vercel/next-forge/edit/main/docs/content/docs/packages/webhooks/outbound.mdx)Scroll to topGive feedbackCopy pageAsk AI about this pageOpen in chat

Vercel

Copyright Vercel 2025. All rights reserved.

Select language[GitHub](https://github.com/vercel/next-forge)