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

# Fuse.js

A powerful, lightweight fuzzy-search library, with zero dependencies.

### [Installation](#installation)

To install `fuse.js`, simply run the following command:

Terminal

```
pnpm add fuse.js
```

### [Usage](#usage)

Here is an example of how to use `fuse.js` for searching through an array of objects:

search.ts

```
import Fuse from 'fuse.js';

const data = [
  { id: 1, name: 'John Doe', email: 'john.doe@example.com' },
  { id: 2, name: 'Jane Doe', email: 'jane.doe@example.com' },
];

const fuse = new Fuse(data, {
  keys: ['name', 'email'],
  minMatchCharLength: 1,
  threshold: 0.3,
});

const results = fuse.search('john');

console.log(results);
```

### [Benefits](#benefits)

* `fuse.js` is easy to use and has a simple API.
* **Performant**: `fuse.js` is performant and has zero dependencies.

For more information and detailed documentation, visit the [`fuse.js` GitHub repo](https://github.com/krisk/fuse).

### On this page

[Installation](#installation)[Usage](#usage)[Benefits](#benefits)

[GitHubEdit this page on GitHub](https://github.com/vercel/next-forge/edit/main/docs/content/docs/addons/fuse.mdx)Scroll to topGive feedbackCopy pageAsk AI about this pageOpen in chat

Vercel

Copyright Vercel 2025. All rights reserved.

Select language[GitHub](https://github.com/vercel/next-forge)