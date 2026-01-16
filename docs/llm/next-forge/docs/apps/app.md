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

# App

How the main application works in next-forge.

The `app` application runs on port 3000. We recommend deploying it to `app.{yourdomain}.com`.

next-forge exports the main app from the `apps/app` directory. It is designed to be run on a subdomain of your choice, and is used to run the main user-facing application.

## [Overview](#overview)

The `app` application is the main user-facing application built on [Next.js](https://nextjs.org). It is designed to be a starting point for your own unique projects, containing all the core functionality you need.

## [Features](#features)

* **Design System**: The app is connected to the [Design System](/en/packages/design-system/components) and includes a variety of components, hooks, and utilities to help you get started.
* **Authentication**: The app includes a fully-featured [authentication system](/en/packages/authentication) with support for email login. You can easily extend it to support other providers and authentication methods. The app is also broken into authenticated and unauthenticated route groups.
* **Database**: The app is connected to the [Database](/en/packages/database) and can fetch data in React Server Components.
* **Collaboration**: The app is connected to the [Collaboration](/en/packages/collaboration) and contains Avatar Stack and Live Cursor components.

### On this page

[Overview](#overview)[Features](#features)

[GitHubEdit this page on GitHub](https://github.com/vercel/next-forge/edit/main/docs/content/docs/apps/app.mdx)Scroll to topGive feedbackCopy pageAsk AI about this page

Vercel

Copyright Vercel 2025. All rights reserved.

Select language[GitHub](https://github.com/vercel/next-forge)