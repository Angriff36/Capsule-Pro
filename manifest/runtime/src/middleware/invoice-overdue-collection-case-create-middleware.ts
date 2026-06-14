/**
 * Invoice-marked-overdue → CollectionCase-create middleware.
 *
 * Completes the finance propagation "when an invoice goes overdue, automatically
 * open a collection case" — so a delinquent invoice no longer falls through the
 * cracks until someone manually opens a case via the collections UI. Without this,
 * `InvoiceMarkedOverdue` (invoice-rules.manifest:213) had ZERO consumers: overdue
 * invoices accumulated with no AR-recovery workflow attached, and the only path to a
 * CollectionCase was the manual POST route (accounting/collections/cases/route.ts).
 *
 * WHY this is middleware and not a reaction (the crux):
 * `Invoice.markOverdue()` takes NO params and is a MUTATE command (last mutate
 * `overdueSince = now()`), so the engine's emitted payload is `{ ...commandInput,
 * result }` where `result` is the last mutate's scalar (a timestamp), NOT the Invoice
 * instance. Every field a collection case needs — `clientId`, `eventId`, `total`,
 * `amountDue`, `invoiceNumber` — is the Invoice's OWN field, NOT a `markOverdue`
 * input param, and declared event fields (`InvoiceMarkedOverdue.invoiceId` /
 * `.invoiceNumber` / `.daysOverdue`) are NEVER auto-populated from `self.*`. So a
 * reaction can only see `payload._subject.id` (the invoice id) plus the command's
 * (empty) input params; it structurally cannot read the fields `CollectionCase.create`
 * requires. This middleware instead LOADS the Invoice from the store via `_subject.id`
 * (the engine-cleaner mechanism for entity-owned fields) and dispatches the governed
 * `CollectionCase.create`, mirroring the exact field mapping the manual route uses.
 *
 * Guard-safe + idempotent:
 *  - Skips when a CollectionCase already exists for the invoice (mirrors the route's
 *    409 "case already exists for this invoice" guard) so re-emits / re-runs cannot
 *    double-open a case; a stable `idempotencyKey` is a second backstop, and the
 *    entity's `unique invoiceNumber` is a third.
 *  - Skips when `originalAmount` (= the invoice `total`) is not positive: the
 *    CollectionCase entity carries `constraint amount_positive: originalAmount > 0`,
 *    so creating a case for a zero-total invoice would be rejected — a clean skip
 *    (reported via `onDiagnostic`) beats a swallowed create failure.
 * Every skip and failure reports through `onDiagnostic` — never silent.
 */

import { randomUUID } from "node:crypto";
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

export interface InvoiceOverdueCollectionCaseDiagnostic {
  caseId?: string;
  detail?: Record<string, unknown>;
  invoiceId?: string;
  reason: string;
  stage: string;
  tenantId?: string;
}

export interface InvoiceOverdueCollectionCaseCreateMiddlewareOptions {
  dispatchCommand: DispatchCommand;
  onDiagnostic?: (diag: InvoiceOverdueCollectionCaseDiagnostic) => void;
  storeProvider: (entityName: string) => Store | undefined;
}

interface InvoiceLike {
  amountDue?: unknown;
  clientId?: unknown;
  eventId?: unknown;
  invoiceNumber?: unknown;
  total?: unknown;
}

interface CollectionCaseLike {
  deletedAt?: unknown;
  invoiceId?: unknown;
  tenantId?: unknown;
}

interface ClientLike {
  businessName?: unknown;
  contactName?: unknown;
  displayName?: unknown;
  name?: unknown;
}

const defaultDiagnostic = (diag: InvoiceOverdueCollectionCaseDiagnostic): void => {
  // eslint-disable-next-line no-console
  console.warn(`[invoice-overdue-collection:${diag.stage}] ${diag.reason}`, {
    caseId: diag.caseId,
    invoiceId: diag.invoiceId,
    tenantId: diag.tenantId,
    ...diag.detail,
  });
};

