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

# Switch to Auth.js

How to change the authentication provider to Auth.js.

next-forge support for Auth.js is currently blocked by [this issue](https://github.com/nextauthjs/next-auth/issues/11076).

Here's how to switch from Clerk to [Auth.js](https://authjs.dev/).

## [1. Replace the dependencies](#1-replace-the-dependencies)

Uninstall the existing Clerk dependencies from the `auth` package...

Terminal

```
pnpm remove @clerk/nextjs @clerk/themes @clerk/types --filter @repo/auth
```

... and install the Auth.js dependencies.

Terminal

```
pnpm add next-auth@beta --filter @repo/auth
```

## [2. Generate an Auth.js secret](#2-generate-an-authjs-secret)

Auth.js requires a random value secret, used by the library to encrypt tokens and email verification hashes. In each of the relevant app directories, generate a secret with the following command:

Terminal

```
cd apps/app && npx auth secret && cd -
cd apps/web && npx auth secret && cd -
cd apps/api && npx auth secret && cd -
```

This will automatically add an `AUTH_SECRET` environment variable to the `.env.local` file in each directory.

## [3. Replace the relevant files](#3-replace-the-relevant-files)

Delete the existing `client.ts` and `server.ts` files in the `auth` package. Then, create the following file:

packages/auth/index.ts

```
import NextAuth from "next-auth";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [],
});
```

## [4. Update the middleware](#4-update-the-middleware)

Update the `middleware.ts` file in the `auth` package with the following content:

packages/auth/middleware.ts

```
import 'server-only';

export { auth as authMiddleware } from './';
```

## [5. Update the auth components](#5-update-the-auth-components)

Auth.js has no concept of "sign up", so we'll use the `signIn` function to sign up users. Update both the `sign-in.tsx` and `sign-up.tsx` components in the `auth` package with the same content:

### [Sign In](#sign-in)

packages/auth/components/sign-in.tsx

```
import { signIn } from '../';

export const SignIn = () => (
  <form
    action={async () => {
      "use server";
      await signIn();
    }}
  >
    <button type="submit">Sign in</button>
  </form>
);
```

### [Sign Up](#sign-up)

packages/auth/components/sign-up.tsx

```
import { signIn } from '../';

export const SignUp = () => (
  <form
    action={async () => {
      "use server";
      await signIn();
    }}
  >
    <button type="submit">Sign up</button>
  </form>
);
```

## [6. Update the Provider file](#6-update-the-provider-file)

Auth.js has no concept of a Provider as a higher-order component, so you can either remove it entirely or just replace it with a stub, like so:

packages/auth/provider.tsx

```
import type { ReactNode } from 'react';

type AuthProviderProps = {
  children: ReactNode;
};

export const AuthProvider = ({ children }: AuthProviderProps) => children;
```

## [7. Create an auth route handler](#7-create-an-auth-route-handler)

In your `app` application, create an auth route handler file with the following content:

apps/app/api/auth/[...nextauth]/route.ts

```
import { handlers } from "@repo/auth"

export const { GET, POST } = handlers;
```

## [8. Update your apps](#8-update-your-apps)

From here, you'll need to replace any remaining Clerk implementations in your apps with Auth.js references. This means swapping out references like:

page.tsx

```
const { orgId } = await auth();
const { redirectToSignIn } = await auth();
const user = await currentUser();
```

Etcetera. Keep in mind that you'll need to build your own "organization" logic as Auth.js doesn't have a concept of organizations.

### On this page

[1. Replace the dependencies](#1-replace-the-dependencies)[2. Generate an Auth.js secret](#2-generate-an-authjs-secret)[3. Replace the relevant files](#3-replace-the-relevant-files)[4. Update the middleware](#4-update-the-middleware)[5. Update the auth components](#5-update-the-auth-components)[Sign In](#sign-in)[Sign Up](#sign-up)[6. Update the Provider file](#6-update-the-provider-file)[7. Create an auth route handler](#7-create-an-auth-route-handler)[8. Update your apps](#8-update-your-apps)

[GitHubEdit this page on GitHub](https://github.com/vercel/next-forge/edit/main/docs/content/docs/migrations/authentication/authjs.mdx)Scroll to topGive feedbackCopy pageAsk AI about this pageOpen in chat

Vercel

Copyright Vercel 2025. All rights reserved.

Select language[GitHub](https://github.com/vercel/next-forge)