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

# Installation

How to setup, install and run next-forge.

## [Initialization](#initialization)

Run the `next-forge` init command:

npmpnpmyarnbun

```
npx next-forge@latest init
```

You will be prompted for the project name and package manager.

Terminal

```
$ npx next-forge@latest init

┌  Let's start a next-forge project!
│
◇  What is your project named?
│  my-app
│
◇  Which package manager would you like to use?
│  pnpm
│
◇  Project initialized successfully!
│
└  Please make sure you install the Mintlify CLI and Stripe CLI before starting the project.
```

This will create a new directory with your project name and clone the repo into it. It will run a setup script to install dependencies and copy `.env` files. You can read more about environment variables [here](/en/docs/setup/env).

## [Database](#database)

You will need to scaffold the database using the schema defined in `packages/database/prisma/schema.prisma`:

npmpnpmyarnbun

```
npm run migrate
```

For more details on the default Prisma configuration (using Neon), refer to the [Database Configuration Guide](https://www.next-forge.com/packages/database#default-configuration).

## [CMS](#cms)

You will need to setup the CMS. Follow the instructions [here](/en/packages/cms/overview), but the summary is:

1. Fork the [`basehub/next-forge`](https://basehub.com/basehub/next-forge?fork=1) template
2. Get your Read Token from the "Connect to Your App" page
3. Add the `BASEHUB_TOKEN` to your [Environment Variables](/en/docs/setup/env)

## [Development](#development)

Run the development server with:

npmpnpmyarnbun

```
npm run dev
```

Open the localhost URLs with the relevant ports listed above to see the app, e.g.

* <http://localhost:3000/> — The main app.
* <http://localhost:3001/> — The website.
* <http://localhost:3002/> — The API.
* <http://localhost:3003/> — Email preview server.
* <http://localhost:3004/> — The docs

### On this page

[Initialization](#initialization)[Database](#database)[CMS](#cms)[Development](#development)

[GitHubEdit this page on GitHub](https://github.com/vercel/next-forge/edit/main/docs/content/docs/setup/installation.mdx)Scroll to topGive feedbackCopy pageAsk AI about this pageOpen in chat

Vercel

Copyright Vercel 2025. All rights reserved.

Select language[GitHub](https://github.com/vercel/next-forge)