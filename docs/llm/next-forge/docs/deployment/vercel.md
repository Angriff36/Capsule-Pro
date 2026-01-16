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

# Deploying to Vercel

How to deploy next-forge to Vercel.

To deploy next-forge on Vercel, you need to create 3 new projects for the `app`, `api` and `web` apps. After selecting your repository, change the Root Directory option to the app of choice e.g. `apps/app`. This should automatically detect the Next.js setup and as such, the build command and output directory.

Then, add all your environment variables to the project.

Finally, just hit "Deploy" and Vercel will take care of the rest!

Want to see it in action? next-forge is featured on the [Vercel Marketplace](https://vercel.com/templates/Next.js/next-forge) - try deploying the `app`:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?build-command=turbo+build&demo-description=Comprehensive+Turborepo+template+for+Next.js+apps.&demo-image=%2F%2Fimages.ctfassets.net%2Fe5382hct74si%2F2XyyD0ftVZoyj9fHabQB2G%2F8e5779630676c645214ddb3729d8ff96%2Fopengraph-image.png&demo-title=next-forge&demo-url=https%3A%2F%2Fwww.next-forge.com%2F&env=DATABASE_URL%2CRESEND_TOKEN%2CRESEND_FROM%2CCLERK_WEBHOOK_SECRET%2CSTRIPE_SECRET_KEY%2CSTRIPE_WEBHOOK_SECRET%2CBASEHUB_TOKEN%2CNEXT_PUBLIC_CLERK_SIGN_IN_URL%2CNEXT_PUBLIC_CLERK_SIGN_UP_URL%2CNEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL%2CNEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL%2CNEXT_PUBLIC_POSTHOG_KEY%2CNEXT_PUBLIC_POSTHOG_HOST%2CNEXT_PUBLIC_APP_URL%2CNEXT_PUBLIC_WEB_URL%2CNEXT_PUBLIC_DOCS_URL&envLink=https%3A%2F%2Fwww.next-forge.com%2Fdocs%2Fsetup%2Fprerequisites&from=templates&project-name=next-forge&repository-name=next-forge&repository-url=https%3A%2F%2Fgithub.com%2Fvercel%2Fnext-forge&root-directory=apps%2Fapp&skippable-integrations=1)

## [Environment variables](#environment-variables)

If you're deploying on Vercel, we recommend making use of the Team Environment Variables feature. Variables used by libraries need to exist in all packages and duplicating them can be a headache. Learn more about how [environment variables](/en/docs/setup/env) work in next-forge.

## [Integrations](#integrations)

We also recommend installing the [BetterStack](https://vercel.com/integrations/betterstack) and [Sentry](https://vercel.com/integrations/sentry) integrations. This will take care of the relevant [environment variables](/en/docs/setup/env).

### On this page

[Environment variables](#environment-variables)[Integrations](#integrations)

[GitHubEdit this page on GitHub](https://github.com/vercel/next-forge/edit/main/docs/content/docs/deployment/vercel.mdx)Scroll to topGive feedbackCopy pageAsk AI about this pageOpen in chat

Vercel

Copyright Vercel 2025. All rights reserved.

Select language[GitHub](https://github.com/vercel/next-forge)