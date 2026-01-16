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

# Zustand

A small, fast, and scalable bearbones state-management solution for React applications. It provides a simple and efficient way to manage state in your application.

### [Installation](#installation)

To install Zustand, run the following command:

Terminal

```
pnpm add zustand
```

### [Usage](#usage)

Here is an example of how to use Zustand for state management:

counter.tsx

```
import create from 'zustand';

const useStore = create((set) => ({
  count: 0,
  increment: () => set((state) => ({ count: state.count + 1 })),
  decrement: () => set((state) => ({ count: state.count - 1 })),
}));

function Counter() {
  const { count, increment, decrement } = useStore();

  return (
    <div>
      <h1>{count}</h1>
      <button onClick={increment}>Increment</button>
      <button onClick={decrement}>Decrement</button>
    </div>
  );
}
```

In this example, the `create` function from Zustand is used to create a store with a `count` state and `increment` and `decrement` actions. The `useStore` hook is then used in the `Counter` component to access the state and actions.

### [Benefits](#benefits)

* **Simple API**: Zustand provides a simple and intuitive API for managing state in your React application.
* **Performance**: Zustand is optimized for performance, making it suitable for large-scale applications.
* **Scalability**: Zustand is scalable and can be used to manage state in applications of any size.

For more information and detailed documentation, visit the [Zustand website](https://zustand.docs.pmnd.rs/guides/nextjs).

### On this page

[Installation](#installation)[Usage](#usage)[Benefits](#benefits)

[GitHubEdit this page on GitHub](https://github.com/vercel/next-forge/edit/main/docs/content/docs/addons/zustand.mdx)Scroll to topGive feedbackCopy pageAsk AI about this pageOpen in chat

Vercel

Copyright Vercel 2025. All rights reserved.

Select language[GitHub](https://github.com/vercel/next-forge)