/**
 * Collection Case Detail API Routes
 *
 * Handles individual collection case operations
 *
 * MANIFEST GOVERNANCE STATUS — REAL VIOLATION, NOT AN ALIAS
 * ---------------------------------------------------------
 * Direct writes to `database.collectionCase` here are constitution violations
 * per `docs/manifest/governance.md` (CollectionCase is a governed entity with
 * a dedicated `CollectionCasePrismaStore`). This route is NOT marked as a
 * `DEPRECATED ALIAS` because it has never been redesigned as one — it is the
 * original implementation. Surfaced by `pnpm manifest:audit-direct-writes`.
 *
 * Per-action blockers (preventing safe migration in this pass):
 *
 *   - assignTo:         Manifest writes BOTH `assignedTo` and `assignedAt`
 *                       (assignedAt lives in metadata JSON); route only writes
 *                       `assignedTo`. Adding assignedAt is an observable
 *                       response-shape change.
 *   - recordPayment:    Manifest applies delta arithmetic only; route ALSO
 *                       transitions `status="PAID"` when `outstanding<=0.01`.
 *                       Manifest has no such status flip. Pinned by test
 *                       (`collection-case-patch-actions.test.ts`).
 *   - escalateDunning:  Route derives priority from stage (HIGH for
 *                       REMINDER_2/3, URGENT for FINAL_NOTICE/COLLECTIONS).
 *                       Manifest's escalateDunning does not. Pinned by test.
 *   - setPriority:      Route appends to `notes`. Manifest doesn't preserve
 *                       prior notes content.
 *   - markDisputed:     Manifest sets `status="DISPUTED"`; route doesn't
 *                       change status and instead appends to `notes`.
 *   - resolveDispute:   Manifest sets `status="ACTIVE"` + `disputeResolvedAt`;
 *                       route only flips `isDisputed` and appends notes.
 *   - escalateToLegal:  Manifest `escalateToLegalWithDetails` requires
 *                       `legalCaseNumber`+`legalFirm`; route accepts them
 *                       optionally and stuffs the values into `notes` instead
 *                       of the dedicated columns.
 *   - writeOff:         Manifest mutation arithmetic differs from route
 *                       (manifest uses self.outstandingAmount - amount;
 *                       route uses Math.min(amount, outstanding)).
 *   - updateAging:      Mutations are identical, BUT route uses
 *                       `requireTenantId` (no user), and the manifest runtime
 *                       requires a `user` context for RBAC policy guard.
 *                       Switching to `requireCurrentUser` is a cross-route
 *                       auth change.
 *   - close, reopen,
 *     createPaymentPlan: All append to `notes`, manifest doesn't.
 *
 * Concrete migration path (whichever lands first, in order):
 *   1. Decide whether the notes-appending and status-derivation behaviors
 *      should move into the manifest commands (additive event handlers or
 *      new command params) or be deprecated as legacy display-only state.
 *   2. Once parity is achieved, switch the route to `requireCurrentUser`
 *      and call `runtime.runCommand("...", body, { entityName, instanceId })`
 *      per action, returning the read-back row via `findFirst`.
 *   3. Update `collection-case-patch-actions.test.ts` to assert against the
 *      manifest runtime call rather than mocked Prisma calls.
 *
 * Do not silence this finding by adding a `DEPRECATED ALIAS` marker. Until
 * the structural blockers above are addressed, this is a tracked violation.
 */

import { database } from "@repo/database";
import { log } from "@repo/observability/log";
import { captureException } from "@sentry/nextjs";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireTenantId } from "@/app/lib/tenant";

