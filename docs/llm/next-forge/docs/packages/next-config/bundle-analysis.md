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

# Bundle Analysis

How to analyze and optimize your app's bundle size

next-forge uses [@vercel/next-bundle-analyzer](https://github.com/vercel/next-bundle-analyzer) to analyze and optimize your app's bundle size. Each app has a `next.config.ts` file that is configured to use the analyzer when the `ANALYZE` environment variable is set to `true`.

## [Usage](#usage)

To run the analyzer, simply run the following command from the root of the project:

Terminal

```
pnpm analyze
```

Turborepo will automatically run the analyzer for each app when the command is executed. Once the bundle analyzer finishes running for each app, it will open three HTML files in your default browser automatically: `client`, `nodejs` and `edge`. Each one shows a treemap, describing the size and impact of modules loaded on that particular environment.

You can then work on optimizing your app by removing or dynamically loading the heaviest modules.

### On this page

[Usage](#usage)

[GitHubEdit this page on GitHub](https://github.com/vercel/next-forge/edit/main/docs/content/docs/packages/next-config/bundle-analysis.mdx)Scroll to topGive feedbackCopy pageAsk AI about this pageOpen in chat

Vercel

Copyright Vercel 2025. All rights reserved.

Select language[GitHub](https://github.com/vercel/next-forge)