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

# IP Geolocation

Accessing IP geolocation data in your application.

next-forge uses [Arcjet](https://arcjet.com) for [application security](/en/packages/security/application) which includes [IP details and geolocation information](https://docs.arcjet.com/reference/nextjs#ip-analysis) you can use in your application.

In the `app` application, Arcjet is called in the `apps/app/app/(authenticated)/layout.tsx` file which runs on every authenticated route.

For the `web` application, Arcjet is called in the middleware, which runs on every request except for static assets.

In both cases you could apply app-/website-wide rules based on the IP details, such as showing different content based on the user's location.

## [Accessing IP location data](#accessing-ip-location-data)

The IP details are available in the Arcjet decision object, which is returned from the all to `aj.protect()`. The IP location fields may be `undefined`, so you can use various utility functions to retrieve the data.

```
// ...
const decision = await aj.protect(req);

if (decision.ip.hasCity() && decision.ip.city === "San Francisco") {
  // Create a custom response for San Francisco
}

if (decision.ip.hasRegion() && decision.ip.region === "California") {
  // Create a custom response for California
}

if (decision.ip.hasCountry() && decision.ip.country === "US") {
  // Create a custom response for the United States
}

if (decision.ip.hasContinent() && decision.ip.continent === "NA") {
  // Create a custom response for North America
}
```

See the Arcjet [IP analysis reference](https://docs.arcjet.com/reference/nextjs#ip-analysis) for more information on the fields available.

## [Accessing IP details elsewhere](#accessing-ip-details-elsewhere)

Next.js does not allow passing data from [the root layout](https://nextjs.org/docs/app/building-your-application/routing/layouts-and-templates) or middleware to other pages in your application. To access the IP details in other parts of your application, you need to remove the Arcjet call from the root layout (`app`) or middleware (`web`) and call it in the specific page where you need the IP details.

See the Arcjet documentation on how to call `aj.protect()` in [route handlers](https://docs.arcjet.com/reference/nextjs#protect), [pages / server components](https://docs.arcjet.com/reference/nextjs#pages--page-components), and [server actions](https://docs.arcjet.com/reference/nextjs#server-actions).

If you remove the Arcjet call from `apps/app/app/(authenticated)/layout.tsx` or `middleware.ts` it will no longer run on every request. You will need to call `aj.protect()` everywhere you wish to apply Arcjet rules, even if you don't need the IP details.

### On this page

[Accessing IP location data](#accessing-ip-location-data)[Accessing IP details elsewhere](#accessing-ip-details-elsewhere)

[GitHubEdit this page on GitHub](https://github.com/vercel/next-forge/edit/main/docs/content/docs/packages/security/ip-geolocation.mdx)Scroll to topGive feedbackCopy pageAsk AI about this pageOpen in chat

Vercel

Copyright Vercel 2025. All rights reserved.

Select language[GitHub](https://github.com/vercel/next-forge)