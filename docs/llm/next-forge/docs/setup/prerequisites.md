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

# Prerequisites

How to configure your development environment for next-forge.

## [Operating System](#operating-system)

next-forge is designed to work on macOS, Linux and Windows. While next-forge itself is platform-agnostic, the tooling and dependencies we use have different requirements.

We've tested and confirmed that next-forge works on the following combinations of operating systems, Node.js versions and next-forge versions:

| Operating system | next-forge version | Node.js version | Notes |
| --- | --- | --- | --- |
| macOS Sequoia 15.0.1 (24A348) | 2.14.3 | 20.12.2 |  |
| Ubuntu 24.04 Arm64 | 2.14.3 | 20.18.0 |  |
| Fedora, Release 41 | 2.14.3 | 22.11.0 |  |
| Windows 11 Pro 24H2 (26100.2033) | 2.14.3 | 20.18.0 | Turborepo only supports specific architectures. `windows ia32` is not supported. |

We're aware of issues on [non-Ubuntu Linux distributions](https://github.com/vercel/next-forge/issues/238). While we don't officially support them, we'd love to know if you get it working!

## [Package Manager](#package-manager)

next-forge defaults to using [pnpm](https://pnpm.io/) as a package manager, but you can use [npm](https://www.npmjs.com/), [yarn](https://yarnpkg.com/) or [bun](https://bun.sh/) instead by passing a flag during the [installation](/en/docs/setup/installation) step.

## [Stripe CLI](#stripe-cli)

We use the [Stripe CLI](https://docs.stripe.com/stripe-cli) to forward [payments webhooks](/en/packages/payments#webhooks) to your local machine.

Once installed, you can login to authenticate with your Stripe account.

Terminal

```
stripe login
```

## [Mintlify CLI](#mintlify-cli)

We use the [Mintlify CLI](https://mintlify.com/docs/development) to preview the [docs](/en/apps/docs) locally.

## [Accounts](#accounts)

next-forge relies on various SaaS products. You will need to create accounts with the following services then set the API keys in your [environment variables](/en/docs/setup/env):

* [Arcjet](https://arcjet.com), for [application security](/en/packages/security/application).
* [BetterStack](https://betterstack.com), for [logging](/en/packages/observability/logging) and [uptime monitoring](/en/packages/observability/uptime).
* [Clerk](https://clerk.com), for [authentication](/en/packages/authentication).
* [Google Analytics](https://developers.google.com/analytics), for [web analytics](/en/packages/analytics/web).
* [Posthog](https://posthog.com), for [product analytics](/en/packages/analytics/product).
* [Resend](https://resend.com), for [transactional emails](/en/packages/email).
* [Sentry](https://sentry.io), for [error tracking](/en/packages/observability/error-capture).
* [Stripe](https://stripe.com), for [payments](/en/packages/payments).

### On this page

[Operating System](#operating-system)[Package Manager](#package-manager)[Stripe CLI](#stripe-cli)[Mintlify CLI](#mintlify-cli)[Accounts](#accounts)

[GitHubEdit this page on GitHub](https://github.com/vercel/next-forge/edit/main/docs/content/docs/setup/prerequisites.mdx)Scroll to topGive feedbackCopy pageAsk AI about this pageOpen in chat

Vercel

Copyright Vercel 2025. All rights reserved.

Select language[GitHub](https://github.com/vercel/next-forge)