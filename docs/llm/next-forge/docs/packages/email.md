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

# Transactional Emails

We use [Resend](https://resend.com/) to send transactional emails. The templates, located in `@repo/email`, are powered by [React Email](https://react.email/) - a collection of high-quality, unstyled components for creating beautiful emails using React and TypeScript.

## [Sending Emails](#sending-emails)

To send an email, you can use the `resend` object, which is imported from the `@repo/email` package:

apps/web/app/contact/actions/contact.tsx

```
import { resend } from '@repo/email';

await resend.emails.send({
  from: 'sender@acme.com',
  to: 'recipient@acme.com',
  subject: 'The email subject',
  text: 'The email text',
});
```

## [Email Templates](#email-templates)

The `email` package is separated from the app folder for two reasons:

1. We can import the templates into the `email` app, allowing for previewing them in the UI; and
2. We can import both the templates and the SDK into our other apps and use them to send emails.

Resend and React Email play nicely together. For example, here's how you can send a transactional email using a React email template:

apps/web/app/contact/actions/contact.tsx

```
import { resend } from '@repo/email';
import { ContactTemplate } from '@repo/email/templates/contact';

await resend.emails.send({
  from: 'sender@acme.com',
  to: 'recipient@acme.com',
  subject: 'The email subject',
  react: <ContactTemplate name={name} email={email} message={message} />,
});
```

## [Previewing Emails](#previewing-emails)

To preview the emails templates, simply run the [`email` app](/en/apps/email).

### On this page

[Sending Emails](#sending-emails)[Email Templates](#email-templates)[Previewing Emails](#previewing-emails)

[GitHubEdit this page on GitHub](https://github.com/vercel/next-forge/edit/main/docs/content/docs/packages/email.mdx)Scroll to topGive feedbackCopy pageAsk AI about this pageOpen in chat

Vercel

Copyright Vercel 2025. All rights reserved.

Select language[GitHub](https://github.com/vercel/next-forge)