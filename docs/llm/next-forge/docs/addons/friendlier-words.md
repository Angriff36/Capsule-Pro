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

# Friendlier Words

A JavaScript package that creates friendly words to use in your app, handy for generating project names.

### [Installation](#installation)

To install `friendlier-words`, simply run the following command:

Terminal

```
pnpm add friendlier-words
```

### [Usage](#usage)

Here is an example of how to use `friendlier-words` for generating friendly words:

get-project-name.ts

```
import { friendlyWords } from 'friendlier-words';

// Default (2 segments, '-')
// e.g. robust-chicken, happy-cat, modest-pear
const words = friendlyWords();

// Custom (3 segments, '_')
// e.g. keen_explorer_oak, comforting_cactus_constructor, playful_tiger_breeze
const words = friendlyWords(3, '_');
```

### [Benefits](#benefits)

* **Easy to Use**: `friendlier-words` is easy to use and generates friendly words with a simple API.
* **Customizable**: You can customize the number of segments and the separator.

For more information and detailed documentation, visit the [`friendlier-words` GitHub repo](https://github.com/haydenbleasel/friendlier-words).

### On this page

[Installation](#installation)[Usage](#usage)[Benefits](#benefits)

[GitHubEdit this page on GitHub](https://github.com/vercel/next-forge/edit/main/docs/content/docs/addons/friendlier-words.mdx)Scroll to topGive feedbackCopy pageAsk AI about this pageOpen in chat

Vercel

Copyright Vercel 2025. All rights reserved.

Select language[GitHub](https://github.com/vercel/next-forge)