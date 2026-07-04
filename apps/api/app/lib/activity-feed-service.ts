/**
 * Activity Feed Service
 *
 * Handles aggregation and recording of activities across all domains.
 * Transforms entity changes, AI operations, and collaborator actions into a unified feed.
 */

import { analyticsDatabase, database, type Prisma } from "@repo/database";

export interface ActivityCreateInput {
  action: string;
  activityType:
    | "entity_change"
    | "ai_approval"
    | "collaborator_action"
    | "system_event";
  correlationId?: string;
  description?: string;
  entityId?: string;
  entityType?: string;
  importance?: "low" | "normal" | "high" | "urgent";
  metadata?: Record<string, unknown>;
  parentId?: string;
  performedBy?: string;
  performerName?: string;
  sourceId?: string;
  sourceType?:
    | "manifest_command"
    | "ai_generation"
    | "direct_action"
    | "webhook";
  tenantId: string;
  title: string;
  visibility?: "all" | "admins" | "performers";
}

export interface ActivityFilterOptions {
  activityType?: string;
  correlationId?: string;
  endDate?: Date;
  entityId?: string;
  entityType?: string;
  importance?: string;
  limit?: number;
  offset?: number;
  performedBy?: string;
  sourceType?: string;
  startDate?: Date;
}

/**
 * Create a new activity entry
 */
export async function createActivity(
  input: ActivityCreateInput
): Promise<void> {
  await database.activityFeed.create({
    data: {
      tenantId: input.tenantId,
      activityType: input.activityType,
      entityType: input.entityType,
      entityId: input.entityId,
      action: input.action,
      title: input.title,
      description: input.description,
      metadata: input.metadata as Prisma.InputJsonValue,
      performedBy: input.performedBy,
      performerName: input.performerName,
      correlationId: input.correlationId,
      parentId: input.parentId,
      sourceType: input.sourceType,
      sourceId: input.sourceId,
      importance: input.importance ?? "normal",
      visibility: input.visibility ?? "all",
    },
  });
}

/**
 * Create multiple activity entries in a batch
 */
export async function createActivities(
  activities: ActivityCreateInput[]
): Promise<void> {
  if (activities.length === 0) {
    return;
  }

  await database.activityFeed.createMany({
    data: activities.map((a) => ({
      tenantId: a.tenantId,
      activityType: a.activityType,
      entityType: a.entityType,
      entityId: a.entityId,
      action: a.action,
      title: a.title,
      description: a.description,
      metadata: a.metadata as Prisma.InputJsonValue,
      performedBy: a.performedBy,
      performerName: a.performerName,
      correlationId: a.correlationId,
      parentId: a.parentId,
      sourceType: a.sourceType,
      sourceId: a.sourceId,
      importance: a.importance ?? "normal",
      visibility: a.visibility ?? "all",
    })),
  });
}

/**
 * Record an entity change activity from Manifest command execution
 */
export async function recordEntityChange(
  tenantId: string,
  entityType: string,
  entityId: string,
  action: string,
  entityName: string,
  performedBy?: string,
  performerName?: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  const title = getEntityChangeTitle(action, entityType, entityName);
  const description = getEntityChangeDescription(
    action,
    entityType,
    entityName
  );

  await createActivity({
    tenantId,
    activityType: "entity_change",
    entityType,
    entityId,
    action,
    title,
    description,
    metadata,
    performedBy,
    performerName,
    sourceType: "manifest_command",
  });
}

/**
 * Record an AI plan approval activity
 */
export async function recordAIApproval(
  tenantId: string,
  planId: string,
  planName: string,
  performedBy: string,
  performerName: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  await createActivity({
    tenantId,
    activityType: "ai_approval",
    action: "approved",
    title: `AI Plan "${planName}" Approved`,
    description: `${performerName} approved the AI-generated plan "${planName}"`,
    metadata,
    performedBy,
    performerName,
    correlationId: planId,
    sourceType: "ai_generation",
    sourceId: planId,
    importance: "high",
  });
}

/**
 * Record a collaborator action
 */
