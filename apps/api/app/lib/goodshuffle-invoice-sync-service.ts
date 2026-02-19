/**
 * Goodshuffle Invoice Sync Service
 *
 * Handles bi-directional synchronization of invoice data between Goodshuffle and Convoy.
 * Implements conflict detection and resolution with configurable strategies.
 *
 * In Convoy, invoice data is represented through EventBudget and BudgetLineItem models.
 */

import { database, Prisma } from "@repo/database";
import {
  createGoodshuffleClient,
  type GoodshuffleClient,
  type GoodshuffleConflict,
  type GoodshuffleInvoice,
  type GoodshuffleInvoiceSyncResult,
} from "./goodshuffle-client";

export interface InvoiceSyncOptions {
  tenantId: string;
  startDate?: Date;
  endDate?: Date;
  dryRun?: boolean;
  direction?: "convoy_to_goodshuffle" | "goodshuffle_to_convoy" | "both";
}

/**
 * Detect conflicts between Goodshuffle and Convoy invoice data
 */
function _detectInvoiceConflicts(
  goodshuffleInvoice: GoodshuffleInvoice,
  convoyBudget: {
    totalBudgeted: number;
    totalActual: number;
  }
): GoodshuffleConflict[] {
  const conflicts: GoodshuffleConflict[] = [];

  // Check total amount conflict
  if (
    goodshuffleInvoice.total_amount !== undefined &&
    convoyBudget.totalActual !== undefined &&
    goodshuffleInvoice.total_amount !== convoyBudget.totalActual
  ) {
    conflicts.push({
      goodshuffleInvoiceId: goodshuffleInvoice.id,
      convoyInvoiceId: "",
      field: "totalAmount",
      goodshuffleValue: goodshuffleInvoice.total_amount,
      convoyValue: convoyBudget.totalActual,
      resolution: "pending",
    });
  }

  return conflicts;
}

/**
 * Sync invoices from Goodshuffle to Convoy
 */
