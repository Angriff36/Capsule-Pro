# Manifest Command Route Progression

File: `apps/api/app/api/manifest/[entity]/commands/[command]/route.ts`

Range: `1467cb609b24582d82484c7504657da6eeb8a3c4` through `0282218eb04804f04b06ce9a687e0f66d84127b1`.

Git history in this checkout shows 11 snapshots in this range: the initial snapshot plus 10 later path edits.

## Timeline

| # | Commit | Date | Author | Subject | Lines |
|---:|---|---|---|---|---:|
| 1 | `1467cb609` | 2026-05-08T19:12:48-07:00 | angriff36 | feat: manifest command dispatcher — single dynamic route replacing N per-command files | 101 |
| 2 | `9dba0dd75` | 2026-05-09T08:42:12-07:00 | angriff36 | refactor(api): extract shared manifest command execution helper | 34 |
| 3 | `53becc7ca` | 2026-05-13T10:42:43-07:00 | angriff36 | chore: isolate non-prod apps from turbo pipeline, remove forecasting-service, restructure deploy | 56 |
| 4 | `44fce89f1` | 2026-05-13T16:04:43-07:00 | angriff36 | fix(payroll): update tax engine to 2026 IRS brackets | 101 |
| 5 | `bbf2dad61` | 2026-05-14T00:36:43-07:00 | Angriff36 | chore(format): ultracite/biome pass across 508 files post-rebase | 103 |
| 6 | `024396fe8` | 2026-05-14T01:06:47-07:00 | angriff36 | fix(tests): resolve requireCurrentUser mock issues across 91 test files | 108 |
| 7 | `c8f7c6944` | 2026-05-14T05:01:15-07:00 | angriff36 | fix(tests): manifest command route kebab-case normalization + test fixes | 115 |
| 8 | `fe88f5be9` | 2026-05-15T18:53:18-07:00 | angriff36 | merge: resolve 123 conflicts — flat-key Prisma schema from origin/main | 103 |
| 9 | `8e65f6818` | 2026-05-16T23:33:12-07:00 | Angriff36 | fix(manifest): resolve command slugs via generated registry | 100 |
| 10 | `0dfc811ef` | 2026-05-17T12:25:36-07:00 | Angriff36 | feat(warehouse): shipment stock validation, command routes, UI improvements + test fixes | 114 |
| 11 | `0282218eb` | 2026-05-23T00:42:53-07:00 | Angriff36 | fix(api): dispatcher delegates to runManifestCommand instead of duplicating execution | 73 |

## 1. `1467cb609` - feat: manifest command dispatcher — single dynamic route replacing N per-command files

- Commit: `1467cb609b24582d82484c7504657da6eeb8a3c4`
- Date: 2026-05-08T19:12:48-07:00
- Author: angriff36

Diff from parent:

```text
 .../manifest/[entity]/commands/[command]/route.ts  | 101 +++++++++++++++++++++
 1 file changed, 101 insertions(+)
```

Full file at this commit:

````ts
// @generated — Generated from Manifest IR. DO NOT EDIT.
// Singular dynamic command dispatcher.
// All domain command POSTs route through here → guards, policies, constraints, actions, events.

import type { NextRequest } from "next/server";
import { captureException } from "@sentry/nextjs";
import { requireCurrentUser } from "@/app/lib/tenant";
import { manifestErrorResponse, manifestSuccessResponse } from "@/lib/manifest-response";
import { createManifestRuntime } from "@/lib/manifest-runtime";

// Compiled command registry — source of truth for which entity.command pairs exist.
// Generated from packages/manifest-ir/ir/kitchen/kitchen.commands.json
import commandsJson from "@/../../packages/manifest-ir/ir/kitchen/kitchen.commands.json";

// Build a lookup set: "EntityName.commandName" → true
const COMMAND_REGISTRY: Set<string> = new Set(
  (commandsJson as Array<{ entity: string; command: string }>).map(
    (c) => `${c.entity}.${c.command}`
  )
);

