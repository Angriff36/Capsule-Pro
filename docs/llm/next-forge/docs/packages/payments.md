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

# Payments

How next-forge handles payments and billing.

next-forge uses [Stripe](https://stripe.com/) by default for payments and billing. Implementing Stripe in your project is straightforward.

## [In-App Purchases](#in-app-purchases)

You can use Stripe anywhere in your app by importing the `stripe` object like so:

page.tsx {1,5}

```
import { stripe } from '@repo/payments';

// ...

await stripe.prices.list();
```

## [Webhooks](#webhooks)

next-forge has a pre-built webhook handler for payment events. Read more about [inbound payment webhooks](/en/packages/webhooks/inbound#payment-events).

## [Anti-Fraud](#anti-fraud)

As your app grows, you will inevitably encounter credit card fraud. [Stripe Radar](https://stripe.com/radar) is enabled by default if you integrate payments using their SDK as described above. This provides a set of tools to help you detect and prevent fraud.

Stripe Radar supports more [advanced anti-fraud features](https://docs.stripe.com/disputes/prevention/advanced-fraud-detection) if you embed the Stripe JS script in every page load. This is not enabled by default in next-forge, but you can add it as follows:

Edit `apps/app/app/layout.tsx` and add `<Script src="https://js.stripe.com/v3/" />` after the opening `<html>` tag and before the opening `<body>` tag. You will also need to add `import Script from 'next/script'`

{5, 13}

```
import '@repo/design-system/styles/globals.css';
import { DesignSystemProvider } from '@repo/design-system';
import { fonts } from '@repo/design-system/lib/fonts';
import type { ReactNode } from 'react';
import Script from 'next/script';

type RootLayoutProperties = {
  readonly children: ReactNode;
};

const RootLayout = ({ children }: RootLayoutProperties) => (
  <html lang="en" className={fonts} suppressHydrationWarning>
    <Script src="https://js.stripe.com/v3/" />
    <body>
      <DesignSystemProvider>{children}</DesignSystemProvider>
    </body>
  </html>
);

export default RootLayout;
```

Add the same script to the website in `apps/web/app/layout.tsx`.

Prevent common fraud patterns by using [Arcjet](/en/packages/security/application) [IP address analysis](https://docs.arcjet.com/reference/nextjs#ip-analysis) to [block requests from VPNs and proxies](https://docs.arcjet.com/blueprints/vpn-proxy-detection). These are commonly used by fraudsters to hide their location, but have legitimate uses as well so are not blocked by default. You could simply block these users, or you could adjust the checkout process to require approval before processing their payment.

For example, in `apps/app/app/(authenticated)/layout.tsx` you could add this after the call to `aj.protect()`:

```
import { redirect } from 'next/navigation';
// ...

if (
  decision.ip.isHosting() ||
  decision.ip.isVpn() ||
  decision.ip.isProxy() ||
  decision.ip.isRelay()
) {
  // The IP is from a hosting provider, VPN, or proxy. We can check the name
  // of the service and customize the response
  if (decision.ip.hasService()) {
    if (decision.ip.service !== 'Apple Private Relay') {
      // We trust Apple Private Relay because it requires an active iCloud
      // subscription, so deny all other VPNs
      redirect('/vpn-blocked');
    }
  } else {
    // The service name is not available, but we still think it's a VPN
    redirect('/vpn-blocked');
  }
}
```

In this case we are providing a friendly redirect to a page that explains why the user is being blocked (which you would need to create). You could also return a more generic error message. [See the Arcjet documentation](https://docs.arcjet.com/blueprints/payment-form#additional-checks) for more advanced examples.

### On this page

[In-App Purchases](#in-app-purchases)[Webhooks](#webhooks)[Anti-Fraud](#anti-fraud)

[GitHubEdit this page on GitHub](https://github.com/vercel/next-forge/edit/main/docs/content/docs/packages/payments.mdx)Scroll to topGive feedbackCopy pageAsk AI about this pageOpen in chat

Vercel

Copyright Vercel 2025. All rights reserved.

Select language[GitHub](https://github.com/vercel/next-forge)