/**
 * Cron endpoint for automated inventory audit scheduling.
 *
 * This should be called by a scheduled job (Vercel Cron, external scheduler, etc.)
 * Protected by CRON_SECRET header to prevent unauthorized access.
 *
 * GET /api/cron/inventory-audit
 *
 * Authentication:
 * - x-vercel-cron: 1 (Vercel Cron Jobs — header always present when CRON_SECRET is configured)
 * - Authorization: Bearer <CRON_SECRET> (Manual/scheduler calls)
 *
 * - If CRON_SECRET env var is not set, returns 503 (not configured)
 * - If header doesn't match, returns 401 (unauthorized)
 *
 * Response: { sessionsCreated: number, tenantsProcessed: number, timestamp: string }
 */

import { database } from "@repo/database";
import { runManifestCommandCore } from "@repo/manifest-runtime/run-manifest-command-core";
import { log } from "@repo/observability/log";
import { captureException } from "@sentry/nextjs";
import { NextResponse } from "next/server";
import { createManifestRuntime } from "@/lib/manifest-runtime";
import { getSystemUserId } from "@/lib/system-user";

// Force dynamic rendering; runs on Node.js (needs createManifestRuntime)
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Generate a unique session ID for cycle count sessions
 */
function generateSessionId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `CC-${timestamp}-${random}`.toUpperCase();
}

/**
 * Check if a schedule should run today based on its frequency
 */
function shouldRunToday(schedule: {
  frequency: string;
  dayOfWeek: number | null;
  dayOfMonth: number | null;
}): boolean {
  const now = new Date();
  const currentDayOfWeek = now.getDay(); // 0-6 (Sunday-Saturday)
  const currentDayOfMonth = now.getDate(); // 1-31

  switch (schedule.frequency) {
    case "daily":
      return true;
    case "weekly":
      return schedule.dayOfWeek === currentDayOfWeek;
    case "monthly": {
      // Handle edge case: if dayOfMonth is greater than days in current month,
      // run on the last day of the month
      const lastDayOfMonth = new Date(
        now.getFullYear(),
        now.getMonth() + 1,
        0
      ).getDate();
      if (schedule.dayOfMonth && schedule.dayOfMonth > lastDayOfMonth) {
        return currentDayOfMonth === lastDayOfMonth;
      }
      return schedule.dayOfMonth === currentDayOfMonth;
    }
    default:
      return false;
  }
}

/**
 * Get the first active location for a tenant
 */
async function getFirstActiveLocation(
  tenantId: string
): Promise<{ id: string; name: string } | null> {
  const location = await database.location.findFirst({
    where: {
      tenantId,
      isActive: true,
      deletedAt: null,
    },
    select: {
      id: true,
      name: true,
    },
    orderBy: {
      isPrimary: "desc",
    },
  });
  return location;
}

/**
 * Create a CycleCountSession via governed Manifest runtime.
 * Returns ok=true/false and an optional message.
 */
async function createCycleCountSession(params: {
  entity: string;
  command: string;
  body: Record<string, unknown>;
  user: { id: string; tenantId: string; role: string };
}): Promise<{ ok: boolean; message?: string }> {
  const result = await runManifestCommandCore(
    {
      createRuntime: ({ user: u, entityName }) =>
        createManifestRuntime({
          user: { id: u.id, tenantId: u.tenantId, role: u.role },
          entityName,
        }),
    },
    {
      entity: params.entity,
      command: params.command,
      body: params.body,
      user: params.user,
    }
  );
  return {
    ok: result.ok,
    message: result.ok ? undefined : result.message,
  };
}