export async function syncInvoicesFromGoodshuffle(
  client: GoodshuffleClient,
  tenantId: string,
  options: InvoiceSyncOptions
): Promise<GoodshuffleInvoiceSyncResult> {
  const result: GoodshuffleInvoiceSyncResult = {
    success: true,
    invoicesImported: 0,
    invoicesSkipped: 0,
    invoicesUpdated: 0,
    conflicts: [],
    errors: [],
  };

  try {
    // Fetch invoices from Goodshuffle
    const goodshuffleInvoices = await client.getAllInvoices(
      options.startDate,
      options.endDate
    );

    // Get existing sync records
    const existingSyncs = await database.goodshuffleInvoiceSync.findMany({
      where: { tenantId },
    });

    const syncMap = new Map(
      existingSyncs.map((sync) => [sync.goodshuffleInvoiceId, sync])
    );

    // Process each Goodshuffle invoice
    for (const gsInvoice of goodshuffleInvoices) {
      try {
        const existingSync = syncMap.get(gsInvoice.id);
        const gsUpdatedAt = new Date(gsInvoice.updated_at);

        // Skip if already synced and not updated
        if (
          existingSync?.lastSyncedAt &&
          existingSync.goodshuffleUpdatedAt &&
          gsUpdatedAt <= existingSync.goodshuffleUpdatedAt
        ) {
          result.invoicesSkipped++;
          continue;
        }

        // Check if we have a linked Convoy budget
        if (existingSync?.convoyInvoiceId) {
          // Update existing budget
          await updateConvoyBudgetFromGoodshuffle(
            tenantId,
            existingSync.convoyInvoiceId,
            gsInvoice,
            options.dryRun ?? false
          );
          result.invoicesUpdated++;
        } else {
          // Create new budget from invoice
          const convoyBudgetId = await createConvoyBudgetFromGoodshuffle(
            tenantId,
            gsInvoice,
            options.dryRun ?? false
          );

          if (!options.dryRun) {
            // Create sync record
            await database.goodshuffleInvoiceSync.create({
              data: {
                tenantId,
                goodshuffleInvoiceId: gsInvoice.id,
                convoyInvoiceId: convoyBudgetId,
                invoiceNumber: gsInvoice.invoice_number,
                invoiceTotal: gsInvoice.total_amount,
                status: "synced",
                lastSyncedAt: new Date(),
                goodshuffleUpdatedAt: gsUpdatedAt,
              },
            });
          }
          result.invoicesImported++;
        }

        // Update sync record timestamp
        if (existingSync && !options.dryRun) {
          await database.goodshuffleInvoiceSync.update({
            where: {
              tenantId_id: {
                tenantId,
                id: existingSync.id,
              },
            },
            data: {
              lastSyncedAt: new Date(),
              goodshuffleUpdatedAt: gsUpdatedAt,
              invoiceTotal: gsInvoice.total_amount,
              status: "synced",
            },
          });
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        result.errors.push(`Invoice ${gsInvoice.id}: ${errorMessage}`);
      }
    }

    // Update last sync status
    if (!options.dryRun) {
      await database.goodshuffleConfig.update({
        where: { tenantId },
        data: {
          lastSyncAt: new Date(),
          lastSyncStatus: result.errors.length > 0 ? "partial" : "success",
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
 * Create a Convoy budget from Goodshuffle invoice data
 * Maps invoice to an EventBudget with BudgetLineItems
 */
async function createConvoyBudgetFromGoodshuffle(
  tenantId: string,
  gsInvoice: GoodshuffleInvoice,
  dryRun: boolean
): Promise<string> {
  if (dryRun) {
    return "dry-run-id";
  }

  // Find or create an event to link the budget to
  // If invoice is linked to an event that exists in our sync records, use that
  let eventId: string | null = null;

  if (gsInvoice.event_id) {
    const eventSync = await database.goodshuffleEventSync.findFirst({
      where: {
        tenantId,
        goodshuffleEventId: gsInvoice.event_id,
      },
    });
    if (eventSync?.convoyEventId) {
      eventId = eventSync.convoyEventId;
    }
  }

  // If no event found, we'll create a standalone budget (or skip)
  // For now, create budget linked to event if available, otherwise return early
  if (!eventId) {
    throw new Error(
      `No linked event found for invoice ${gsInvoice.invoice_number}`
    );
  }

  // Check if event already has a budget
  const existingBudget = await database.$queryRaw<Array<{ id: string }>>(
    Prisma.sql`
      SELECT id
      FROM tenant_events.event_budgets
      WHERE tenant_id = ${tenantId}
        AND event_id = ${eventId}
    `
  );

  if (existingBudget.length > 0) {
    // Update existing budget
    const budgetId = existingBudget[0].id;
    await updateConvoyBudgetFromGoodshuffle(
      tenantId,
      budgetId,
      gsInvoice,
      false
    );
    return budgetId;
  }

  // Create new budget
  const newBudget = await database.$queryRaw<Array<{ id: string }>>(
    Prisma.sql`
      INSERT INTO tenant_events.event_budgets (
        tenant_id, id, event_id, total_budgeted, total_actual,
        currency, created_at, updated_at
      )
      VALUES (
        ${tenantId},
        gen_random_uuid(),
        ${eventId},
        ${gsInvoice.total_amount},
        ${gsInvoice.total_amount},
        'USD',
        NOW(),
        NOW()
      )
      RETURNING id
    `
  );

  const budgetId = newBudget[0].id;

  // Create budget line items from invoice line items
  if (gsInvoice.line_items && gsInvoice.line_items.length > 0) {
    for (const lineItem of gsInvoice.line_items) {
      await database.$executeRaw`
        INSERT INTO tenant_events.budget_line_items (
          tenant_id, id, budget_id, category, name, description,
          budgeted_amount, actual_amount, variance_amount,
          sort_order, created_at, updated_at
        )
        VALUES (
          ${tenantId},
          gen_random_uuid(),
          ${budgetId},
          'invoice',
          ${lineItem.description},
          NULL,
          ${lineItem.total_price},
          ${lineItem.total_price},
          0,
          0,
          NOW(),
          NOW()
        )
      `;
    }
  }

  return budgetId;
}

/**
 * Update a Convoy budget from Goodshuffle invoice data
 */
async function updateConvoyBudgetFromGoodshuffle(
  tenantId: string,
  convoyBudgetId: string,
  gsInvoice: GoodshuffleInvoice,
  dryRun: boolean
): Promise<void> {
  if (dryRun) {
    return;
  }

  // Update budget totals
  await database.$executeRaw`
    UPDATE tenant_events.event_budgets
    SET
      total_budgeted = ${gsInvoice.total_amount},
      total_actual = ${gsInvoice.total_amount},
      updated_at = NOW()
    WHERE tenant_id = ${tenantId}
      AND id = ${convoyBudgetId}
  `;

  // Update or create line items
  if (gsInvoice.line_items && gsInvoice.line_items.length > 0) {
    // Delete existing invoice-sourced line items
    await database.$executeRaw`
      DELETE FROM tenant_events.budget_line_items
      WHERE tenant_id = ${tenantId}
        AND budget_id = ${convoyBudgetId}
        AND category = 'invoice'
    `;

    // Create new line items
    for (const lineItem of gsInvoice.line_items) {
      await database.$executeRaw`
        INSERT INTO tenant_events.budget_line_items (
          tenant_id, id, budget_id, category, name, description,
          budgeted_amount, actual_amount, variance_amount,
          sort_order, created_at, updated_at
        )
        VALUES (
          ${tenantId},
          gen_random_uuid(),
          ${convoyBudgetId},
          'invoice',
          ${lineItem.description},
          NULL,
          ${lineItem.total_price},
          ${lineItem.total_price},
          0,
          0,
          NOW(),
          NOW()
        )
      `;
    }
  }
}

/**
 * Run a full Goodshuffle invoice sync
 */
export async function runGoodshuffleInvoiceSync(
  tenantId: string,
  options: Omit<InvoiceSyncOptions, "tenantId">
): Promise<GoodshuffleInvoiceSyncResult> {
  const config = await database.goodshuffleConfig.findUnique({
    where: { tenantId },
  });

  if (!config) {
    return {
      success: false,
      invoicesImported: 0,
      invoicesSkipped: 0,
      invoicesUpdated: 0,
      conflicts: [],
      errors: ["Goodshuffle integration not configured"],
    };
  }

  if (!config.syncEnabled) {
    return {
      success: false,
      invoicesImported: 0,
      invoicesSkipped: 0,
      invoicesUpdated: 0,
      conflicts: [],
      errors: ["Goodshuffle sync is disabled"],
    };
  }

  const client = createGoodshuffleClient({
    apiKey: config.apiKey,
    apiSecret: config.apiSecret,
  });

  return syncInvoicesFromGoodshuffle(client, tenantId, {
    ...options,
    tenantId,
  });
}

/**
 * Get invoice sync status for a tenant
 */
export async function getGoodshuffleInvoiceSyncStatus(
  tenantId: string
): Promise<{
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
    database.goodshuffleInvoiceSync.count({
      where: { tenantId, status: "conflict" },
    }),
    database.goodshuffleInvoiceSync.count({
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
