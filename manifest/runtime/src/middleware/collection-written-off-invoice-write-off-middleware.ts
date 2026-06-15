/**
 * Collection-written-off → Invoice-writeOff middleware.
 *
 * Closes the OTHER end of the collections↔invoice loop (the symmetric counterpart
 * of `InvoiceMarkedOverdue → CollectionCase.create`): when a collection case is
 * written off as uncollectable, the underlying invoice must also be marked
 * WRITE_OFF — otherwise the AR books keep showing a dead debt as owed/overdue and
 * financial reporting overstates receivables forever.
 *
 * WHY this is middleware and not a reaction (the crux):
 * `CollectionCase.writeOff(amount, reason, approvedBy)` is a MUTATE command (last
 * mutate `closedAt = now()`), so the engine's emitted payload is
 * `{ ...commandInput, result }` where `result` is a timestamp scalar, NOT the
 * CollectionCase instance. The invoice to write off is identified by
 * `CollectionCase.invoiceId` — the case's OWN field, NOT a `writeOff` input param.
 * Declared event fields (`CollectionWrittenOff.invoiceId`) are NEVER auto-populated
 * from `self.*`, so a reaction reading `payload.result.invoiceId` (or even
 * `payload.invoiceId`) is a silent no-op. This middleware instead LOADS the
 * CollectionCase from the store via `_subject.id`, reads `self.invoiceId`, and
 * dispatches the governed `Invoice.writeOff`.
 *
 * Direct sibling of `collection-payment-recorded-invoice-apply-middleware.ts`.
 *
 * PREREQUISITE BUG (fixed in the same change): `CollectionCase.writeOff` was a DEAD
 * command — it mutates `status = "WRITTEN_OFF"`, but the CollectionCase FSM listed no
 * transition target of "WRITTEN_OFF", so the engine rejected every call before the
 * mutate ran (same dead-target class as the Invoice VOIDED/WRITTEN_OFF bug). The FSM
 * was fixed (ACTIVE/IN_PROGRESS/LEGAL -> "WRITTEN_OFF") so the source command — and
 * therefore this propagation — can fire at all.
 *
 * Guard-safe + idempotent: only dispatches when the case carries an `invoiceId`, the
 * linked Invoice is in a status `Invoice.writeOff` accepts (OVERDUE or PARTIALLY_PAID —
 * a collections-stage invoice is normally OVERDUE), and the remaining `amountDue` is
 * positive. An already-written-off / paid / void / draft invoice is skipped (reported
 * via `onDiagnostic`) rather than producing a swallowed guard failure. The invoice's
 * FULL remaining `amountDue` is written off (the whole balance is uncollectable) — this
 * is independent of the murky `amount` param the case-side command keeps as its residual
 * outstanding. A static `idempotencyKey` per case dedups a re-emitted event; a case is
 * written off once (terminal), so this never collides with a legitimate second write-off.
 * Every skip and failure reports through `onDiagnostic` — never silent.
 */

import type {
  CommandResult,
  Middleware,
  MiddlewareContext,
  MiddlewareResult,
  Store,
} from "@angriff36/manifest";

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

export interface CollectionInvoiceWriteOffDiagnostic {
  caseId?: string;
  detail?: Record<string, unknown>;
  invoiceId?: string;
  reason: string;
  stage: string;
  tenantId?: string;
}

export interface CollectionWrittenOffInvoiceWriteOffMiddlewareOptions {
  dispatchCommand: DispatchCommand;
  onDiagnostic?: (diag: CollectionInvoiceWriteOffDiagnostic) => void;
  storeProvider: (entityName: string) => Store | undefined;
}

interface CollectionCaseLike {
  invoiceId?: unknown;
  tenantId?: unknown;
}

interface InvoiceLike {
  amountDue?: unknown;
  status?: unknown;
}

// Invoice.writeOff guards `self.status in ["OVERDUE", "PARTIALLY_PAID"]`; outside this
// set the command rejects (DRAFT/SENT/VIEWED not yet collectible-as-loss; PAID/VOID/
// WRITE_OFF terminal). Mirror it so a skip is a clean no-op, not a swallowed failure.
const WRITE_OFFABLE_INVOICE_STATUSES = new Set(["OVERDUE", "PARTIALLY_PAID"]);

