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

# Toolbar

next-forge uses the Vercel Toolbar to allow you to override feature flags in development.

The [Vercel Toolbar](https://vercel.com/docs/workflow-collaboration/vercel-toolbar) is a tool that allows you to leave feedback, navigate through important dashboard pages, share deployments, use Draft Mode for previewing unpublished content, and Edit Mode for editing content in real-time. next-forge has the Vercel Toolbar enabled by default.

## [Link your applications](#link-your-applications)

Go into each application and run `vercel link`, like so:

Terminal

```
cd apps/app && vercel link && cd ../..
cd apps/web && vercel link && cd ../..
cd apps/api && vercel link && cd ../..
```

This will create a `.vercel/project.json` file in each application.

## [Add the environment variable](#add-the-environment-variable)

Then, simply add a `FLAGS_SECRET` environment variable to each application's `.env.local` file, like so:

.env.local

```
FLAGS_SECRET="test"
```

These two steps are optional, but they are recommended to ensure that the Vercel Toolbar is enabled in each application.

### On this page

[Link your applications](#link-your-applications)[Add the environment variable](#add-the-environment-variable)

[GitHubEdit this page on GitHub](https://github.com/vercel/next-forge/edit/main/docs/content/docs/packages/toolbar.mdx)Scroll to topGive feedbackCopy pageAsk AI about this pageOpen in chat

Vercel

Copyright Vercel 2025. All rights reserved.

Select language[GitHub](https://github.com/vercel/next-forge)