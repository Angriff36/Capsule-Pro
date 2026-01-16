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

# Switch to Content Collections

How to switch to Content Collections.

It's possible to switch to [Content Collections](https://www.content-collections.dev/) to generate type-safe data collections from MDX files. This approach provides a structured way to manage blog posts while maintaining full type safety throughout your application.

## [1. Swap out the required dependencies](#1-swap-out-the-required-dependencies)

Remove the existing dependencies...

Terminal

```
pnpm remove basehub --filter @repo/cms
```

... and install the new dependencies...

Terminal

```
pnpm add @content-collections/mdx fumadocs-core --filter @repo/cms
pnpm add -D @content-collections/cli @content-collections/core @content-collections/next --filter @repo/cms
```

## [2. Update the `.gitignore` file](#2-update-the-gitignore-file)

Add `.content-collections` to the root `.gitignore` file (in the root of your monorepo):

.gitignore

```
# content-collections
.content-collections
```

## [3. Modify the CMS package scripts](#3-modify-the-cms-package-scripts)

Now we need to modify the CMS package scripts to replace the `basehub` commands with `content-collections`.

packages/cms/package.json {3-5}

```
{
  "scripts": {
    "dev": "content-collections build",
    "build": "content-collections build",
    "analyze": "content-collections build"
  },
}
```

We're using the Content Collections CLI directly to generate the collections prior to Next.js processes. The files are cached and not rebuilt in the Next.js build process. This is a workaround for [this issue](https://github.com/sdorra/content-collections/issues/214).

## [4. Modify the relevant CMS package files](#4-modify-the-relevant-cms-package-files)

You may see TypeScript errors during this step. These will be resolved after you create your collections configuration and run the first build in step 6.

### [Next.js Config (CMS Package)](#nextjs-config-cms-package)

Update the CMS package's Next.js config to export the Content Collections wrapper:

packages/cms/next-config.ts

```
export { withContentCollections as withCMS } from '@content-collections/next';
```

This replaces the previous BaseHub configuration and maintains compatibility with your existing `next.config.ts` in the web app.

### [Collections](#collections)

packages/cms/index.ts

```
import { allPosts, allLegals } from 'content-collections';

export const blog = {
  postsQuery: null,
  latestPostQuery: null,
  postQuery: (slug: string) => null,
  getPosts: async () => allPosts,
  getLatestPost: async () =>
    allPosts.sort((a, b) => a.date.getTime() - b.date.getTime()).at(0),
  getPost: async (slug: string) =>
    allPosts.find(({ _meta }) => _meta.path === slug),
};

export const legal = {
  postsQuery: null,
  latestPostQuery: null,
  postQuery: (slug: string) => null,
  getPosts: async () => allLegals,
  getLatestPost: async () =>
    allLegals.sort((a, b) => a.date.getTime() - b.date.getTime()).at(0),
  getPost: async (slug: string) =>
    allLegals.find(({ _meta }) => _meta.path === slug),
};
```

### [Components](#components)

packages/cms/components/body.tsx

```
import { MDXContent } from '@content-collections/mdx/react';
import type { ComponentProps } from 'react';

type BodyProperties = Omit<ComponentProps<typeof MDXContent>, 'code'> & {
  content: ComponentProps<typeof MDXContent>['code'];
};

export const Body = ({ content, ...props }: BodyProperties) => (
  <MDXContent {...props} code={content} />
);
```

### [TypeScript Config](#typescript-config)

Update your `tsconfig.json` in the `apps/web` directory to add the path mapping:

apps/web/tsconfig.json

```
{
  "compilerOptions": {
    "paths": {
      "content-collections": ["./.content-collections/generated"]
    }
  }
}
```

Make sure to merge this with your existing `compilerOptions.paths` if you have any.

### [Toolbar](#toolbar)

packages/cms/components/toolbar.tsx

```
export const Toolbar = () => null;
```

### [Table of Contents](#table-of-contents)

