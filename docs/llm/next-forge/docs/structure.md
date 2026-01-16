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

# Structure

Learn how next-forge apps and packages are structured.

next-forge is a monorepo, which means it contains multiple packages in a single repository. This is a common pattern for modern web applications, as it allows you to share code between different parts of the application, and manage them all together.

The monorepo is managed by [Turborepo](https://turborepo.com), which is a tool for managing monorepos. It provides a simple way to manage multiple packages in a single repository, and is designed to work with modern web applications.

## [Apps](#apps)

next-forge contains a number of [apps](/en/apps/api) that make up your project. Each app is a self-contained application that can be deployed independently.

While you can choose to run these apps on the subdomain of your choice, the recommended subdomains are listed on each page. Remember to add them to your [environment variables](/en/docs/setup/env) under `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_WEB_URL`, and `NEXT_PUBLIC_DOCS_URL`.

Each app should be self-contained and not depend on other apps. They should have an `env.ts` file at the root of the app that composes the environment variables from the packages it depends on.

## [Packages](#packages)

next-forge contains a number of shared packages that are used across the monorepo. The purpose of these packages is to isolate shared code from the main app, making it easier to manage and update.

Additionally, it makes it easier to swap out parts of the app for different implementations. For example, the `database` package contains everything related to the database, including the schema and migrations. This allows us to easily swap out the database provider or ORM without impacting other parts of the app.

Each package should be self-contained and not depend on other packages. They should export everything that is needed by the app — middleware, hooks, components and even the [environment variables](/en/docs/setup/env).

## [Boundaries](#boundaries)

next-forge uses [Turborepo's boundaries](https://turborepo.com/docs/reference/boundaries) to ensure that Turborepo features work correctly by checking for package manager Workspace violations.

You can run `pnpm run boundaries` to check for any violations.

### On this page

[Apps](#apps)[Packages](#packages)[Boundaries](#boundaries)

[GitHubEdit this page on GitHub](https://github.com/vercel/next-forge/edit/main/docs/content/docs/structure.mdx)Scroll to topGive feedbackCopy pageAsk AI about this pageOpen in chat

Vercel

Copyright Vercel 2025. All rights reserved.

Select language[GitHub](https://github.com/vercel/next-forge)