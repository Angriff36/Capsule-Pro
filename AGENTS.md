# ⚠️ "BOARD" DISAMBIGUATION — READ BEFORE TOUCHING ANYTHING WITH "BOARD" IN THE NAME

Several UNRELATED features have "board" in the name. Agents repeatedly grab the WRONG
one (lazy substring match). When the user OR code says "board", STOP and identify WHICH
of these it is — never assume the nearest match:

| User's word | What it is | Entities / source | Where |
|---|---|---|---|
| **event tree** | the LIVE per-event card tree | `CommandBoard`, `CommandBoardCard`/`Group`/`Connection`/`Layout` (`tenant_events`) | `/events/{id}?tab=board` · `manifest/source/events/command-board-rules.manifest` |
| **command grid** | OLD deprecated grid + Ably realtime board, to be revived as the **global board** (future work) | (deprecated — NOT the `CommandBoard*` entities) | — |
| **battle board** | the per-event battle board | `BattleBoard`, `BoardProjection`, `BoardAnnotation` | `/events/battle-boards/…` |
| **kanban** | the admin task kanban | `AdminTask*`, `BoardConfig` (`tenant_admin`) | admin tasks |

RULES:
1. `CommandBoard*` = the **event tree**. It is NOT the battle board, NOT the kanban, NOT the (deprecated) command grid.
2. Never resolve "board" by proximity. Confirm against this table first.
3. If the user's intent is ambiguous, ASK which board — do not guess.

<!-- BEGIN:nextjs-agent-rules -->

# Next.js: ALWAYS read bundled docs before coding

Before any Next.js work, find and read the relevant doc in `node_modules/next/dist/docs/`.
Your training data is outdated — the docs are the source of truth.

## GraphRAG rule

For architecture/debugging tasks, run:

`powershell -NoProfile -ExecutionPolicy Bypass -File ./scripts/graphrag.ps1 "<task question>"`

Use the output to pick likely files, but prefer implementation files over package.json, generated files, and broad domain matches.

<!-- END:nextjs-agent-rules -->

You must also read the constitution.md and the planning with files documentation at "C:\Projects\capsule-pro\manifest\IMPLEMENTATION_PROMPT.md"
"C:\Projects\capsule-pro\manifest\notes.md"
"C:\Projects\capsule-pro\manifest\phase-out-registry.md"
"C:\Projects\capsule-pro\manifest\task_plan.md"
"C:\Projects\capsule-pro\manifest\AGENTS.md"

## Capsule Pro Dev Server

- **App**: `http://localhost:2221` (Tailscale: `https://pop-os.tail78dd9e.ts.net`)
- **API**: `http://localhost:2223`
- **MCP endpoint**: `http://localhost:2221/_next/mcp` (Next.js 16+ built-in, SSE)

## MCP Tools (use mcporter)

### Next.js devtools (HTTP, app must be running on 2221)

```bash
# List available tools
mcporter list --http-url http://127.0.0.1:2221/_next/mcp --allow-http --name next-devtools

# Call a tool
mcporter call --http-url http://127.0.0.1:2221/_next/mcp --allow-http 'next-devtools.get_routes()'
mcporter call --http-url http://127.0.0.1:2221/_next/mcp --allow-http 'next-devtools.get_errors()'
mcporter call --http-url http://127.0.0.1:2221/_next/mcp --allow-http 'next-devtools.get_project_metadata()'
```

Available tools: `get_project_metadata`, `get_errors`, `get_page_metadata`, `get_logs`, `get_server_action_by_id`, `get_routes`

### Manifest MCP (stdio, `@angriff36/manifest@2.4.2+`)

Project config: `.cursor/mcp.json` registers three stdio servers:

| Server | Command | Purpose |
|--------|---------|---------|
| `manifest` | `pnpm exec manifest-mcp` | Upstream compile / execute / validate / explain (from npm tarball) |
| `capsule-pro` | `pnpm --filter @repo/mcp-server start` | Tenant-scoped IR introspection, route resolution, governed queries |
| `capsule-pro-admin` | `pnpm --filter @repo/mcp-server start:admin` | Admin mode (future plugins) |

Manual start (outside Cursor):

```bash
pnpm manifest:mcp
# or: pnpm exec manifest-mcp
# or: npx --package @angriff36/manifest manifest-mcp
```

**Not** `npx @manifest/mcp-server` — that package was never published. Use `@angriff36/manifest` with the `manifest-mcp` bin.

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

## Capsule Pro-Specific Rules

- **Constitution**: `constitution.md` is the binding Manifest Integration Charter. All governed writes go through Manifest runtime. Reads bypass runtime. Read it before any architectural work.
- All governed domain mutations execute via `RuntimeEngine.runCommand()` — never direct Prisma writes
- The command dispatcher is at `apps/api/app/api/manifest/[entity]/commands/[command]/route.ts` — singular dynamic entry point
- Auth: Clerk (`auth().protect()`) on all protected routes
- Prisma: no foreign keys, use flat keys, Decimal fields must be cast with `.toFixed(2)`
- No `.js` extensions in imports — use `.ts`/`.tsx` only
- Port 2221 for app, 2223 for API server
- Test via Tailscale HTTPS URL, not localhost
