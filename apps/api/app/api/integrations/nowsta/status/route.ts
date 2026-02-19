/**
 * GET /api/integrations/nowsta/status
 *
 * Get current Nowsta sync status and statistics
 */

import { auth } from "@repo/auth/server";
import { database, Prisma } from "@repo/database";
import { type NextRequest, NextResponse } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";

/**
 * GET /api/integrations/nowsta/status
 * Get sync status and statistics
 */
export async function GET(_request: NextRequest) {
  try {
    const { orgId } = await auth();
    if (!orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tenantId = await getTenantIdForOrg(orgId);
    if (!tenantId) {
      return NextResponse.json({ error: "No tenant found" }, { status: 401 });
    }

    // Get config with sync status
    const config = await database.nowstaConfig.findUnique({
      where: { tenantId },
      select: {
        syncEnabled: true,
        lastSyncAt: true,
        lastSyncStatus: true,
        lastSyncError: true,
        autoSyncInterval: true,
      },
    });

    if (!config) {
      return NextResponse.json({
        configured: false,
        syncEnabled: false,
        lastSync: null,
        statistics: null,
      });
    }

    // Get employee mapping statistics
    const employeeMappingStats = await database.$queryRaw<
      [{ total: bigint; autoMapped: bigint; confirmed: bigint }]
    >(
      Prisma.sql`
        SELECT
          COUNT(*)::bigint AS total,
          COUNT(*) FILTER (WHERE auto_mapped = true)::bigint AS "autoMapped",
          COUNT(*) FILTER (WHERE confirmed_at IS NOT NULL)::bigint AS "confirmed"
        FROM tenant_admin.nowsta_employee_mappings
        WHERE tenant_id = ${tenantId}
      `
    );

    // Get shift sync statistics
    const shiftSyncStats = await database.$queryRaw<
      [{ total: bigint; synced: bigint; pending: bigint; error: bigint }]
    >(
      Prisma.sql`
        SELECT
          COUNT(*)::bigint AS total,
          COUNT(*) FILTER (WHERE status = 'synced')::bigint AS "synced",
          COUNT(*) FILTER (WHERE status = 'pending')::bigint AS "pending",
          COUNT(*) FILTER (WHERE status = 'error')::bigint AS "error"
        FROM tenant_admin.nowsta_shift_syncs
        WHERE tenant_id = ${tenantId}
      `
    );

    // Get recent sync errors
    const recentErrors = await database.$queryRaw<
      Array<{
        nowstaShiftId: string;
        syncError: string | null;
        updatedAt: Date;
      }>
    >(
      Prisma.sql`
        SELECT
          nowsta_shift_id AS "nowstaShiftId",
          sync_error AS "syncError",
          updated_at AS "updatedAt"
        FROM tenant_admin.nowsta_shift_syncs
        WHERE tenant_id = ${tenantId}
          AND status = 'error'
        ORDER BY updated_at DESC
        LIMIT 10
      `
    );

    return NextResponse.json({
      configured: true,
      syncEnabled: config.syncEnabled,
      autoSyncInterval: config.autoSyncInterval,
      lastSync: config.lastSyncAt
        ? {
            at: config.lastSyncAt,
            status: config.lastSyncStatus,
            error: config.lastSyncError,
          }
        : null,
      statistics: {
        employeeMappings: {
          total: Number(employeeMappingStats[0].total),
          autoMapped: Number(employeeMappingStats[0].autoMapped),
          confirmed: Number(employeeMappingStats[0].confirmed),
        },
        shiftSyncs: {
          total: Number(shiftSyncStats[0].total),
          synced: Number(shiftSyncStats[0].synced),
          pending: Number(shiftSyncStats[0].pending),
          error: Number(shiftSyncStats[0].error),
        },
        recentErrors: recentErrors.map((e) => ({
          shiftId: e.nowstaShiftId,
          error: e.syncError,
          at: e.updatedAt,
        })),
      },
    });
  } catch (error) {
    console.error("Failed to get Nowsta status:", error);
    return NextResponse.json(
      { error: "Failed to get status" },
      { status: 500 }
    );
  }
}
