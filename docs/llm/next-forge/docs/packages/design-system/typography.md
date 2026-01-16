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

# Typography

Custom fonts and how to use them

The design system package contains a pre-configured fonts file, which has been wired up to all the apps. This `fonts.ts` file imports the default font Geist from Google Fonts, configures the appropriate subset and CSS variable name, then exports a `className` you can use in your app. This CSS variable is then applied to the shared Tailwind configuration.

By default, `fonts.ts` exports a `sans` and `mono` font, but you can configure this to export as many as you need e.g. heading, body, secondary, etc. You can also replace fonts entirely simply by replacing the font name, like so:

packages/design-system/lib/fonts.ts

```
import { Acme } from 'next/font/google';

const sans = Acme({ subsets: ['latin'], variable: '--font-sans' });
```

You can also load fonts locally. Read more about this on the [Next.js docs](https://nextjs.org/docs/app/building-your-application/optimizing/fonts).

### On this page

No Headings

[GitHubEdit this page on GitHub](https://github.com/vercel/next-forge/edit/main/docs/content/docs/packages/design-system/typography.mdx)Scroll to topGive feedbackCopy pageAsk AI about this pageOpen in chat

Vercel

Copyright Vercel 2025. All rights reserved.

Select language[GitHub](https://github.com/vercel/next-forge)