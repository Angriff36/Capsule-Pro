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

# Switch to Turso

How to change the database provider to Turso.

[Turso](https://turso.tech) is multi-tenant database platform built for all types of apps, including AI apps with on-device RAG, local-first vector search, offline writes, and privacy-focused data access with low latency.

Here's how to switch from Neon to [Turso](https://turso.tech) for your `next-forge` project.

## [1. Sign up to Turso](#1-sign-up-to-turso)

You can use the [Dashboard](https://app.turso.tech), or the [CLI](https://docs.turso.tech/cli) to manage your account, database, and auth tokens.

*We'll be using the CLI throughout this guide.*

## [2. Create a Database](#2-create-a-database)

Create a new database and give it a name using the Turso CLI:

Terminal

```
turso db create <database-name>
```

You can now fetch the URL to the database:

Terminal

```
turso db show <database-name> --url
```

It will look something like this:

```
libsql://<database-name>-<account-or-org-slug>.turso.io
```

## [3. Create a Database Auth Token](#3-create-a-database-auth-token)

You will need to create an auth token to connect to your Turso database:

Terminal

```
turso db tokens create <database-name>
```

## [4. Update your environment variables](#4-update-your-environment-variables)

Update your environment variables to use the new Turso connection string:

apps/database/.env

```
DATABASE_URL="libsql://<database-name>-<account-or-org-slug>.turso.io"
DATABASE_AUTH_TOKEN="..."
```

apps/app/.env.local

```
DATABASE_URL="libsql://<database-name>-<account-or-org-slug>.turso.io"
DATABASE_AUTH_TOKEN="..."
```

Etcetera.

Now inside `packages/env/index.ts`, add `DATABASE_AUTH_TOKEN` to the `server` and `runtimeEnv` objects:

{3,12}

```
const server: Parameters<typeof createEnv>[0]["server"] = {
  // ...
  DATABASE_AUTH_TOKEN: z.string(),
  // ...
};

export const env = createEnv({
  client,
  server,
  runtimeEnv: {
    // ...
    DATABASE_AUTH_TOKEN: process.env.DATABASE_AUTH_TOKEN,
    // ...
  },
});
```

## [5. Install @libsql/client](#5-install-libsqlclient)

The [`@libsql/client`](https://www.npmjs.com/%40libsql/client) is used to connect to the hosted Turso database.

Uninstall the existing dependencies for Neon...

Terminal

```
pnpm remove @neondatabase/serverless @prisma/adapter-neon ws @types/ws --filter @repo/database
```

... and install the new dependencies for Turso & libSQL:

Terminal

```
pnpm add @libsql/client --filter @repo/database
```

## [6. Update the database connection code](#6-update-the-database-connection-code)

Open `packages/database/index.ts` and make the following changes:

packages/database/index.ts

```
import "server-only";

import { createClient } from "@libsql/client";
import { env } from "@repo/env";

const libsql = createClient({
  url: env.DATABASE_URL,
  authToken: env.DATABASE_AUTH_TOKEN,
});

export const database = libsql;
```

## [7. Apply schema changes](#7-apply-schema-changes)

Now connect to the Turso database using the CLI:

Terminal

```
turso db shell <database-name>
```

And apply the schema to the database:

```
CREATE TABLE pages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  name TEXT
);
```

## [8. Update application code](#8-update-application-code)

Now wherever you would usually call Prisma, use the `libsql` client instead:

packages/app/app/(authenticated)/page.tsx

```
import { database } from "@repo/database";

type PageType = {
  id: number;
  email: string;
  name?: string;
};

// ...

const { rows } = await database.execute(`SELECT * FROM pages`);

const pages = rows as unknown as Array<PageType>;
```

### On this page

[1. Sign up to Turso](#1-sign-up-to-turso)[2. Create a Database](#2-create-a-database)[3. Create a Database Auth Token](#3-create-a-database-auth-token)[4. Update your environment variables](#4-update-your-environment-variables)[5. Install @libsql/client](#5-install-libsqlclient)[6. Update the database connection code](#6-update-the-database-connection-code)[7. Apply schema changes](#7-apply-schema-changes)[8. Update application code](#8-update-application-code)

[GitHubEdit this page on GitHub](https://github.com/vercel/next-forge/edit/main/docs/content/docs/migrations/database/turso.mdx)Scroll to topGive feedbackCopy pageAsk AI about this pageOpen in chat

Vercel

Copyright Vercel 2025. All rights reserved.

Select language[GitHub](https://github.com/vercel/next-forge)