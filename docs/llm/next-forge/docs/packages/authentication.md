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

# Authentication

We use Clerk to handle authentication, user and organization management.

next-forge manages authentication through the use of a `auth` package. By default, this package is a wrapper around [Clerk](https://clerk.com/) which provides a complete authentication and user management solution that integrates seamlessly with Next.js applications.

## [In-App](#in-app)

The `@repo/auth` package exposes an `AuthProvider`, however you don't need to use this directly. The [`DesignSystemProvider`](/en/packages/design-system/provider) includes all relevant providers and higher-order components.

From here, you can use all the pre-built components and hooks provided by Clerk. To demonstrate this, we've added the `<OrganizationSwitcher>` and `<UserButton>` components to the sidebar, as well as built out the Sign In and Sign Up pages.

## [Webhooks](#webhooks)

Clerk uses webhooks to handle authentication events and you can send these to your application. Read more about [inbound authentication webhooks](/en/packages/webhooks/inbound#authentication-events).

## [Email Templates](#email-templates)

Clerk handles authentication and authorization emails automatically. You can configure the theming of Clerk-sent emails in their dashboard.

### [Local Development](#local-development)

Currently there's no way to easily test Clerk webhooks locally, so you'll have to test them in a staging environment. This means deploying your app to a "production" state Vercel project with development environment variables e.g. `staging-api.example.com`. Then you can add this URL to your Clerk project's webhook settings.

### On this page

[In-App](#in-app)[Webhooks](#webhooks)[Email Templates](#email-templates)[Local Development](#local-development)

[GitHubEdit this page on GitHub](https://github.com/vercel/next-forge/edit/main/docs/content/docs/packages/authentication.mdx)Scroll to topGive feedbackCopy pageAsk AI about this pageOpen in chat

Vercel

Copyright Vercel 2025. All rights reserved.

Select language[GitHub](https://github.com/vercel/next-forge)