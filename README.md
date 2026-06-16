# Capsule Pro

Monorepo for Capsule Pro — catering management platform.

## Prerequisites

- **Node.js** (see `.nvmrc`)
- **pnpm** (ONLY — no npm, no yarn)
- GitHub Packages auth (one-time): `pnpm config set //npm.pkg.github.com/:_authToken <PAT> --location=user`

```sh
pnpm install
```

## Development

### Web-Only (most common)

Run the web app (port 2221) and API (port 2223) together:

```sh
pnpm dev:web
```

Or run them individually in separate terminals:

```sh
pnpm dev:app   # web app on :2221
pnpm dev:api   # API on :2223
```

### Full Stack (includes mobile)

Only use this when working on the mobile app:

```sh
pnpm dev:apps  # app + api + mobile (Expo)
```

### All Services

Starts every app in parallel (app, api, web, docs, email, studio, mobile):

```sh
pnpm dev
```

### Dev Script Reference

| Script | What it runs | When to use |
|--------|-------------|-------------|
| `pnpm dev:app` | Web app (port 2221) | Frontend-only work |
| `pnpm dev:api` | API (port 2223) | Backend-only work |
| `pnpm dev:web` | App + API | Day-to-day web development |
| `pnpm dev:apps` | App + API + Mobile | Mobile feature work |
| `pnpm dev:mobile` | Expo dev server | Mobile-only (requires setup) |
| `pnpm dev` | Everything | Full stack / integration testing |
| `pnpm dev:check` | Env validation | First-time setup |

### Port Allocation

| Port | Service |
|------|---------|
| 2221 | Web app (`apps/app`) |
| 2222 | Content site (`apps/web`) |
| 2223 | API (`apps/api`) |
| 2224 | Docs (`apps/docs`) |
| 2225 | Email preview (`apps/email`) |
| 2226 | Convex dashboard (`npx convex dashboard`) |

## Validation

```sh
pnpm tsc --noEmit       # typecheck
pnpm lint                # lint (ultracite/biome)
pnpm lint:fix            # auto-fix lint issues
pnpm turbo build         # build all
pnpm test                # run tests
```

## Project Structure

```
apps/
  app/          # Next.js web app (main UI)
  api/          # Next.js API server
  mobile/       # Expo/React Native mobile app
  web/          # Marketing/content site
  docs/         # Documentation site
  email/        # Email template preview
  studio/       # (legacy) was Prisma Studio — deprecated, use Convex dashboard
  storybook/    # Component storybook

packages/       # Shared libraries (41 packages)
```

## Package Boundaries

Shared packages under `packages/` should be framework-agnostic:

- **No `next/*` imports** in shared packages (use dependency injection instead)
- **No `react-native` imports** in web apps (`apps/app`, `apps/api`)
- Framework-specific code belongs in `apps/` or dedicated adapter packages (e.g., `packages/next-config`)

See `AGENTS.md` for full operational guide.
