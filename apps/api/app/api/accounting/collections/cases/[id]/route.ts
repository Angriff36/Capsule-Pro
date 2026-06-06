/**
 * Collection Case Detail API Routes
 *
 * Handles individual collection case operations.
 * PATCH actions delegate to governed Manifest commands per constitution §10.
 * GET reads bypass runtime.
 */

import { database } from "@repo/database";
import { log } from "@repo/observability/log";
import { captureException } from "@sentry/nextjs";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { resolveCurrentUser } from "@/app/lib/tenant";
import { runManifestCommand } from "@/lib/manifest/execute-command";

// Validation schemas
const recordPaymentSchema = z.object({
  amount: z.number().positive(),
  paymentId: z.uuid().optional(),
  paymentDate: z.iso.datetime().optional(),
});

const escalateDunningSchema = z.object({
  stage: z.enum([
    "REMINDER_1",
    "REMINDER_2",
    "REMINDER_3",
    "FINAL_NOTICE",
    "COLLECTIONS",
  ]),
});

const setPrioritySchema = z.object({
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]),
  reason: z.string().optional(),
});

const writeOffSchema = z.object({
  amount: z.number().positive(),
  reason: z.string().min(1),
  approvedBy: z.uuid(),
});

const createPaymentPlanSchema = z.object({
  planId: z.uuid(),
  nextPaymentDue: z.iso.datetime(),
});

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/accounting/collections/cases/[id]
 * Get a single collection case (read — bypasses Manifest per §10)
 */
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const user = await resolveCurrentUser(request);
    const { id } = await context.params;

    const collectionCase = await database.collectionCase.findFirst({
      where: {
        tenantId: user.tenantId,
        id,
        deletedAt: null,
      },
      include: {
        actions: {
          orderBy: { createdAt: "desc" },
        },
        paymentPlans: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!collectionCase) {
      return NextResponse.json(
        { error: "Collection case not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ...collectionCase,
      collectionPercentage:
        Number(collectionCase.originalAmount) > 0
          ? (Number(collectionCase.collectedAmount) /
              Number(collectionCase.originalAmount)) *
            100
          : 0,
      isHighRisk:
        collectionCase.daysOverdue > 90 || collectionCase.status === "LEGAL",
      isCritical:
        collectionCase.daysOverdue > 120 || collectionCase.isEscalatedToLegal,
    });
  } catch (error) {
    captureException(error);
    log.error("Error getting collection case:", error);
    return NextResponse.json(
      { error: "Failed to get collection case" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/accounting/collections/cases/[id]
 * Update a collection case via governed Manifest commands.
 */
export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const user = await resolveCurrentUser(request);
    const { id } = await context.params;
    const body = await request.json();

    const manifestUser = { id: user.id, tenantId: user.tenantId, role: user.role };

    // Verify case exists (read — bypasses Manifest per §10)
    const collectionCase = await database.collectionCase.findFirst({
      where: {
        tenantId: user.tenantId,
        id,
        deletedAt: null,
      },
    });

    if (!collectionCase) {
      return NextResponse.json(
        { error: "Collection case not found" },
        { status: 404 }
      );
    }

    // Handle different action types via governed Manifest commands
    const action = body.action;

    if (action === "assignTo") {
      return runManifestCommand({
        entity: "CollectionCase",
        command: "assignTo",
        body: { id, tenantId: user.tenantId, userId: body.userId },
        user: manifestUser,
      });
    }

    if (action === "recordPayment") {
      const parseResult = recordPaymentSchema.safeParse(body);
      if (!parseResult.success) {
        return NextResponse.json(
          { error: "Validation failed", details: parseResult.error.issues },
          { status: 400 }
        );
      }
      const validated = parseResult.data;
      const newOutstanding =
        Number(collectionCase.outstandingAmount) - validated.amount;

      const result = await runManifestCommand({
        entity: "CollectionCase",
        command: "recordPayment",
        body: {
          id,
          tenantId: user.tenantId,
          amount: validated.amount,
          paymentId: validated.paymentId ?? "",
          paymentDate: validated.paymentDate ?? new Date().toISOString(),
        },
        user: manifestUser,
      });

      // If outstanding is near zero, also mark resolved
      if (newOutstanding <= 0.01 && result.status === 200) {
        await runManifestCommand({
          entity: "CollectionCase",
          command: "markResolved",
          body: { id, tenantId: user.tenantId },
          user: manifestUser,
        });
      }

      return result;
    }

    if (action === "escalateDunning") {
      const parseResult = escalateDunningSchema.safeParse(body);
      if (!parseResult.success) {
        return NextResponse.json(
          { error: "Validation failed", details: parseResult.error.issues },
          { status: 400 }
        );
      }
      const newStage = parseResult.data.stage;

      // TODO: migrate to Manifest resetDunning command once dunningStage
      // manifest/Prisma type drift is resolved (manifest defines int, Prisma
      // uses DunningStage enum). The escalateDunning/resetDunning commands
      // produce integer values that Prisma rejects for the enum column.
      const newPriority =
        newStage === "COLLECTIONS" || newStage === "FINAL_NOTICE"
          ? "URGENT"
          : newStage === "REMINDER_2" || newStage === "REMINDER_3"
            ? "HIGH"
            : collectionCase.priority;

      const updated = await database.collectionCase.update({
        where: { id },
        data: {
          dunningStage: newStage,
          priority: newPriority,
          updatedAt: new Date(),
        },
      });
      return NextResponse.json(updated);
    }

    if (action === "setPriority") {
      const parseResult = setPrioritySchema.safeParse(body);
      if (!parseResult.success) {
        return NextResponse.json(
          { error: "Validation failed", details: parseResult.error.issues },
          { status: 400 }
        );
      }
      const validated = parseResult.data;
      return runManifestCommand({
        entity: "CollectionCase",
        command: "setPriority",
        body: {
          id,
          tenantId: user.tenantId,
          newPriority: validated.priority,
          reason: validated.reason ?? "",
        },
        user: manifestUser,
      });
    }

    if (action === "markDisputed") {
      return runManifestCommand({
        entity: "CollectionCase",
        command: "markDisputed",
        body: {
          id,
          tenantId: user.tenantId,
          reason: body.reason ?? "No reason provided",
        },
        user: manifestUser,
      });
    }

    if (action === "resolveDispute") {
      return runManifestCommand({
        entity: "CollectionCase",
        command: "resolveDispute",
        body: {
          id,
          tenantId: user.tenantId,
          resolutionNotes: body.resolutionNotes ?? "",
        },
        user: manifestUser,
      });
    }

    if (action === "escalateToLegal") {
      return runManifestCommand({
        entity: "CollectionCase",
        command: "escalateToLegalWithDetails",
        body: {
          id,
          tenantId: user.tenantId,
          legalCaseNumber: body.legalCaseNumber ?? "",
          legalFirm: body.legalFirm ?? "",
        },
        user: manifestUser,
      });
    }

    if (action === "writeOff") {
      const parseResult = writeOffSchema.safeParse(body);
      if (!parseResult.success) {
        return NextResponse.json(
          { error: "Validation failed", details: parseResult.error.issues },
          { status: 400 }
        );
      }
      const validated = parseResult.data;
      return runManifestCommand({
        entity: "CollectionCase",
        command: "writeOff",
        body: {
          id,
          tenantId: user.tenantId,
          amount: validated.amount,
          reason: validated.reason,
          approvedBy: validated.approvedBy,
        },
        user: manifestUser,
      });
    }

    if (action === "updateAging") {
      return runManifestCommand({
        entity: "CollectionCase",
        command: "updateAging",
        body: {
          id,
          tenantId: user.tenantId,
          daysOverdue: body.daysOverdue ?? 0,
          agingBucket: body.agingBucket ?? "",
        },
        user: manifestUser,
      });
    }

    if (action === "close") {
      return runManifestCommand({
        entity: "CollectionCase",
        command: "close",
        body: {
          id,
          tenantId: user.tenantId,
          resolution: body.resolution ?? "",
        },
        user: manifestUser,
      });
    }

    if (action === "createPaymentPlan") {
      const parseResult = createPaymentPlanSchema.safeParse(body);
      if (!parseResult.success) {
        return NextResponse.json(
          { error: "Validation failed", details: parseResult.error.issues },
          { status: 400 }
        );
      }
      const validated = parseResult.data;
      return runManifestCommand({
        entity: "CollectionCase",
        command: "createPaymentPlan",
        body: {
          id,
          tenantId: user.tenantId,
          planId: validated.planId,
          nextPaymentDue: new Date(validated.nextPaymentDue).getTime(),
        },
        user: manifestUser,
      });
    }

    if (action === "reopen") {
      return runManifestCommand({
        entity: "CollectionCase",
        command: "updateStatus",
        body: {
          id,
          tenantId: user.tenantId,
          newStatus: "ACTIVE",
          newNotes: body.reason ?? "Case reopened",
        },
        user: manifestUser,
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    captureException(error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.issues },
        { status: 400 }
      );
    }
    log.error("Error updating collection case:", error);
    return NextResponse.json(
      { error: "Failed to update collection case" },
      { status: 500 }
    );
  }
}