packages/cms/components/toc.tsx

```
import { getTableOfContents } from 'fumadocs-core/server';

type TableOfContentsProperties = {
  data: string;
};

export const TableOfContents = async ({
  data,
}: TableOfContentsProperties) => {
  const toc = await getTableOfContents(data);

  return (
    <ul className="flex list-none flex-col gap-2 text-sm">
      {toc.map((item) => (
        <li
          key={item.url}
          style={{
            paddingLeft: `${item.depth - 2}rem`,
          }}
        >
          <a
            href={item.url}
            className="line-clamp-3 flex rounded-sm text-foreground text-sm underline decoration-foreground/0 transition-colors hover:decoration-foreground/50"
          >
            {item.title}
          </a>
        </li>
      ))}
    </ul>
  );
};
```

## [5. Update the `sitemap.ts` file](#5-update-the-sitemapts-file)

Update the `sitemap.ts` file to scan the `content` directory for MDX files:

apps/web/app/sitemap.ts

```
// ...

const blogs = fs
  .readdirSync('content/blog', { withFileTypes: true })
  .filter((file) => !file.isDirectory())
  .filter((file) => !file.name.startsWith('_'))
  .filter((file) => !file.name.startsWith('('))
  .map((file) => file.name.replace('.mdx', ''));

const legals = fs
  .readdirSync('content/legal', { withFileTypes: true })
  .filter((file) => !file.isDirectory())
  .filter((file) => !file.name.startsWith('_'))
  .filter((file) => !file.name.startsWith('('))
  .map((file) => file.name.replace('.mdx', ''));

// ...
```

## [6. Create your collections](#6-create-your-collections)

Create a new content collections configuration file in the `cms` package, then create a re-export file in the `web` app.

We're remapping the `title` field to `_title` and the `_meta.path` field to `_slug` to match the default next-forge CMS.

### [CMS Package](#cms-package)

packages/cms/collections.ts

```
import { defineCollection, defineConfig } from '@content-collections/core';
import { compileMDX } from '@content-collections/mdx';

const posts = defineCollection({
  name: 'posts',
  directory: 'content/blog', // relative to apps/web
  include: '**/*.mdx',
  schema: (z) => ({
    title: z.string(),
    description: z.string(),
    date: z.string(),
    image: z.string(),
    authors: z.array(z.string()),
    tags: z.array(z.string()),
  }),
  transform: async ({ title, ...page }, context) => {
    const body = await context.cache(page.content, async () =>
      compileMDX(context, page)
    );

    return {
      ...page,
      _title: title,
      _slug: page._meta.path,
      body,
    };
  },
});

const legals = defineCollection({
  name: 'legals',
  directory: 'content/legal', // relative to apps/web
  include: '**/*.mdx',
  schema: (z) => ({
    title: z.string(),
    description: z.string(),
    date: z.string(),
  }),
  transform: async ({ title, ...page }, context) => {
    const body = await context.cache(page.content, async () =>
      compileMDX(context, page)
    );

    return {
      ...page,
      _title: title,
      _slug: page._meta.path,
      body,
    };
  },
});

export default defineConfig({
  collections: [posts, legals],
});
```

### [Web App](#web-app)

Create a configuration file in the root of your `web` app:

apps/web/content-collections.ts

```
export { default } from '@repo/cms/collections';
```

After creating these files, you'll need to run `pnpm build` in the `packages/cms` directory to generate the types. TypeScript errors about missing `content-collections` module will resolve after the first build.

## [7. Create your content](#7-create-your-content)

Create the content directories if they don't exist:

* `apps/web/content/blog` for blog posts
* `apps/web/content/legal` for legal pages

To create a new blog post, add a new MDX file to the `apps/web/content/blog` directory. The file name will be used as the slug for the blog post and the frontmatter will be used to generate the blog post page. For example:

apps/web/content/blog/my-first-post.mdx

