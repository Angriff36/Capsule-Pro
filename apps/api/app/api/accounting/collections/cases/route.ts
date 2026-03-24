/**
 * Collection Cases API Routes
 *
 * Handles collections management for overdue invoices
 */

import { database } from "@repo/database";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireTenantId } from "@/app/lib/tenant";

// Validation schemas
const createCaseSchema = z.object({
  invoiceId: z.string().uuid(),
  invoiceNumber: z.string().min(1),
  eventId: z.string().uuid(),
  clientId: z.string().uuid(),
  clientName: z.string().min(1),
  originalAmount: z.number().positive(),
  outstandingAmount: z.number().nonnegative(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
  daysOverdue: z.number().int().nonnegative().optional(),
  agingBucket: z.string().optional(),
  notes: z.string().optional(),
  metadata: z.record(z.string(), z.any()).optional(),
});

type CreateCaseInput = z.infer<typeof createCaseSchema>;

/**
 * GET /api/accounting/collections/cases
 * List all collection cases
 */
export async function GET(request: NextRequest) {
  try {
    const tenantId = await requireTenantId();
    const { searchParams } = new URL(request.url);

    const page = Math.max(1, Number(searchParams.get("page") || "1"));
    const limit = Math.min(100, Number(searchParams.get("limit") || "50"));
    const skip = (page - 1) * limit;
    const status = searchParams.get("status");
    const priority = searchParams.get("priority");
    const dunningStage = searchParams.get("dunningStage");
    const assignedTo = searchParams.get("assignedTo");
    const clientId = searchParams.get("clientId");

    const where: Record<string, unknown> = {
      tenantId,
      deletedAt: null,
    };

    if (status) {
      where.status = status;
    }
    if (priority) {
      where.priority = priority;
    }
    if (dunningStage) {
      where.dunningStage = dunningStage;
    }
    if (assignedTo) {
      where.assignedTo = assignedTo;
    }
    if (clientId) {
      where.clientId = clientId;
    }

    const [cases, totalCount] = await Promise.all([
      database.collectionCase.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          actions: {
            take: 5,
            orderBy: { createdAt: "desc" },
          },
          paymentPlans: {
            where: { status: "ACTIVE" },
          },
        },
      }),
      database.collectionCase.count({ where }),
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    return NextResponse.json({
      data: cases.map((c) => ({
        ...c,
        collectionPercentage:
          Number(c.originalAmount) > 0
            ? Number(c.collectedAmount) / Number(c.originalAmount) * 100
            : 0,
        isHighRisk: c.daysOverdue > 90 || c.status === "LEGAL",
        isCritical: c.daysOverdue > 120 || c.isEscalatedToLegal,
      })),
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages,
      },
    });
  } catch (error) {
    console.error("Error listing collection cases:", error);
    return NextResponse.json(
      { error: "Failed to list collection cases" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/accounting/collections/cases
 * Create a new collection case
 */
export async function POST(request: NextRequest) {
  try {
    const tenantId = await requireTenantId();
    const body = await request.json();

    const validated = createCaseSchema.parse(body);

    // Verify invoice exists and belongs to tenant
    const invoice = await database.invoice.findFirst({
      where: {
        tenantId,
        id: validated.invoiceId,
        deletedAt: null,
      },
    });

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    // Check if case already exists for this invoice
    const existing = await database.collectionCase.findFirst({
      where: {
        tenantId,
        invoiceId: validated.invoiceId,
        deletedAt: null,
      },
    });

    if (existing) {
      return NextResponse.json(
        {
          error: "Collection case already exists for this invoice",
          caseId: existing.id,
        },
        { status: 409 }
      );
    }

    // Create the collection case
    const collectionCase = await database.collectionCase.create({
      data: {
        tenantId,
        invoiceId: validated.invoiceId,
        invoiceNumber: validated.invoiceNumber,
        eventId: validated.eventId,
        clientId: validated.clientId,
        clientName: validated.clientName,
        originalAmount: validated.originalAmount,
        outstandingAmount: validated.outstandingAmount,
        collectedAmount: 0,
        status: "ACTIVE",
        priority: validated.priority ?? "MEDIUM",
        dunningStage: "CURRENT",
        daysOverdue: validated.daysOverdue ?? 0,
        agingBucket: validated.agingBucket,
        notes: validated.notes,
        metadata: JSON.parse(JSON.stringify(validated.metadata ?? {})),
        assignedTo: null,
        hasPaymentPlan: false,
        isDisputed: false,
        isEscalatedToLegal: false,
      },
    });

    return NextResponse.json(
      {
        ...collectionCase,
        collectionPercentage: 0,
        isHighRisk: false,
        isCritical: false,
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.issues },
        { status: 400 }
      );
    }
    console.error("Error creating collection case:", error);
    return NextResponse.json(
      { error: "Failed to create collection case" },
      { status: 500 }
    );
  }
}
