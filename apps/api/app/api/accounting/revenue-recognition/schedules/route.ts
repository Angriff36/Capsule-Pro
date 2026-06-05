/**
 * Revenue Recognition Schedules API Routes
 *
 * GET  /api/accounting/revenue-recognition/schedules      - List schedules
 * POST /api/accounting/revenue-recognition/schedules      - Create schedule (via Manifest runtime)
 */

import { database } from "@repo/database";
import { log } from "@repo/observability/log";
import { captureException } from "@sentry/nextjs";
import { type NextRequest, NextResponse } from "next/server";
import { requireTenantId, resolveCurrentUser } from "@/app/lib/tenant";
import { runManifestCommand } from "@/lib/manifest/execute-command";

export const runtime = "nodejs";

/**
 * GET /api/accounting/revenue-recognition/schedules
 * List all revenue recognition schedules with optional filters
 */
export async function GET(request: NextRequest) {
  try {
    const tenantId = await requireTenantId();
    const { searchParams } = new URL(request.url);

    const where: Record<string, unknown> = {
      tenantId,
      deletedAt: null,
    };

    const status = searchParams.get("status");
    if (status) {
      where.status = status;
    }

    const method = searchParams.get("method");
    if (method) {
      where.method = method;
    }

    const invoiceId = searchParams.get("invoiceId");
    if (invoiceId) {
      where.invoiceId = invoiceId;
    }

    const eventId = searchParams.get("eventId");
    if (eventId) {
      where.eventId = eventId;
    }

    const clientId = searchParams.get("clientId");
    if (clientId) {
      where.clientId = clientId;
    }

    const schedules = await database.revenueRecognitionSchedule.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ data: schedules });
  } catch (error) {
    captureException(error);
    log.error("Error listing revenue recognition schedules:", error);
    return NextResponse.json(
      { error: "Failed to list revenue recognition schedules" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/accounting/revenue-recognition/schedules
 * Create a new revenue recognition schedule via Manifest runtime.
 */
export async function POST(request: NextRequest) {
  const user = await resolveCurrentUser(request);
  const rawBody = await request.json().catch(() => ({})) as Record<string, unknown>;
  return runManifestCommand({
    entity: "RevenueRecognitionSchedule",
    command: "create",
    body: rawBody,
    user: { id: user.id, tenantId: user.tenantId, role: user.role },
  });
}
