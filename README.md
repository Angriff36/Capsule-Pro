# ▲ / next-forge

**Production-grade Turborepo template for Next.js apps.**

<div>
  <img src="https://img.shields.io/npm/dy/next-forge" alt="" />
  <img src="https://img.shields.io/npm/v/next-forge" alt="" />
  <img src="https://img.shields.io/github/license/vercel/next-forge" alt="" />
</div>

## Overview

[next-forge](https://github.com/vercel/next-forge) is a production-grade [Turborepo](https://turborepo.com) template for [Next.js](https://nextjs.org/) apps. It's designed to be a comprehensive starting point for building SaaS applications, providing a solid, opinionated foundation with minimal configuration required.

Built on a decade of experience building web applications, next-forge balances speed and quality to help you ship thoroughly-built products faster.

### Philosophy

next-forge is built around five core principles:

- **Fast** — Quick to build, run, deploy, and iterate on
- **Cheap** — Free to start with services that scale with you
- **Opinionated** — Integrated tooling designed to work together
- **Modern** — Latest stable features with healthy community support
- **Safe** — End-to-end type safety and robust security posture

## Demo

Experience next-forge in action:

- [Web](https://demo.next-forge.com) — Marketing website
- [App](https://app.demo.next-forge.com) — Main application
- [Storybook](https://storybook.demo.next-forge.com) — Component library
- [API](https://api.demo.next-forge.com/health) — API health check

## Features

next-forge comes with batteries included:

### Apps

- **Web** — Marketing site built with Tailwind CSS and TWBlocks
- **App** — Main application with authentication and database integration
- **API** — RESTful API with health checks and monitoring
- **Docs** — Documentation site powered by Mintlify
- **Email** — Email templates with React Email
- **Storybook** — Component development environment

### Packages

- **Authentication** — Powered by [Clerk](https://clerk.com)
- **Database** — Type-safe ORM with migrations
- **Design System** — Comprehensive component library with dark mode
- **Payments** — Subscription management via [Stripe](https://stripe.com)
- **Email** — Transactional emails via [Resend](https://resend.com)
- **Analytics** — Web ([Google Analytics](https://developers.google.com/analytics)) and product ([Posthog](https://posthog.com))
- **Observability** — Error tracking ([Sentry](https://sentry.io)), logging, and uptime monitoring ([BetterStack](https://betterstack.com))
- **Security** — Application security ([Arcjet](https://arcjet.com)), rate limiting, and secure headers
- **CMS** — Type-safe content management for blogs and documentation
- **SEO** — Metadata management, sitemaps, and JSON-LD
- **AI** — AI integration utilities
- **Webhooks** — Inbound and outbound webhook handling
- **Collaboration** — Real-time features with avatars and live cursors
- **Feature Flags** — Feature flag management
- **Cron** — Scheduled job management
- **Storage** — File upload and management
- **Internationalization** — Multi-language support
- **Notifications** — In-app notification system

## Getting Started

### Prerequisites

- Node.js 20+
- [pnpm](https://pnpm.io) (or npm/yarn/bun)
- [Stripe CLI](https://docs.stripe.com/stripe-cli) for local webhook testing

### Installation

Create a new next-forge project:

```sh
npx next-forge@latest init
```

### Setup

1. Configure your environment variables
2. Set up required service accounts (Clerk, Stripe, Resend, etc.)
3. Run the development server

For detailed setup instructions, read the [documentation](https://www.next-forge.com/docs).

## Structure

next-forge uses a monorepo structure managed by Turborepo:

```
next-forge/
├── apps/           # Deployable applications
│   ├── web/        # Marketing website (port 2222)
│   ├── app/        # Main application (port 2221)
│   ├── api/        # API server
│   ├── docs/       # Documentation
│   ├── email/      # Email templates
│   └── storybook/  # Component library
└── packages/       # Shared packages
    ├── design-system/
    ├── database/
    ├── auth/
    └── ...
```

Each app is self-contained and independently deployable. Packages are shared across apps for consistency and maintainability.

## Documentation

Full documentation is available at [next-forge.com/docs](https://www.next-forge.com/docs), including:

- Detailed setup guides
- Package documentation
- Migration guides for swapping providers
- Deployment instructions
- Examples and recipes

## Convoy Specific information

Convoy is an attempt to salvage previous projects that were all attempting to build a comprehensive enterprise catering management software suite. They all had various failures and they can all be found within C:\Projects\respective_project_name ie C:\projects\capsule



# Notes: Convoy Salvage Sources

## Sources

### Capsule
- Key: Supabase schema contract and migrations across tenant_* schemas.
- Artifacts: `supabase/Schema Contract v2.txt`, `supabase/migrations/`.
**Failure cause: horrible looking ui but had strong backend setup**

### Shift-Stream
- Key: Scheduling data model (companies, users, venues, shifts, time off).
- Artifacts: `shared/schema.ts`.
**Failure cause: Built with replit, worked and looked great, hard to port**

### Battle-Boards
- Key: CSV + TPP PDF parsing; print-ready battle board UI.
- Artifacts: `shared/` parsers, `Event-Battle-Board/src/`.
**Failure cause: incomplete functionality with autofilling fields, should be combined with Mikes module for similar functionality**

### Kitchen-Manager-Module
- Key: Event/run-report JSON schemas, policies.
- Artifacts: `schemas/event.schema.json`, `schemas/runreport.schema.json`.
**Failure cause: part of Mikes module, incomplete**

### Mikes Module
- Key: PDF parsing pipeline + allergen/policy configs + review flow.
- Artifacts: `kitchen-prep-app/src/lib/`, `config/`.
**Failure cause: dont remember, was mostly complete but not sure where the functionality is now**

### PrepChefApp
- Key: Prep lists, recipes, tasks, event integration; mobile-first workflows.
**Original iteration, had some good ideas but implementation was awful. but it did kind of work. was being built under the impression it was a mobile app, didnt realize i was building it as a web app accidentally**

### caterkingapp
- Key: OpenAPI contracts for prep lists, recipes, events, tasks, CRM.
- Artifacts: `specs/001-catering-ops-platform/contracts/*.yaml`.
**Failure cause: started over because i realized i was building a web app for the kitchen aspect instead of a mobile app. has a good spec and guardrails**

### codemachine
- Key: Monorepo blueprint + system scope inventory.
**Failure cause: experimental program that tries to oneshot complex designs. Spent millions of tokens designing enterprise grade architecture i dont even understand but i couldnt get  it to actually all work together in a usable ai. worth revisiting**

### hq-operations
- Key: Module separation and integration diagrams.
**Failure cause: just was an attempt to create a headquarters module for overseeing all  your modules.**

## Synthesized Findings

### Database + RLS
- Capsule contract is the most complete, enforceable multi-tenant model.
- Use SQL migrations to preserve RLS, audit, and realtime requirements.
- Current direction: shared DB with `tenant_id` (no per-tenant DBs).

### Realtime priorities
- Kitchen task claims/progress first.
- Events board second.
- Scheduling third.

### Modules to prioritize
- Events + Battle Boards (highest leverage, clear import pipeline).
- Kitchen tasks and prep lists (mobile + realtime).
- Scheduling (Shift-Stream model maps cleanly).

