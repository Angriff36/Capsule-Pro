# Plan: Manifest Singular Command Dispatcher + Shared Helper

## Steps

### 1. Create shared helper: `apps/api/lib/manifest/execute-command.ts`
- Export `runManifestCommand(params)` — lower-level helper that:
  - Validates entity+command against compiled IR (`kitchen.commands.json`)
  - Creates Manifest runtime with provided user context
  - Calls `runtime.runCommand(command, body, { entityName, instanceId? })`
  - Normalizes failures (policyDenial→403, guardFailure→422, error→400)
  - Returns normalized success (result + events)

### 2. Update dispatcher: `apps/api/app/api/manifest/[entity]/commands/[command]/route.ts`
- Call `runManifestCommand({ entity, command, body, user, ... })` instead of creating runtime inline
- Remove duplicated runtime creation and error-handling code

### 3. Convert proof route: `settings/rate-limits/[id]/route.ts` DELETE
- Replace direct Prisma write with call to `executeManifestCommand` from `@/lib/manifest-command-handler`
- Map REST params to Manifest command input: `entityName: "RateLimitConfig"`, `commandName: "softDelete"`
- Keep GET and PATCH unchanged

### 4. Run audit + typecheck
- `pnpm manifest:route-audit`
- `pnpm --filter api typecheck`
