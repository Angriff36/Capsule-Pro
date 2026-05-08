/**
 * Revenue Recognition Schedules API Routes
 *
 * GET  /api/accounting/revenue-recognition/schedules      - List schedules
 * POST /api/accounting/revenue-recognition/schedules      - Create schedule
 */

import { database } from "@repo/database";
import { log } from "@repo/observability/log";
import { captureException } from "@sentry/nextjs";
import { type NextRequest, NextResponse } from "next/server";
import { requireTenantId } from "@/app/lib/tenant";

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
 * Create a new revenue recognition schedule
 */
export async function POST(request: NextRequest) {
  try {
    const tenantId = await requireTenantId();
    const body = await request.json();

    const schedule = await database.revenueRecognitionSchedule.create({
      data: {
        tenantId,
        invoiceId: body.invoiceId,
        eventId: body.eventId,
        contractId: body.contractId ?? null,
        clientId: body.clientId,
        totalAmount: body.totalAmount,
        recognizedAmount: body.recognizedAmount ?? 0,
        remainingAmount: body.remainingAmount,
        method: body.method,
        status: body.status ?? "PENDING",
        startDate: new Date(body.startDate),
        endDate: new Date(body.endDate),
        recognitionPeriod: body.recognitionPeriod,
        serviceStartDate: body.serviceStartDate
          ? new Date(body.serviceStartDate)
          : null,
        serviceEndDate: body.serviceEndDate
          ? new Date(body.serviceEndDate)
          : null,
        totalMilestones: body.totalMilestones ?? 0,
        completedMilestones: body.completedMilestones ?? 0,
        description: body.description ?? null,
        notes: body.notes ?? null,
        metadata: body.metadata ?? {},
      },
    });

    return NextResponse.json({ data: schedule }, { status: 201 });
  } catch (error) {
    captureException(error);
    log.error("Error creating revenue recognition schedule:", error);
    return NextResponse.json(
      { error: "Failed to create revenue recognition schedule" },
      { status: 500 }
    );
  }
}
