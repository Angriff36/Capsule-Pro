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

# Documentation

How the documentation is configured in next-forge.

The `docs` application runs on port 3004. We recommend deploying it to `docs.{yourdomain}.com`.

next-forge uses [Mintlify](https://mintlify.com) to generate beautiful docs. Each page is a `.mdx` file, written in Markdown, with built-in UI components and API playground.

## [Creating a new page](#creating-a-new-page)

To create a new documentation page, add a new MDX file to the `apps/docs` directory. The file name will be used as the slug for the page and the frontmatter will be used to generate the docs page. For example:

apps/docs/hello-world.mdx

```
---
title: 'Quickstart'
description: 'Start building modern documentation in under five minutes.'
---
```

Learn more supported [meta tags](https://mintlify.com/docs/page).

## [Adding a page to the navigation](#adding-a-page-to-the-navigation)

To add a page to the sidebar, you'll need to define it in the `mint.json` file in the `apps/docs` directory. From the previous example, here's how you can add it to the sidebar:

mint.json {2-5}

```
"navigation": [
  {
    "group": "Getting Started",
    "pages": ["hello-world"]
  },
  {
    // ...
  }
]
```

## [Advanced](#advanced)

You can build the docs you want with advanced features.

[wrench

### Global Settings

Customize your documentation using the mint.json file](https://mintlify.com/docs/settings/global)
[shapes

### Components

Explore the variety of components available](https://mintlify.com/docs/content/components)

### On this page

[Creating a new page](#creating-a-new-page)[Adding a page to the navigation](#adding-a-page-to-the-navigation)[Advanced](#advanced)

[GitHubEdit this page on GitHub](https://github.com/vercel/next-forge/edit/main/docs/content/docs/apps/docs.mdx)Scroll to topGive feedbackCopy pageAsk AI about this pageOpen in chat

Vercel

Copyright Vercel 2025. All rights reserved.

Select language[GitHub](https://github.com/vercel/next-forge)