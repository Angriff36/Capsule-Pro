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

# Configuration

The next-config package, explained

The `next-config` package is a configuration package for Next.js. It is used to configure the Next.js app and is located in the `packages/next-config` directory.

## [Images](#images)

The package configures Next.js image optimization to support AVIF and WebP formats. It also sets up remote patterns to allow loading images from Clerk securely (i.e. profile images).

## [Prisma](#prisma)

For server-side builds, the package includes the Prisma plugin which helps handle Prisma in a Next.js monorepo setup correctly.

## [Rewrites](#rewrites)

The package configures URL rewrites to handle PostHog analytics integration:

* `/ingest/static/:path*` routes to PostHog's static assets
* `/ingest/:path*` routes to the main PostHog ingestion endpoint
* `/ingest/decide` routes to PostHog's feature flags endpoint

It also enables `skipTrailingSlashRedirect` to properly support PostHog API requests with trailing slashes.

## [OpenTelemetry](#opentelemetry)

The package includes a fix for OpenTelemetry instrumentation warnings by configuring webpack to ignore warnings from `@opentelemetry/instrumentation` packages.

The configuration can optionally be wrapped with `withAnalyzer()` to enable bundle analysis capabilities.

### On this page

[Images](#images)[Prisma](#prisma)[Rewrites](#rewrites)[OpenTelemetry](#opentelemetry)

[GitHubEdit this page on GitHub](https://github.com/vercel/next-forge/edit/main/docs/content/docs/packages/next-config/overview.mdx)Scroll to topGive feedbackCopy pageAsk AI about this pageOpen in chat

Vercel

Copyright Vercel 2025. All rights reserved.

Select language[GitHub](https://github.com/vercel/next-forge)