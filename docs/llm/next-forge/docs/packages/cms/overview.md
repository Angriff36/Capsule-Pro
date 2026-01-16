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

# Overview

How the CMS is configured in next-forge.

next-forge has a dedicated CMS package that can be used to generate type-safe data collections from your content. This approach provides a structured way to manage your content while maintaining full type safety throughout your application. By default, next-forge uses [BaseHub](https://basehub.com) as the CMS.

## [Setup](#setup)

Here's how to quickly get started with your new CMS.

### [1. Fork the [`basehub/next-forge`](https://basehub.com/basehub/next-forge?fork=1) template](#1-fork-the-basehubnext-forge-template)

You'll be forking a BaseHub repository which contains the next-forge compatible content schema.

Once you fork the repository, you'll need to get your Read Token from the "Connect to your App" page:

```
https://basehub.com/<team-slug>/<repo-slug>/dev/main/dev:connect
```

The token will look something like this:

```
bshb_pk_<password>
```

Keep this connection string handy, you will need it in the next step.

### [2. Update your environment variables](#2-update-your-environment-variables)

Update your [environment variables](/en/docs/setup/env) to use the new BaseHub token. For example:

```
BASEHUB_TOKEN="<token>"
```

### [3. Start the dev server](#3-start-the-dev-server)

When you run `pnpm dev`, the CMS package will generate the type-safe BaseHub SDK, and watch changes to your CMS's schema.

You might need to run `Restart TS Server` in your IDE for TypeScript to pick up the new types.

## [Querying Basics](#querying-basics)

The structure of the CMS should look something like this:

```
- Blog
  - Posts
  - Authors
  - Categories
- Legal Pages
```

So in order to get all posts, you'd write a query like this:

```
{
  blog: {
    posts: {
      items: {
        _title: true,
        _slug: true,
        authors: { _title: true }, // references the authors collection
        // ...
      },
    },
  },
}
```

Starter queries are provided for you in the `cms` package, within the `blog` and `legal` objects. You can read more about the BaseHub SDK in [their docs](https://docs.basehub.com/nextjs-integration/).

## [Revalidation](#revalidation)

A key part of any good CMS integration is the ability to revalidate content when it changes. To do that, BaseHub comes with automatic [on-demand revalidation](https://docs.basehub.com/nextjs-integration/environments-and-caching#on-demand-revalidation-recommended).

### On this page

[Setup](#setup)[1. Fork the [`basehub/next-forge`](https://basehub.com/basehub/next-forge?fork=1) template](#1-fork-the-basehubnext-forge-template)[2. Update your environment variables](#2-update-your-environment-variables)[3. Start the dev server](#3-start-the-dev-server)[Querying Basics](#querying-basics)[Revalidation](#revalidation)

[GitHubEdit this page on GitHub](https://github.com/vercel/next-forge/edit/main/docs/content/docs/packages/cms/overview.mdx)Scroll to topGive feedbackCopy pageAsk AI about this pageOpen in chat

Vercel

Copyright Vercel 2025. All rights reserved.

Select language[GitHub](https://github.com/vercel/next-forge)