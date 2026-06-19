/**
 * Collection-payment-recorded → Invoice-applyPayment middleware.
 *
 * Completes the finance propagation "when a collection case records a payment
 * against its invoice, apply it through the governed Invoice.applyPayment" — the
 * cascade that keeps a delinquent invoice's `amountPaid`/`amountDue`/`status`
 * consistent with collection-recovery activity.
 *
 * WHY this is middleware and not a reaction (the crux):
 * `CollectionCase.recordPayment(amount, paymentId, paymentDate)` is a MUTATE
 * command (last mutate `lastActivityAt = now()`), so the engine's emitted payload
 * is `{ ...commandInput, result }` where `result` is the last mutate's scalar (a
 * timestamp), NOT the CollectionCase instance. The invoice to credit is identified
 * by `CollectionCase.invoiceId` — the case's OWN field, NOT a `recordPayment` input
 * param. Declared event fields (`CollectionPaymentRecorded.invoiceId` /
 * `.outstandingAmount`) are NEVER auto-populated from `self.*`. So the prior
 * `on CollectionPaymentRecorded run Invoice.applyPayment` reaction reading
 * `resolve payload.result.invoiceId` was a SILENT NO-OP: every ref `undefined` →
 * `Invoice.applyPayment`'s guards failed → reaction error logged-and-swallowed →
 * the collected invoices were never credited (collections recorded the recovery
 * but the AR books never moved). Reading `payload.invoiceId` would not help — it is
 * not a `recordPayment` param either. This middleware instead LOADS the
 * CollectionCase from the store via `_subject.id` (the engine-cleaner mechanism for
 * entity-owned fields), reads `self.invoiceId`, takes the `amount`/`paymentId` from
 * the command input (genuine params that DO ride the payload), and dispatches the
 * governed `Invoice.applyPayment`.
 *
 * Direct sibling of `payment-processed-invoice-apply-middleware.ts`. There is no
 * double-apply risk: the collections route only invokes `CollectionCase.recordPayment`
 * and relies on this propagation — it does not separately credit the invoice, and a
 * collection payment is NOT a `Payment.process`, so the PaymentProcessed apply leg
 * never fires for this path.
 *
 * Guard-safe + idempotent: only dispatches when the case carries an `invoiceId`, the
 * `amount` is positive, and the linked Invoice satisfies `applyPayment`'s guards
 * (status ∈ {SENT, VIEWED, OVERDUE, PARTIALLY_PAID} and 0 < amount <= amountDue). A
 * DRAFT/PAID invoice or an over-payment is skipped (reported via `onDiagnostic`)
 * rather than producing a swallowed guard failure. The `idempotencyKey` keys on the
 * case's post-payment `outstandingAmount` (strictly decreasing per payment, so
 * distinct real payments never collide) — or the `paymentId` when present — so a
 * re-emitted `CollectionPaymentRecorded` dedups but sequential payments do not.
 * Every skip and failure reports through `onDiagnostic` — never silent.
 */

import type {
  CommandResult,
  Middleware,
  MiddlewareContext,
  MiddlewareResult,
  Store,
} from "@angriff36/manifest";
import { isMoneyGreaterThan } from "../numeric-boundary";

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

export interface CollectionInvoiceApplyDiagnostic {
  caseId?: string;
  detail?: Record<string, unknown>;
  invoiceId?: string;
  reason: string;
  stage: string;
  tenantId?: string;
}

export interface CollectionPaymentRecordedInvoiceApplyMiddlewareOptions {
  dispatchCommand: DispatchCommand;
  onDiagnostic?: (diag: CollectionInvoiceApplyDiagnostic) => void;
  storeProvider: (entityName: string) => Store | undefined;
}

interface CollectionCaseLike {
  invoiceId?: unknown;
  outstandingAmount?: unknown;
  tenantId?: unknown;
}

interface InvoiceLike {
  amountDue?: unknown;
  status?: unknown;
}

// Invoice.applyPayment guards `self.status in [...]`; outside this set the command
// rejects (DRAFT not yet sent; PAID/VOID/WRITE_OFF terminal).
const APPLICABLE_INVOICE_STATUSES = new Set([
  "SENT",
  "VIEWED",
  "OVERDUE",
  "PARTIALLY_PAID",
]);

const defaultDiagnostic = (diag: CollectionInvoiceApplyDiagnostic): void => {
  // eslint-disable-next-line no-console
  console.warn(`[collection-invoice:${diag.stage}] ${diag.reason}`, {
    caseId: diag.caseId,
    invoiceId: diag.invoiceId,
    tenantId: diag.tenantId,
    ...diag.detail,
  });
};

