<!-- BEGIN:nextjs-agent-rules -->
 
# Next.js: ALWAYS read docs before coding
 
Before any Next.js work, find and read the relevant doc in `node_modules/next/dist/docs/`. Your training data is outdated — the docs are the source of truth.
 
<!-- END:nextjs-agent-rules -->

## Capsule Pro — Agent Rules

This is a pnpm monorepo. Key constraints:

- **pnpm only** — no npm, no yarn
- **No `next/*` imports** in shared packages (`packages/`)
- **Manifest runtime**: all mutations compile to Manifest domain commands
- **IR is authority** — filesystem is not source of truth for routes
- **Prisma**: no foreign keys, Neon pooled connections
- **Biome** for linting/formatting (not ESLint, not Prettier)
- **Never edit generated files**

## Validation

- `pnpm --filter api typecheck`
- `pnpm --filter app typecheck`  
- `pnpm --filter api test`
- `pnpm --filter app test`
- `pnpm biome check`
- `pnpm turbo build --filter=app`
