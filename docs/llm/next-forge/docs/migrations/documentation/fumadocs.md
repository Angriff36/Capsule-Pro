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

# Switch to Fumadocs

How to change the documentation provider to Fumadocs.

[Fumadocs](https://fumadocs.vercel.app) is a beautiful & powerful docs framework powered by Next.js, allowing advanced customisations.

## [1. Create a Fumadocs App](#1-create-a-fumadocs-app)

Fumadocs is similar to a set of libraries built on **Next.js App Router**, which works very differently from a hosted solution like Mintlify, or other frameworks/static site generator that takes complete control over your app.

To begin, you can use a command to initialize a Fumadocs app quicky:

Terminal

```
pnpm create fumadocs-app
```

Here we assume you have enabled Fumadocs MDX, Tailwind CSS, and without a default ESLint config.

### [What is a Content Source?](#what-is-a-content-source)

The input/source of your content, it can be a CMS, or local data layers like **Content Collections** and **Fumadocs MDX** (the official content source).

Fumadocs is designed carefully to allow a custom content source, there's also examples for [Sanity](https://github.com/fuma-nama/fumadocs-sanity) if you are interested.

`lib/source.ts` is where you organize code for content sources.

### [Update your Tailwind CSS](#update-your-tailwind-css)

Start the app with `pnpm dev`.

If some styles are missing, it could be due to your monorepo setup, you can change the `content` property in your Tailwind CSS config (`tailwind.config.mjs`) to ensure it works:

tailwind.config.mjs

```
export default {
  content: [
    // from
    './node_modules/fumadocs-ui/dist/**/*.js',
    // to
    '../../node_modules/fumadocs-ui/dist/**/*.js',

    './components/**/*.{ts,tsx}',
    // ...
  ],
};
```

You can either keep the Tailwind config file isolated to the docs, or merge it with your existing config from the `tailwind-config` package.

## [2. Migrate MDX Files](#2-migrate-mdx-files)

Fumadocs, same as Mintlify, utilize MDX for content files. You can move the `.mdx` files from your Mintlify app to `content/docs` directory.

Fumadocs requires a `title` frontmatter property.

The MDX syntax of Fumadocs is almost identical to Mintlify, despite from having different components and usage for code blocks. Visit [Markdown](https://fumadocs.vercel.app/docs/ui/markdown) for supported Markdown syntax.

### [Code Block](#code-block)

Code block titles are formatted with `title="Title"`.

#### [Before](#before)

Mintlify

```
```sh title="Name"
pnpm i
```
```

#### [After](#after)

Fumadocs

```
```sh title="title="Name""
pnpm i
```
```

Code highlighting is done with an inline comment.

#### [Before](#before-1)

Mintlify

```
```ts {1}
console.log('Highlighted');
```
```

#### [After](#after-1)

Fumadocs

```
```ts
console.log('Highlighted'); // [!code highlight]
```
```

In Fumadocs, you can also highlight specific words.

Fumadocs

```
console.log('Highlighted');
```

### [Code Groups](#code-groups)

For code groups, you can use the `Tabs` component:

#### [Before](#before-2)

Mintlify

```
<CodeGroup>

```ts title="Tab One"
console.log('Hello, world!');
```

```ts title="Tab Two"
console.log('Hello, world!');
```

</CodeGroup>
```

#### [After](#after-2)

Fumadocs

```
import { Tab, Tabs } from 'fumadocs-ui/components/tabs';

<Tabs items={["Tab 1", "Tab 2"]}>

```ts title="tab="Tab 1""
console.log('A');
```

```ts title="tab="Tab 2""
console.log('B');
```

</Tabs>
```

Fumadocs also has a built-in integration for TypeScript Twoslash, check it out in the [Setup Guide](https://fumadocs.vercel.app/docs/ui/twoslash).

### [Callout](#callout)

Fumadocs uses a generic `Callout` component for callouts, as opposed to Mintlify's specific ones.

#### [Before](#before-3)

Mintlify

```
<Note>Hello World</Note>
<Warning>Hello World</Warning>
<Info>Hello World</Info>
<Tip>Hello World</Tip>
<Check>Hello World</Check>
```

#### [After](#after-3)

Fumadocs

```
<Callout title="Title" type="info">Hello World</Callout>
<Callout title="Title" type="warn">Hello World</Callout>
<Callout title="Title" type="error">Hello World</Callout>
```

### [Adding Components](#adding-components)

To use components without import, add them to your MDX component.

app/docs/[[...slug]]/page.tsx

```
import { Tabs, Tab } from 'fumadocs-ui/components/tabs';

<MDX components={{ Tabs, Tab }} />;
```

## [3. Migrate `mint.json` File](#3-migrate-mintjson-file)

Instead of a single file, you can configure Fumadocs using code.

### [Sidebar Items](#sidebar-items)

The sidebar items are generated from your file system, Fumadocs takes `meta.json` as the configurations of a folder.
You don't need to hardcode the sidebar config manually.

For example, to customise the order of pages in `content/docs/components` folder, you can create a `meta.json` folder in the directory:

meta.json

```
{
  "title": "Components", // optional
  "pages": ["index", "apple"] // file names (without extension)
}
```

Fumadocs also support the rest operator (`...`) if you want to include the other pages.

meta.json

```
{
  "title": "Components", // optional
  "pages": ["index", "apple", "..."] // file names (without extension)
}
```

Visit the [Pages Organization Guide](https://fumadocs.vercel.app/docs/ui/page-conventions) for an overview of supported syntaxs.

### [Appearance](#appearance)

The overall theme can be customised using CSS variables and/or presets.

#### [CSS variables](#css-variables)

In your global CSS file:

global.css

```
:root {
  /* hsl values, like hsl(239 37% 50%) but without `hsl()` */
  --background: 239 37% 50%;

  /* Want a max width for docs layout? */
  --fd-layout-width: 1400px;
}

.dark {
  /* hsl values, like hsl(239 37% 50%) but without `hsl()` */
  --background: 239 37% 50%;
}
```

#### [Tailwind Presets](#tailwind-presets)

In your Tailwind config, use the `preset` option.

tailwind.config.mjs

```
import { createPreset } from 'fumadocs-ui/tailwind-plugin';

/** @type {import('tailwindcss').Config} */
export default {
  presets: [
    createPreset({
      preset: 'ocean',
    }),
  ],
};
```

See [all available presets](https://fumadocs.vercel.app/docs/ui/theme#presets).

### [Layout Styles](#layout-styles)

You can open `app/layout.config.tsx`, it contains the shared options for layouts.
Fumadocs offer a default **Docs Layout** for documentation pages, and **Home Layout** for other pages.

You can customise the layouts in `layout.tsx`.

### [Search](#search)

`app/api/search/route.ts` contains the Route Handler for search, it is powered by [Orama](https://orama.com) by default.

### [Navigation Links](#navigation-links)

Navigation links are passed to layouts, you can also customise them in your Layout config.

app/layout.config.tsx

```
import { BookIcon } from 'lucide-react';
import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared';

export const baseOptions: BaseLayoutProps = {
  links: [
    {
      icon: <BookIcon />,
      text: 'Blog',
      url: '/blog',
    },
  ],
};
```

See [all supported items](https://fumadocs.vercel.app/docs/ui/blocks/links).

## [Done](#done)

Now, you should be able to build and preview the docs.

Visit [Fumadocs](https://fumadocs.vercel.app/docs/ui) for details and additional features.

### On this page

[1. Create a Fumadocs App](#1-create-a-fumadocs-app)[What is a Content Source?](#what-is-a-content-source)[Update your Tailwind CSS](#update-your-tailwind-css)[2. Migrate MDX Files](#2-migrate-mdx-files)[Code Block](#code-block)[Before](#before)[After](#after)[Before](#before-1)[After](#after-1)[Code Groups](#code-groups)[Before](#before-2)[After](#after-2)[Callout](#callout)[Before](#before-3)[After](#after-3)[Adding Components](#adding-components)[3. Migrate `mint.json` File](#3-migrate-mintjson-file)[Sidebar Items](#sidebar-items)[Appearance](#appearance)[CSS variables](#css-variables)[Tailwind Presets](#tailwind-presets)[Layout Styles](#layout-styles)[Search](#search)[Navigation Links](#navigation-links)[Done](#done)

[GitHubEdit this page on GitHub](https://github.com/vercel/next-forge/edit/main/docs/content/docs/migrations/documentation/fumadocs.mdx)Scroll to topGive feedbackCopy pageAsk AI about this pageOpen in chat

Vercel

Copyright Vercel 2025. All rights reserved.

Select language[GitHub](https://github.com/vercel/next-forge)