export async function recordCollaboratorAction(
  tenantId: string,
  action: string,
  title: string,
  description: string,
  performedBy: string,
  performerName: string,
  entityType?: string,
  entityId?: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  await createActivity({
    tenantId,
    activityType: "collaborator_action",
    entityType,
    entityId,
    action,
    title,
    description,
    metadata,
    performedBy,
    performerName,
    sourceType: "direct_action",
  });
}

/**
 * Record a system event
 */
export async function recordSystemEvent(
  tenantId: string,
  eventType: string,
  title: string,
  description?: string,
  metadata?: Record<string, unknown>,
  importance: "low" | "normal" | "high" | "urgent" = "normal"
): Promise<void> {
  await createActivity({
    tenantId,
    activityType: "system_event",
    action: eventType,
    title,
    description,
    metadata,
    importance,
    visibility: "all",
  });
}

/**
 * Get activities with filtering
 */
export async function getActivities(
  tenantId: string,
  options: ActivityFilterOptions = {}
): Promise<{ activities: unknown[]; hasMore: boolean; totalCount: number }> {
  const where: Prisma.ActivityFeedWhereInput = { tenantId };

  if (options.activityType) {
    where.activityType = options.activityType;
  }
  if (options.entityType) {
    where.entityType = options.entityType;
  }
  if (options.entityId) {
    where.entityId = options.entityId;
  }
  if (options.performedBy) {
    where.performedBy = options.performedBy;
  }
  if (options.importance) {
    where.importance = options.importance;
  }
  if (options.sourceType) {
    where.sourceType = options.sourceType;
  }
  if (options.correlationId) {
    where.correlationId = options.correlationId;
  }

  // Add date range filters if provided
  if (options.startDate || options.endDate) {
    where.createdAt = { gte: options.startDate, lte: options.endDate };
  }

  const limit = Math.min(options.limit ?? 50, 200);
  const offset = options.offset ?? 0;

  // Get total count for pagination
  const totalCount = await database.activityFeed.count({ where });

  // Fetch activities with pagination
  const activities = await database.activityFeed.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: limit,
    skip: offset,
  });

  const hasMore = offset + activities.length < totalCount;

  return { activities, hasMore, totalCount };
}

/**
 * Get activities for a specific entity
 */
