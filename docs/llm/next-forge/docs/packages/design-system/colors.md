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

# Colors

CSS variables and how they work

next-forge makes use of the CSS variables offered by [shadcn/ui](https://ui.shadcn.com/). They're a brilliant way of abstracting the scaling and maintenance difficulties associated with [Dark Mode](/en/packages/design-system/dark-mode) and whitelabelling.

These colors have also been applied to other tools, such as the `AuthProvider`, to ensure that third-party components align with the application design as closely as possible.

## [Usage](#usage)

All default pages and components use these colors. You can also use them in your own components, like so:

component.tsx

```
export const MyComponent = () => (
  <div className="bg-background text-foreground border rounded-4xl shadow">
    <p>I'm using CSS Variables!</p>
  </div>
);
```

You can also access colors in JavaScript through the `tailwind` utility exported from `@repo/tailwind-config`, like so:

component.tsx

```
import { tailwind } from '@repo/tailwind-config';

export const MyComponent = () => (
  <div style={{
    background: tailwind.theme.colors.background,
    color: tailwind.theme.colors.muted.foreground,
  }}>
    <p>I'm using styles directly from the Tailwind config!</p>
  </div>
);
```

## [Caveats](#caveats)

Currently, it's not possible to change the Clerk theme to match the exact theme of the app. This is because Clerk's Theme doesn't accept custom CSS variables. We'd like to be able to add the following in the future:

packages/design-system/providers/clerk.tsx {4-15}

```
const variables: Theme['variables'] = {
  // ...

  colorBackground: 'hsl(var(--background))',
  colorPrimary: 'hsl(var(--primary))',
  colorDanger: 'hsl(var(--destructive))',
  colorInputBackground: 'hsl(var(--transparent))',
  colorInputText: 'hsl(var(--text-foreground))',
  colorNeutral: 'hsl(var(--neutral))',
  colorShimmer: 'hsl(var(--primary) / 10%)',
  colorSuccess: 'hsl(var(--success))',
  colorText: 'hsl(var(--text-foreground))',
  colorTextOnPrimaryBackground: 'hsl(var(--text-foreground))',
  colorTextSecondary: 'hsl(var(--text-muted-foreground))',
  colorWarning: 'hsl(var(--warning))',
};
```

### On this page

[Usage](#usage)[Caveats](#caveats)

[GitHubEdit this page on GitHub](https://github.com/vercel/next-forge/edit/main/docs/content/docs/packages/design-system/colors.mdx)Scroll to topGive feedbackCopy pageAsk AI about this pageOpen in chat

Vercel

Copyright Vercel 2025. All rights reserved.

Select language[GitHub](https://github.com/vercel/next-forge)