export function createCollectionPaymentRecordedInvoiceApplyMiddleware(
  options: CollectionPaymentRecordedInvoiceApplyMiddlewareOptions
): Middleware {
  const {
    storeProvider,
    dispatchCommand,
    onDiagnostic = defaultDiagnostic,
  } = options;

  return {
    hooks: ["after-emit"],

    async handler(ctx: MiddlewareContext): Promise<MiddlewareResult> {
      const recordedEvents = ctx.emittedEvents.filter(
        (event) =>
          event.name === "CollectionPaymentRecorded" &&
          ctx.entityName === "CollectionCase" &&
          ctx.command.name === "recordPayment"
      );

      for (const event of recordedEvents) {
        const payload = event.payload as
          | { amount?: unknown; paymentId?: unknown; tenantId?: unknown }
          | undefined;
        const caseId =
          asNonEmptyString(event.subject?.id) ??
          asNonEmptyString(ctx.instanceId);
        const tenantId =
          asNonEmptyString(payload?.tenantId) ??
          asNonEmptyString(
            (ctx.runtimeContext.user as { tenantId?: unknown } | undefined)
              ?.tenantId
          );
        if (!(caseId && tenantId)) {
          onDiagnostic({
            stage: "resolve",
            reason: `CollectionPaymentRecorded missing ${caseId ? "tenantId" : "caseId"}`,
            caseId,
            tenantId,
          });
          continue;
        }

        const caseStore = storeProvider("CollectionCase");
        const invoiceStore = storeProvider("Invoice");
        if (!(caseStore && invoiceStore)) {
          onDiagnostic({
            stage: "stores",
            reason:
              "CollectionCase or Invoice store unavailable — payment not applied",
            caseId,
            tenantId,
            detail: { collectionCase: !!caseStore, invoice: !!invoiceStore },
          });
          continue;
        }

        const collectionCase = (await caseStore.getById(caseId)) as
          | CollectionCaseLike
          | undefined;
        if (!collectionCase) {
          onDiagnostic({
            stage: "load",
            reason: "collection case not found in store — cannot apply",
            caseId,
            tenantId,
          });
          continue;
        }

        // invoiceId is the case's OWN field — the whole reason this is middleware.
        const invoiceId = asNonEmptyString(collectionCase.invoiceId);
        if (!invoiceId) {
          onDiagnostic({
            stage: "invoiceId",
            reason: "collection case has no invoiceId — nothing to credit",
            caseId,
            tenantId,
          });
          continue;
        }

        // `amount` IS a recordPayment input param, so it rides the payload.
        const amount = asFiniteNumber(payload?.amount);
        if (!(amount && amount > 0)) {
          onDiagnostic({
            stage: "amount",
            reason: `recorded payment amount not positive (${String(payload?.amount)}) — skip apply`,
            caseId,
            invoiceId,
            tenantId,
          });
          continue;
        }

        // Guard-safe: mirror Invoice.applyPayment's guards so a skip is a clean
        // no-op instead of a swallowed guard failure.
        const invoice = (await invoiceStore.getById(invoiceId)) as
          | InvoiceLike
          | undefined;
        if (!invoice) {
          onDiagnostic({
            stage: "invoice-load",
            reason: "linked invoice not found in store — cannot apply",
            caseId,
            invoiceId,
            tenantId,
          });
          continue;
        }
        const invoiceStatus = asNonEmptyString(invoice.status);
        if (!(invoiceStatus && APPLICABLE_INVOICE_STATUSES.has(invoiceStatus))) {
          onDiagnostic({
            stage: "invoice-status",
            reason: `invoice not in an applicable status (status="${invoiceStatus ?? "?"}") — skip apply`,
            caseId,
            invoiceId,
            tenantId,
          });
          continue;
        }
        const amountDue = asFiniteNumber(invoice.amountDue) ?? 0;
        if (isMoneyGreaterThan(amount, amountDue)) {
          onDiagnostic({
            stage: "overpay",
            reason: `recorded payment ${amount} exceeds invoice amount due ${amountDue} — skip apply`,
            caseId,
            invoiceId,
            tenantId,
          });
          continue;
        }

        // `paymentId` is a recordPayment param (may be empty); fall back to the case
        // id for traceability. The idempotency discriminator uses the case's
        // post-payment outstandingAmount (strictly decreasing → unique per payment,
        // stable on retry) so a re-emitted event dedups but sequential payments don't.
        const paymentId =
          asNonEmptyString(payload?.paymentId) ?? caseId;
        const outstanding = asFiniteNumber(collectionCase.outstandingAmount);
        const dedupKey = asNonEmptyString(payload?.paymentId) ?? String(outstanding ?? amount);

        const result = await dispatchCommand(
          "applyPayment",
          {
            // applyPayment is a MUTATE on the existing Invoice. The target id is
            // supplied BOTH in the body (`id`) AND as `instanceId` so the
            // write-back persists to the right row regardless of which the engine
            // keys persistence on (same shape as the sibling finance middleware).
            id: invoiceId,
            tenantId,
            paymentAmount: amount,
            paymentId,
          },
          {
            entityName: "Invoice",
            instanceId: invoiceId,
            correlationId:
              asNonEmptyString(
                (ctx as { correlationId?: unknown }).correlationId
              ) ?? caseId,
            causationId: "CollectionPaymentRecorded",
            idempotencyKey: `collection-invoice:${tenantId}:${caseId}:${dedupKey}:apply`,
          }
        );
        if (result.emittedEvents) {
          ctx.emittedEvents.push(...result.emittedEvents);
        }
        if (!result.success) {
          onDiagnostic({
            stage: "apply",
            reason: `Invoice.applyPayment failed: ${result.error ?? "unknown"}`,
            caseId,
            invoiceId,
            tenantId,
          });
          continue;
        }

        onDiagnostic({
          stage: "done",
          reason: `applied collection payment ${amount} to invoice`,
          caseId,
          invoiceId,
          tenantId,
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
