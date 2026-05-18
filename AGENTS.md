<!-- BEGIN:nextjs-agent-rules -->

# Next.js: ALWAYS read bundled docs before coding

Before any Next.js work, find and read the relevant doc in `node_modules/next/dist/docs/`.
Your training data is outdated — the docs are the source of truth.

## Capsule Pro Dev Server

- **App**: `http://localhost:2221` (Tailscale: `https://pop-os.tail78dd9e.ts.net`)
- **API**: `http://localhost:2223`
- **MCP endpoint**: `http://localhost:2221/_next/mcp` (Next.js 16+ built-in, SSE)

## MCP Tools (use mcporter)

```bash
# List available tools
mcporter list --http-url http://127.0.0.1:2221/_next/mcp --allow-http --name next-devtools

# Call a tool
mcporter call --http-url http://127.0.0.1:2221/_next/mcp --allow-http 'next-devtools.get_routes()'
mcporter call --http-url http://127.0.0.1:2221/_next/mcp --allow-http 'next-devtools.get_errors()'
mcporter call --http-url http://127.0.0.1:2221/_next/mcp --allow-http 'next-devtools.get_project_metadata()'
```

Available tools: `get_project_metadata`, `get_errors`, `get_page_metadata`, `get_logs`, `get_server_action_by_id`, `get_routes`

## Start Dev Server

```bash
cd /home/oc/projects/capsule-pro/apps/app
pnpm dev
```

Or with Infisical secrets (if keyring available):
```bash
cd /home/oc/projects/capsule-pro
source .env  # for INFISICAL_TOKEN
infisical run --projectId=d8319856-8caf-4c22-8717-57ab28b326b3 --env=dev --path=/apps/capsule-pro/app -- pnpm --filter app dev
```

<!-- END:nextjs-agent-rules -->

## Capsule Pro-Specific Rules

- All API routes go through `apps/app/lib/manifest/routes.ts` — do not bypass the manifest
- Auth: Clerk (`auth().protect()`) on all protected routes
- Prisma: no foreign keys, use flat keys, Decimal fields must be cast with `.toFixed(2)`
- No `.js` extensions in imports — use `.ts`/`.tsx` only
- Port 2221 for app, 2223 for API server
- Test via Tailscale HTTPS URL, not localhost