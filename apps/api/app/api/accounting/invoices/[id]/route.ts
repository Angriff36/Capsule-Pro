/**
 * Single Invoice API Routes
 *
 * Handles operations on individual invoices.
 *
 * MANIFEST GOVERNANCE STATUS — REAL VIOLATION, NOT AN ALIAS
 * ---------------------------------------------------------
 * Direct writes to `database.invoice` here are constitution violations
 * (Invoice is a governed entity with a dedicated PrismaStore). Surfaced by
 * `pnpm manifest:audit-direct-writes`. This route is NOT marked as a
 * `DEPRECATED ALIAS` — it is the original implementation.
 *
 * Per-action blockers (preventing safe migration in this pass):
 *
 *   - PUT /update:      Generic field updates (lineItems, notes, dueDate,
 *                       paymentTerms) with totals recalculation. Manifest
 *                       has `updateLineItems(lineItems)` only and ONLY for
 *                       DRAFT status. Route allows updating notes/dueDate
 *                       in any status that passes `validateInvoiceAccess`.
 *                       Migration would tighten the contract.
 *   - apply-payment:    Route auto-flips status to `"PAID"` when amountDue
 *                       falls within the 0.01 epsilon AND sets `paidAt`.
 *                       Manifest `applyPayment` ALWAYS sets
 *                       `status="PARTIALLY_PAID"` (no auto-PAID transition,
 *                       no paidAt). Migration would break the
 *                       fully-paid-via-apply-payment branch pinned by
 *                       `invoice-patch-actions.test.ts`.
 *   - mark-as-paid:     Route also writes `amountPaid = invoice.total` so
 *                       the ledger nets to zero. Manifest `markAsPaid` only
 *                       sets status + paidAt + amountDue=0 — leaves
 *                       amountPaid untouched. The result is observably
 *                       different (downstream reports read amountPaid).
 *   - mark-overdue:     Route just sets `status="OVERDUE"`. Manifest
 *                       `markOverdue` guards `dueDate < now()` AND
 *                       `status != "OVERDUE"`. Route allows manual
 *                       re-marking; manifest would 422.
 *   - send-reminder:    Route sends an email (best-effort) and only updates
 *                       `updatedAt`. Manifest `sendReminder` mutates
 *                       `reminderCount` and `lastReminderAt` instead. Route
 *                       depends on email being a side-effect; manifest does
 *                       not emit an email.
 *   - POST /send:       Updates `{ status: "SENT", sentAt }` and sends an
 *                       email. Manifest `send(clientContactId)` requires a
 *                       parameter the route doesn't pass and guards
 *                       `status == "DRAFT"` AND `amountDue > 0`. The email
 *                       is a non-manifest side effect that mirrors
 *                       EventContract.send.
 *   - DELETE /void:     Mutations match (`status="VOID"`), but manifest
 *                       `voidInvoice` guards `amountPaid == 0` strictly
 *                       and emits `InvoiceVoided`. The route's
 *                       `validateInvoiceBusinessRules` enforces similar
 *                       checks, but no DELETE test exists — migration
 *                       without test coverage is unsafe.
 *
 * Concrete migration path:
 *   1. Decide ledger-arithmetic ownership: should the manifest commands
 *      perform the auto-PAID transition (apply-payment) and write amountPaid
 *      on markAsPaid, or should the route keep doing them? Migrating
 *      without resolving this changes invoice status semantics.
 *   2. Add a non-manifest email side-effect (manifest event handler) for
 *      send + send-reminder so the routes can stop owning Resend calls.
 *   3. Write a DELETE-action test, then migrate that single branch first.
 *      It is the closest to 1:1 between route and manifest.
 *   4. Update `invoice-patch-actions.test.ts` to mock the manifest runtime
 *      rather than `database.invoice.update`.
 *
 * Do not silence this finding by adding a `DEPRECATED ALIAS` marker. Until
 * the structural divergences above are addressed, this is a tracked
 * violation.
 */

import { database } from "@repo/database";
import { InvoiceTemplate, resend } from "@repo/email";
import { log } from "@repo/observability/log";
import { captureException } from "@sentry/nextjs";
import { type NextRequest, NextResponse } from "next/server";
import { requireApiManager } from "@/app/lib/auth-roles";
import { requireTenantId } from "@/app/lib/tenant";
import { translatePrismaError } from "@/lib/prisma-error";
import {
  calculateInvoiceTotals,
  type InvoiceResponse,
  validateInvoiceAccess,
  validateInvoiceBusinessRules,
} from "../validation";

