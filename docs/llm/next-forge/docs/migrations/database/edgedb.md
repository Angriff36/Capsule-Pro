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

# Switch to EdgeDB

How to change the database provider to EdgeDB.

[EdgeDB](https://edgedb.com) is an open-source Postgres data layer designed to address major ergonomic SQL and relational schema modeling limitations while improving type safety and performance.

`next-forge` uses Neon as the database provider with Prisma as the ORM as well as Clerk for authentication. This guide will provide the steps you need to switch the database provider from Neon to EdgeDB.

For authentication, another guide will be provided to switch to EdgeDB Auth with access policies, social
auth providers, and more.

Here's how to switch from Neon to [EdgeDB](https://edgedb.com) for your `next-forge` project.

## [1. Create a new EdgeDB database](#1-create-a-new-edgedb-database)

Create an account at [EdgeDB Cloud](https://cloud.edgedb.com/). Once done, create a new instance (you can use EdgeDB's free tier). We'll later connect to it through the EdgeDB CLI.

## [2. Swap out the required dependencies in `@repo/database`](#2-swap-out-the-required-dependencies-in-repodatabase)

Uninstall the existing dependencies...

Terminal

```
pnpm remove @prisma/adapter-neon @prisma/client prisma --filter @repo/database
```

... and install the new dependencies:

Terminal

```
pnpm add edgedb @edgedb/generate
```

## [3. Setup EdgeDB in `@repo/database` package](#3-setup-edgedb-in-repodatabase-package)

In the `@repo/database` directory, run:

Terminal

```
npx edgedb project init --server-instance <org_name>/<instance_name> --non-interactive
```

Replace `<org_name>` and `<instance_name>` with the EdgeDB's organization and instance you've previously created in the EdgeDB Cloud.

The `init` command creates a new subdirectory called `dbschema`, which contains everything related to EdgeDB:

```
dbschema
├── default.esdl
└── migrations
```

This command also links your environment to the EdgeDB Cloud instance, allowing the EdgeDB client libraries to automatically connect to it without any additional configuration.

You can also delete `prisma/` directory from the `@repo/database`:

Terminal

```
rm -fr packages/database/prisma
```

## [4. Update the database connection code](#4-update-the-database-connection-code)

Update the database connection code to use an EdgeDB client:

packages/database/index.ts

```
import 'server-only';

import { createClient } from "edgedb";

export const database = createClient();
```

## [5. Update the schema file and generate types](#5-update-the-schema-file-and-generate-types)

Now, you can modify the database schema:

dbschema/default.esdl

```
module default {
  type Page {
    email: str {
      constraint exclusive;
    }
    name: str
  }
}
```

And apply your changes by running:

Terminal

```
npx migration create
npx migration apply
```

Once complete, you can also generate a TypeScript query builder and types from your database schema:

Terminal

```
npx @edgedb/generate edgeql-js
npx @edgedb/generate interfaces
```

These commands introspect the schema of your database and generate code in the `dbschema` directory.

## [6. Update your queries](#6-update-your-queries)

Now you can update your queries to use the EdgeDB client.

For example, here’s how we can update the `page` query in `app/(authenticated)/page.tsx`:

app/(authenticated)/page.tsx {2,7-8}

```
import { database } from '@repo/database';
import edgeql from '@repo/database/dbschema/edgeql-js';

// ...

const App = async () => {
  const pagesQuery = edgeql.select(edgeql.Page, () => ({ ...edgeql.Page['*'] }));
  const pages = await pagesQuery.run(database);

  // ...
};

export default App;
```

## [7. Replace Prisma Studio with EdgeDB UI](#7-replace-prisma-studio-with-edgedb-ui)

You can also delete the now unused Prisma Studio app located at `apps/studio`:

Terminal

```
rm -fr apps/studio
```

To manage your database and browse your data, you can run:

Terminal

```
npx edgedb ui
```

## [8. Extract EdgeDB environment variables for deployment](#8-extract-edgedb-environment-variables-for-deployment)

When deploying your app, you need to provide the `EDGEDB_SECRET_KEY` and `EDGEDB_INSTANCE` environment variables in your app's cloud provider to connect to your EdgeDB Cloud instance.

You can generate a dedicated secret key for your instance with `npx edgedb cloud secretkey create` or via the web UI's "Secret Keys" pane in your instance dashboard.

### On this page

[1. Create a new EdgeDB database](#1-create-a-new-edgedb-database)[2. Swap out the required dependencies in `@repo/database`](#2-swap-out-the-required-dependencies-in-repodatabase)[3. Setup EdgeDB in `@repo/database` package](#3-setup-edgedb-in-repodatabase-package)[4. Update the database connection code](#4-update-the-database-connection-code)[5. Update the schema file and generate types](#5-update-the-schema-file-and-generate-types)[6. Update your queries](#6-update-your-queries)[7. Replace Prisma Studio with EdgeDB UI](#7-replace-prisma-studio-with-edgedb-ui)[8. Extract EdgeDB environment variables for deployment](#8-extract-edgedb-environment-variables-for-deployment)

[GitHubEdit this page on GitHub](https://github.com/vercel/next-forge/edit/main/docs/content/docs/migrations/database/edgedb.mdx)Scroll to topGive feedbackCopy pageAsk AI about this pageOpen in chat

Vercel

Copyright Vercel 2025. All rights reserved.

Select language[GitHub](https://github.com/vercel/next-forge)