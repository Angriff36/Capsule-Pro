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

# Updates

Built-in helpers to help you keep your project up to date.

## [Upgrading next-forge](#upgrading-next-forge)

As next-forge evolves, you may want to stay up to date with the latest changes. This can be difficult to do manually, so we've created a script to help you.

Terminal

```
npx next-forge@latest update
```

This will run our update script, which will guide you through the process of updating your project.

```
┌  Let's update your next-forge project!
│
│
◆  Select a version to update to:
│  ● v3.2.15
│  ○ v3.2.14
│  ○ v3.2.13
│  ○ v3.2.12
│  ○ v3.2.11
└
```

This will clone the latest version of next-forge into a temporary directory, apply the updates, and then copy the files over to your project. From here, you can commit the changes and push them to your repository.

Because next-forge is a boilerplate and not a library, you'll likely need to manually merge the changes you've made with the changes from the update.

## [Upgrading dependencies](#upgrading-dependencies)

You can upgrade all the dependencies in all your `package.json` files and installs the new versions with the `bump-deps` command:

Terminal

```
pnpm bump-deps
```

This will update all the dependencies in your `package.json` files and install the new versions.

You should run a `pnpm build` after running `bump-deps` to ensure the project builds correctly. You should also run `pnpm dev` and ensure the project runs correctly in runtime.

## [Upgrading shadcn/ui components](#upgrading-shadcnui-components)

You can upgrade all the shadcn/ui components in the [Design System](/en/packages/design-system/components) package with the `bump-ui` command:

Terminal

```
pnpm bump-ui
```

This will update all the shadcn/ui components, as well as the relevant dependencies in the Design System's `package.json` file.

This will override all customization you've made to the components. To avoid this happening, we recommend proxying the components into a new folder, such as `@repo/design-system/components`.

The `shadcn` CLI will likely make some unwanted changes to your shared Tailwind config file and global CSS. Make sure you review changes before committing them.

### On this page

[Upgrading next-forge](#upgrading-next-forge)[Upgrading dependencies](#upgrading-dependencies)[Upgrading shadcn/ui components](#upgrading-shadcnui-components)

[GitHubEdit this page on GitHub](https://github.com/vercel/next-forge/edit/main/docs/content/docs/updates.mdx)Scroll to topGive feedbackCopy pageAsk AI about this pageOpen in chat

Vercel

Copyright Vercel 2025. All rights reserved.

Select language[GitHub](https://github.com/vercel/next-forge)