const DEFAULT_APP_URL = "https://app.capsule.pro";
const DEFAULT_FROM_ADDRESS = "noreply@capsule.pro";

type RouteContext = {
  params: Promise<{ id: string }>;
};

function formatInvoiceResponse(invoice: Record<string, unknown>) {
  return {
    ...invoice,
    subtotal: String(invoice.subtotal),
    taxAmount: String(invoice.taxAmount),
    discountAmount: String(invoice.discountAmount),
    total: String(invoice.total),
    amountPaid: String(invoice.amountPaid),
    amountDue: String(invoice.amountDue),
    depositPercentage: invoice.depositPercentage
      ? String(invoice.depositPercentage)
      : null,
    depositRequired: invoice.depositRequired
      ? String(invoice.depositRequired)
      : null,
    depositPaid: invoice.depositPaid ? String(invoice.depositPaid) : null,
    lineItems: invoice.lineItems,
    metadata: invoice.metadata,
  };
}

/**
 * GET /api/accounting/invoices/[id]
 * Get a single invoice by ID
 */
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const tenantId = await requireTenantId();
    const { id } = await context.params;

    const invoice = await database.invoice.findFirst({
      where: {
        tenantId,
        id,
        deletedAt: null,
      },
      include: {
        client: {
          select: {
            id: true,
            company_name: true,
            first_name: true,
            last_name: true,
            email: true,
            defaultPaymentTerms: true,
          },
        },
        event: {
          select: {
            id: true,
            title: true,
            eventDate: true,
          },
        },
      },
    });

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    return NextResponse.json<InvoiceResponse>({
      ...invoice,
      subtotal: invoice.subtotal.toString(),
      taxAmount: invoice.taxAmount.toString(),
      discountAmount: invoice.discountAmount.toString(),
      total: invoice.total.toString(),
      amountPaid: invoice.amountPaid.toString(),
      amountDue: invoice.amountDue.toString(),
      depositPercentage: invoice.depositPercentage?.toString() ?? null,
      depositRequired: invoice.depositRequired?.toString() ?? null,
      depositPaid: invoice.depositPaid?.toString() ?? null,
      lineItems: invoice.lineItems as InvoiceResponse["lineItems"],
      metadata: invoice.metadata as Record<string, unknown>,
    });
  } catch (error) {
    captureException(error);
    const prismaResult = translatePrismaError(error);
    if (prismaResult.mapped) {
      return NextResponse.json(
        { error: prismaResult.message },
        { status: prismaResult.status }
      );
    }
    log.error("Error fetching invoice", { error });
    return NextResponse.json(
      { error: "Failed to fetch invoice" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/accounting/invoices/[id]
 * Update an invoice
 */
export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    // Manager-tier role guard (P1.AM). Invoice edits change billed totals and
    // tax/line-item state — must not be reachable from a base-staff session.
    const guard = await requireApiManager();
    if (!guard.ok) {
      return guard.response;
    }
    const { tenantId } = guard;
    const { id } = await context.params;
    const body = await request.json();

    const invoice = await database.invoice.findFirst({
      where: {
        tenantId,
        id,
        deletedAt: null,
      },
    });

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    validateInvoiceAccess(invoice, tenantId, ["DRAFT"]);

    // Calculate new totals if line items provided
    const updateData: Record<string, unknown> = {};
    if (body.lineItems) {
      const { subtotal, taxAmount, total } = calculateInvoiceTotals(
        body.lineItems
      );
      updateData.subtotal = subtotal;
      updateData.taxAmount = taxAmount;
      updateData.total = total;
      updateData.amountDue = total - Number(invoice.amountPaid);
    }

    // Copy other allowed fields
    if (body.notes !== undefined) updateData.notes = body.notes;
    if (body.internalNotes !== undefined)
      updateData.internalNotes = body.internalNotes;
    if (body.dueDate !== undefined) updateData.dueDate = new Date(body.dueDate);
    if (body.paymentTerms !== undefined)
      updateData.paymentTerms = body.paymentTerms;

    // Update invoice
    const updatedInvoice = await database.invoice.update({
      where: {
        tenantId_id: {
          tenantId,
          id,
        },
      },
      data: updateData,
      include: {
        client: {
          select: {
            id: true,
            company_name: true,
            first_name: true,
            last_name: true,
            email: true,
            defaultPaymentTerms: true,
          },
        },
        event: {
          select: {
            id: true,
            title: true,
            eventDate: true,
          },
        },
      },
    });

    return NextResponse.json<InvoiceResponse>({
      ...updatedInvoice,
      subtotal: updatedInvoice.subtotal.toString(),
      taxAmount: updatedInvoice.taxAmount.toString(),
      discountAmount: updatedInvoice.discountAmount.toString(),
      total: updatedInvoice.total.toString(),
      amountPaid: updatedInvoice.amountPaid.toString(),
      amountDue: updatedInvoice.amountDue.toString(),
      depositPercentage: updatedInvoice.depositPercentage?.toString() ?? null,
      depositRequired: updatedInvoice.depositRequired?.toString() ?? null,
      depositPaid: updatedInvoice.depositPaid?.toString() ?? null,
      lineItems: updatedInvoice.lineItems as InvoiceResponse["lineItems"],
      metadata: updatedInvoice.metadata as Record<string, unknown>,
    });
  } catch (error) {
    captureException(error);
    const prismaResult = translatePrismaError(error);
    if (prismaResult.mapped) {
      return NextResponse.json(
        { error: prismaResult.message },
        { status: prismaResult.status }
      );
    }
    log.error("Error updating invoice", { error });
    return NextResponse.json(
      { error: "Failed to update invoice" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/accounting/invoices/[id]
 * Handle invoice command actions
 */
export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    // Manager-tier role guard (P1.AM). apply-payment / mark-as-paid /
    // mark-overdue / send-reminder mutate ledger state and trigger customer
    // emails — staff-tier sessions must not reach these branches.
    const guard = await requireApiManager();
    if (!guard.ok) {
      return guard.response;
    }
    const { tenantId } = guard;
    const { id } = await context.params;
    const body = await request.json();

    const invoice = await database.invoice.findFirst({
      where: { tenantId, id, deletedAt: null },
      include: {
        client: {
          select: {
            id: true,
            email: true,
            first_name: true,
            company_name: true,
          },
        },
      },
    });

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    const action = body.action;

    if (action === "apply-payment") {
      const amount = Number(body.amount);
      if (!amount || amount <= 0) {
        return NextResponse.json(
          { error: "Valid payment amount is required" },
          { status: 400 }
        );
      }

      const newAmountPaid = Number(invoice.amountPaid) + amount;
      const newAmountDue = Number(invoice.total) - newAmountPaid;
      const newStatus = newAmountDue <= 0.01 ? "PAID" : "PARTIALLY_PAID";

      const updated = await database.invoice.update({
        where: { tenantId_id: { tenantId, id } },
        data: {
          amountPaid: newAmountPaid,
          amountDue: Math.max(0, newAmountDue),
          status: newStatus,
          paidAt: newStatus === "PAID" ? new Date() : invoice.paidAt,
          updatedAt: new Date(),
        },
        include: {
          client: {
            select: {
              id: true,
              company_name: true,
              first_name: true,
              last_name: true,
              email: true,
            },
          },
          event: { select: { id: true, title: true, eventDate: true } },
        },
      });

      return NextResponse.json(formatInvoiceResponse(updated));
    }

    if (action === "mark-as-paid") {
      const updated = await database.invoice.update({
        where: { tenantId_id: { tenantId, id } },
        data: {
          amountPaid: invoice.total,
          amountDue: 0,
          status: "PAID",
          paidAt: new Date(),
          updatedAt: new Date(),
        },
        include: {
          client: {
            select: {
              id: true,
              company_name: true,
              first_name: true,
              last_name: true,
              email: true,
            },
          },
          event: { select: { id: true, title: true, eventDate: true } },
        },
      });

      return NextResponse.json(formatInvoiceResponse(updated));
    }

    if (action === "mark-overdue") {
      if (invoice.status === "VOID" || invoice.status === "PAID") {
        return NextResponse.json(
          { error: `Cannot mark ${invoice.status} invoice as overdue` },
          { status: 400 }
        );
      }

      const updated = await database.invoice.update({
        where: { tenantId_id: { tenantId, id } },
        data: {
          status: "OVERDUE",
          updatedAt: new Date(),
        },
        include: {
          client: {
            select: {
              id: true,
              company_name: true,
              first_name: true,
              last_name: true,
              email: true,
            },
          },
          event: { select: { id: true, title: true, eventDate: true } },
        },
      });

      return NextResponse.json(formatInvoiceResponse(updated));
    }

    if (action === "send-reminder") {
      if (invoice.status === "DRAFT") {
        return NextResponse.json(
          { error: "Cannot send reminder for draft invoice" },
          { status: 400 }
        );
      }

      // Send reminder email (best-effort)
      const clientEmail = invoice.client?.email;
      if (clientEmail) {
        try {
          const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? DEFAULT_APP_URL;
          const paymentUrl = `${appUrl}/invoices/${invoice.id}`;
          const currency = "USD";

          await resend.emails.send({
            from: process.env.RESEND_FROM ?? DEFAULT_FROM_ADDRESS,
            to: clientEmail,
            subject: `Reminder: Invoice ${invoice.invoiceNumber} — ${invoice.amountDue.toString()} ${currency} due`,
            react: InvoiceTemplate({
              clientName:
                invoice.client?.first_name ||
                invoice.client?.company_name ||
                "Valued Client",
              invoiceNumber: invoice.invoiceNumber,
              amountDue: invoice.amountDue.toString(),
              currency,
              dueDate: invoice.dueDate
                ? new Date(invoice.dueDate).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })
                : undefined,
              paymentUrl,
              notes: invoice.notes ?? undefined,
            }),
          });
        } catch (emailError) {
          captureException(emailError);
          log.error("Failed to send reminder email", { error: emailError });
        }
      }

      const updated = await database.invoice.update({
        where: { tenantId_id: { tenantId, id } },
        data: { updatedAt: new Date() },
        include: {
          client: {
            select: {
              id: true,
              company_name: true,
              first_name: true,
              last_name: true,
              email: true,
            },
          },
          event: { select: { id: true, title: true, eventDate: true } },
        },
      });

      return NextResponse.json(formatInvoiceResponse(updated));
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    captureException(error);
    const prismaResult = translatePrismaError(error);
    if (prismaResult.mapped) {
      return NextResponse.json(
        { error: prismaResult.message },
        { status: prismaResult.status }
      );
    }
    log.error("Error handling invoice action", { error });
    return NextResponse.json(
      { error: "Failed to handle invoice action" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/accounting/invoices/[id]/send
 * Send an invoice to client
 */
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    // Manager-tier role guard (P1.AM). Sending an invoice transitions it to
    // SENT and triggers a client-visible email — keep it off staff-tier
    // sessions.
    const guard = await requireApiManager();
    if (!guard.ok) {
      return guard.response;
    }
    const { tenantId } = guard;
    const { id } = await context.params;

    const invoice = await database.invoice.findFirst({
      where: {
        tenantId,
        id,
        deletedAt: null,
      },
    });

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    validateInvoiceAccess(invoice, tenantId);
    validateInvoiceBusinessRules(
      {
        status: invoice.status as InvoiceResponse["status"],
        amountPaid: Number(invoice.amountPaid),
        amountDue: Number(invoice.amountDue),
      },
      "send"
    );

    // Update invoice status
    const updatedInvoice = await database.invoice.update({
      where: {
        tenantId_id: {
          tenantId,
          id,
        },
      },
      data: {
        status: "SENT",
        sentAt: new Date(),
      },
      include: {
        client: true,
        event: true,
      },
    });

    // Send notification email (best-effort — failure does not roll back send).
    // Mirrors EventContract.send: status transition is the source of truth;
    // the email is a side-effect that should eventually move into a manifest
    // event handler. Failing OPEN preserves invoice send semantics during a
    // transient Resend/SMTP outage.
    const clientEmail = updatedInvoice.client?.email;
    if (clientEmail) {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? DEFAULT_APP_URL;
      const paymentUrl = `${appUrl}/invoices/${updatedInvoice.id}`;
      const clientName =
        updatedInvoice.client?.first_name ||
        updatedInvoice.client?.company_name ||
        "Valued Client";
      const dueDate = updatedInvoice.dueDate
        ? new Date(updatedInvoice.dueDate).toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
          })
        : undefined;

      // Invoice amounts are stored as Postgres `money` (single tenant currency,
      // USD by default). When a per-tenant currency setting lands, replace this
      // literal with that value.
      const currency = "USD";
      const amountDue = updatedInvoice.amountDue.toString();

      try {
        await resend.emails.send({
          from: process.env.RESEND_FROM ?? DEFAULT_FROM_ADDRESS,
          to: clientEmail,
          subject: `Invoice ${updatedInvoice.invoiceNumber} — ${amountDue} ${currency} due`,
          react: InvoiceTemplate({
            clientName,
            invoiceNumber: updatedInvoice.invoiceNumber,
            amountDue,
            currency,
            dueDate,
            paymentUrl,
            notes: updatedInvoice.notes ?? undefined,
          }),
        });
      } catch (emailError) {
        // Non-fatal: status transition already committed.
        captureException(emailError);
        log.error("Failed to send invoice email", { error: emailError });
      }
    }

    return NextResponse.json<InvoiceResponse>({
      ...updatedInvoice,
      subtotal: updatedInvoice.subtotal.toString(),
      taxAmount: updatedInvoice.taxAmount.toString(),
      discountAmount: updatedInvoice.discountAmount.toString(),
      total: updatedInvoice.total.toString(),
      amountPaid: updatedInvoice.amountPaid.toString(),
      amountDue: updatedInvoice.amountDue.toString(),
      depositPercentage: updatedInvoice.depositPercentage?.toString() ?? null,
      depositRequired: updatedInvoice.depositRequired?.toString() ?? null,
      depositPaid: updatedInvoice.depositPaid?.toString() ?? null,
      lineItems: updatedInvoice.lineItems as InvoiceResponse["lineItems"],
      metadata: updatedInvoice.metadata as Record<string, unknown>,
    });
  } catch (error) {
    captureException(error);
    const prismaResult = translatePrismaError(error);
    if (prismaResult.mapped) {
      return NextResponse.json(
        { error: prismaResult.message },
        { status: prismaResult.status }
      );
    }
    log.error("Error sending invoice", { error });
    return NextResponse.json(
      { error: "Failed to send invoice" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/accounting/invoices/[id]
 * Void an invoice
 */
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    // Manager-tier role guard (P1.AM). Voiding an invoice removes a
    // receivable from the AR ledger — staff-tier sessions must not reach it.
    const guard = await requireApiManager();
    if (!guard.ok) {
      return guard.response;
    }
    const { tenantId } = guard;
    const { id } = await context.params;

    const invoice = await database.invoice.findFirst({
      where: {
        tenantId,
        id,
        deletedAt: null,
      },
    });

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    validateInvoiceAccess(invoice, tenantId);
    validateInvoiceBusinessRules(
      {
        status: invoice.status as InvoiceResponse["status"],
        amountPaid: Number(invoice.amountPaid),
        amountDue: Number(invoice.amountDue),
      },
      "void"
    );

    // Update invoice status to VOID
    const updatedInvoice = await database.invoice.update({
      where: {
        tenantId_id: {
          tenantId,
          id,
        },
      },
      data: {
        status: "VOID",
      },
    });

    return NextResponse.json<InvoiceResponse>({
      ...updatedInvoice,
      subtotal: updatedInvoice.subtotal.toString(),
      taxAmount: updatedInvoice.taxAmount.toString(),
      discountAmount: updatedInvoice.discountAmount.toString(),
      total: updatedInvoice.total.toString(),
      amountPaid: updatedInvoice.amountPaid.toString(),
      amountDue: updatedInvoice.amountDue.toString(),
      depositPercentage: updatedInvoice.depositPercentage?.toString() ?? null,
      depositRequired: updatedInvoice.depositRequired?.toString() ?? null,
      depositPaid: updatedInvoice.depositPaid?.toString() ?? null,
      lineItems: updatedInvoice.lineItems as InvoiceResponse["lineItems"],
      metadata: updatedInvoice.metadata as Record<string, unknown>,
    });
  } catch (error) {
    captureException(error);
    const prismaResult = translatePrismaError(error);
    if (prismaResult.mapped) {
      return NextResponse.json(
        { error: prismaResult.message },
        { status: prismaResult.status }
      );
    }
    log.error("Error voiding invoice", { error });
    return NextResponse.json(
      { error: "Failed to void invoice" },
      { status: 500 }
    );
  }
}
