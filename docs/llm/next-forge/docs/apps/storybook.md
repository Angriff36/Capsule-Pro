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

# Storybook

Frontend workshop for the design system

The `storybook` application runs on port 6006.

next-forge uses [Storybook](https://storybook.js.org/) as a frontend workshop for the design system. It allows you to interact with the components in the design system, and see how they behave in different states.

## [Configuration](#configuration)

By default, Storybook is configured with every component from [shadcn/ui](https://ui.shadcn.com/), and allows you to interact with them. It is also configured with the relevant fonts and higher-order components to ensure a consistent experience between your application and Storybook.

## [Running the workshop](#running-the-workshop)

Storybook will start automatically when you run `pnpm dev`. You can also start it independently with `pnpm dev --filter storybook`. The preview will be available at [localhost:6006](http://localhost:6006).

## [Adding stories](#adding-stories)

You can add your own components to the workshop by adding them to the `apps/storybook/stories` directory. Each component should have its own `.stories.tsx` file.

### On this page

[Configuration](#configuration)[Running the workshop](#running-the-workshop)[Adding stories](#adding-stories)

[GitHubEdit this page on GitHub](https://github.com/vercel/next-forge/edit/main/docs/content/docs/apps/storybook.mdx)Scroll to topGive feedbackCopy pageAsk AI about this pageOpen in chat

Vercel

Copyright Vercel 2025. All rights reserved.

Select language[GitHub](https://github.com/vercel/next-forge)