export async function getEntityActivities(
  tenantId: string,
  entityType: string,
  entityId: string,
  limit = 20
): Promise<unknown[]> {
  return database.activityFeed.findMany({
    where: {
      tenantId,
      entityType,
      entityId,
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

/**
 * Get activities performed by a specific user
 */
export async function getUserActivities(
  tenantId: string,
  userId: string,
  limit = 20
): Promise<unknown[]> {
  return database.activityFeed.findMany({
    where: {
      tenantId,
      performedBy: userId,
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

/**
 * Get activities by correlation ID (for grouped operations)
 */
export async function getCorrelatedActivities(
  tenantId: string,
  correlationId: string
): Promise<unknown[]> {
  return database.activityFeed.findMany({
    where: {
      tenantId,
      correlationId,
    },
    orderBy: { createdAt: "asc" },
  });
}

/**
 * Generate human-readable title for entity changes
 */
function getEntityChangeTitle(
  action: string,
  entityType: string,
  entityName: string
): string {
  const actionText = getActionText(action);
  const typeText = formatEntityType(entityType);
  return `${typeText} "${entityName}" ${actionText}`;
}

/**
 * Generate human-readable description for entity changes
 */
function getEntityChangeDescription(
  action: string,
  entityType: string,
  entityName: string
): string {
  const actionText = getActionDescription(action);
  const typeText = formatEntityType(entityType).toLowerCase();
  return `${actionText} ${typeText} "${entityName}"`;
}

/**
 * Get user-friendly text for an action
 */
function getActionText(action: string): string {
  const actionMap: Record<string, string> = {
    create: "Created",
    created: "Created",
    update: "Updated",
    updated: "Updated",
    delete: "Deleted",
    deleted: "Deleted",
    softDelete: "Deleted",
    claim: "Claimed",
    claimed: "Claimed",
    unclaim: "Unclaimed",
    unclaimed: "Unclaimed",
    complete: "Completed",
    completed: "Completed",
    start: "Started",
    started: "Started",
    approve: "Approved",
    approved: "Approved",
    reject: "Rejected",
    rejected: "Rejected",
    publish: "Published",
    published: "Published",
    archive: "Archived",
    archived: "Archived",
  };

  return actionMap[action] || action.charAt(0).toUpperCase() + action.slice(1);
}

/**
 * Get description text for an action
 */
function getActionDescription(action: string): string {
  const descMap: Record<string, string> = {
    create: "Created",
    created: "Created",
    update: "Updated",
    updated: "Updated",
    delete: "Deleted",
    deleted: "Deleted",
    softDelete: "Deleted",
    claim: "Claimed",
    claimed: "Claimed",
    unclaim: "Unclaimed",
    unclaimed: "Unclaimed",
    complete: "Completed",
    completed: "Completed",
    start: "Started",
    started: "Started",
    approve: "Approved",
    approved: "Approved",
    reject: "Rejected",
    rejected: "Rejected",
    publish: "Published",
    published: "Published",
    archive: "Archived",
    archived: "Archived",
  };

  return descMap[action] ?? action;
}

/**
 * Format entity type for display
 */
function formatEntityType(entityType: string): string {
  // Handle common pluralizations
  if (entityType.endsWith("ies")) {
    return `${entityType.slice(0, -3)}y`;
  }
  if (entityType.endsWith("ses") || entityType.endsWith("xes")) {
    return entityType.slice(0, -2);
  }
  if (entityType.endsWith("s") && !entityType.endsWith("ss")) {
    return entityType.slice(0, -1);
  }
  return entityType;
}

/**
 * Get activity statistics for a tenant
 */
const READ_ONLY_COMMANDS = new Set([
  "get",
  "list",
  "find",
  "search",
  "count",
  "export",
]);

/**
 * Map append-only reaction_logs rows into ActivityFeed-shaped items when the
 * governed ActivityFeed table has no rows yet (historical observability data).
 */
export function mapReactionLogsToFeedItems(
  logs: Array<{
    id: string;
    tenantId: string;
    entity: string | null;
    command: string;
    status: string;
    emittedEvents: string[];
    errorMessage: string | null;
    actorId: string | null;
    correlationId: string | null;
    createdAt: Date;
  }>
): Array<{
  id: string;
  tenantId: string;
  activityType: string;
  entityType: string | null;
  entityId: string | null;
  action: string;
  title: string;
  description: string | null;
  metadata: Record<string, unknown> | null;
  performedBy: string | null;
  performerName: string | null;
  correlationId: string | null;
  parentId: string | null;
  sourceType: string | null;
  sourceId: string | null;
  importance: string;
  visibility: string;
  createdAt: Date;
}> {
  return logs.map((log) => {
    const entityLabel = log.entity ?? "System";
    const failed = log.status === "failed";
    const events =
      log.emittedEvents.length > 0 ? log.emittedEvents.join(", ") : null;

    return {
      id: log.id,
      tenantId: log.tenantId,
      activityType: failed ? "system_event" : "entity_change",
      entityType: log.entity,
      entityId: null,
      action: log.command,
      title: failed
        ? `${entityLabel}.${log.command} failed`
        : `${entityLabel}.${log.command}`,
      description: failed
        ? (log.errorMessage ?? "Command failed")
        : events
          ? `Emitted ${events}`
          : `${entityLabel} ${log.command} completed`,
      metadata: {
        source: "reaction_logs",
        status: log.status,
        emittedEvents: log.emittedEvents,
      },
      performedBy: log.actorId,
      performerName: null,
      correlationId: log.correlationId,
      parentId: null,
      sourceType: "manifest_command",
      sourceId: null,
      importance: failed ? "high" : "normal",
      visibility: "all",
      createdAt: log.createdAt,
    };
  });
}

export async function getReactionLogActivities(
  tenantId: string,
  options: ActivityFilterOptions = {}
): Promise<{ activities: unknown[]; hasMore: boolean; totalCount: number }> {
  const limit = Math.min(options.limit ?? 50, 200);
  const offset = options.offset ?? 0;

  const where = {
    tenantId,
    ...(options.entityType ? { entity: options.entityType } : {}),
    ...(options.startDate || options.endDate
      ? {
          createdAt: {
            gte: options.startDate,
            lte: options.endDate,
          },
        }
      : {}),
  };

  const [totalCount, logs] = await Promise.all([
    analyticsDatabase.reactionLog.count({ where }),
    analyticsDatabase.reactionLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    }),
  ]);

  const activities = mapReactionLogsToFeedItems(logs);
  return {
    activities,
    hasMore: offset + activities.length < totalCount,
    totalCount,
  };
}

export async function getActivityStats(tenantId: string): Promise<{
  totalActivities: number;
  todayCount: number;
  weekCount: number;
  byType: Record<string, number>;
  byEntity: Record<string, number>;
}> {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekStart = new Date(todayStart);
  weekStart.setDate(weekStart.getDate() - 7);

  const [total, today, week, byTypeResult, byEntityResult] = await Promise.all([
    database.activityFeed.count({ where: { tenantId } }),
    database.activityFeed.count({
      where: {
        tenantId,
        createdAt: { gte: todayStart },
      },
    }),
    database.activityFeed.count({
      where: {
        tenantId,
        createdAt: { gte: weekStart },
      },
    }),
    database.$queryRaw<Array<{ activity_type: string; count: bigint }>>`
      SELECT activity_type, COUNT(*) as count
      FROM tenant_admin."ActivityFeed"
      WHERE tenant_id = ${tenantId}
      GROUP BY activity_type
    `,
    database.$queryRaw<Array<{ entity_type: string; count: bigint }>>`
      SELECT COALESCE(entity_type, 'unknown') as entity_type, COUNT(*) as count
      FROM tenant_admin."ActivityFeed"
      WHERE tenant_id = ${tenantId} AND entity_type IS NOT NULL
      GROUP BY entity_type
      ORDER BY count DESC
      LIMIT 10
    `,
  ]);

  const byType: Record<string, number> = {};
  for (const row of byTypeResult) {
    byType[row.activity_type] = Number(row.count);
  }

  const byEntity: Record<string, number> = {};
  for (const row of byEntityResult) {
    byEntity[row.entity_type] = Number(row.count);
  }

  if (total > 0) {
    return {
      totalActivities: total,
      todayCount: today,
      weekCount: week,
      byType,
      byEntity,
    };
  }

  const reactionTotal = await analyticsDatabase.reactionLog.count({ where: { tenantId } });
  if (reactionTotal === 0) {
    return {
      totalActivities: 0,
      todayCount: 0,
      weekCount: 0,
      byType: {},
      byEntity: {},
    };
  }

  const [reactionToday, reactionWeek] = await Promise.all([
    analyticsDatabase.reactionLog.count({
      where: { tenantId, createdAt: { gte: todayStart } },
    }),
    analyticsDatabase.reactionLog.count({
      where: { tenantId, createdAt: { gte: weekStart } },
    }),
  ]);

  return {
    totalActivities: reactionTotal,
    todayCount: reactionToday,
    weekCount: reactionWeek,
    byType: { entity_change: reactionTotal },
    byEntity: {},
  };
}

/**
 * Fire-and-forget activity row for a successful governed command.
 */
export function recordManifestCommandActivity(
  tenantId: string,
  entityType: string,
  entityId: string,
  command: string,
  result: Record<string, unknown>,
  performedBy?: string,
  correlationId?: string
): void {
  if (READ_ONLY_COMMANDS.has(command)) {
    return;
  }

  const entityName = String(
    result.name ?? result.title ?? result.label ?? entityId
  );

  void recordEntityChange(
    tenantId,
    entityType,
    entityId,
    command,
    entityName,
    performedBy,
    undefined,
    {
      correlationId,
      source: "manifest_command",
    }
  ).catch(() => {
    // Observability must not break command execution.
  });
}
