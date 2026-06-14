/**
 * Lead-converted → Deal-create middleware.
 *
 * Completes the CRM propagation "when a Lead is converted to a client, open a
 * Deal in the sales pipeline" — the part the declarative DSL cannot express.
 *
 * WHY this is middleware and not a reaction (the crux):
 * `Lead.convertToClient` is a MUTATE command, so the engine's emitted payload is
 * `{ ...commandInput, result }` where `result` is the LAST mutate's scalar
 * (`status = "won"`), NOT the Lead instance. The Deal's `title`/`value` come from
 * the Lead's OWN fields (`companyName`, `estimatedValue`), which are NOT
 * `convertToClient` input params — and declared event fields are never
 * auto-populated from `self.*`. So a reaction can only see `payload._subject.id`
 * (the Lead id) plus the command's input params; it structurally cannot read
 * `companyName`/`estimatedValue`. The prior `on LeadConvertedToClient run
 * Deal.create` reaction reading `payload.result.*` was therefore a SILENT NO-OP
 * (every ref `undefined` → `Deal.create`'s `leadId`/`title` guards fail → reaction
 * error logged-and-swallowed → zero Deals). Adding the fields as command params
 * would pollute `Lead.convertToClient`'s contract with its own entity's fields and
 * the only caller (the CRM UI → generic dispatcher) supplies just `{ id }`. This
 * middleware instead LOADS the converted Lead from the store (the engine-cleaner
 * mechanism for entity-owned fields) and dispatches the governed `Deal.create`.
 *
 * Idempotent: skips if a Deal already exists for the lead (and the source command
 * itself is one-shot — `blockAlreadyConverted` prevents re-conversion). Every skip
 * reports through `onDiagnostic` — never silent.
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

export interface LeadConvertedDealDiagnostic {
  detail?: Record<string, unknown>;
  dealId?: string;
  leadId?: string;
  reason: string;
  stage: string;
  tenantId?: string;
}

export interface LeadConvertedDealCreateMiddlewareOptions {
  dispatchCommand: DispatchCommand;
  onDiagnostic?: (diag: LeadConvertedDealDiagnostic) => void;
  storeProvider: (entityName: string) => Store | undefined;
}

interface LeadLike {
  companyName?: unknown;
  contactName?: unknown;
  estimatedValue?: unknown;
  eventDate?: unknown;
  tenantId?: unknown;
}

interface DealLike {
  leadId?: unknown;
  tenantId?: unknown;
}

const defaultDiagnostic = (diag: LeadConvertedDealDiagnostic): void => {
  // eslint-disable-next-line no-console
  console.warn(`[lead-deal:${diag.stage}] ${diag.reason}`, {
    leadId: diag.leadId,
    dealId: diag.dealId,
    tenantId: diag.tenantId,
    ...diag.detail,
  });
};

export function createLeadConvertedDealCreateMiddleware(
  options: LeadConvertedDealCreateMiddlewareOptions
): Middleware {
  const {
    storeProvider,
    dispatchCommand,
    onDiagnostic = defaultDiagnostic,
  } = options;

  return {
    hooks: ["after-emit"],

    async handler(ctx: MiddlewareContext): Promise<MiddlewareResult> {
      const convertedEvents = ctx.emittedEvents.filter(
        (event) =>
          event.name === "LeadConvertedToClient" &&
          ctx.entityName === "Lead" &&
          ctx.command.name === "convertToClient"
      );

      for (const event of convertedEvents) {
        const payload = event.payload as { tenantId?: unknown } | undefined;
        const leadId =
          asNonEmptyString(event.subject?.id) ??
          asNonEmptyString(ctx.instanceId);
        const tenantId =
          asNonEmptyString(payload?.tenantId) ??
          asNonEmptyString(
            (ctx.runtimeContext.user as { tenantId?: unknown } | undefined)
              ?.tenantId
          );
        if (!(leadId && tenantId)) {
          onDiagnostic({
            stage: "resolve",
            reason: `LeadConvertedToClient missing ${leadId ? "tenantId" : "leadId"}`,
            leadId,
            tenantId,
          });
          continue;
        }

        const leadStore = storeProvider("Lead");
        const dealStore = storeProvider("Deal");
        if (!(leadStore && dealStore)) {
          onDiagnostic({
            stage: "stores",
            reason: "Lead or Deal store unavailable — deal not created",
            leadId,
            tenantId,
            detail: { lead: !!leadStore, deal: !!dealStore },
          });
          continue;
        }

        // Idempotency: a converted lead maps to exactly one pipeline deal.
        const existing = (await dealStore.getAll()).find(
          (row) =>
            asNonEmptyString((row as DealLike).tenantId) === tenantId &&
            asNonEmptyString((row as DealLike).leadId) === leadId
        );
        if (existing) {
          onDiagnostic({
            stage: "dedupe",
            reason: "deal already exists for this lead — skip",
            leadId,
            tenantId,
          });
          continue;
        }

        const lead = (await leadStore.getById(leadId)) as LeadLike | undefined;
        if (!lead) {
          onDiagnostic({
            stage: "load",
            reason: "converted lead not found in store — cannot derive deal",
            leadId,
            tenantId,
          });
          continue;
        }

        // Title/value come from the Lead's own fields. companyName can be blank
        // (it defaults to "" on Lead); fall back to contactName, then a sentinel,
        // so Deal.create's `title != ""` guard always passes.
        const title =
          asNonEmptyString(lead.companyName) ??
          asNonEmptyString(lead.contactName) ??
          "Untitled Deal";
        const value = asFiniteNumber(lead.estimatedValue) ?? 0;
        // Anchor the expected close to the lead's event date when known; the
        // original reaction used `now()` as the fallback.
        const expectedCloseDate = asFiniteNumber(lead.eventDate) ?? Date.now();

        const dealId = randomUUID();
        const result = await dispatchCommand(
          "create",
          {
            id: dealId,
            tenantId,
            leadId,
            title,
            value,
            currency: "USD",
            stage: "new",
            probability: 25,
            expectedCloseDate,
            assignedTo: "",
            notes: "Auto-created from lead conversion",
          },
          {
            // For a create the new id travels in the body (above), NOT as
            // instanceId — passing instanceId targets an existing instance and
            // the row is never persisted (mirrors prep-list-seed's item create).
            entityName: "Deal",
            correlationId:
              asNonEmptyString(
                (ctx as { correlationId?: unknown }).correlationId
              ) ?? leadId,
            causationId: "LeadConvertedToClient",
            idempotencyKey: `lead-deal:${tenantId}:${leadId}:create`,
          }
        );
        if (result.emittedEvents) {
          ctx.emittedEvents.push(...result.emittedEvents);
        }
        if (!result.success) {
          onDiagnostic({
            stage: "create",
            reason: `Deal.create failed: ${result.error ?? "unknown"}`,
            leadId,
            dealId,
            tenantId,
          });
          continue;
        }

        onDiagnostic({
          stage: "done",
          reason: `deal opened for converted lead (value ${value}, title "${title}")`,
          leadId,
          dealId,
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
  // Lead.estimatedValue is a `decimal` — stores may surface it as a string.
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}
