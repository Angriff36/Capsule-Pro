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

next-forge offers a default component library by shadcn/ui

next-forge contains a design system out of the box powered by [shadcn/ui](https://ui.shadcn.com/).

## [Default configuration](#default-configuration)

shadcn/ui has been configured by default to use the "New York" style, Tailwind's `neutral` color palette and CSS variables. You can customize the component configuration in `@repo/design-system`, specifically the `components.json` file. All components have been installed and are regularly updated.

## [Installing components](#installing-components)

To install a new component, use the `shadcn` CLI from the root:

Terminal

```
npx shadcn@latest add select -c packages/design-system
```

This will install the component into the Design System package.

## [Updating components](#updating-components)

To update shadcn/ui, you can run the following command from the root:

Terminal

```
npx shadcn@latest add --all --overwrite -c packages/design-system
```

We also have a dedicated command for this. Read more about [updates](/en/docs/updates).

## [Changing libraries](#changing-libraries)

If you prefer a different component library, you can replace it at any time with something similar, such as Tailwind's [Catalyst](https://catalyst.tailwindui.com/).

### On this page

[Default configuration](#default-configuration)[Installing components](#installing-components)[Updating components](#updating-components)[Changing libraries](#changing-libraries)

[GitHubEdit this page on GitHub](https://github.com/vercel/next-forge/edit/main/docs/content/docs/packages/design-system/components.mdx)Scroll to topGive feedbackCopy pageAsk AI about this pageOpen in chat

Vercel

Copyright Vercel 2025. All rights reserved.

Select language[GitHub](https://github.com/vercel/next-forge)