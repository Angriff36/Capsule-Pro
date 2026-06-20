/**
 * Invoice-fully-paid → markAsPaid middleware.
 *
 * Closes a core AR correctness gap: `Invoice.applyPayment(paymentAmount, paymentId)`
 * (invoice-rules.manifest:94-102) UNCONDITIONALLY mutates `status = "PARTIALLY_PAID"`,
 * even when the payment settles the balance exactly (`paymentAmount == amountDue`, which
 * drives `amountDue` to 0). So an invoice paid in full via the apply path is stranded at
 * `PARTIALLY_PAID` with `amountDue = 0` — it NEVER reaches `PAID`. `Invoice.markAsPaid()`
 * (invoice-rules.manifest:104-109) exists and the transitions to PAID are present
 * (SENT/VIEWED/OVERDUE/PARTIALLY_PAID → PAID), but nothing was calling it. Consequence:
 * fully-settled invoices kept showing as owed, `sendReminder` stayed allowed, and
 * AR/collections kept chasing debt that was already paid.
 *
 * WHY this is middleware and not a reaction (the crux):
 * Whether the invoice is now fully paid depends on the Invoice's OWN post-mutation
 * `amountDue`/`status` — NOT on `applyPayment`'s input params, and the declared
 * `PaymentApplied` fields (`remainingBalance`, …) are NEVER auto-populated from `self.*`
 * (the engine emits `{ ...commandInput, result }` only). A reaction therefore cannot read
 * the remaining balance to decide whether to close the invoice. This middleware instead
 * loads the Invoice from the store via `_subject.id` (the post-mutation row already
 * reflects the payment) and dispatches the governed `Invoice.markAsPaid` when the balance
 * has reached zero.
 *
 * Loop-safe (this is the important subtlety): `markAsPaid` ALSO emits `PaymentApplied`
 * (invoice-rules.manifest:108). This handler is scoped to `command.name === "applyPayment"`,
 * so the markAsPaid-emitted `PaymentApplied` never re-enters this middleware — no
 * re-trigger cycle. Belt-and-suspenders: it also skips when `status == "PAID"` (so even a
 * stray re-emit is a clean no-op, and never a rejected `PAID -> PAID` no-op self-transition),
 * and carries a stable `idempotencyKey`.
 *
 * Quiet on the common path: a PARTIAL payment (`amountDue > 0`) is the dominant, expected
 * outcome — there is simply no action to take, so it returns without a diagnostic (warning
 * on every partial payment would be log spam). Genuine anomalies (missing invoice, missing
 * `amountDue`, dispatch failure) and the close action itself ARE reported via `onDiagnostic`.
 */

import type {
  CommandResult,
  Middleware,
  MiddlewareContext,
  MiddlewareResult,
  Store,
} from "@angriff36/manifest";
import type { AsyncDispatch } from "../async-reactions";
import {
  captureTriggeringEvents,
  INVOICE_FULLY_PAID_MARK_PAID_REACTION,
} from "../async-reactions";

interface RunCommandOptions {
  causationId?: string;
  correlationId?: string;
  entityName?: string;
  idempotencyKey?: string;
  instanceId?: string;
}

type DispatchCommand = (
  commandName: string,
  input: Record<string, unknown>,
  options: RunCommandOptions
) => Promise<CommandResult>;

export interface InvoiceFullyPaidMarkPaidDiagnostic {
  amountDue?: number;
  detail?: Record<string, unknown>;
  invoiceId?: string;
  reason: string;
  stage: string;
  tenantId?: string;
}

export interface InvoiceFullyPaidMarkPaidMiddlewareOptions {
  asyncEnqueue?: AsyncDispatch;
  dispatchCommand: DispatchCommand;
  onDiagnostic?: (diag: InvoiceFullyPaidMarkPaidDiagnostic) => void;
  storeProvider: (entityName: string) => Store | undefined;
}

interface InvoiceLike {
  amountDue?: unknown;
  status?: unknown;
}

const defaultDiagnostic = (diag: InvoiceFullyPaidMarkPaidDiagnostic): void => {
  // eslint-disable-next-line no-console
  console.warn(`[invoice-fully-paid:${diag.stage}] ${diag.reason}`, {
    invoiceId: diag.invoiceId,
    tenantId: diag.tenantId,
    amountDue: diag.amountDue,
    ...diag.detail,
  });
};

