/**
 * Cron endpoint for automatic integration sync (Goodshuffle & Nowsta).
 *
 * Queries all tenant configs where `autoSyncInterval` is set, checks whether
 * a sync is due based on `lastSyncAt + autoSyncInterval` minutes, and
 * dispatches the sync service directly.
 *
 * GET /api/cron/integration-auto-sync
 *
 * Authentication: Authorization: Bearer <CRON_SECRET>
 * - If CRON_SECRET env var is not set, returns 503 (not configured)
 * - If header doesn't match, returns 401 (unauthorized)
 *
 * Response: { goodshuffle: { checked: N, synced: N, errors: N }, nowsta: { checked: N, synced: N, errors: N }, timestamp: string }
 */

import { database } from "@repo/database";
import { log } from "@repo/observability/log";
import { captureException } from "@sentry/nextjs";
import { NextResponse } from "next/server";

import { runGoodshuffleEventSync } from "@/app/lib/goodshuffle-event-sync-service";
import { runNowstaSync } from "@/app/lib/nowsta-sync-service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Default sync window: look back 30 days, forward 7 days
const SYNC_LOOKBACK_DAYS = 30;
const SYNC_LOOKAHEAD_DAYS = 7;

function isSyncDue(lastSyncAt: Date | null, intervalMinutes: number): boolean {
  if (!lastSyncAt) {
    return true;
  }
  const nextSyncAt = new Date(
    lastSyncAt.getTime() + intervalMinutes * 60 * 1000
  );
  return nextSyncAt <= new Date();
}

function buildSyncDateRange() {
  const now = new Date();
  const startDate = new Date(now);
  startDate.setDate(startDate.getDate() - SYNC_LOOKBACK_DAYS);
  const endDate = new Date(now);
  endDate.setDate(endDate.getDate() + SYNC_LOOKAHEAD_DAYS);
  return { startDate, endDate };
}

export async function GET(request: Request): Promise<NextResponse> {
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    log.error(
      "[integration-auto-sync] CRON_SECRET environment variable is not configured"
    );
    return NextResponse.json(
      { error: "Cron endpoint not configured" },
      { status: 503 }
    );
  }

  // Validate auth: accept Vercel cron header OR Authorization: Bearer
  const vercelCron = request.headers.get("x-vercel-cron");
  const authHeader = request.headers.get("authorization");
  const isVercelCron = vercelCron === "1" && cronSecret;
  const isBearerValid = authHeader === `Bearer ${cronSecret}`;

  if (!(isVercelCron || isBearerValid)) {
    log.error(
      "[integration-auto-sync] Unauthorized request — invalid or missing authentication"
    );
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const goodshuffleResult = { checked: 0, synced: 0, errors: 0 };
  const nowstaResult = { checked: 0, synced: 0, errors: 0 };

  try {
    // --- Goodshuffle ---
    const goodshuffleConfigs = await database.goodshuffleConfig.findMany({
      where: {
        autoSyncInterval: { not: null },
        syncEnabled: true,
      },
    });

    goodshuffleResult.checked = goodshuffleConfigs.length;

    const { startDate: gsStart, endDate: gsEnd } = buildSyncDateRange();

    for (const config of goodshuffleConfigs) {
      if (
        !(
          isSyncDue(config.lastSyncAt, config.autoSyncInterval as number) &&
          config.syncEnabled
        )
      ) {
        continue;
      }

      try {
        await runGoodshuffleEventSync(config.tenantId, {
          startDate: gsStart,
          endDate: gsEnd,
          dryRun: false,
          direction: "goodshuffle_to_convoy",
        });
        goodshuffleResult.synced++;
        log.info(
          `[integration-auto-sync] Goodshuffle sync completed for tenant ${config.tenantId}`
        );
      } catch (syncError) {
        goodshuffleResult.errors++;
        log.error(
          `[integration-auto-sync] Goodshuffle sync failed for tenant ${config.tenantId}`,
          { error: syncError }
        );
        captureException(syncError);
      }
    }

    // --- Nowsta ---
    const nowstaConfigs = await database.nowstaConfig.findMany({
      where: {
        autoSyncInterval: { not: null },
        syncEnabled: true,
      },
    });

    nowstaResult.checked = nowstaConfigs.length;

    const { startDate: nsStart, endDate: nsEnd } = buildSyncDateRange();

    for (const config of nowstaConfigs) {
      if (
        !(
          isSyncDue(config.lastSyncAt, config.autoSyncInterval as number) &&
          config.syncEnabled
        )
      ) {
        continue;
      }

      try {
        await runNowstaSync(config.tenantId, {
          startDate: nsStart,
          endDate: nsEnd,
          dryRun: false,
        });
        nowstaResult.synced++;
        log.info(
          `[integration-auto-sync] Nowsta sync completed for tenant ${config.tenantId}`
        );
      } catch (syncError) {
        nowstaResult.errors++;
        log.error(
          `[integration-auto-sync] Nowsta sync failed for tenant ${config.tenantId}`,
          { error: syncError }
        );
        captureException(syncError);
      }
    }

    log.info(
      `[integration-auto-sync] Goodshuffle: checked=${goodshuffleResult.checked} synced=${goodshuffleResult.synced} errors=${goodshuffleResult.errors} | Nowsta: checked=${nowstaResult.checked} synced=${nowstaResult.synced} errors=${nowstaResult.errors}`
    );

    return NextResponse.json({
      goodshuffle: goodshuffleResult,
      nowsta: nowstaResult,
      timestamp: new Date().toISOString(),
    });
  } catch (error: unknown) {
    log.error("[integration-auto-sync] Fatal error", { error });
    captureException(error);

    return NextResponse.json(
      {
        error: "Integration auto-sync failed",
        message: error instanceof Error ? error.message : "Unknown error",
        goodshuffle: goodshuffleResult,
        nowsta: nowstaResult,
      },
      { status: 500 }
    );
  }
}
