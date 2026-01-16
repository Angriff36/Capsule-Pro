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

# Dub

How to add link tracking to your app with Dub.

While next-forge does not come with link tracking and analytics out of the box, you can easily add it to your app with [Dub](https://dub.co/).

## [Overview](#overview)

Dub is an open-source link tracking and analytics platform that allows you to track the performance of your links and see how they're performing. It comes with a suite of features that make it a great choice for marketing teams, including link shortening, custom domains, branded QR codes, and more.

## [Signing up](#signing-up)

You can sign up for a Dub account [on their website](https://app.dub.co/register).

![/images/dub-register.png](/_next/image?url=%2F_next%2Fstatic%2Fmedia%2Fdub-register.4c72f8c0.png&w=3840&q=75&dpl=dpl_GNYDMquaXuMtnLzfKfMsTquZJvC1)

## [Creating a link](#creating-a-link)

Once you've signed up, you can create a link by clicking the "Create Link" button in the top right corner.

![/images/dub-create.png](/_next/image?url=%2F_next%2Fstatic%2Fmedia%2Fdub-create.7b83e3a0.png&w=3840&q=75&dpl=dpl_GNYDMquaXuMtnLzfKfMsTquZJvC1)

## [Adding link tracking to your app](#adding-link-tracking-to-your-app)

From here, simply replace all `href` values with the Dub link!

```
<a href="https://dub.co/example">Example</a>
<Link href="https://dub.co/example">Example</Link>
```

## [Interfacing programmatically](#interfacing-programmatically)

Dub provides a simple SDK for creating links, managing customers, tracking leads and more. You can install it with:

Terminal

```
pnpm add dub
```

For more information on the SDK, you can refer to the [official documentation](https://dub.co/docs/api-reference/introduction).

### On this page

[Overview](#overview)[Signing up](#signing-up)[Creating a link](#creating-a-link)[Adding link tracking to your app](#adding-link-tracking-to-your-app)[Interfacing programmatically](#interfacing-programmatically)

[GitHubEdit this page on GitHub](https://github.com/vercel/next-forge/edit/main/docs/content/docs/addons/dub.mdx)Scroll to topGive feedbackCopy pageAsk AI about this pageOpen in chat

Vercel

Copyright Vercel 2025. All rights reserved.

Select language[GitHub](https://github.com/vercel/next-forge)