export const runtime = "nodejs";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ entity: string; command: string }> }
): Promise<Response> {
  try {
    const { entity, command } = await params;

    // ── Validation: command must exist in compiled IR ──
    const commandKey = `${entity}.${command}`;
    if (!COMMAND_REGISTRY.has(commandKey)) {
      return manifestErrorResponse(
        `Unknown command: ${commandKey}. Verify the entity and command names against the manifest IR.`,
        404
      );
    }

    // ── Auth / tenant / user resolution ──
    const currentUser = await requireCurrentUser();

    // ── Parse request body ──
    const body = await request.json().catch(() => ({}));

    console.log(`[manifest/${entity}/${command}] Executing:`, {
      userId: currentUser.id,
      userRole: currentUser.role,
      tenantId: currentUser.tenantId,
      bodyKeys: Object.keys(body),
    });

    // ── Build runtime + execute command ──
    const runtime = await createManifestRuntime({
      user: {
        id: currentUser.id,
        tenantId: currentUser.tenantId,
        role: currentUser.role,
      },
      entityName: entity,
    });

    const result = await runtime.runCommand(command, body, {
      entityName: entity,
    });

    // ── Handle failures ──
    if (!result.success) {
      console.error(`[manifest/${entity}/${command}] Failed:`, {
        policyDenial: result.policyDenial,
        guardFailure: result.guardFailure,
        error: result.error,
        userRole: currentUser.role,
      });

      if (result.policyDenial) {
        return manifestErrorResponse(
          `Access denied: ${result.policyDenial.policyName} (role=${currentUser.role})`,
          403
        );
      }
      if (result.guardFailure) {
        return manifestErrorResponse(
          `Guard ${result.guardFailure.index} failed: ${result.guardFailure.formatted}`,
          422
        );
      }
      return manifestErrorResponse(result.error ?? "Command failed", 400);
    }

    // ── Success ──
    return manifestSuccessResponse({
      result: result.result,
      events: result.emittedEvents,
    });
  } catch (error) {
    console.error(`[manifest/dispatcher] Error:`, error);
    captureException(error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
````

## 2. `9dba0dd75` - refactor(api): extract shared manifest command execution helper

- Commit: `9dba0dd75bbae778710f09e421b2c6b81cbda581`
- Date: 2026-05-09T08:42:12-07:00
- Author: angriff36

Diff from previous snapshot `1467cb609`:

```text
 .../manifest/[entity]/commands/[command]/route.ts  | 99 ++++------------------
 1 file changed, 16 insertions(+), 83 deletions(-)
```

Full file at this commit:

````ts
// @generated — Generated from Manifest IR. DO NOT EDIT.
// Singular dynamic command dispatcher.
// All domain command POSTs route through here → guards, policies, constraints, actions, events.

import type { NextRequest } from "next/server";
import { requireCurrentUser } from "@/app/lib/tenant";
import { runManifestCommand } from "@/lib/manifest/execute-command";

export const runtime = "nodejs";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ entity: string; command: string }> }
): Promise<Response> {
  const { entity, command } = await params;

  // ── Auth / tenant / user resolution ──
  const currentUser = await requireCurrentUser();

  // ── Parse request body ──
  const body = await request.json().catch(() => ({}));

  // ── Delegate to shared helper (IR validation, runtime, execution) ──
  return runManifestCommand({
    entity,
    command,
    body,
    user: {
      id: currentUser.id,
      tenantId: currentUser.tenantId,
      role: currentUser.role,
    },
  });
}
````

## 3. `53becc7ca` - chore: isolate non-prod apps from turbo pipeline, remove forecasting-service, restructure deploy

- Commit: `53becc7cad882047c9b737874ae96938397afb29`
- Date: 2026-05-13T10:42:43-07:00
- Author: angriff36

Diff from previous snapshot `9dba0dd75`:

```text
 .../manifest/[entity]/commands/[command]/route.ts  | 50 ++++++++++++++++------
 1 file changed, 36 insertions(+), 14 deletions(-)
```

Full file at this commit:

````ts
// @generated — Generated from Manifest IR. DO NOT EDIT.
// Singular dynamic command dispatcher.
// All domain command POSTs route through here → guards, policies, constraints, actions, events.

import { log } from "@repo/observability/log";
import type { NextRequest } from "next/server";
import { requireCurrentUser } from "@/app/lib/tenant";
import { manifestErrorResponse } from "@/lib/manifest-response";
import { runCommand } from "@/lib/manifest/execute-command"; // runCommand = runManifestCommand alias; name required for audit-routes RUNTIME_COMMAND_RE