export function createInvoiceOverdueCollectionCaseCreateMiddleware(
  options: InvoiceOverdueCollectionCaseCreateMiddlewareOptions
): Middleware {
  const {
    storeProvider,
    dispatchCommand,
    onDiagnostic = defaultDiagnostic,
  } = options;

  return {
    hooks: ["after-emit"],

    async handler(ctx: MiddlewareContext): Promise<MiddlewareResult> {
      const overdueEvents = ctx.emittedEvents.filter(
        (event) =>
          event.name === "InvoiceMarkedOverdue" &&
          ctx.entityName === "Invoice" &&
          ctx.command.name === "markOverdue"
      );

      for (const event of overdueEvents) {
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
            reason: `InvoiceMarkedOverdue missing ${invoiceId ? "tenantId" : "invoiceId"}`,
            invoiceId,
            tenantId,
          });
          continue;
        }

        const invoiceStore = storeProvider("Invoice");
        const caseStore = storeProvider("CollectionCase");
        if (!(invoiceStore && caseStore)) {
          onDiagnostic({
            stage: "stores",
            reason:
              "Invoice or CollectionCase store unavailable — case not opened",
            invoiceId,
            tenantId,
            detail: { invoice: !!invoiceStore, collectionCase: !!caseStore },
          });
          continue;
        }

        // Idempotency: an overdue invoice maps to at most one collection case
        // (mirrors the route's 409 guard — any existing, non-deleted case wins).
        const existing = (await caseStore.getAll()).find(
          (row) =>
            asNonEmptyString((row as CollectionCaseLike).tenantId) ===
              tenantId &&
            asNonEmptyString((row as CollectionCaseLike).invoiceId) ===
              invoiceId &&
            (row as CollectionCaseLike).deletedAt == null
        );
        if (existing) {
          onDiagnostic({
            stage: "dedupe",
            reason: "collection case already exists for this invoice — skip",
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
            reason: "overdue invoice not found in store — cannot open case",
            invoiceId,
            tenantId,
          });
          continue;
        }

        // originalAmount = the invoice total (the original debt). CollectionCase's
        // `amount_positive` constraint requires it > 0, so a zero-total invoice is
        // skipped rather than producing a swallowed create failure.
        const originalAmount = asFiniteNumber(invoice.total) ?? 0;
        if (originalAmount <= 0) {
          onDiagnostic({
            stage: "amount",
            reason: `invoice total not positive (${String(invoice.total)}) — cannot open case`,
            invoiceId,
            tenantId,
          });
          continue;
        }

        // outstandingAmount = what is still owed; fall back to the full debt.
        const outstandingAmount =
          asFiniteNumber(invoice.amountDue) ?? originalAmount;
        const invoiceNumber = asNonEmptyString(invoice.invoiceNumber) ?? "";
        const clientId = asNonEmptyString(invoice.clientId) ?? "";
        const eventId = asNonEmptyString(invoice.eventId) ?? "";

        // clientName is display metadata only (no create-bootstrap constraint), so
        // resolve it opportunistically from the Client store and fall back to "".
        const clientName = await resolveClientName(
          storeProvider,
          clientId
        );

        const caseId = randomUUID();
        const result = await dispatchCommand(
          "create",
          {
            // For a create the new id travels in the body, NOT as instanceId —
            // instanceId targets an existing instance and the row is never
            // persisted (see lead-converted-deal-create-middleware).
            id: caseId,
            tenantId,
            invoiceId,
            invoiceNumber,
            eventId,
            clientId,
            clientName,
            originalAmount,
            outstandingAmount,
            collectedAmount: 0,
            priority: "MEDIUM",
            daysOverdue: 0,
            agingBucket: "",
            notes: "Auto-opened from overdue invoice",
            metadata: "{}",
            assignedTo: "",
            hasPaymentPlan: false,
            isDisputed: false,
            isEscalatedToLegal: false,
          },
          {
            entityName: "CollectionCase",
            correlationId:
              asNonEmptyString(
                (ctx as { correlationId?: unknown }).correlationId
              ) ?? invoiceId,
            causationId: "InvoiceMarkedOverdue",
            idempotencyKey: `invoice-overdue-collection:${tenantId}:${invoiceId}:create`,
          }
        );
        if (result.emittedEvents) {
          ctx.emittedEvents.push(...result.emittedEvents);
        }
        if (!result.success) {
          onDiagnostic({
            stage: "create",
            reason: `CollectionCase.create failed: ${result.error ?? "unknown"}`,
            caseId,
            invoiceId,
            tenantId,
          });
          continue;
        }

        onDiagnostic({
          stage: "done",
          reason: `collection case opened for overdue invoice (outstanding ${outstandingAmount})`,
          caseId,
          invoiceId,
          tenantId,
        });
      }

      return {};
    },
  };
}

async function resolveClientName(
  storeProvider: (entityName: string) => Store | undefined,
  clientId: string
): Promise<string> {
  if (!clientId) {
    return "";
  }
  const clientStore = storeProvider("Client");
  if (!clientStore) {
    return "";
  }
  const client = (await clientStore.getById(clientId)) as
    | ClientLike
    | undefined;
  if (!client) {
    return "";
  }
  return (
    asNonEmptyString(client.businessName) ??
    asNonEmptyString(client.name) ??
    asNonEmptyString(client.displayName) ??
    asNonEmptyString(client.contactName) ??
    ""
  );
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
