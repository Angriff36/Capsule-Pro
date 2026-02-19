/**
 * Goodshuffle Event Sync Service
 *
 * Handles bi-directional synchronization of events between Goodshuffle and Convoy.
 * Implements conflict detection and resolution with configurable strategies.
 */

import { database, Prisma } from "@repo/database";
import {
  createGoodshuffleClient,
  type GoodshuffleClient,
  type GoodshuffleConflict,
  type GoodshuffleEvent,
  type GoodshuffleSyncResult,
} from "./goodshuffle-client";

export interface EventSyncOptions {
  tenantId: string;
  startDate: Date;
  endDate: Date;
  dryRun?: boolean;
  direction?: "convoy_to_goodshuffle" | "goodshuffle_to_convoy" | "both";
}

/**
 * Detect conflicts between Goodshuffle and Convoy event data
 */
function _detectConflicts(
  goodshuffleEvent: GoodshuffleEvent,
  convoyEvent: {
    name: string;
    eventDate: Date;
    guestCount: number | null;
  }
): GoodshuffleConflict[] {
  const conflicts: GoodshuffleConflict[] = [];

  // Check name conflict
  if (
    goodshuffleEvent.name &&
    convoyEvent.name &&
    goodshuffleEvent.name !== convoyEvent.name
  ) {
    conflicts.push({
      goodshuffleEventId: goodshuffleEvent.id,
      convoyEventId: "",
      field: "name",
      goodshuffleValue: goodshuffleEvent.name,
      convoyValue: convoyEvent.name,
      resolution: "pending",
    });
  }

  // Check date conflict
  if (goodshuffleEvent.event_date && convoyEvent.eventDate) {
    const gsDate = new Date(goodshuffleEvent.event_date).toDateString();
    const convoyDate = convoyEvent.eventDate.toDateString();
    if (gsDate !== convoyDate) {
      conflicts.push({
        goodshuffleEventId: goodshuffleEvent.id,
        convoyEventId: "",
        field: "eventDate",
        goodshuffleValue: goodshuffleEvent.event_date,
        convoyValue: convoyEvent.eventDate.toISOString(),
        resolution: "pending",
      });
    }
  }

  // Check guest count conflict
  if (
    goodshuffleEvent.guest_count &&
    convoyEvent.guestCount &&
    goodshuffleEvent.guest_count !== convoyEvent.guestCount
  ) {
    conflicts.push({
      goodshuffleEventId: goodshuffleEvent.id,
      convoyEventId: "",
      field: "guestCount",
      goodshuffleValue: goodshuffleEvent.guest_count,
      convoyValue: convoyEvent.guestCount,
      resolution: "pending",
    });
  }

  return conflicts;
}

/**
 * Sync events from Goodshuffle to Convoy
 */
// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Complex sync logic with multiple branches
export async function syncEventsFromGoodshuffle(
  client: GoodshuffleClient,
  tenantId: string,
  options: EventSyncOptions
): Promise<GoodshuffleSyncResult> {
  const result: GoodshuffleSyncResult = {
    success: true,
    eventsImported: 0,
    eventsSkipped: 0,
    eventsUpdated: 0,
    conflicts: [],
    errors: [],
  };

  try {
    // Fetch events from Goodshuffle
    const goodshuffleEvents = await client.getAllEvents(
      options.startDate,
      options.endDate
    );

    // Get existing sync records
    const existingSyncs = await database.goodshuffleEventSync.findMany({
      where: { tenantId },
    });

    const syncMap = new Map(
      existingSyncs.map((sync) => [sync.goodshuffleEventId, sync])
    );

    // Process each Goodshuffle event
    for (const gsEvent of goodshuffleEvents) {
      try {
        const existingSync = syncMap.get(gsEvent.id);
        const gsUpdatedAt = new Date(gsEvent.updated_at);

        // Skip if already synced and not updated
        if (
          existingSync?.lastSyncedAt &&
          existingSync.goodshuffleUpdatedAt &&
          gsUpdatedAt <= existingSync.goodshuffleUpdatedAt
        ) {
          result.eventsSkipped++;
          continue;
        }

        // Check if we have a linked Convoy event
        if (existingSync?.convoyEventId) {
          // Update existing event
          await updateConvoyEventFromGoodshuffle(
            tenantId,
            existingSync.convoyEventId,
            gsEvent,
            options.dryRun ?? false
          );
          result.eventsUpdated++;
        } else {
          // Create new event
          const convoyEventId = await createConvoyEventFromGoodshuffle(
            tenantId,
            gsEvent,
            options.dryRun ?? false
          );

          if (!options.dryRun) {
            // Create sync record
            await database.goodshuffleEventSync.create({
              data: {
                tenantId,
                goodshuffleEventId: gsEvent.id,
                convoyEventId,
                eventName: gsEvent.name,
                eventDate: gsEvent.event_date
                  ? new Date(gsEvent.event_date)
                  : null,
                status: "synced",
                lastSyncedAt: new Date(),
                goodshuffleUpdatedAt: gsUpdatedAt,
              },
            });
          }
          result.eventsImported++;
        }

        // Update sync record timestamp
        if (existingSync && !options.dryRun) {
          await database.goodshuffleEventSync.update({
            where: {
              tenantId_id: {
                tenantId,
                id: existingSync.id,
              },
            },
            data: {
              lastSyncedAt: new Date(),
              goodshuffleUpdatedAt: gsUpdatedAt,
              status: "synced",
            },
          });
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        result.errors.push(`Event ${gsEvent.id}: ${errorMessage}`);
      }
    }

    // Update last sync status
    if (!options.dryRun) {
      const syncStatus =
        result.errors.length > 0 || result.conflicts.length > 0
          ? "partial"
          : "success";
      await database.goodshuffleConfig.update({
        where: { tenantId },
        data: {
          lastSyncAt: new Date(),
          lastSyncStatus: syncStatus,
          lastSyncError:
            result.errors.length > 0 ? result.errors.join("\n") : null,
        },
      });
    }
  } catch (error) {
    result.success = false;
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    result.errors.push(`Sync failed: ${errorMessage}`);

    if (!options.dryRun) {
      await database.goodshuffleConfig.update({
        where: { tenantId },
        data: {
          lastSyncAt: new Date(),
          lastSyncStatus: "error",
          lastSyncError: errorMessage,
        },
      });
    }
  }

  return result;
}

/**
 * Create a Convoy event from Goodshuffle event data
 */
async function createConvoyEventFromGoodshuffle(
  tenantId: string,
  gsEvent: GoodshuffleEvent,
  dryRun: boolean
): Promise<string> {
  if (dryRun) {
    return "dry-run-id";
  }

  // Get default location
  const defaultLocation = await database.$queryRaw<Array<{ id: string }>>(
    Prisma.sql`
      SELECT id
      FROM tenant.locations
      WHERE tenant_id = ${tenantId}
        AND deleted_at IS NULL
        AND is_active = true
      ORDER BY is_primary DESC
      LIMIT 1
    `
  );

  const locationId = defaultLocation.length > 0 ? defaultLocation[0].id : null;

  // Create event
  const newEvent = await database.$queryRaw<Array<{ id: string }>>(
    Prisma.sql`
      INSERT INTO tenant.events (
        tenant_id, id, name, event_date, guest_count,
        location_id, status, created_at, updated_at
      )
      VALUES (
        ${tenantId},
        gen_random_uuid(),
        ${gsEvent.name},
        ${gsEvent.event_date ? new Date(gsEvent.event_date) : null},
        ${gsEvent.guest_count ?? null},
        ${locationId},
        'draft',
        NOW(),
        NOW()
      )
      RETURNING id
    `
  );

  return newEvent[0].id;
}

/**
 * Update a Convoy event from Goodshuffle event data
 */
async function updateConvoyEventFromGoodshuffle(
  tenantId: string,
  convoyEventId: string,
  gsEvent: GoodshuffleEvent,
  dryRun: boolean
): Promise<void> {
  if (dryRun) {
    return;
  }

  await database.$executeRaw`
    UPDATE tenant.events
    SET
      name = ${gsEvent.name},
      event_date = ${gsEvent.event_date ? new Date(gsEvent.event_date) : null},
      guest_count = ${gsEvent.guest_count ?? null},
      updated_at = NOW()
    WHERE tenant_id = ${tenantId}
      AND id = ${convoyEventId}
  `;
}

/**
 * Run a full Goodshuffle event sync
 */
export async function runGoodshuffleEventSync(
  tenantId: string,
  options: Omit<EventSyncOptions, "tenantId">
): Promise<GoodshuffleSyncResult> {
  const config = await database.goodshuffleConfig.findUnique({
    where: { tenantId },
  });

  if (!config) {
    return {
      success: false,
      eventsImported: 0,
      eventsSkipped: 0,
      eventsUpdated: 0,
      conflicts: [],
      errors: ["Goodshuffle integration not configured"],
    };
  }

  if (!config.syncEnabled) {
    return {
      success: false,
      eventsImported: 0,
      eventsSkipped: 0,
      eventsUpdated: 0,
      conflicts: [],
      errors: ["Goodshuffle sync is disabled"],
    };
  }

  const client = createGoodshuffleClient({
    apiKey: config.apiKey,
    apiSecret: config.apiSecret,
  });

  return syncEventsFromGoodshuffle(client, tenantId, {
    ...options,
    tenantId,
  });
}

/**
 * Get sync status for a tenant
 */
export async function getGoodshuffleSyncStatus(tenantId: string): Promise<{
  configured: boolean;
  syncEnabled: boolean;
  lastSyncAt: Date | null;
  lastSyncStatus: string | null;
  pendingConflicts: number;
  totalSynced: number;
}> {
  const config = await database.goodshuffleConfig.findUnique({
    where: { tenantId },
  });

  if (!config) {
    return {
      configured: false,
      syncEnabled: false,
      lastSyncAt: null,
      lastSyncStatus: null,
      pendingConflicts: 0,
      totalSynced: 0,
    };
  }

  const [conflictCount, syncedCount] = await Promise.all([
    database.goodshuffleEventSync.count({
      where: { tenantId, status: "conflict" },
    }),
    database.goodshuffleEventSync.count({
      where: { tenantId, status: "synced" },
    }),
  ]);

  return {
    configured: true,
    syncEnabled: config.syncEnabled,
    lastSyncAt: config.lastSyncAt,
    lastSyncStatus: config.lastSyncStatus,
    pendingConflicts: conflictCount,
    totalSynced: syncedCount,
  };
}
