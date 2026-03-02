/**
 * DB/Outbox verification tools (read-only + allowlisted).
 *
 * Tools:
 * - `db.read`: Execute allowlisted query templates
 * - `outbox.find`: Query outbox events with filters
 * - `events.find`: Query domain events with filters
 *
 * Security: Only predefined query templates are allowed.
 * No arbitrary SQL execution.
 *
 * @packageDocumentation
 */

import { z } from "zod";
import { getPrisma } from "../lib/runtime-factory.js";
import type { McpPlugin, PluginContext } from "../types.js";

// ---------------------------------------------------------------------------
// Allowlisted query templates
// ---------------------------------------------------------------------------

type QueryHandler = (
  prisma: ReturnType<typeof getPrisma>,
  tenantId: string,
  params: Record<string, unknown>
) => Promise<{ rows: unknown[]; rowCount: number }>;

const MODEL_MAP: Record<string, string> = {
  PrepTask: "prepTask",
  PrepList: "prepList",
  Event: "event",
  Dish: "dish",
  Recipe: "recipe",
  Ingredient: "ingredient",
  Client: "client",
  User: "user",
};

const QUERY_TEMPLATES: Record<string, QueryHandler> = {
  "entity.byId": async (prisma, tenantId, params) => {
    const { entity, id } = params as { entity: string; id: string };
    const modelName = MODEL_MAP[entity];
    if (!modelName) {
      throw new Error(`Unknown entity: ${entity}`);
    }
    // biome-ignore lint/suspicious/noExplicitAny: Dynamic model access
    const p = prisma as any;
    const rows = await p[modelName].findMany({
      where: { id, tenantId },
      take: 1,
    });
    return { rows, rowCount: rows.length };
  },

  "entity.list": async (prisma, tenantId, params) => {
    const {
      entity,
      limit = 10,
      offset = 0,
    } = params as {
      entity: string;
      limit?: number;
      offset?: number;
    };
    const modelName = MODEL_MAP[entity];
    if (!modelName) {
      throw new Error(`Unknown entity: ${entity}`);
    }
    // biome-ignore lint/suspicious/noExplicitAny: Dynamic model access
    const p = prisma as any;
    const rows = await p[modelName].findMany({
      where: { tenantId },
      take: Math.min(limit, 50),
      skip: offset,
      orderBy: { createdAt: "desc" },
    });
    return { rows, rowCount: rows.length };
  },

  "outbox.pending": async (prisma, tenantId, params) => {
    const { limit = 50 } = params as { limit?: number };
    // biome-ignore lint/suspicious/noExplicitAny: Dynamic model access
    const p = prisma as any;
    const rows = await p.outboxEvent.findMany({
      where: { tenantId, status: "pending" },
      take: Math.min(limit, 50),
      orderBy: { createdAt: "desc" },
    });
    return { rows, rowCount: rows.length };
  },

  "outbox.byCorrelationId": async (prisma, tenantId, params) => {
    const { correlationId } = params as { correlationId: string };
    // biome-ignore lint/suspicious/noExplicitAny: Dynamic model access
    const p = prisma as any;
    const rows = await p.outboxEvent.findMany({
      where: { tenantId, correlationId },
      orderBy: { createdAt: "asc" },
    });
    return { rows, rowCount: rows.length };
  },

  "events.recent": async (prisma, tenantId, params) => {
    const { sinceMinutes = 60, limit = 50 } = params as {
      sinceMinutes?: number;
      limit?: number;
    };
    const since = new Date(Date.now() - sinceMinutes * 60 * 1000);
    // biome-ignore lint/suspicious/noExplicitAny: Dynamic model access
    const p = prisma as any;
    const rows = await p.outboxEvent.findMany({
      where: { tenantId, createdAt: { gte: since } },
      take: Math.min(limit, 50),
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        eventType: true,
        aggregateType: true,
        aggregateId: true,
        payload: true,
        correlationId: true,
        createdAt: true,
        status: true,
      },
    });
    return { rows, rowCount: rows.length };
  },

  "events.byEntity": async (prisma, tenantId, params) => {
    const {
      entityType,
      entityId,
      limit = 50,
    } = params as {
      entityType: string;
      entityId: string;
      limit?: number;
    };
    // biome-ignore lint/suspicious/noExplicitAny: Dynamic model access
    const p = prisma as any;
    const rows = await p.outboxEvent.findMany({
      where: { tenantId, aggregateType: entityType, aggregateId: entityId },
      take: Math.min(limit, 50),
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        eventType: true,
        aggregateType: true,
        aggregateId: true,
        payload: true,
        correlationId: true,
        createdAt: true,
        status: true,
      },
    });
    return { rows, rowCount: rows.length };
  },
};

