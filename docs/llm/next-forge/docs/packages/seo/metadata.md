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

# Metadata

How to customize the page metadata.

next-forge relies on Next.js's built-in [Metadata](https://nextjs.org/docs/app/building-your-application/optimizing/metadata) API to handle most of our SEO needs. Specifically, the `@repo/seo` package provides a `createMetadata` function that you can use to generate metadata for your pages. For example:

page.tsx

```
import { createMetadata } from '@repo/seo/metadata';

export const metadata = createMetadata({
  title: 'My Page',
  description: 'My page description',
});
```

While this looks similar to just exporting a `metadata` object from your page, the `createMetadata` function deep merges your metadata with our default metadata, allowing you to customize only the metadata that you need to. It's also much easier to specify a cover photo for the page, for example:

page.tsx {6}

```
import { createMetadata } from '@repo/seo/metadata';

export const metadata = createMetadata({
  title: 'My Page',
  description: 'My page description',
  image: '/my-page-image.png',
});
```

### On this page

No Headings

[GitHubEdit this page on GitHub](https://github.com/vercel/next-forge/edit/main/docs/content/docs/packages/seo/metadata.mdx)Scroll to topGive feedbackCopy pageAsk AI about this pageOpen in chat

Vercel

Copyright Vercel 2025. All rights reserved.

Select language[GitHub](https://github.com/vercel/next-forge)