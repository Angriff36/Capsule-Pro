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

# Switch to Drizzle

How to change the ORM to Drizzle.

Drizzle is a brilliant, type-safe ORM growing quickly in popularity. If you want to switch to Drizzle, you have two options:

1. Keep Prisma and add the Drizzle API to the Prisma client. Drizzle have a [great guide](https://orm.drizzle.team/docs/prisma) on how to do this.
2. Go all-in and switch to Drizzle.

Here, we'll assume you have a working Neon database and cover the second option.

## [1. Swap out the required dependencies in `@repo/database`](#1-swap-out-the-required-dependencies-in-repodatabase)

Uninstall the existing dependencies...

Terminal

```
pnpm remove @prisma/adapter-neon @prisma/client prisma --filter @repo/database
```

...and install the new ones:

Terminal

```
pnpm add drizzle-orm --filter @repo/database
pnpm add -D drizzle-kit --filter @repo/database
```

## [2. Update the database connection code](#2-update-the-database-connection-code)

Delete everything in `@repo/database/index.ts` and replace it with the following:

packages/database/index.ts

```
import 'server-only';

import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import { env } from '@repo/env';

const client = neon(env.DATABASE_URL);

export const database = drizzle({ client });
```

## [3. Create a `drizzle.config.ts` file](#3-create-a-drizzleconfigts-file)

Next we'll create a Drizzle configuration file, used by Drizzle Kit and contains all the information about your database connection, migration folder and schema files. Create a `drizzle.config.ts` file in the `packages/database` directory with the following contents:

packages/database/drizzle.config.ts

```
import { defineConfig } from 'drizzle-kit';
import { env } from '@repo/env';

export default defineConfig({
  schema: './schema.ts',
  out: './',
  dialect: 'postgresql',
  dbCredentials: {
    url: env.DATABASE_URL,
  },
});
```

## [4. Generate the schema file](#4-generate-the-schema-file)

Drizzle uses a schema file to define your database tables. Rather than create one from scratch, we can generate it from the existing database. In the `packages/database` folder, run the following command to generate the schema file:

```
npx drizzle-kit pull
```

This should pull the schema from the database, creating a `schema.ts` file containing the table definitions and some other files.

## [5. Update your queries](#5-update-your-queries)

Now you can update your queries to use the Drizzle ORM.

For example, here's how we can update the `page` query in `app/(authenticated)/page.tsx`:

apps/app/app/(authenticated)/page.tsx {2, 7}

```
import { database } from '@repo/database';
import { page } from '@repo/database/schema';

// ...

const App = async () => {
  const pages = await database.select().from(page);

  // ...
};

export default App;
```

## [6. Remove Prisma Studio](#6-remove-prisma-studio)

You can also delete the now unused Prisma Studio app located at `apps/studio`:

Terminal

```
rm -fr apps/studio
```

## [7. Update the migration script in the root `package.json`](#7-update-the-migration-script-in-the-root-packagejson)

Change the migration script in the root `package.json` from Prisma to Drizzle. Update the `migrate` script to use Drizzle commands:

```
"scripts": {
  "db:migrate": "cd packages/database && npx drizzle-kit migrate"
  "db:generate": "cd packages/database && npx drizzle-kit generate"
  "db:pull": "cd packages/database && npx drizzle-kit pull"
}
```

### On this page

[1. Swap out the required dependencies in `@repo/database`](#1-swap-out-the-required-dependencies-in-repodatabase)[2. Update the database connection code](#2-update-the-database-connection-code)[3. Create a `drizzle.config.ts` file](#3-create-a-drizzleconfigts-file)[4. Generate the schema file](#4-generate-the-schema-file)[5. Update your queries](#5-update-your-queries)[6. Remove Prisma Studio](#6-remove-prisma-studio)[7. Update the migration script in the root `package.json`](#7-update-the-migration-script-in-the-root-packagejson)

[GitHubEdit this page on GitHub](https://github.com/vercel/next-forge/edit/main/docs/content/docs/migrations/database/drizzle.mdx)Scroll to topGive feedbackCopy pageAsk AI about this pageOpen in chat

Vercel

Copyright Vercel 2025. All rights reserved.

Select language[GitHub](https://github.com/vercel/next-forge)