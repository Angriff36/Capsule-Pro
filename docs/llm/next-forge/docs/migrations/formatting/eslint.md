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

# Switch to ESLint

How to change the default linter to ESLint.

Here's how to switch from Biome to [ESLint](https://eslint.org). In this example, we'll also add the Next.js and React plugins, as well as the new ESLint Flat Config.

## [1. Swap out the required dependencies](#1-swap-out-the-required-dependencies)

First, uninstall the existing dependencies from the root `package.json` file...

Terminal

```
pnpm remove -w @biomejs/biome ultracite
```

...and install the new ones:

Terminal

```
pnpm add -w -D eslint eslint-plugin-next eslint-plugin-react eslint-plugin-react-hooks typescript-eslint
```

## [2. Configure ESLint](#2-configure-eslint)

Delete the existing `biome.json` file in the root of the project, and create a new `eslint.config.mjs` file:

eslint.config.mjs

```
import react from 'eslint-plugin-react';
import next from '@next/eslint-plugin-next';
import hooks from 'eslint-plugin-react-hooks';
import ts from 'typescript-eslint'

export default [
  ...ts.configs.recommended,
  {
    ignores: ['**/.next'],
  },
  {
    files: ['**/*.ts', '**/*.tsx'],
    plugins: {
      react: react,
      'react-hooks': hooks,
      '@next/next': next,
    },
    rules: {
      ...react.configs['jsx-runtime'].rules,
      ...hooks.configs.recommended.rules,
      ...next.configs.recommended.rules,
      ...next.configs['core-web-vitals'].rules,
      '@next/next/no-img-element': 'error',
    },
  },
]
```

## [3. Install the ESLint VSCode extension](#3-install-the-eslint-vscode-extension)

This is generally installed if you selected "JavaScript" as a language to support when you first set up Visual Studio Code.

Install the [ESLint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint) VSCode extension to get linting and formatting support in your editor.

## [4. Update your `.vscode/settings.json` file](#4-update-your-vscodesettingsjson-file)

Add the following to your `.vscode/settings.json` file to match the following:

.vscode/settings.json

```
{
  "editor.codeActionsOnSave": {
    "source.fixAll": true,
    "source.fixAll.eslint": true
  },
  "editor.defaultFormatter": "dbaeumer.vscode-eslint",
  "editor.formatOnPaste": true,
  "editor.formatOnSave": true,
  "emmet.showExpandedAbbreviation": "never",
  "prettier.enable": true,
  "tailwindCSS.experimental.configFile": "./packages/tailwind-config/config.ts",
  "typescript.tsdk": "node_modules/typescript/lib"
}
```

## [5. Re-enable the `lint` script](#5-re-enable-the-lint-script)

As Next.js uses ESLint for linting, we can re-enable the `lint` script in the root `package.json` files. In each of the Next.js apps, update the `package.json` file to include the following:

apps/app/package.json {3}

```
{
  "scripts": {
    "lint": "next lint"
  }
}
```

### On this page

[1. Swap out the required dependencies](#1-swap-out-the-required-dependencies)[2. Configure ESLint](#2-configure-eslint)[3. Install the ESLint VSCode extension](#3-install-the-eslint-vscode-extension)[4. Update your `.vscode/settings.json` file](#4-update-your-vscodesettingsjson-file)[5. Re-enable the `lint` script](#5-re-enable-the-lint-script)

[GitHubEdit this page on GitHub](https://github.com/vercel/next-forge/edit/main/docs/content/docs/migrations/formatting/eslint.mdx)Scroll to topGive feedbackCopy pageAsk AI about this pageOpen in chat

Vercel

Copyright Vercel 2025. All rights reserved.

Select language[GitHub](https://github.com/vercel/next-forge)