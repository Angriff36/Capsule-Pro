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

# Notifications

In-app notifications for your users.

next-forge offers a notifications package that allows you to send in-app notifications to your users. By default, it uses [Knock](https://knock.app/), a cross-channel notification platform that supports in-app, email, SMS, push, and chat notifications. Knock allows you to centralize your notification logic and templates in one place and [orchestrate complex workflows](https://docs.knock.app/designing-workflows/overview) with things like branching, batching, throttling, delays, and conditional sending.

## [Setup](#setup)

To use the notifications package, you need to add the required environment variables to your project, as specified in the `packages/notifications/keys.ts` file.

## [In-app notifications feed](#in-app-notifications-feed)

To render an in-app notifications feed, import the `NotificationsTrigger` component from the `@repo/notifications` package and use it in your app. We've already added this to the sidebar in the example app:

apps/app/app/(authenticated)/components/sidebar.tsx

```
import { NotificationsTrigger } from '@repo/notifications/components/trigger';

<NotificationsTrigger>
  <Button variant="ghost" size="icon" className="shrink-0">
    <BellIcon size={16} className="text-muted-foreground" />
  </Button>
</NotificationsTrigger>
```

Pressing the button will open the in-app notifications feed, which displays all of the notifications for the current user.

## [Send a notification](#send-a-notification)

Knock sends notifications using workflows. To send an in-app notification, create a new [workflow](https://docs.knock.app/concepts/workflows) in the Knock dashboard that uses the [`in-app` channel provider](https://docs.knock.app/integrations/in-app/knock) and create a corresponding message template.

Then you can [trigger that workflow](https://docs.knock.app/send-notifications/triggering-workflows) for a particular user in your app, passing in the necessary data to populate the message template:

notify.ts

```
import { notifications } from '@repo/notifications';

await notifications.workflows.trigger('workflow-key', {
  recipients: [{
    id: 'user-id',
    email: 'user-email',
  }],
  data: {
    message: 'Hello, world!',
  },
});
```

## [Multi-channel notifications](#multi-channel-notifications)

Using Knock, you can add additional channel providers to your workflow to send notifications via email, SMS, push, or chat. To do this, create a new [channel provider](https://docs.knock.app/integrations) in the Knock dashboard, follow any configuration instructions for that provider, and add it to your workflow as a channel step.

### On this page

[Setup](#setup)[In-app notifications feed](#in-app-notifications-feed)[Send a notification](#send-a-notification)[Multi-channel notifications](#multi-channel-notifications)

[GitHubEdit this page on GitHub](https://github.com/vercel/next-forge/edit/main/docs/content/docs/packages/notifications.mdx)Scroll to topGive feedbackCopy pageAsk AI about this pageOpen in chat

Vercel

Copyright Vercel 2025. All rights reserved.

Select language[GitHub](https://github.com/vercel/next-forge)