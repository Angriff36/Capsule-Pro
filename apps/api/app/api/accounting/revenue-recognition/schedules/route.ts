/**
 * Revenue Recognition Schedules API Routes
 *
 * Handles revenue recognition schedule management for accrual accounting
 */

import { db } from "@capsule-db";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getTenantId } from "@/app/lib/tenant";

// Validation schemas
const createScheduleSchema = z.object({
  invoiceId: z.string().uuid(),
  eventId: z.string().uuid(),
  contractId: z.string().uuid().optional(),
  clientId: z.string().uuid(),
  totalAmount: z.number().positive(),
  method: z.enum([
    "IMMEDIATE",
    "PROPORTIONAL",
    "MILESTONE_BASED",
    "PERCENTAGE_COMPLETE",
    "STRAIGHT_LINE",
    "SERVICE_PERIOD",
  ]),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  recognitionPeriod: z.number().int().positive().optional(),
  serviceStartDate: z.string().datetime().optional(),
  serviceEndDate: z.string().datetime().optional(),
  totalMilestones: z.number().int().nonnegative().optional(),
  description: z.string().optional(),
  notes: z.string().optional(),
  metadata: z.record(z.any()).optional(),
});

type CreateScheduleInput = z.infer<typeof createScheduleSchema>;

/**
 * GET /api/accounting/revenue-recognition/schedules
 * List all revenue recognition schedules
 */
export async function GET(request: NextRequest) {
  try {
    const tenantId = await getTenantId();
    const { searchParams } = new URL(request.url);

    const page = Math.max(1, Number(searchParams.get("page") || "1"));
    const limit = Math.min(100, Number(searchParams.get("limit") || "50"));
    const skip = (page - 1) * limit;
    const status = searchParams.get("status");
    const method = searchParams.get("method");
    const invoiceId = searchParams.get("invoiceId");
    const clientId = searchParams.get("clientId");

    const where: Record<string, unknown> = {
      tenantId,
      deletedAt: null,
    };

    if (status) {
      where.status = status;
    }
    if (method) {
      where.method = method;
    }
    if (invoiceId) {
      where.invoiceId = invoiceId;
    }
    if (clientId) {
      where.clientId = clientId;
    }

    const [schedules, totalCount] = await Promise.all([
      db.revenueRecognitionSchedule.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          scheduleLines: {
            orderBy: { sequence: "asc" },
          },
        },
      }),
      db.revenueRecognitionSchedule.count({ where }),
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    return NextResponse.json({
      data: schedules.map((schedule) => ({
        ...schedule,
        recognitionPercentage:
          schedule.totalAmount > 0
            ? Number((schedule.recognizedAmount / schedule.totalAmount) * 100)
            : 0,
        isFullyRecognized:
          schedule.recognizedAmount >= schedule.totalAmount - 0.01,
      })),
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages,
      },
    });
  } catch (error) {
    console.error("Error listing revenue recognition schedules:", error);
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
    const tenantId = await getTenantId();
    const body = await request.json();

    const validated = createScheduleSchema.parse(body);
    const startDate = new Date(validated.startDate);
    const endDate = new Date(validated.endDate);

    // Verify invoice exists and belongs to tenant
    const invoice = await db.invoice.findFirst({
      where: {
        tenantId,
        id: validated.invoiceId,
        deletedAt: null,
      },
    });

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    // Verify event exists and belongs to tenant
    const event = await db.event.findFirst({
      where: {
        tenantId,
        id: validated.eventId,
        deletedAt: null,
      },
    });

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    // Create the schedule
    const schedule = await db.revenueRecognitionSchedule.create({
      data: {
        tenantId,
        invoiceId: validated.invoiceId,
        eventId: validated.eventId,
        contractId: validated.contractId,
        clientId: validated.clientId,
        totalAmount: validated.totalAmount,
        recognizedAmount: 0,
        remainingAmount: validated.totalAmount,
        method: validated.method,
        status: "PENDING",
        startDate,
        endDate,
        recognitionPeriod: validated.recognitionPeriod,
        serviceStartDate: validated.serviceStartDate
          ? new Date(validated.serviceStartDate)
          : null,
        serviceEndDate: validated.serviceEndDate
          ? new Date(validated.serviceEndDate)
          : null,
        totalMilestones: validated.totalMilestones ?? 0,
        completedMilestones: 0,
        description: validated.description,
        notes: validated.notes,
        metadata: validated.metadata ?? {},
      },
    });

    return NextResponse.json(
      {
        ...schedule,
        recognitionPercentage: 0,
        isFullyRecognized: false,
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.errors },
        { status: 400 }
      );
    }
    console.error("Error creating revenue recognition schedule:", error);
    return NextResponse.json(
      { error: "Failed to create revenue recognition schedule" },
      { status: 500 }
    );
  }
}