export function createInvoiceFullyPaidMarkPaidMiddleware(
  options: InvoiceFullyPaidMarkPaidMiddlewareOptions
): Middleware {
  const {
    storeProvider,
    dispatchCommand,
    onDiagnostic = defaultDiagnostic,
    asyncEnqueue,
  } = options;

  return {
    hooks: ["after-emit"],

    async handler(ctx: MiddlewareContext): Promise<MiddlewareResult> {
      // Scope to applyPayment ONLY. markAsPaid also emits PaymentApplied; excluding it
      // here is what prevents this middleware from re-triggering on its own dispatch.
      const appliedEvents = ctx.emittedEvents.filter(
        (event) =>
          event.name === "PaymentApplied" &&
          ctx.entityName === "Invoice" &&
          ctx.command.name === "applyPayment"
      );

      if (asyncEnqueue && appliedEvents.length > 0) {
        await captureTriggeringEvents({
          asyncEnqueue,
          ctx,
          events: appliedEvents,
          reactionName: INVOICE_FULLY_PAID_MARK_PAID_REACTION,
        });
        return {};
      }

      for (const event of appliedEvents) {
        const payload = event.payload as { tenantId?: unknown } | undefined;
        const invoiceId =
          asNonEmptyString(event.subject?.id) ??
          asNonEmptyString(ctx.instanceId);
        const tenantId =
          asNonEmptyString(payload?.tenantId) ??
          asNonEmptyString(
            (ctx.runtimeContext.user as { tenantId?: unknown } | undefined)
              ?.tenantId
          );
        if (!(invoiceId && tenantId)) {
          onDiagnostic({
            stage: "resolve",
            reason: `PaymentApplied missing ${invoiceId ? "tenantId" : "invoiceId"}`,
            invoiceId,
            tenantId,
          });
          continue;
        }

        const invoiceStore = storeProvider("Invoice");
        if (!invoiceStore) {
          onDiagnostic({
            stage: "stores",
            reason: "Invoice store unavailable — cannot evaluate paid-in-full",
            invoiceId,
            tenantId,
          });
          continue;
        }

        const invoice = (await invoiceStore.getById(invoiceId)) as
          | InvoiceLike
          | undefined;
        if (!invoice) {
          onDiagnostic({
            stage: "load",
            reason: "invoice not found in store — cannot evaluate paid-in-full",
            invoiceId,
            tenantId,
          });
          continue;
        }

        const status = asNonEmptyString(invoice.status);
        // Already closed (incl. the markAsPaid re-emit path) — nothing to do, and a
        // markAsPaid dispatch here would be a rejected PAID -> PAID no-op self-transition.
        if (status === "PAID") {
          continue;
        }

        const amountDue = asFiniteNumber(invoice.amountDue);
        if (amountDue === undefined) {
          onDiagnostic({
            stage: "amount",
            reason: `invoice amountDue not numeric (${String(invoice.amountDue)}) — skip`,
            invoiceId,
            tenantId,
          });
          continue;
        }

        // The common, expected case: balance remains. No action, no diagnostic.
        if (amountDue > 0) {
          continue;
        }

        // Balance is settled (== 0; <= 0 is defensive) and the invoice is not yet PAID.
        const result = await dispatchCommand(
          "markAsPaid",
          {
            // markAsPaid() is a MUTATE on the existing Invoice. Supply the target id
            // BOTH in the body (`id`) AND as `instanceId` so the write-back persists to
            // the right row regardless of which the engine keys persistence on (same
            // shape as the payment→invoice apply middleware).
            id: invoiceId,
            tenantId,
          },
          {
            entityName: "Invoice",
            instanceId: invoiceId,
            correlationId:
              asNonEmptyString(
                (ctx as { correlationId?: unknown }).correlationId
              ) ?? invoiceId,
            causationId: "PaymentApplied",
            idempotencyKey: `invoice-fully-paid:${tenantId}:${invoiceId}:mark`,
          }
        );
        if (result.emittedEvents) {
          ctx.emittedEvents.push(...result.emittedEvents);
        }
        if (!result.success) {
          onDiagnostic({
            stage: "mark",
            reason: `Invoice.markAsPaid failed: ${result.error ?? "unknown"}`,
            invoiceId,
            tenantId,
            amountDue,
          });
          continue;
        }

        onDiagnostic({
          stage: "done",
          reason: "invoice balance reached zero — marked PAID",
          invoiceId,
          tenantId,
          amountDue,
        });
      }

      return {};
    },
  };
}

function asNonEmptyString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function asFiniteNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  // money fields may surface as strings from some stores.
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}