/** Exported for tests. */
export const ALLOWED_QUERY_IDS = Object.keys(QUERY_TEMPLATES);

/** Param schemas per template: validate types and reject SQL-like values. */
const PARAM_SCHEMAS: Record<
  string,
  { required: string[]; optional: Record<string, "string" | "number"> }
> = {
  "entity.byId": { required: ["entity", "id"], optional: {} },
  "entity.list": {
    required: ["entity"],
    optional: { limit: "number", offset: "number" },
  },
  "outbox.pending": { required: [], optional: { limit: "number" } },
  "outbox.byCorrelationId": { required: ["correlationId"], optional: {} },
  "events.recent": {
    required: [],
    optional: { sinceMinutes: "number", limit: "number" },
  },
  "events.byEntity": {
    required: ["entityType", "entityId"],
    optional: { limit: "number" },
  },
};

/** Exported for tests. Validates params per template. Safety is from allowlist + parameterization, not keyword scanning. */
export function validateParams(
  queryId: string,
  params: Record<string, unknown>
): void {
  const schema = PARAM_SCHEMAS[queryId];
  if (!schema) return;

  for (const r of schema.required) {
    if (!(r in params) || params[r] === undefined || params[r] === null) {
      throw new Error(`Param '${r}' is required for query ${queryId}`);
    }
  }

  for (const [key, type] of Object.entries(schema.optional)) {
    if (!(key in params) || params[key] === undefined) continue;
    const val = params[key];
    if (type === "number" && typeof val !== "number") {
      throw new Error(`Param '${key}' must be a number for query ${queryId}`);
    }
    if (type === "string" && typeof val !== "string") {
      throw new Error(`Param '${key}' must be a string for query ${queryId}`);
    }
  }
}

// ---------------------------------------------------------------------------
// Plugin
// ---------------------------------------------------------------------------

