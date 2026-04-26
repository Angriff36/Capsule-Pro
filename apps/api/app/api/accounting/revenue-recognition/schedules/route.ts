/**
 * Revenue Recognition Schedules API Routes
 *
 * Handles revenue recognition schedule CRUD.
 * Follows the same direct-Prisma pattern as other accounting routes.
 */

import { database } from "@repo/database";
import { type NextRequest, NextResponse } from "next/server";
import { requireTenantId } from "@/app/lib/tenant";
import { captureException } from "@sentry/nextjs";

/**
 * GET /api/accounting/revenue-recognition/schedules
 * List all revenue recognition schedules
 */
export async function GET(request: NextRequest) {
  try {
    const tenantId = await requireTenantId();
    const { searchParams } = new URL(request.url);

    const page = Number(searchParams.get("page")) || 1;
    const limit = Math.min(Number(searchParams.get("limit")) || 50, 200);
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {
      tenantId,
      deletedAt: null,
    };

    if (searchParams.get("status")) {
      where.status = searchParams.get("status");
    }

    if (searchParams.get("invoiceId")) {
      where.invoiceId = searchParams.get("invoiceId");
    }

    if (searchParams.get("clientId")) {
      where.clientId = searchParams.get("clientId");
    }

    if (searchParams.get("recognitionMethod")) {
      where.recognitionMethod = searchParams.get("recognitionMethod");
    }

    const [schedules, totalCount] = await Promise.all([
      database.revenueRecognitionSchedule.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: { lines: { where: { status: "PENDING" }, take: 5 } },
      }),
      database.revenueRecognitionSchedule.count({ where }),
    ]);

    return NextResponse.json({
      data: schedules.map((s) => ({
        ...s,
        totalAmount: s.totalAmount.toString(),
        recognizedAmount: s.recognizedAmount.toString(),
        remainingAmount: s.remainingAmount.toString(),
        recognitionPercentage: s.recognitionPercentage.toString(),
      })),
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    });
  } catch (error) {
    captureException(error);
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

    if (!body.invoiceId || !body.totalAmount || !body.recognitionMethod) {
      return NextResponse.json(
        { error: "invoiceId, totalAmount, and recognitionMethod are required" },
        { status: 400 }
      );
    }

    const invoice = await database.invoice.findFirst({
      where: { tenantId, id: body.invoiceId, deletedAt: null },
    });

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    const schedule = await database.revenueRecognitionSchedule.create({
      data: {
        tenantId,
        invoiceId: body.invoiceId,
        eventId: body.eventId || invoice.eventId,
        clientId: invoice.clientId,
        totalAmount: body.totalAmount,
        recognizedAmount: 0,
        remainingAmount: body.totalAmount,
        recognitionMethod: body.recognitionMethod,
        status: "PENDING",
        startDate: body.startDate ? new Date(body.startDate) : new Date(),
        endDate: body.endDate ? new Date(body.endDate) : null,
        totalMilestones: body.totalMilestones || 0,
        completedMilestones: 0,
        recognitionPercentage: 0,
        currency: body.currency || "USD",
        metadata: body.metadata || {},
      },
    });

    return NextResponse.json(
      {
        ...schedule,
        totalAmount: schedule.totalAmount.toString(),
        recognizedAmount: schedule.recognizedAmount.toString(),
        remainingAmount: schedule.remainingAmount.toString(),
        recognitionPercentage: schedule.recognitionPercentage.toString(),
      },
      { status: 201 }
    );
  } catch (error) {
    captureException(error);
    return NextResponse.json(
      { error: "Failed to create revenue recognition schedule" },
      { status: 500 }
    );
  }
}