// Validation schemas
const recordPaymentSchema = z.object({
  amount: z.number().positive(),
  paymentId: z.uuid().optional(),
  paymentDate: z.string().datetime().optional(),
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
  nextPaymentDue: z.string().datetime(),
});

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/accounting/collections/cases/[id]
 * Get a single collection case
 */
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const tenantId = await requireTenantId();
    const { id } = await context.params;

    const collectionCase = await database.collectionCase.findFirst({
      where: {
        tenantId,
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
 * Update a collection case
 */
export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const tenantId = await requireTenantId();
    const { id } = await context.params;
    const body = await request.json();

    // Verify case exists
    const collectionCase = await database.collectionCase.findFirst({
      where: {
        tenantId,
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

    // Handle different action types
    const action = body.action;

    if (action === "assignTo") {
      const updated = await database.collectionCase.update({
        where: { id },
        data: {
          assignedTo: body.userId,
          updatedAt: new Date(),
        },
      });
      return NextResponse.json(updated);
    }

    if (action === "recordPayment") {
      const validated = recordPaymentSchema.parse(body);
      const newCollected =
        Number(collectionCase.collectedAmount) + validated.amount;
      const newOutstanding =
        Number(collectionCase.outstandingAmount) - validated.amount;

      const isResolved = newOutstanding <= 0.01;

      const updated = await database.collectionCase.update({
        where: { id },
        data: {
          collectedAmount: newCollected,
          outstandingAmount: Math.max(0, newOutstanding),
          status: isResolved ? "PAID" : collectionCase.status,
          updatedAt: new Date(),
        },
      });
      return NextResponse.json(updated);
    }

    if (action === "escalateDunning") {
      const newStage = body.stage || collectionCase.dunningStage;

      const newStatus = collectionCase.status;
      let newPriority = collectionCase.priority;

      // COLLECTIONS stage indicates escalation to external collections
      if (newStage === "COLLECTIONS") {
        newPriority = "URGENT";
      }

      if (newStage === "FINAL_NOTICE" || newStage === "COLLECTIONS") {
        newPriority = "URGENT";
      } else if (newStage === "REMINDER_2" || newStage === "REMINDER_3") {
        newPriority = "HIGH";
      }

      const updated = await database.collectionCase.update({
        where: { id },
        data: {
          dunningStage: newStage,
          status: newStatus,
          priority: newPriority,
          updatedAt: new Date(),
        },
      });
      return NextResponse.json(updated);
    }

    if (action === "setPriority") {
      const validated = setPrioritySchema.parse(body);
      const updated = await database.collectionCase.update({
        where: { id },
        data: {
          priority: validated.priority,
          notes: collectionCase.notes
            ? collectionCase.notes +
              "\nPriority changed: " +
              (validated.reason || "No reason provided")
            : "Priority changed: " + (validated.reason || "No reason provided"),
          updatedAt: new Date(),
        },
      });
      return NextResponse.json(updated);
    }

    if (action === "markDisputed") {
      const updated = await database.collectionCase.update({
        where: { id },
        data: {
          isDisputed: true,
          notes: collectionCase.notes
            ? collectionCase.notes +
              "\nDispute reason: " +
              (body.reason || "No reason provided")
            : "Dispute reason: " + (body.reason || "No reason provided"),
          updatedAt: new Date(),
        },
      });
      return NextResponse.json(updated);
    }

    if (action === "resolveDispute") {
      const updated = await database.collectionCase.update({
        where: { id },
        data: {
          isDisputed: false,
          notes: collectionCase.notes
            ? collectionCase.notes +
              "\nDispute resolved: " +
              (body.resolutionNotes || "")
            : "Dispute resolved: " + (body.resolutionNotes || ""),
          updatedAt: new Date(),
        },
      });
      return NextResponse.json(updated);
    }

    if (action === "escalateToLegal") {
      const updated = await database.collectionCase.update({
        where: { id },
        data: {
          isEscalatedToLegal: true,
          status: "LEGAL",
          priority: "URGENT",
          notes: collectionCase.notes
            ? collectionCase.notes +
              "\nEscalated to legal" +
              (body.legalCaseNumber
                ? ` (Case #: ${body.legalCaseNumber})`
                : "") +
              (body.legalFirm ? ` (Firm: ${body.legalFirm})` : "")
            : "Escalated to legal" +
              (body.legalCaseNumber
                ? ` (Case #: ${body.legalCaseNumber})`
                : "") +
              (body.legalFirm ? ` (Firm: ${body.legalFirm})` : ""),
          updatedAt: new Date(),
        },
      });
      return NextResponse.json(updated);
    }

    if (action === "writeOff") {
      const validated = writeOffSchema.parse(body);
      const amountToWriteOff = Math.min(
        validated.amount,
        Number(collectionCase.outstandingAmount)
      );
      const newCollected =
        Number(collectionCase.collectedAmount) +
        (Number(collectionCase.outstandingAmount) - amountToWriteOff);

      const updated = await database.collectionCase.update({
        where: { id },
        data: {
          collectedAmount: newCollected,
          outstandingAmount: amountToWriteOff,
          status: "WRITE_OFF",
          notes: collectionCase.notes
            ? collectionCase.notes +
              "\nWritten off: " +
              validated.reason +
              " (approved by: " +
              validated.approvedBy +
              ")"
            : "Written off: " +
              validated.reason +
              " (approved by: " +
              validated.approvedBy +
              ")",
          updatedAt: new Date(),
        },
      });
      return NextResponse.json(updated);
    }

    if (action === "updateAging") {
      const updated = await database.collectionCase.update({
        where: { id },
        data: {
          daysOverdue: body.daysOverdue ?? 0,
          agingBucket: body.agingBucket ?? null,
          updatedAt: new Date(),
        },
      });
      return NextResponse.json(updated);
    }

    if (action === "close") {
      const updated = await database.collectionCase.update({
        where: { id },
        data: {
          status: "CLOSED",
          notes: collectionCase.notes
            ? collectionCase.notes + "\nClosed: " + (body.resolution || "")
            : "Closed: " + (body.resolution || ""),
          updatedAt: new Date(),
        },
      });
      return NextResponse.json(updated);
    }

    if (action === "createPaymentPlan") {
      const validated = createPaymentPlanSchema.parse(body);
      const updated = await database.collectionCase.update({
        where: { id },
        data: {
          hasPaymentPlan: true,
          priority: "MEDIUM",
          notes: collectionCase.notes
            ? collectionCase.notes +
              "\nPayment plan created: " +
              validated.planId
            : "Payment plan created: " + validated.planId,
          updatedAt: new Date(),
        },
      });
      return NextResponse.json(updated);
    }

    if (action === "reopen") {
      const updated = await database.collectionCase.update({
        where: { id },
        data: {
          status: "ACTIVE",
          dunningStage: "CURRENT",
          isEscalatedToLegal: false,
          notes: collectionCase.notes
            ? collectionCase.notes +
              "\nReopened: " +
              (body.reason || "No reason provided")
            : "Reopened: " + (body.reason || "No reason provided"),
          updatedAt: new Date(),
        },
      });
      return NextResponse.json(updated);
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
