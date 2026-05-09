# Plan: Manifest Singular Command Dispatcher

## Goal
Replace N per-command physical route.ts files with ONE dynamic `[entity]/[command]` dispatcher that validates against compiled IR and calls `RuntimeEngine.runCommand`.

## Context
- **Current state**: `generate-all-routes.mjs` generates one route.ts per command (e.g., `kitchen/prep-tasks/commands/claim/route.ts`).
- **Target**: Single route at `apps/api/app/api/manifest/[entity]/commands/[command]/route.ts`
- **IR source**: `packages/manifest-ir/ir/kitchen/kitchen.commands.json` — array of `{entity, command, commandId}`
- **Runtime API**: `runtime.runCommand(commandName, input, { entityName })` → `CommandResult`

## Phases

### Phase 1: Design the dispatcher route ✅
- Route: `apps/api/app/api/manifest/[entity]/commands/[command]/route.ts`
- POST handler reads params.entity, params.command
- Auth: Clerk → resolve internal user via `database.user.findFirst({ authUserId, tenantId })`
- Validation: Check entity+command exists in `kitchen.commands.json`
- Execution: `createManifestRuntime({user, entityName})` + `runtime.runCommand(commandName, body, {entityName})`
- Response: Uses existing `manifestSuccessResponse`/`manifestErrorResponse`

### Phase 2: Add generation to generate.mjs
- Add a new generation step in `generate.mjs` that writes the dispatcher route.ts
- The dispatcher imports `kitchen.commands.json` as a data module
- Must have `// @generated` marker so materialization logic treats it correctly

### Phase 3: Wire into pnpm manifest:generate
- Already wired — `"manifest:generate": "node scripts/manifest/generate.mjs"`

### Phase 4: Dry-run + typecheck
- Run `pnpm manifest:generate --dry-run` equivalent
- Run `pnpm --filter api typecheck`

### Phase 5: Audit report
- Check if WRITE_ROUTE_BYPASSES_RUNTIME is satisfied for domain REST adapters calling this dispatcher