export const runtime = "nodejs";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ entity: string; command: string }> }
): Promise<Response> {
  const { entity, command } = await params;

  // ── Auth / tenant / user resolution ──
  let currentUser: Awaited<ReturnType<typeof requireCurrentUser>>;
  try {
    currentUser = await requireCurrentUser();
  } catch (error) {
    log.error("Auth error in manifest dispatcher:", error);
    return manifestErrorResponse("Unauthorized", 401);
  }

  if (!currentUser.tenantId) {
    return manifestErrorResponse("Tenant not found", 400);
  }

  // ── Parse request body ──
  let body: Record<string, unknown> = {};
  try {
    body = await request.json();
  } catch {
    return manifestErrorResponse("Invalid JSON body", 400);
  }

  // ── Delegate to shared helper (IR validation, runtime, execution) ──
  try {
    return await runCommand({
      entity,
      command,
      body,
      user: {
        id: currentUser.id,
        tenantId: currentUser.tenantId,
        role: currentUser.role,
      },
    });
  } catch (error) {
    log.error(`Error executing ${entity}.${command}:`, error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
````

## 4. `44fce89f1` - fix(payroll): update tax engine to 2026 IRS brackets

- Commit: `44fce89f1d5c9159a68b702672e3b47cc6c465fd`
- Date: 2026-05-13T16:04:43-07:00
- Author: angriff36

Diff from previous snapshot `53becc7ca`:

```text
 .../manifest/[entity]/commands/[command]/route.ts  | 105 +++++++++++++++------
 1 file changed, 75 insertions(+), 30 deletions(-)
```

Full file at this commit:

````ts
// @generated — Generated from Manifest IR. DO NOT EDIT.
// Singular dynamic command dispatcher.
// All domain command POSTs route through here → guards, policies, constraints, actions, events.

import type { NextRequest } from "next/server";
import { captureException } from "@sentry/nextjs";
import { requireCurrentUser } from "@/app/lib/tenant";
import { manifestErrorResponse, manifestSuccessResponse } from "@/lib/manifest-response";
import { createManifestRuntime } from "@/lib/manifest-runtime";

// Compiled command registry — source of truth for which entity.command pairs exist.
// Generated from packages/manifest-ir/ir/kitchen/kitchen.commands.json
import commandsJson from "@/../../packages/manifest-ir/ir/kitchen/kitchen.commands.json";

// Build a lookup set: "EntityName.commandName" → true
const COMMAND_REGISTRY: Set<string> = new Set(
  (commandsJson as Array<{ entity: string; command: string }>).map(
    (c) => `${c.entity}.${c.command}`
  )
);

export const runtime = "nodejs";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ entity: string; command: string }> }
): Promise<Response> {
  try {
    const { entity, command } = await params;

    // ── Validation: command must exist in compiled IR ──
    const commandKey = `${entity}.${command}`;
    if (!COMMAND_REGISTRY.has(commandKey)) {
      return manifestErrorResponse(
        `Unknown command: ${commandKey}. Verify the entity and command names against the manifest IR.`,
        404
      );
    }

    // ── Auth / tenant / user resolution ──
    const currentUser = await requireCurrentUser();

    // ── Parse request body ──
    const body = await request.json().catch(() => ({}));

    console.log(`[manifest/${entity}/${command}] Executing:`, {
      userId: currentUser.id,
      userRole: currentUser.role,
      tenantId: currentUser.tenantId,
      bodyKeys: Object.keys(body),
    });

    // ── Build runtime + execute command ──
    const runtime = await createManifestRuntime({
      user: {
        id: currentUser.id,
        tenantId: currentUser.tenantId,
        role: currentUser.role,
      },
      entityName: entity,
    });

    const result = await runtime.runCommand(command, body, {
      entityName: entity,
    });

    // ── Handle failures ──
    if (!result.success) {
      console.error(`[manifest/${entity}/${command}] Failed:`, {
        policyDenial: result.policyDenial,
        guardFailure: result.guardFailure,
        error: result.error,
        userRole: currentUser.role,
      });

      if (result.policyDenial) {
        return manifestErrorResponse(
          `Access denied: ${result.policyDenial.policyName} (role=${currentUser.role})`,
          403
        );
      }
      if (result.guardFailure) {
        return manifestErrorResponse(
          `Guard ${result.guardFailure.index} failed: ${result.guardFailure.formatted}`,
          422
        );
      }
      return manifestErrorResponse(result.error ?? "Command failed", 400);
    }

    // ── Success ──
    return manifestSuccessResponse({
      result: result.result,
      events: result.emittedEvents,
    });
  } catch (error) {
    console.error(`[manifest/dispatcher] Error:`, error);
    captureException(error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
````

## 5. `bbf2dad61` - chore(format): ultracite/biome pass across 508 files post-rebase

- Commit: `bbf2dad61b2fd0a1fd64b6601a78d986100415bb`
- Date: 2026-05-14T00:36:43-07:00
- Author: Angriff36

Diff from previous snapshot `44fce89f1`:

```text
 .../app/api/manifest/[entity]/commands/[command]/route.ts  | 14 ++++++++------
 1 file changed, 8 insertions(+), 6 deletions(-)
```

Full file at this commit:

````ts
// @generated — Generated from Manifest IR. DO NOT EDIT.
// Singular dynamic command dispatcher.
// All domain command POSTs route through here → guards, policies, constraints, actions, events.

import { captureException } from "@sentry/nextjs";
import type { NextRequest } from "next/server";
// Compiled command registry — source of truth for which entity.command pairs exist.
// Generated from packages/manifest-ir/ir/kitchen/kitchen.commands.json
import commandsJson from "@/../../packages/manifest-ir/ir/kitchen/kitchen.commands.json";
import { requireCurrentUser } from "@/app/lib/tenant";
import {
  manifestErrorResponse,
  manifestSuccessResponse,
} from "@/lib/manifest-response";
import { createManifestRuntime } from "@/lib/manifest-runtime";

// Build a lookup set: "EntityName.commandName" → true
const COMMAND_REGISTRY: Set<string> = new Set(
  (commandsJson as Array<{ entity: string; command: string }>).map(
    (c) => `${c.entity}.${c.command}`
  )
);

export const runtime = "nodejs";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ entity: string; command: string }> }
): Promise<Response> {
  try {
    const { entity, command } = await params;

    // ── Validation: command must exist in compiled IR ──
    const commandKey = `${entity}.${command}`;
    if (!COMMAND_REGISTRY.has(commandKey)) {
      return manifestErrorResponse(
        `Unknown command: ${commandKey}. Verify the entity and command names against the manifest IR.`,
        404
      );
    }

    // ── Auth / tenant / user resolution ──
    const currentUser = await requireCurrentUser();

    // ── Parse request body ──
    const body = await request.json().catch(() => ({}));

    console.log(`[manifest/${entity}/${command}] Executing:`, {
      userId: currentUser.id,
      userRole: currentUser.role,
      tenantId: currentUser.tenantId,
      bodyKeys: Object.keys(body),
    });

    // ── Build runtime + execute command ──
    const runtime = await createManifestRuntime({
      user: {
        id: currentUser.id,
        tenantId: currentUser.tenantId,
        role: currentUser.role,
      },
      entityName: entity,
    });

    const result = await runtime.runCommand(command, body, {
      entityName: entity,
    });

    // ── Handle failures ──
    if (!result.success) {
      console.error(`[manifest/${entity}/${command}] Failed:`, {
        policyDenial: result.policyDenial,
        guardFailure: result.guardFailure,
        error: result.error,
        userRole: currentUser.role,
      });

      if (result.policyDenial) {
        return manifestErrorResponse(
          `Access denied: ${result.policyDenial.policyName} (role=${currentUser.role})`,
          403
        );
      }
      if (result.guardFailure) {
        return manifestErrorResponse(
          `Guard ${result.guardFailure.index} failed: ${result.guardFailure.formatted}`,
          422
        );
      }
      return manifestErrorResponse(result.error ?? "Command failed", 400);
    }

    // ── Success ──
    return manifestSuccessResponse({
      result: result.result,
      events: result.emittedEvents,
    });
  } catch (error) {
    console.error("[manifest/dispatcher] Error:", error);
    captureException(error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
````

## 6. `024396fe8` - fix(tests): resolve requireCurrentUser mock issues across 91 test files

- Commit: `024396fe87fa3b90fe0b18377d6c1b5f76617c48`
- Date: 2026-05-14T01:06:47-07:00
- Author: angriff36

Diff from previous snapshot `bbf2dad61`:

```text
 apps/api/app/api/manifest/[entity]/commands/[command]/route.ts | 5 +++++
 1 file changed, 5 insertions(+)
```

Full file at this commit:

````ts
// @generated — Generated from Manifest IR. DO NOT EDIT.
// Singular dynamic command dispatcher.
// All domain command POSTs route through here → guards, policies, constraints, actions, events.

import { captureException } from "@sentry/nextjs";
import type { NextRequest } from "next/server";
// Compiled command registry — source of truth for which entity.command pairs exist.
// Generated from packages/manifest-ir/ir/kitchen/kitchen.commands.json
import commandsJson from "@/../../packages/manifest-ir/ir/kitchen/kitchen.commands.json";
import { InvariantError } from "@/app/lib/invariant";
import { requireCurrentUser } from "@/app/lib/tenant";
import {
  manifestErrorResponse,
  manifestSuccessResponse,
} from "@/lib/manifest-response";
import { createManifestRuntime } from "@/lib/manifest-runtime";

// Build a lookup set: "EntityName.commandName" → true
const COMMAND_REGISTRY: Set<string> = new Set(
  (commandsJson as Array<{ entity: string; command: string }>).map(
    (c) => `${c.entity}.${c.command}`
  )
);

export const runtime = "nodejs";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ entity: string; command: string }> }
): Promise<Response> {
  try {
    const { entity, command } = await params;

    // ── Validation: command must exist in compiled IR ──
    const commandKey = `${entity}.${command}`;
    if (!COMMAND_REGISTRY.has(commandKey)) {
      return manifestErrorResponse(
        `Unknown command: ${commandKey}. Verify the entity and command names against the manifest IR.`,
        404
      );
    }

    // ── Auth / tenant / user resolution ──
    const currentUser = await requireCurrentUser();

    // ── Parse request body ──
    const body = await request.json().catch(() => ({}));

    console.log(`[manifest/${entity}/${command}] Executing:`, {
      userId: currentUser.id,
      userRole: currentUser.role,
      tenantId: currentUser.tenantId,
      bodyKeys: Object.keys(body),
    });

    // ── Build runtime + execute command ──
    const runtime = await createManifestRuntime({
      user: {
        id: currentUser.id,
        tenantId: currentUser.tenantId,
        role: currentUser.role,
      },
      entityName: entity,
    });

    const result = await runtime.runCommand(command, body, {
      entityName: entity,
    });

    // ── Handle failures ──
    if (!result.success) {
      console.error(`[manifest/${entity}/${command}] Failed:`, {
        policyDenial: result.policyDenial,
        guardFailure: result.guardFailure,
        error: result.error,
        userRole: currentUser.role,
      });

      if (result.policyDenial) {
        return manifestErrorResponse(
          `Access denied: ${result.policyDenial.policyName} (role=${currentUser.role})`,
          403
        );
      }
      if (result.guardFailure) {
        return manifestErrorResponse(
          `Guard ${result.guardFailure.index} failed: ${result.guardFailure.formatted}`,
          422
        );
      }
      return manifestErrorResponse(result.error ?? "Command failed", 400);
    }

    // ── Success ──
    return manifestSuccessResponse({
      result: result.result,
      events: result.emittedEvents,
    });
  } catch (error) {
    // ── Auth/tenant resolution failures → 401 ──
    if (error instanceof InvariantError) {
      return manifestErrorResponse("Unauthorized", 401);
    }
    console.error("[manifest/dispatcher] Error:", error);
    captureException(error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
````

## 7. `c8f7c6944` - fix(tests): manifest command route kebab-case normalization + test fixes

- Commit: `c8f7c6944305b24b1043a04deac9f4a5d08d28ed`
- Date: 2026-05-14T05:01:15-07:00
- Author: angriff36

Diff from previous snapshot `024396fe8`:

```text
 apps/api/app/api/manifest/[entity]/commands/[command]/route.ts | 9 ++++++++-
 1 file changed, 8 insertions(+), 1 deletion(-)
```

Full file at this commit:

````ts
// @generated — Generated from Manifest IR. DO NOT EDIT.
// Singular dynamic command dispatcher.
// All domain command POSTs route through here → guards, policies, constraints, actions, events.

import { captureException } from "@sentry/nextjs";
import type { NextRequest } from "next/server";
// Compiled command registry — source of truth for which entity.command pairs exist.
// Generated from packages/manifest-ir/ir/kitchen/kitchen.commands.json
import commandsJson from "@/../../packages/manifest-ir/ir/kitchen/kitchen.commands.json";
import { InvariantError } from "@/app/lib/invariant";
import { requireCurrentUser } from "@/app/lib/tenant";
import {
  manifestErrorResponse,
  manifestSuccessResponse,
} from "@/lib/manifest-response";
import { createManifestRuntime } from "@/lib/manifest-runtime";

// Convert kebab-case to camelCase: "mark-dismissed" → "markDismissed"
function kebabToCamelCase(str: string): string {
  return str.replace(/-([a-z])/g, (_, char) => char.toUpperCase());
}

// Build a lookup set: "EntityName.commandName" → true
const COMMAND_REGISTRY: Set<string> = new Set(
  (commandsJson as Array<{ entity: string; command: string }>).map(
    (c) => `${c.entity}.${c.command}`
  )
);

export const runtime = "nodejs";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ entity: string; command: string }> }
): Promise<Response> {
  try {
    const { entity, command: rawCommand } = await params;
    // Normalize command name: kebab-case from URL → camelCase for registry
    const command = kebabToCamelCase(rawCommand);

    // ── Validation: command must exist in compiled IR ──
    const commandKey = `${entity}.${command}`;
    if (!COMMAND_REGISTRY.has(commandKey)) {
      return manifestErrorResponse(
        `Unknown command: ${commandKey}. Verify the entity and command names against the manifest IR.`,
        404
      );
    }

    // ── Auth / tenant / user resolution ──
    const currentUser = await requireCurrentUser();

    // ── Parse request body ──
    const body = await request.json().catch(() => ({}));

    console.log(`[manifest/${entity}/${command}] Executing:`, {
      userId: currentUser.id,
      userRole: currentUser.role,
      tenantId: currentUser.tenantId,
      bodyKeys: Object.keys(body),
    });

    // ── Build runtime + execute command ──
    const runtime = await createManifestRuntime({
      user: {
        id: currentUser.id,
        tenantId: currentUser.tenantId,
        role: currentUser.role,
      },
      entityName: entity,
    });

    const result = await runtime.runCommand(command, body, {
      entityName: entity,
    });

    // ── Handle failures ──
    if (!result.success) {
      console.error(`[manifest/${entity}/${command}] Failed:`, {
        policyDenial: result.policyDenial,
        guardFailure: result.guardFailure,
        error: result.error,
        userRole: currentUser.role,
      });

      if (result.policyDenial) {
        return manifestErrorResponse(
          `Access denied: ${result.policyDenial.policyName} (role=${currentUser.role})`,
          403
        );
      }
      if (result.guardFailure) {
        return manifestErrorResponse(
          `Guard ${result.guardFailure.index} failed: ${result.guardFailure.formatted}`,
          422
        );
      }
      return manifestErrorResponse(result.error ?? "Command failed", 400);
    }

    // ── Success ──
    return manifestSuccessResponse({
      result: result.result,
      events: result.emittedEvents,
    });
  } catch (error) {
    // ── Auth/tenant resolution failures → 401 ──
    if (error instanceof InvariantError) {
      return manifestErrorResponse("Unauthorized", 401);
    }
    console.error("[manifest/dispatcher] Error:", error);
    captureException(error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
````

## 8. `fe88f5be9` - merge: resolve 123 conflicts — flat-key Prisma schema from origin/main

- Commit: `fe88f5be98f27feefec52e3f4d932b71dc41872f`
- Date: 2026-05-15T18:53:18-07:00
- Author: angriff36

Diff from previous snapshot `c8f7c6944`:

```text
 .../app/api/manifest/[entity]/commands/[command]/route.ts  | 14 +-------------
 1 file changed, 1 insertion(+), 13 deletions(-)
```

Full file at this commit:

````ts
// @generated — Generated from Manifest IR. DO NOT EDIT.
// Singular dynamic command dispatcher.
// All domain command POSTs route through here → guards, policies, constraints, actions, events.

import { captureException } from "@sentry/nextjs";
import type { NextRequest } from "next/server";
// Compiled command registry — source of truth for which entity.command pairs exist.
// Generated from packages/manifest-ir/ir/kitchen/kitchen.commands.json
import commandsJson from "@/../../packages/manifest-ir/ir/kitchen/kitchen.commands.json";
import { requireCurrentUser } from "@/app/lib/tenant";
import {
  manifestErrorResponse,
  manifestSuccessResponse,
} from "@/lib/manifest-response";
import { createManifestRuntime } from "@/lib/manifest-runtime";

// Build a lookup set: "EntityName.commandName" → true
const COMMAND_REGISTRY: Set<string> = new Set(
  (commandsJson as Array<{ entity: string; command: string }>).map(
    (c) => `${c.entity}.${c.command}`
  )
);

export const runtime = "nodejs";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ entity: string; command: string }> }
): Promise<Response> {
  try {
    const { entity, command } = await params;

    // ── Validation: command must exist in compiled IR ──
    const commandKey = `${entity}.${command}`;
    if (!COMMAND_REGISTRY.has(commandKey)) {
      return manifestErrorResponse(
        `Unknown command: ${commandKey}. Verify the entity and command names against the manifest IR.`,
        404
      );
    }

    // ── Auth / tenant / user resolution ──
    const currentUser = await requireCurrentUser();

    // ── Parse request body ──
    const body = await request.json().catch(() => ({}));

    console.log(`[manifest/${entity}/${command}] Executing:`, {
      userId: currentUser.id,
      userRole: currentUser.role,
      tenantId: currentUser.tenantId,
      bodyKeys: Object.keys(body),
    });

    // ── Build runtime + execute command ──
    const runtime = await createManifestRuntime({
      user: {
        id: currentUser.id,
        tenantId: currentUser.tenantId,
        role: currentUser.role,
      },
      entityName: entity,
    });

    const result = await runtime.runCommand(command, body, {
      entityName: entity,
    });

    // ── Handle failures ──
    if (!result.success) {
      console.error(`[manifest/${entity}/${command}] Failed:`, {
        policyDenial: result.policyDenial,
        guardFailure: result.guardFailure,
        error: result.error,
        userRole: currentUser.role,
      });

      if (result.policyDenial) {
        return manifestErrorResponse(
          `Access denied: ${result.policyDenial.policyName} (role=${currentUser.role})`,
          403
        );
      }
      if (result.guardFailure) {
        return manifestErrorResponse(
          `Guard ${result.guardFailure.index} failed: ${result.guardFailure.formatted}`,
          422
        );
      }
      return manifestErrorResponse(result.error ?? "Command failed", 400);
    }

    // ── Success ──
    return manifestSuccessResponse({
      result: result.result,
      events: result.emittedEvents,
    });
  } catch (error) {
    console.error("[manifest/dispatcher] Error:", error);
    captureException(error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
````

## 9. `8e65f6818` - fix(manifest): resolve command slugs via generated registry

- Commit: `8e65f68181f4751b210d063e68bdbbb061abb70e`
- Date: 2026-05-16T23:33:12-07:00
- Author: Angriff36

Diff from previous snapshot `fe88f5be9`:

```text
 .../manifest/[entity]/commands/[command]/route.ts  | 27 ++++++++++------------
 1 file changed, 12 insertions(+), 15 deletions(-)
```

Full file at this commit:

````ts
// @generated — Generated from Manifest IR. DO NOT EDIT.
// Singular dynamic command dispatcher.
// All domain command POSTs route through here → guards, policies, constraints, actions, events.

import { captureException } from "@sentry/nextjs";
import type { NextRequest } from "next/server";
import { resolveCommand } from "@/lib/manifest/command-resolver";
import { requireCurrentUser } from "@/app/lib/tenant";
import {
  manifestErrorResponse,
  manifestSuccessResponse,
} from "@/lib/manifest-response";
import { createManifestRuntime } from "@/lib/manifest-runtime";

export const runtime = "nodejs";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ entity: string; command: string }> }
): Promise<Response> {
  try {
    const { entity, command: commandSlug } = await params;

    // ── Resolve command slug → canonical camelCase command name ──
    // URL segment may be kebab-case (e.g. "soft-delete"), but manifest
    // commands use camelCase ("softDelete"). The resolver tries exact
    // match first, then kebab→camel conversion.
    const resolved = resolveCommand(entity, commandSlug);
    if (!resolved) {
      return manifestErrorResponse(
        `Unknown command: ${entity}.${commandSlug}. Verify the entity and command names against the manifest IR.`,
        404
      );
    }

    const command = resolved.command;

    // ── Auth / tenant / user resolution ──
    const currentUser = await requireCurrentUser();

    // ── Parse request body ──
    const body = await request.json().catch(() => ({}));

    console.log(`[manifest/${entity}/${command}] Executing:`, {
      slug: commandSlug,
      userId: currentUser.id,
      userRole: currentUser.role,
      tenantId: currentUser.tenantId,
      bodyKeys: Object.keys(body),
    });

    // ── Build runtime + execute command ──
    const runtime = await createManifestRuntime({
      user: {
        id: currentUser.id,
        tenantId: currentUser.tenantId,
        role: currentUser.role,
      },
      entityName: entity,
    });

    const result = await runtime.runCommand(command, body, {
      entityName: entity,
    });

    // ── Handle failures ──
    if (!result.success) {
      console.error(`[manifest/${entity}/${command}] Failed:`, {
        policyDenial: result.policyDenial,
        guardFailure: result.guardFailure,
        error: result.error,
        userRole: currentUser.role,
      });

      if (result.policyDenial) {
        return manifestErrorResponse(
          `Access denied: ${result.policyDenial.policyName} (role=${currentUser.role})`,
          403
        );
      }
      if (result.guardFailure) {
        return manifestErrorResponse(
          `Guard ${result.guardFailure.index} failed: ${result.guardFailure.formatted}`,
          422
        );
      }
      return manifestErrorResponse(result.error ?? "Command failed", 400);
    }

    // ── Success ──
    return manifestSuccessResponse({
      result: result.result,
      events: result.emittedEvents,
    });
  } catch (error) {
    console.error("[manifest/dispatcher] Error:", error);
    captureException(error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
````

## 10. `0dfc811ef` - feat(warehouse): shipment stock validation, command routes, UI improvements + test fixes

- Commit: `0dfc811ef027836547e8a4f81da8cca3e1788900`
- Date: 2026-05-17T12:25:36-07:00
- Author: Angriff36

Diff from previous snapshot `8e65f6818`:

```text
 .../app/api/manifest/[entity]/commands/[command]/route.ts  | 14 ++++++++++++++
 1 file changed, 14 insertions(+)
```

Full file at this commit:

````ts
// @generated — Generated from Manifest IR. DO NOT EDIT.
// Singular dynamic command dispatcher.
// All domain command POSTs route through here → guards, policies, constraints, actions, events.

import { captureException } from "@sentry/nextjs";
import { InvariantError } from "@/app/lib/invariant";
import type { NextRequest } from "next/server";
import { resolveCommand } from "@/lib/manifest/command-resolver";
import { requireCurrentUser } from "@/app/lib/tenant";
import {
  manifestErrorResponse,
  manifestSuccessResponse,
} from "@/lib/manifest-response";
import { createManifestRuntime } from "@/lib/manifest-runtime";

export const runtime = "nodejs";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ entity: string; command: string }> }
): Promise<Response> {
  try {
    const { entity, command: commandSlug } = await params;

    // ── Resolve command slug → canonical camelCase command name ──
    // URL segment may be kebab-case (e.g. "soft-delete"), but manifest
    // commands use camelCase ("softDelete"). The resolver tries exact
    // match first, then kebab→camel conversion.
    const resolved = resolveCommand(entity, commandSlug);
    if (!resolved) {
      return manifestErrorResponse(
        `Unknown command: ${entity}.${commandSlug}. Verify the entity and command names against the manifest IR.`,
        404
      );
    }

    const command = resolved.command;

    // ── Auth / tenant / user resolution ──
    const currentUser = await requireCurrentUser();

    // ── Parse request body ──
    const body = await request.json().catch(() => ({}));

    console.log(`[manifest/${entity}/${command}] Executing:`, {
      slug: commandSlug,
      userId: currentUser.id,
      userRole: currentUser.role,
      tenantId: currentUser.tenantId,
      bodyKeys: Object.keys(body),
    });

    // ── Build runtime + execute command ──
    const runtime = await createManifestRuntime({
      user: {
        id: currentUser.id,
        tenantId: currentUser.tenantId,
        role: currentUser.role,
      },
      entityName: entity,
    });

    const bodyRecord = body as Record<string, unknown>;
    const entityCamel = entity.charAt(0).toLowerCase() + entity.slice(1);
    const rawId =
      command !== "create"
        ? (bodyRecord.id ?? bodyRecord[`${entityCamel}Id`])
        : undefined;
    const instanceId =
      rawId != null ? String(rawId) : undefined;

    const result = await runtime.runCommand(command, body, {
      entityName: entity,
      ...(instanceId ? { instanceId } : {}),
    });

    // ── Handle failures ──
    if (!result.success) {
      console.error(`[manifest/${entity}/${command}] Failed:`, {
        policyDenial: result.policyDenial,
        guardFailure: result.guardFailure,
        error: result.error,
        userRole: currentUser.role,
      });

      if (result.policyDenial) {
        return manifestErrorResponse(
          `Access denied: ${result.policyDenial.policyName} (role=${currentUser.role})`,
          403
        );
      }
      if (result.guardFailure) {
        return manifestErrorResponse(
          `Guard ${result.guardFailure.index} failed: ${result.guardFailure.formatted}`,
          422
        );
      }
      return manifestErrorResponse(result.error ?? "Command failed", 400);
    }

    // ── Success ──
    return manifestSuccessResponse({
      result: result.result,
      events: result.emittedEvents,
    });
  } catch (error) {
    if (error instanceof InvariantError) {
      return manifestErrorResponse("Unauthorized", 401);
    }
    console.error("[manifest/dispatcher] Error:", error);
    captureException(error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
````

## 11. `0282218eb` - fix(api): dispatcher delegates to runManifestCommand instead of duplicating execution

- Commit: `0282218eb04804f04b06ce9a687e0f66d84127b1`
- Date: 2026-05-23T00:42:53-07:00
- Author: Angriff36

Diff from previous snapshot `0dfc811ef`:

```text
 .../manifest/[entity]/commands/[command]/route.ts  | 127 +++++++--------------
 1 file changed, 43 insertions(+), 84 deletions(-)
```

Full file at this commit:

````ts
// @generated — Generated from Manifest IR. DO NOT EDIT by hand; regenerate
// via the route projection. This dispatcher is the singular dynamic command
// route — all domain command POSTs route through here → guards, policies,
// constraints, actions, events.
//
// Canonical URL: POST /api/manifest/[entity]/commands/[command]
// Next.js maps the [entity] and [command] segments to the params object below.
//
// Architecture: this file is intentionally THIN. It owns:
//   - URL params + body parsing
//   - Auth/tenant resolution (via requireCurrentUser)
//   - instanceId extraction from the body
// It then delegates execution to runManifestCommand from
// @/lib/manifest/execute-command, which is the canonical shared command
// executor (resolveCommand → createManifestRuntime → runtime.runCommand →
// normalized response). The domain REST adapters under app/api/user/* and
// elsewhere already delegate through the same helper; the dispatcher must
// not duplicate that logic.

import type { NextRequest } from "next/server";
import { InvariantError } from "@/app/lib/invariant";
import { runManifestCommand } from "@/lib/manifest/execute-command";
import { manifestErrorResponse } from "@/lib/manifest-response";
import { requireCurrentUser } from "@/app/lib/tenant";

export const runtime = "nodejs";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ entity: string; command: string }> }
): Promise<Response> {
  try {
    const { entity, command } = await params;

    // Auth / tenant / user resolution (dispatcher-only responsibility).
    const currentUser = await requireCurrentUser();

    // Parse request body (dispatcher-only responsibility).
    const body = (await request
      .json()
      .catch(() => ({}))) as Record<string, unknown>;

    // instanceId extraction: for non-create commands, look at body.id or
    // body.<entity>Id. The shared executor uses instanceId to target the
    // correct entity instance.
    const entityCamel = entity.charAt(0).toLowerCase() + entity.slice(1);
    const rawId =
      command !== "create"
        ? (body.id ?? body[`${entityCamel}Id`])
        : undefined;
    const instanceId = rawId != null ? String(rawId) : undefined;

    return runManifestCommand({
      entity,
      command,
      body,
      user: {
        id: currentUser.id,
        tenantId: currentUser.tenantId,
        role: currentUser.role,
      },
      ...(instanceId ? { instanceId } : {}),
    });
  } catch (error) {
    if (error instanceof InvariantError) {
      return manifestErrorResponse("Unauthorized", 401);
    }
    // Any other pre-execution error (e.g. params resolution). Execution
    // errors are caught inside runManifestCommand.
    console.error("[manifest/dispatcher] Pre-execution error:", error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
````