const defaultDiagnostic = (diag: CollectionInvoiceWriteOffDiagnostic): void => {
  // eslint-disable-next-line no-console
  console.warn(`[collection-writeoff:${diag.stage}] ${diag.reason}`, {
    caseId: diag.caseId,
    invoiceId: diag.invoiceId,
    tenantId: diag.tenantId,
    ...diag.detail,
  });
};

export function createCollectionWrittenOffInvoiceWriteOffMiddleware(
  options: CollectionWrittenOffInvoiceWriteOffMiddlewareOptions
): Middleware {
  const {
    storeProvider,
    dispatchCommand,
    onDiagnostic = defaultDiagnostic,
  } = options;

  return {
    hooks: ["after-emit"],

    async handler(ctx: MiddlewareContext): Promise<MiddlewareResult> {
      const writtenOffEvents = ctx.emittedEvents.filter(
        (event) =>
          event.name === "CollectionWrittenOff" &&
          ctx.entityName === "CollectionCase" &&
          ctx.command.name === "writeOff"
      );

      for (const event of writtenOffEvents) {
        const payload = event.payload as
          | { reason?: unknown; tenantId?: unknown }
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
            reason: `CollectionWrittenOff missing ${caseId ? "tenantId" : "caseId"}`,
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
              "CollectionCase or Invoice store unavailable — invoice not written off",
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
            reason: "collection case not found in store — cannot write off invoice",
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
            reason: "collection case has no invoiceId — nothing to write off",
            caseId,
            tenantId,
          });
          continue;
        }

        // Guard-safe: mirror Invoice.writeOff's guards so a skip is a clean no-op
        // instead of a swallowed guard failure.
        const invoice = (await invoiceStore.getById(invoiceId)) as
          | InvoiceLike
          | undefined;
        if (!invoice) {
          onDiagnostic({
            stage: "invoice-load",
            reason: "linked invoice not found in store — cannot write off",
            caseId,
            invoiceId,
            tenantId,
          });
          continue;
        }
        const invoiceStatus = asNonEmptyString(invoice.status);
        if (
          !(invoiceStatus && WRITE_OFFABLE_INVOICE_STATUSES.has(invoiceStatus))
        ) {
          onDiagnostic({
            stage: "invoice-status",
            reason: `invoice not in a write-offable status (status="${invoiceStatus ?? "?"}") — skip`,
            caseId,
            invoiceId,
            tenantId,
          });
          continue;
        }
        // Write off the FULL remaining balance: the case is uncollectable, so whatever
        // the invoice still has due is the loss. writeOffAmount <= amountDue is satisfied
        // by equality; the command zeroes amountDue regardless.
        const amountDue = asFiniteNumber(invoice.amountDue) ?? 0;
        if (amountDue <= 0) {
          onDiagnostic({
            stage: "nothing-due",
            reason: `invoice amountDue is ${amountDue} — nothing to write off`,
            caseId,
            invoiceId,
            tenantId,
          });
          continue;
        }

        // `reason` IS a writeOff input param, so it rides the payload.
        const reason =
          asNonEmptyString(payload?.reason) ??
          "Collection case written off as uncollectable";

        const result = await dispatchCommand(
          "writeOff",
          {
            // writeOff is a MUTATE on the existing Invoice. The target id is supplied
            // BOTH in the body (`id`) AND as `instanceId` so the write-back persists to
            // the right row regardless of which the engine keys persistence on (same
            // shape as the sibling finance middleware).
            id: invoiceId,
            tenantId,
            reason,
            writeOffAmount: amountDue,
          },
          {
            entityName: "Invoice",
            instanceId: invoiceId,
            correlationId:
              asNonEmptyString(
                (ctx as { correlationId?: unknown }).correlationId
              ) ?? caseId,
            causationId: "CollectionWrittenOff",
            idempotencyKey: `collection-writeoff:${tenantId}:${caseId}:writeoff`,
          }
        );
        if (result.emittedEvents) {
          ctx.emittedEvents.push(...result.emittedEvents);
        }
        if (!result.success) {
          onDiagnostic({
            stage: "writeoff",
            reason: `Invoice.writeOff failed: ${result.error ?? "unknown"}`,
            caseId,
            invoiceId,
            tenantId,
          });
          continue;
        }

        onDiagnostic({
          stage: "done",
          reason: `wrote off invoice balance ${amountDue} for an uncollectable case`,
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
