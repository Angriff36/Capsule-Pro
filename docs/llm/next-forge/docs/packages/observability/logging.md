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

# Logging

How we've configured logging in next-forge.

The logging functionality is abstracted through a simple wrapper that provides a consistent logging interface across environments.

## [How it works](#how-it-works)

In development, logs are output to the console for easy debugging. In production, logs are sent to BetterStack Logs where they can be searched, filtered, and analyzed.

## [Usage](#usage)

To use this logging setup, simply import and use the `log` object. It shares the same interface as the `console` object, so you can replace `console` with `log` in your codebase.

page.tsx

```
import { log } from '@repo/observability/log';

log.info('Hello, world!');
```

### On this page

[How it works](#how-it-works)[Usage](#usage)

[GitHubEdit this page on GitHub](https://github.com/vercel/next-forge/edit/main/docs/content/docs/packages/observability/logging.mdx)Scroll to topGive feedbackCopy pageAsk AI about this pageOpen in chat

Vercel

Copyright Vercel 2025. All rights reserved.

Select language[GitHub](https://github.com/vercel/next-forge)