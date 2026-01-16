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

# Switch to Hypertune

How to change the feature flag provider to Hypertune.

[Hypertune](https://www.hypertune.com/) is the most flexible platform for feature flags, A/B testing, analytics and app configuration. Built with full end-to-end type-safety, Git version control and local, synchronous, in-memory flag evaluation. Optimized for TypeScript, React and Next.js.

Here's how to switch your next-forge project to use Hypertune for feature flags!

## [1. Create a new Hypertune project](#1-create-a-new-hypertune-project)

Go to Hypertune and create a new project using the [next-forge template](https://app.hypertune.com/?new_project=1&new_project_template=next-forge). Then go to the Settings page of your project and copy the main token.

## [2. Update the environment variables](#2-update-the-environment-variables)

Update the environment variables across the project. For example:

apps/app/.env

```
// Add this:
NEXT_PUBLIC_HYPERTUNE_TOKEN=""
```

Add a `.env` file to the `feature-flags` package with the following contents:

packages/feature-flags/.env

```
NEXT_PUBLIC_HYPERTUNE_TOKEN=""
HYPERTUNE_FRAMEWORK=nextApp
HYPERTUNE_OUTPUT_DIRECTORY_PATH=generated
HYPERTUNE_PLATFORM=vercel
HYPERTUNE_GET_HYPERTUNE_IMPORT_PATH=../lib/getHypertune
```

## [3. Update the `keys.ts` file in the `feature-flags` package](#3-update-the-keysts-file-in-the-feature-flags-package)

Use the `NEXT_PUBLIC_HYPERTUNE_TOKEN` environment variable in the call to `createEnv`:

packages/feature-flags/keys.ts {6-8,14}

```
import { createEnv } from '@t3-oss/env-nextjs';
import { z } from 'zod';

export const keys = () =>
  createEnv({
    client: {
      NEXT_PUBLIC_HYPERTUNE_TOKEN: z.string().min(1),
    },
    server: {
      FLAGS_SECRET: z.string().optional(),
    },
    runtimeEnv: {
      FLAGS_SECRET: process.env.FLAGS_SECRET,
      NEXT_PUBLIC_HYPERTUNE_TOKEN: process.env.NEXT_PUBLIC_HYPERTUNE_TOKEN,
    },
  });
```

## [4. Swap out the required dependencies](#4-swap-out-the-required-dependencies)

First, delete the `create-flag.ts` file.

Then, uninstall the existing dependencies from the `feature-flags` package:

Terminal

```
pnpm remove @repo/analytics --filter @repo/feature-flags
```

Then, install the new dependencies:

Terminal

```
pnpm add hypertune server-only --filter @repo/feature-flags
```

## [5. Set up Hypertune code generation](#5-set-up-hypertune-code-generation)

Add `analyze` and `build` scripts to the `package.json` file for the `feature-flags` package, which both execute the `hypertune` command:

packages/feature-flags/package.json

```
{
  "scripts": {
    "analyze": "hypertune",
    "build": "hypertune"
  }
}
```

Then run code generation with the following command:

Terminal

```
pnpm build --filter @repo/feature-flags
```

This will generate the following files:

```
packages/feature-flags/generated/hypertune.ts
packages/feature-flags/generated/hypertune.react.tsx
packages/feature-flags/generated/hypertune.vercel.tsx
```

## [6. Set up Hypertune client instance](#6-set-up-hypertune-client-instance)

Add a `getHypertune.ts` file in the `feature-flags` package which defines a `getHypertune` function that returns an initialized instance of the Hypertune SDK on the server:

packages/feature-flags/lib/getHypertune.ts

```
import 'server-only';
import { auth } from '@repo/auth/server';
import { unstable_noStore as noStore } from 'next/cache';
import type { ReadonlyHeaders } from 'next/dist/server/web/spec-extension/adapters/headers';
import type { ReadonlyRequestCookies } from 'next/dist/server/web/spec-extension/adapters/request-cookies';
import { createSource } from '../generated/hypertune';
import { getVercelOverride } from '../generated/hypertune.vercel';
import { keys } from '../keys';

const hypertuneSource = createSource({
  token: keys().NEXT_PUBLIC_HYPERTUNE_TOKEN,
});

export default async function getHypertune(params?: {
  headers?: ReadonlyHeaders;
  cookies?: ReadonlyRequestCookies;
}) {
  noStore();
  await hypertuneSource.initIfNeeded(); // Check for flag updates

  const { userId, orgId, sessionId } = await auth();

  // Respect flag overrides set by the Vercel Toolbar
  hypertuneSource.setOverride(await getVercelOverride());

  return hypertuneSource.root({
    args: {
      context: {
        environment: process.env.NODE_ENV,
        user: { id: userId ?? '', sessionId: sessionId ?? '' },
        org: { id: orgId ?? '' },
      },
    },
  });
}
```

## [7. Update `index.ts`](#7-update-indexts)

Hypertune automatically generates feature flag functions that use the `flags` package. To export them the same way as before, update the `index.ts` file to export everything from the `generated/hypertune.vercel.ts` file:

packages/feature-flags/index.ts

```
export * from "./generated/hypertune.vercel.tsx"
```

Hypertune adds a `Flag` suffix to all these generated feature flag functions, so you will need to update flag usages with this, e.g. `showBetaFeature` => `showBetaFeatureFlag`.

## [8. Add more feature flags](#8-add-more-feature-flags)

To add more feature flags, create them in the Hypertune UI and then re-run code generation. They will be automatically added to your generated files.

### On this page

[1. Create a new Hypertune project](#1-create-a-new-hypertune-project)[2. Update the environment variables](#2-update-the-environment-variables)[3. Update the `keys.ts` file in the `feature-flags` package](#3-update-the-keysts-file-in-the-feature-flags-package)[4. Swap out the required dependencies](#4-swap-out-the-required-dependencies)[5. Set up Hypertune code generation](#5-set-up-hypertune-code-generation)[6. Set up Hypertune client instance](#6-set-up-hypertune-client-instance)[7. Update `index.ts`](#7-update-indexts)[8. Add more feature flags](#8-add-more-feature-flags)

[GitHubEdit this page on GitHub](https://github.com/vercel/next-forge/edit/main/docs/content/docs/migrations/flags/hypertune.mdx)Scroll to topGive feedbackCopy pageAsk AI about this pageOpen in chat

Vercel

Copyright Vercel 2025. All rights reserved.

Select language[GitHub](https://github.com/vercel/next-forge)