```
---
title: 'My First Post'
description: 'This is my first blog post'
date: 2024-10-23
image: /blog/my-first-post.png
---
```

The same concept applies to the `legal` collection, which is used to generate the legal policy pages. Also, the `image` field is the path relative to the app's root `public` directory.

## [8. Remove the environment variables](#8-remove-the-environment-variables)

Finally, remove all instances of `BASEHUB_TOKEN` from the `@repo/env` package.

## [9. Bonus features](#9-bonus-features)

### [Fumadocs MDX Plugins](#fumadocs-mdx-plugins)

You can use the [Fumadocs](/en/migrations/documentation/fumadocs) MDX plugins to enhance your MDX content.

{1-6,8-13,20-23}

```
import {
  type RehypeCodeOptions,
  rehypeCode,
  remarkGfm,
  remarkHeading,
} from 'fumadocs-core/mdx-plugins';

const rehypeCodeOptions: RehypeCodeOptions = {
  themes: {
    light: 'catppuccin-mocha',
    dark: 'catppuccin-mocha',
  },
};

const posts = defineCollection({
  // ...
  transform: async (page, context) => {
    // ...
    const body = await context.cache(page.content, async () =>
      compileMDX(context, page, {
        remarkPlugins: [remarkGfm, remarkHeading],
        rehypePlugins: [[rehypeCode, rehypeCodeOptions]],
      })
    );

    // ...
  },
});
```

### [Reading Time](#reading-time)

You can calculate reading time for your collection by adding a transform function.

{1,10}

```
import readingTime from 'reading-time';

const posts = defineCollection({
  // ...
  transform: async (page, context) => {
    // ...

    return {
      // ...
      readingTime: readingTime(page.content).text,
    };
  },
});
```

### [Low-Quality Image Placeholder (LQIP)](#low-quality-image-placeholder-lqip)

You can generate a low-quality image placeholder for your collection by adding a transform function.

{1,8-19,23,24}

```
import { sqip } from 'sqip';

const posts = defineCollection({
  // ...
  transform: async (page, context) => {
    // ...

    const blur = await context.cache(page._meta.path, async () =>
      sqip({
        input: `./public/${page.image}`,
        plugins: [
          'sqip-plugin-primitive',
          'sqip-plugin-svgo',
          'sqip-plugin-data-uri',
        ],
      })
    );

    const result = Array.isArray(blur) ? blur[0] : blur;

    return {
      // ...
      image: page.image,
      imageBlur: result.metadata.dataURIBase64 as string,
    };
  },
});
```

### On this page

[1. Swap out the required dependencies](#1-swap-out-the-required-dependencies)[2. Update the `.gitignore` file](#2-update-the-gitignore-file)[3. Modify the CMS package scripts](#3-modify-the-cms-package-scripts)[4. Modify the relevant CMS package files](#4-modify-the-relevant-cms-package-files)[Next.js Config (CMS Package)](#nextjs-config-cms-package)[Collections](#collections)[Components](#components)[TypeScript Config](#typescript-config)[Toolbar](#toolbar)[Table of Contents](#table-of-contents)[5. Update the `sitemap.ts` file](#5-update-the-sitemapts-file)[6. Create your collections](#6-create-your-collections)[CMS Package](#cms-package)[Web App](#web-app)[7. Create your content](#7-create-your-content)[8. Remove the environment variables](#8-remove-the-environment-variables)[9. Bonus features](#9-bonus-features)[Fumadocs MDX Plugins](#fumadocs-mdx-plugins)[Reading Time](#reading-time)[Low-Quality Image Placeholder (LQIP)](#low-quality-image-placeholder-lqip)

[GitHubEdit this page on GitHub](https://github.com/vercel/next-forge/edit/main/docs/content/docs/migrations/cms/content-collections.mdx)Scroll to topGive feedbackCopy pageAsk AI about this pageOpen in chat

Vercel

Copyright Vercel 2025. All rights reserved.

Select language[GitHub](https://github.com/vercel/next-forge)