export const dbVerificationPlugin: McpPlugin = {
  name: "db-verification",
  version: "1.0.0",

  register(ctx: PluginContext) {
    const { server, identity } = ctx;

    // ── db.read ─────────────────────────────────────────────────────────
    server.registerTool(
      "db.read",
      {
        title: "DB Read",
        description:
          "Execute an allowlisted query template. " +
          "No arbitrary SQL - only predefined safe queries. " +
          `Available templates: ${ALLOWED_QUERY_IDS.join(", ")}`,
        inputSchema: z.object({
          queryId: z
            .enum(ALLOWED_QUERY_IDS as [string, ...string[]])
            .describe("Query template ID"),
          params: z
            .record(z.string(), z.unknown())
            .optional()
            .describe("Query parameters"),
        }),
      },
      async (args: { queryId: string; params?: Record<string, unknown> }) => {
        const { queryId, params = {} } = args;

        const handler = QUERY_TEMPLATES[queryId];
        if (!handler) {
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify(
                  {
                    error: `Unknown queryId: ${queryId}`,
                    allowedQueryIds: ALLOWED_QUERY_IDS,
                  },
                  null,
                  2
                ),
              },
            ],
            isError: true,
          };
        }

        try {
          validateParams(queryId, params);
          const prisma = getPrisma();
          const { rows, rowCount } = await handler(
            prisma,
            identity.tenantId,
            params
          );

          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify(
                  {
                    rows,
                    rowCount,
                    queryId,
                    executedAt: new Date().toISOString(),
                  },
                  null,
                  2
                ),
              },
            ],
          };
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify(
                  {
                    error: errorMessage,
                    queryId,
                  },
                  null,
                  2
                ),
              },
            ],
            isError: true,
          };
        }
      }
    );

    // ── outbox.find ─────────────────────────────────────────────────────
    server.registerTool(
      "outbox.find",
      {
        title: "Find Outbox Events",
        description:
          "Query outbox events with filters. " +
          "Returns pending/processed/failed events for tracing.",
        inputSchema: z.object({
          correlationId: z
            .string()
            .optional()
            .describe("Filter by correlation ID"),
          entityId: z.string().optional().describe("Filter by entity ID"),
          eventType: z.string().optional().describe("Filter by event type"),
          status: z
            .enum(["pending", "processed", "failed"])
            .optional()
            .describe("Filter by status"),
          sinceMinutes: z
            .number()
            .int()
            .min(1)
            .max(1440)
            .optional()
            .default(60)
            .describe("Events from last N minutes (max 1440 = 24h)"),
          limit: z
            .number()
            .int()
            .min(1)
            .max(100)
            .optional()
            .default(50)
            .describe("Max results"),
        }),
      },
      async (args: {
        correlationId?: string;
        entityId?: string;
        eventType?: string;
        status?: "pending" | "processed" | "failed";
        sinceMinutes?: number;
        limit?: number;
      }) => {
        const {
          correlationId,
          entityId,
          eventType,
          status,
          sinceMinutes = 60,
          limit = 50,
        } = args;

        try {
          const prisma = getPrisma();
          const since = new Date(Date.now() - sinceMinutes * 60 * 1000);

          const where: Record<string, unknown> = {
            tenantId: identity.tenantId,
            createdAt: { gte: since },
          };

          if (correlationId) where.correlationId = correlationId;
          if (entityId) where.aggregateId = entityId;
          if (eventType) where.eventType = eventType;
          if (status) where.status = status;

          // biome-ignore lint/suspicious/noExplicitAny: Dynamic model access
          const p = prisma as any;
          const rows = await p.outboxEvent.findMany({
            where,
            take: Math.min(limit, 100),
            orderBy: { createdAt: "desc" },
            select: {
              id: true,
              aggregateType: true,
              aggregateId: true,
              eventType: true,
              payload: true,
              status: true,
              correlationId: true,
              createdAt: true,
              processedAt: true,
            },
          });

          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify(
                  {
                    rows,
                    totalCount: rows.length,
                    query: { correlationId, entityId, eventType, status },
                  },
                  null,
                  2
                ),
              },
            ],
          };
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify({ error: errorMessage }, null, 2),
              },
            ],
            isError: true,
          };
        }
      }
    );

    // ── events.find ─────────────────────────────────────────────────────
    server.registerTool(
      "events.find",
      {
        title: "Find Domain Events",
        description:
          "Query domain events with filters. " +
          "Includes provenance information for traceability.",
        inputSchema: z.object({
          eventName: z.string().optional().describe("Filter by event name"),
          correlationId: z
            .string()
            .optional()
            .describe("Filter by correlation ID"),
          entityId: z.string().optional().describe("Filter by entity ID"),
          sinceMinutes: z
            .number()
            .int()
            .min(1)
            .max(1440)
            .optional()
            .default(60)
            .describe("Events from last N minutes"),
          limit: z
            .number()
            .int()
            .min(1)
            .max(100)
            .optional()
            .default(50)
            .describe("Max results"),
        }),
      },
      async (args: {
        eventName?: string;
        correlationId?: string;
        entityId?: string;
        sinceMinutes?: number;
        limit?: number;
      }) => {
        const {
          eventName,
          correlationId,
          entityId,
          sinceMinutes = 60,
          limit = 50,
        } = args;

        try {
          const prisma = getPrisma();
          const since = new Date(Date.now() - sinceMinutes * 60 * 1000);

          const where: Record<string, unknown> = {
            tenantId: identity.tenantId,
            createdAt: { gte: since },
          };

          if (eventName) where.eventName = eventName;
          if (correlationId) where.correlationId = correlationId;
          if (entityId) where.aggregateId = entityId;

          // biome-ignore lint/suspicious/noExplicitAny: Dynamic model access
          const p = prisma as any;
          const rows = await p.domainEvent.findMany({
            where,
            take: Math.min(limit, 100),
            orderBy: { createdAt: "desc" },
            select: {
              id: true,
              eventName: true,
              channel: true,
              payload: true,
              correlationId: true,
              causationId: true,
              aggregateType: true,
              aggregateId: true,
              createdAt: true,
              provenance: true,
            },
          });

          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify(
                  {
                    rows,
                    totalCount: rows.length,
                    query: { eventName, correlationId, entityId },
                  },
                  null,
                  2
                ),
              },
            ],
          };
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify({ error: errorMessage }, null, 2),
              },
            ],
            isError: true,
          };
        }
      }
    );
  },
};
