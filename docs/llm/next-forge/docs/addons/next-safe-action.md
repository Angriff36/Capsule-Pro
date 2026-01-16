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

# Next Safe Action

A powerful library for managing and securing your Next.js Server Actions.

## [Installation](#installation)

To install Next Safe Action, simply run the following command:

Terminal

```
pnpm add next-safe-action zod --filter app
```

By default, Next Safe Action uses Zod to validate inputs, but it also supports adapters for Valibot, Yup, and Typebox.

## [Basic Usage](#basic-usage)

Here is a basic example of how to use Next Safe Action to call your Server Actions:

### [Server Action](#server-action)

action.ts

```
"use server"

import { createSafeActionClient } from "next-safe-action";
import { z } from "zod";

export const serverAction = createSafeActionClient()
  .schema(
    z.object({
      name: z.string(),
      id: z.string()
    })
  )
  .action(async ({ parsedInput: { name, id } }) => {
    // Fetch data in server
    const data = await fetchData(name, id);

    // Write server logic here ...

    // Return here the value to the client
    return data;
  });
```

### [Client Component](#client-component)

my-component.tsx

```
"use client"

import { serverAction } from "./action"
import { useAction } from "next-safe-action/hooks";
import { toast } from "@repo/design-system/components/ui/sonner";

function MyComponent() {
  const { execute, isPending } = useAction(serverAction, {
    onSuccess() {
      // Display success message to client
      toast.success("Action Success");
    },
    onError({ error }) {
      // Display error message to client
      toast.error("Action Failed");
    },
  });

  const onClick = () => {
    execute({ name: "next-forge", id: "example" });
  };

  return (
    <div>
      <Button disabled={isPending} onClick={onClick}>
        Click to call action
      </Button>
    </div>
  );
}
```

In this example, we create an action with input validation on the server, and call it on the client to with type-safe inputs and convinient callback utilities to simplify state management and error handling.

## [Benefits](#benefits)

* **Simplified State Management**: Next Safe Action simplifies server action state management by providing callbacks and status utilities.
* **Type-safe**: By using Zod or other validation libraries, your inputs are type-safe and validated end-to-end.
* **Easy Integration**: Next Safe Action is extremely easy to integrate, and you can incrementally use more of its feature like optimistic updates and middlewares.

For more information and detailed documentation, visit the [Next Safe Action website](https://next-safe-action.dev).

### On this page

[Installation](#installation)[Basic Usage](#basic-usage)[Server Action](#server-action)[Client Component](#client-component)[Benefits](#benefits)

[GitHubEdit this page on GitHub](https://github.com/vercel/next-forge/edit/main/docs/content/docs/addons/next-safe-action.mdx)Scroll to topGive feedbackCopy pageAsk AI about this pageOpen in chat

Vercel

Copyright Vercel 2025. All rights reserved.

Select language[GitHub](https://github.com/vercel/next-forge)