export async function GET(request: Request): Promise<NextResponse> {
  const cronSecret = process.env.CRON_SECRET;

  // If CRON_SECRET is not configured, the endpoint is not available
  if (!cronSecret) {
    log.error(
      "[inventory-audit] CRON_SECRET environment variable is not configured"
    );
    return NextResponse.json(
      { error: "Cron endpoint not configured" },
      { status: 503 }
    );
  }

  // Validate auth: accept Vercel cron header OR Authorization: Bearer
  const vercelCron = request.headers.get("x-vercel-cron");
  const authHeader = request.headers.get("authorization");

  const isVercelCronValid = vercelCron === "1" && cronSecret;
  const isAuthHeaderValid = authHeader === `Bearer ${cronSecret}`;

  if (!(isVercelCronValid || isAuthHeaderValid)) {
    log.error(
      "[inventory-audit] Unauthorized request — invalid or missing authentication"
    );
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Find all active audit schedules
    const activeSchedules = await database.auditSchedule.findMany({
      where: {
        isActive: true,
        deletedAt: null,
      },
    });

    // If no schedules configured, fall back to creating daily sessions for all tenants
    // that have inventory locations but no pending cycle count sessions
    if (activeSchedules.length === 0) {
      log.info(
        "[inventory-audit] No active schedules found, using default daily behavior"
      );
      return await createDefaultDailySessions();
    }

    // Filter schedules that should run today
    const schedulesToRun = activeSchedules.filter(shouldRunToday);

    if (schedulesToRun.length === 0) {
      log.info("[inventory-audit] No schedules due to run today");
      return NextResponse.json({
        sessionsCreated: 0,
        tenantsProcessed: 0,
        schedulesChecked: activeSchedules.length,
        timestamp: new Date().toISOString(),
      });
    }

    // Get unique tenant IDs from schedules
    const tenantIds = Array.from(
      new Set(schedulesToRun.map((s) => s.tenantId))
    );

    let sessionsCreated = 0;
    const tenantsProcessed: string[] = [];
    const errors: { tenantId: string; error: string }[] = [];

    for (const tenantId of tenantIds) {
      try {
        // Get tenant's schedules for today
        const tenantSchedules = schedulesToRun.filter(
          (s) => s.tenantId === tenantId
        );

        // Get first active location
        const location = await getFirstActiveLocation(tenantId);
        if (!location) {
          log.info(
            `[inventory-audit] No active locations for tenant ${tenantId}, skipping`
          );
          continue;
        }

        // Get system user ID for createdById
        const systemUserId = await getSystemUserId(tenantId);

        // Create a session for each schedule
        for (const schedule of tenantSchedules) {
          const sessionId = generateSessionId();
          const scheduledDate = new Date();
          scheduledDate.setHours(0, 0, 0, 0);

          const result = await createCycleCountSession({
            entity: "CycleCountSession",
            command: "create",
            body: {
              locationId: location.id,
              sessionId,
              sessionName: `${schedule.name} - ${scheduledDate.toISOString().split("T")[0]}`,
              countType: "scheduled",
              scheduledDate: scheduledDate.getTime(),
              notes: "",
              userId: systemUserId,
            },
            user: {
              id: systemUserId,
              tenantId,
              role: "system",
            },
          });

          if (!result.ok) {
            throw new Error(
              `Manifest create failed: ${result.message ?? "unknown error"}`
            );
          }

          sessionsCreated++;
        }

        tenantsProcessed.push(tenantId);
      } catch (tenantError) {
        log.error(
          `[inventory-audit] Failed to create session for tenant ${tenantId}`,
          { error: tenantError }
        );
        errors.push({
          tenantId,
          error:
            tenantError instanceof Error
              ? tenantError.message
              : "Unknown error",
        });
      }
    }

    log.info(
      `[inventory-audit] Created ${sessionsCreated} sessions for ${tenantsProcessed.length} tenants`
    );

    return NextResponse.json({
      sessionsCreated,
      tenantsProcessed: tenantsProcessed.length,
      schedulesChecked: activeSchedules.length,
      schedulesRun: schedulesToRun.length,
      errors: errors.length > 0 ? errors : undefined,
      timestamp: new Date().toISOString(),
    });
  } catch (error: unknown) {
    log.error(
      "[inventory-audit] Failed to process inventory audit scheduling",
      { error }
    );
    captureException(error);

    return NextResponse.json(
      {
        error: "Inventory audit scheduling failed",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * Fallback: Create daily sessions for tenants with locations but no pending sessions
 */
async function createDefaultDailySessions(): Promise<NextResponse> {
  try {
    // Find tenants with active locations
    const tenantsWithLocations = await database.location.groupBy({
      by: ["tenantId"],
      where: {
        isActive: true,
        deletedAt: null,
      },
    });

    if (tenantsWithLocations.length === 0) {
      return NextResponse.json({
        sessionsCreated: 0,
        tenantsProcessed: 0,
        mode: "default_daily",
        timestamp: new Date().toISOString(),
      });
    }

    let sessionsCreated = 0;
    const tenantsProcessed: string[] = [];

    for (const { tenantId } of tenantsWithLocations) {
      try {
        // Check if tenant already has a pending session for today
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const existingPending = await database.cycleCountSession.findFirst({
          where: {
            tenantId,
            status: "pending",
            scheduledDate: today,
            deletedAt: null,
          },
        });

        if (existingPending) {
          continue; // Skip if already has pending session
        }

        // Get first active location
        const location = await getFirstActiveLocation(tenantId);
        if (!location) {
          continue;
        }

        // Get system user ID
        const systemUserId = await getSystemUserId(tenantId);

        // Create session
        const sessionId = generateSessionId();

        const result = await createCycleCountSession({
          entity: "CycleCountSession",
          command: "create",
          body: {
            locationId: location.id,
            sessionId,
            sessionName: `Daily Cycle Count - ${today.toISOString().split("T")[0]}`,
            countType: "scheduled",
            scheduledDate: today.getTime(),
            notes: "",
            userId: systemUserId,
          },
          user: {
            id: systemUserId,
            tenantId,
            role: "system",
          },
        });

        if (!result.ok) {
          throw new Error(
            `Manifest create failed: ${result.message ?? "unknown error"}`
          );
        }

        sessionsCreated++;
        tenantsProcessed.push(tenantId);
      } catch (tenantError) {
        log.error(
          `[inventory-audit] Failed to create default session for tenant ${tenantId}`,
          { error: tenantError }
        );
      }
    }

    log.info(
      `[inventory-audit] Default mode: Created ${sessionsCreated} sessions for ${tenantsProcessed.length} tenants`
    );

    return NextResponse.json({
      sessionsCreated,
      tenantsProcessed: tenantsProcessed.length,
      mode: "default_daily",
      timestamp: new Date().toISOString(),
    });
  } catch (error: unknown) {
    log.error("[inventory-audit] Failed to create default daily sessions", {
      error,
    });
    captureException(error);

    return NextResponse.json(
      {
        error: "Default session creation failed",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
