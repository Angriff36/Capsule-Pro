/**
 * MCP-specific runtime factory.
 *
 * Thin wrapper around `@repo/manifest-adapters/manifest-runtime-factory`
 * that injects MCP-appropriate dependencies (Sentry for Node.js standalone
 * process, not Next.js).
 *
 * @packageDocumentation
 */

import type { CommandResult } from "@angriff36/manifest";
import type { IRCommand } from "@angriff36/manifest/ir";
import {
  createManifestRuntime,
  type ManifestTelemetryHooks,
  type PrismaLike,
} from "@repo/manifest-adapters/manifest-runtime-factory";
import { addBreadcrumb, captureException } from "@sentry/node";
import type { McpIdentity } from "../types.js";

// ---------------------------------------------------------------------------
// Prisma singleton for the MCP server process lifetime
// ---------------------------------------------------------------------------

let prismaInstance: PrismaLike | null = null;

/**
 * Set the Prisma instance for the MCP server.
 * Called once during server initialization.
 */
export function setPrisma(prisma: PrismaLike): void {
  prismaInstance = prisma;
}

export function getPrisma(): PrismaLike {
  if (!prismaInstance) {
    throw new Error(
      "Prisma not initialized. Call setPrisma() during server startup."
    );
  }
  return prismaInstance;
}

// ---------------------------------------------------------------------------
// Telemetry hooks (Sentry breadcrumbs for standalone Node.js process)
// ---------------------------------------------------------------------------

const sentryTelemetry: ManifestTelemetryHooks = {
  onCommandExecuted(
    command: Readonly<IRCommand>,
    result: Readonly<CommandResult>,
    entityName?: string
  ) {
    addBreadcrumb({
      category: "manifest.command",
      message: `${entityName ?? command.entity ?? "unknown"}.${command.name}: ${result.success ? "success" : "failed"}`,
      level: result.success ? "info" : "warning",
      data: {
        entity: entityName ?? command.entity ?? "unknown",
        command: command.name,
        success: result.success,
      },
    });
  },

  onConstraintEvaluated(
    outcome: unknown,
    commandName: string,
    entityName?: string
  ) {
    const o = outcome as { passed?: boolean; severity?: string; code?: string };
    if (!o.passed) {
      addBreadcrumb({
        category: "manifest.constraint",
        message: `${entityName ?? "unknown"}.${commandName}: constraint ${o.code ?? "unknown"} ${o.severity === "error" ? "blocked" : "warned"}`,
        level: o.severity === "error" ? "warning" : "info",
        data: {
          entity: entityName ?? "unknown",
          command: commandName,
          constraint: o.code ?? "unknown",
          severity: o.severity,
        },
      });
    }
  },
};

// ---------------------------------------------------------------------------
// Logger (structured, writes to stderr to avoid polluting stdio transport)
// ---------------------------------------------------------------------------

const mcpLogger = {
  info(message: string, meta?: Record<string, unknown>) {
    process.stderr.write(
      `${JSON.stringify({ level: "info", message, ...meta })}\n`
    );
  },
  error(message: string, meta?: Record<string, unknown>) {
    process.stderr.write(
      `${JSON.stringify({ level: "error", message, ...meta })}\n`
    );
  },
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Create a manifest runtime for an MCP tool call.
 *
 * Uses the resolved MCP identity for user context and tenant scoping.
 * All operations are automatically scoped to the identity's tenant.
 *
 * Returns the runtime engine. Callers use `engine.runCommand()` to execute.
 */
export async function createMcpRuntime(
  identity: McpIdentity,
  entityName?: string
) {
  return await createManifestRuntime(
    {
      prisma: getPrisma(),
      log: mcpLogger,
      captureException,
      telemetry: sentryTelemetry,
    },
    {
      user: {
        id: identity.userId,
        tenantId: identity.tenantId,
        role: identity.roles[0],
      },
      entityName,
    }
  );
}

/**
 * Gracefully disconnect the Prisma client.
 * Called during server shutdown.
 */
export async function disconnectPrisma(): Promise<void> {
  if (prismaInstance && "$disconnect" in prismaInstance) {
    // biome-ignore lint/suspicious/noExplicitAny: PrismaLike doesn't expose $disconnect but the real client has it
    await (prismaInstance as any).$disconnect?.();
  }
}
