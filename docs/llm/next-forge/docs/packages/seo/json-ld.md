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

# JSON-LD

How we've implemented JSON-LD structured data.

## [Default Configuration](#default-configuration)

next-forge has a dedicated JSON+LD helper designed to create fully validated Google structured data, making your content more likely to be featured in Google Search results.

By default, structured data is implemented on the following pages:

* `Blog` for the blog index
* `BlogPosting` for the blog post pages

## [Usage](#usage)

Our `@repo/seo` package provides a JSON+LD helper built on `schema-dts`, allowing for structured data generation in a type-safe way. You can declare your own JSON+LD implementations like so:

page.tsx

```
import { JsonLd } from '@repo/seo/json-ld';
import type { WithContext, YourInterface } from '@repo/seo/json-ld';

const jsonLd: WithContext<YourInterface> = {
  // ...
};

return <JsonLd code={jsonLd} />;
```

### On this page

[Default Configuration](#default-configuration)[Usage](#usage)

[GitHubEdit this page on GitHub](https://github.com/vercel/next-forge/edit/main/docs/content/docs/packages/seo/json-ld.mdx)Scroll to topGive feedbackCopy pageAsk AI about this pageOpen in chat

Vercel

Copyright Vercel 2025. All rights reserved.

Select language[GitHub](https://github.com/vercel/next-forge)