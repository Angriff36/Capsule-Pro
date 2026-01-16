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

# Switch to Paddle Billing

How to change the default payment processor to Paddle Billing.

[Paddle Billing](https://www.paddle.com/) is a merchant of record for selling digital products and subscriptions. It takes care of payments, global tax compliance, fraud prevention, localization, and subscriptions. Here's how to switch the default payment processor from Stripe to Paddle Billing.

This guide is for Paddle Billing, which is the latest version of Paddle. It doesn't include Paddle Classic.

## [1. Swap out the required dependencies](#1-swap-out-the-required-dependencies)

First, uninstall the existing dependencies from the Payments package...

Terminal

```
pnpm remove stripe --filter @repo/payments
```

... and install the new dependencies...

Terminal

```
pnpm add @paddle/paddle-node-sdk --filter @repo/payments
```

## [2. Update the Payment keys](#2-update-the-payment-keys)

Update the required Payment keys in the `packages/payments/keys.ts` file:

packages/payments/keys.ts

```
import { createEnv } from '@t3-oss/env-nextjs';
import { Environment } from '@paddle/paddle-node-sdk'
import { z } from 'zod';

export const keys = () =>
  createEnv({
    server: {
      PADDLE_SECRET_KEY: z.string().min(1),
      PADDLE_WEBHOOK_SECRET: z.string().optional(),
      PADDLE_ENV: z.enum([Environment.sandbox, Environment.production]).optional(),
    },
    client: {
      NEXT_PUBLIC_PADDLE_CLIENT_TOKEN: z
        .union([
          z.string().min(1).startsWith('live_'),
          z.string().min(1).startsWith('test_'),
        ]),
      NEXT_PUBLIC_PADDLE_ENV: z.enum([Environment.sandbox, Environment.production]).optional(),
    },
    runtimeEnv: {
      PADDLE_SECRET_KEY: process.env.PADDLE_SECRET_KEY,
      PADDLE_WEBHOOK_SECRET: process.env.PADDLE_WEBHOOK_SECRET,
      PADDLE_ENV: process.env.PADDLE_ENV,
      NEXT_PUBLIC_PADDLE_ENV: process.env.NEXT_PUBLIC_PADDLE_ENV,
      NEXT_PUBLIC_PADDLE_CLIENT_TOKEN: process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN,
    },
  });
```

## [3. Update the environment variables](#3-update-the-environment-variables)

Next, update the environment variables across the project, replacing the existing Stripe keys with the new Paddle keys:

apps/app/.env

```
# Server
PADDLE_SECRET_KEY=""
PADDLE_WEBHOOK_SECRET=""
PADDLE_ENV="sandbox"

# Client
NEXT_PUBLIC_PADDLE_ENV="sandbox"
NEXT_PUBLIC_PADDLE_CLIENT_TOKEN="test_"
```

## [4. Update the payments client](#4-update-the-payments-client)

Initialize the payments client in the `packages/payments/index.ts` file with the new API key.

packages/payments/index.ts

```
import 'server-only';
import { type Environment, Paddle } from '@paddle/paddle-node-sdk';
import { keys } from './keys';

const { PADDLE_SECRET_KEY, PADDLE_ENV } = keys();

export const paddle = new Paddle(PADDLE_SECRET_KEY, {
  environment: PADDLE_ENV,
});

export * from '@paddle/paddle-node-sdk';
```

## [5. Update the payments webhook handler](#5-update-the-payments-webhook-handler)

Update the webhook handler for Paddle:

apps/api/app/webhooks/payments/route.ts

```
import { env } from '@/env';
import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { paddle } from '@repo/payments';

export const POST = async (request: Request) => {
  try {
    const body = await request.text();
    const headerPayload = await headers();
    const signature = headerPayload.get('paddle-signature');

    if (!signature) {
      throw new Error('missing paddle-signature header');
    }

    const event = await paddle.webhooks.unmarshal(
      body,
      env.PADDLE_WEBHOOK_SECRET,
      signature
    );

    switch (event.eventType) {}

    return NextResponse.json({ result: event, ok: true });
  }
};
```

There's quite a lot you can do with Paddle, so check out the following resources for more information:

* [Webhooks Overview](https://developer.paddle.com/webhooks/respond-to-webhooks)
* [Signature Verification](https://developer.paddle.com/webhooks/signature-verification)
* [Simulate Webhooks](https://developer.paddle.com/webhooks/test-webhooks)

## [6. Create a Checkout hook](#6-create-a-checkout-hook)

Create a new file for `checkout` and install `paddle-js`:

Terminal

```
pnpm add @paddle/paddle-js --filter @repo/payments
```

Then, create a new hook to initialize Paddle in the `packages/payments/checkout.tsx` file:

packages/payments/checkout.tsx

```
'use client';

import {
  type Environments,
  type Paddle,
  initializePaddle,
} from '@paddle/paddle-js';
import { useEffect, useState } from 'react';
import { keys } from './keys';

const { NEXT_PUBLIC_PADDLE_CLIENT_TOKEN, NEXT_PUBLIC_PADDLE_ENV } = keys();

export function usePaddle() {
  const [paddle, setPaddle] = useState<Paddle>();

  useEffect(() => {
    initializePaddle({
      environment: NEXT_PUBLIC_PADDLE_ENV,
      token: NEXT_PUBLIC_PADDLE_CLIENT_TOKEN,
      checkout: {
        settings: {
          variant: 'one-page',
        },
      },
    }).then((paddleInstance: Paddle | undefined) => {
      if (paddleInstance) {
        setPaddle(paddleInstance);
      }
    });
  }, []);

  return paddle;
}
```

## [7. Use the Checkout hook](#7-use-the-checkout-hook)

Finally, open a checkout on your pricing page:

apps/web/app/pricing/page.tsx

```
'use client';

import { usePaddle } from '@repo/payments/checkout';

const Pricing = () => {
  const paddle = usePaddle();

  function openCheckout(priceId: string) {
    paddle?.Checkout.open({
      items: [
        {
          priceId,
          quantity: 1,
        },
      ],
    });
  }

  return (
    <Button
      className="mt-8 gap-4"
      onClick={() => openCheckout('pri_01jkzb4x1hc91s8w38cr3m86yy')}
    >
      Subscribe now <MoveRight className="h-4 w-4" />
    </Button>
  );
};

export default Pricing;
```

### On this page

[1. Swap out the required dependencies](#1-swap-out-the-required-dependencies)[2. Update the Payment keys](#2-update-the-payment-keys)[3. Update the environment variables](#3-update-the-environment-variables)[4. Update the payments client](#4-update-the-payments-client)[5. Update the payments webhook handler](#5-update-the-payments-webhook-handler)[6. Create a Checkout hook](#6-create-a-checkout-hook)[7. Use the Checkout hook](#7-use-the-checkout-hook)

[GitHubEdit this page on GitHub](https://github.com/vercel/next-forge/edit/main/docs/content/docs/migrations/payments/paddle.mdx)Scroll to topGive feedbackCopy pageAsk AI about this pageOpen in chat

Vercel

Copyright Vercel 2025. All rights reserved.

Select language[GitHub](https://github.com/vercel/next-forge)