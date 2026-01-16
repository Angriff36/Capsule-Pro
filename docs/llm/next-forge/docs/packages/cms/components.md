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

# Components

Components that come with the CMS package.

The CMS package comes with a set of components that are designed to work with the CMS. At any point in time, you can extend these components to add your own custom functionality.

## [The `Feed` component](#the-feed-component)

The `Feed` component is a wrapper around BaseHub's `Pump` component — a React Server Component that gets generated with the basehub SDK. It leverages RSC, Server Actions, and the existing BaseHub client to subscribe to changes in real time with minimal development effort.

It's also setup by default to use Next.js [Draft Mode](https://nextjs.org/docs/app/building-your-application/configuring/draft-mode), allowing you to preview draft content in your app.

## [The `Body` component](#the-body-component)

The `Body` component is a wrapper around BaseHub's `RichText` component — BaseHub's rich text renderer which supports passing custom handlers for native html elements and BaseHub components.

## [The `TableOfContents` component](#the-tableofcontents-component)

The `TableOfContents` component leverages the `Body` component to render the table of contents for the current page.

## [The `Image` component](#the-image-component)

The `Image` component is a wrapper around BaseHub's `BaseHubImage` component, which comes with built-in image resizing and optimization. BaseHub recommendeds using the `BaseHubImage` component instead of the standard Next.js `Image` component as it uses `Image` under the hood, but adds a custom loader to leverage BaseHub's image pipeline.

## [The `Toolbar` component](#the-toolbar-component)

The `Toolbar` component is a wrapper around BaseHub's `Toolbar` component, which helps manage draft mode and switch branches in your site previews. It's automatically mounted on CMS pages.

### On this page

[The `Feed` component](#the-feed-component)[The `Body` component](#the-body-component)[The `TableOfContents` component](#the-tableofcontents-component)[The `Image` component](#the-image-component)[The `Toolbar` component](#the-toolbar-component)

[GitHubEdit this page on GitHub](https://github.com/vercel/next-forge/edit/main/docs/content/docs/packages/cms/components.mdx)Scroll to topGive feedbackCopy pageAsk AI about this pageOpen in chat

Vercel

Copyright Vercel 2025. All rights reserved.

Select language[GitHub](https://github.com/vercel/next-forge)