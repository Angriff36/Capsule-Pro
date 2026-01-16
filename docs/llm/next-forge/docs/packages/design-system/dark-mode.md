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

# Dark Mode

How to use dark mode in the design system.

next-forge comes with built-in dark mode support through the combination of [Tailwind CSS](https://tailwindcss.com/docs/dark-mode) and [next-themes](https://github.com/pacocoursey/next-themes).

## [Implementation](#implementation)

The dark mode implementation uses Tailwind's `darkMode: 'class'` strategy, which toggles dark mode by adding a `dark` class to the `html` element. This approach provides better control over dark mode and prevents flash of incorrect theme.

The `next-themes` provider is already configured in the application, handling theme persistence and system preference detection automatically. Third-party components like Clerk's Provider and Sonner have also been preconfigured to respect this setup.

## [Usage](#usage)

By default, each application theme will default to the user's operating system preference.

To allow the user to change theme manually, you can use the `ModeToggle` component which is located in the Design System package. We've already added it to the `app` sidebar and `web` navbar, but you can import it anywhere:

page.tsx

```
import { ModeToggle } from '@repo/design-system/components/mode-toggle';

const MyPage = () => (
  <ModeToggle />
);
```

You can check the theme by using the `useTheme` hook directly from `next-themes`. For example:

page.tsx

```
import { useTheme } from 'next-themes';

const MyPage = () => {
  const { resolvedTheme } = useTheme();

  return resolvedTheme === 'dark' ? 'Dark mode baby' : 'Light mode ftw';
}
```

### On this page

[Implementation](#implementation)[Usage](#usage)

[GitHubEdit this page on GitHub](https://github.com/vercel/next-forge/edit/main/docs/content/docs/packages/design-system/dark-mode.mdx)Scroll to topGive feedbackCopy pageAsk AI about this pageOpen in chat

Vercel

Copyright Vercel 2025. All rights reserved.

Select language[GitHub](https://github.com/vercel/next-forge)