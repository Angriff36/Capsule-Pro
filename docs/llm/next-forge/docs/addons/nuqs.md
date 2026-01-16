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

# NUQS

A powerful library for managing URL search parameters in your application. It provides a simple and efficient way to handle state management through URL search parameters.

### [Installation](#installation)

To install NUQS, simply run the following command:

Terminal

```
pnpm add nuqs
```

### [Usage](#usage)

Here is an example of how to use NUQS for URL search parameter state management:

my-component.tsx

```
import { useSearchParams } from 'nuqs';

function MyComponent() {
  const [searchParams, setSearchParams] = useSearchParams();

  const handleInputChange = (event) => {
    setSearchParams({ query: event.target.value });
  };

  return (
    <div>
      <input
        type="text"
        value={searchParams.query || ''}
        onChange={handleInputChange}
      />
      <p>Search Query: {searchParams.query}</p>
    </div>
  );
}
```

In this example, the `useSearchParams` hook from NUQS is used to manage the state of the search query through URL search parameters. The `setSearchParams` function updates the URL search parameters whenever the input value changes.

### [Benefits](#benefits)

* **Simplified State Management**: NUQS simplifies state management by using URL search parameters, making it easy to share and persist state across different parts of your application.
* **SEO-Friendly**: By using URL search parameters, NUQS helps improve the SEO of your application by making the state accessible through the URL.
* **Easy Integration**: NUQS is easy to integrate into your existing React application, providing a seamless experience for managing URL search parameters.

For more information and detailed documentation, visit the [NUQS website](https://nuqs.47ng.com/).

### On this page

[Installation](#installation)[Usage](#usage)[Benefits](#benefits)

[GitHubEdit this page on GitHub](https://github.com/vercel/next-forge/edit/main/docs/content/docs/addons/nuqs.mdx)Scroll to topGive feedbackCopy pageAsk AI about this pageOpen in chat

Vercel

Copyright Vercel 2025. All rights reserved.

Select language[GitHub](https://github.com/vercel/next-forge)