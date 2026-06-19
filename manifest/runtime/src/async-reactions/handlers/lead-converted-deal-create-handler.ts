/**
 * Async reaction handler for lead conversion → deal creation.
 *
 * Deferred counterpart of {@link createLeadConvertedDealCreateMiddleware}. When
 * `LeadConvertedToClient` fires, the middleware (with async enabled) ENQUEUES a
 * job; this handler runs LATER in the worker, loads the converted Lead for its
 * own fields (`companyName` / `estimatedValue` / `contactName` / `eventDate` —
 * NOT reachable from the declared event payload), and dispatches the governed
 * `Deal.create` linking back to the lead.
 *
 * The load + dispatch logic is identical to the synchronous middleware. It is
 * duplicated here rather than shared because the synchronous middleware reads
 * `ctx.instanceId` / `ctx.runtimeContext.user.tenantId` / `ctx.correlationId`,
 * while the async handler only has {@link TriggeringEventPayload} + `job.tenantId`
 * captured at enqueue time. Keeping the two paths independent means each can
 * evolve without coupling.
 *
 * Idempotent: per (tenant, lead). Skips when a Deal already exists for the lead
 * (the converted lead maps to exactly one pipeline deal), AND forwards
 * `lead-converted:${tenantId}:${leadId}` so the governed dispatch dedups a
 * redelivered job. The source command itself is one-shot (`blockAlreadyConverted`),
 * so this is belt-and-suspenders.
 */

import { randomUUID } from "node:crypto";
import type {
  AsyncReactionHandler,
  AsyncReactionHandlerContext,
} from "..";

/** Reaction name registered with {@link asyncReactionRegistry}. */
export const LEAD_CONVERTED_DEAL_CREATE_REACTION = "leadConvertedDealCreate";

interface LeadRow {
  companyName?: unknown;
  contactName?: unknown;
  estimatedValue?: unknown;
  eventDate?: unknown;
}

interface DealRow {
  leadId?: unknown;
  tenantId?: unknown;
}

interface ManifestStore {
  getAll(): Promise<unknown[]>;
  getById(id: string): Promise<unknown | undefined>;
}

/**
 * Handler implementation. Exposed for direct unit testing (the registry
 * registers a thin wrapper around it).
 */
export const leadConvertedDealCreateHandler: AsyncReactionHandler = async (
  ctx: AsyncReactionHandlerContext
): Promise<void> => {
  const { job, dispatchCommand, storeProvider, log } = ctx;
  const leadId = job.triggeringEvent.subjectId;
  const tenantId = job.tenantId;

  if (!leadId) {
    log.warn?.("leadConvertedDealCreate: missing subjectId — skipping", {
      jobId: job.id,
    });
    return;
  }

  const leadStore = storeProvider("Lead") as ManifestStore | undefined;
  const dealStore = storeProvider("Deal") as ManifestStore | undefined;
  if (!(leadStore && dealStore)) {
    throw new Error("Lead or Deal store unavailable");
  }

  const existing = (await dealStore.getAll())
    .map((row) => row as DealRow)
    .find(
      (row) =>
        asNonEmptyString(row.tenantId) === tenantId &&
        asNonEmptyString(row.leadId) === leadId
    );
  if (existing) {
    log.warn?.("leadConvertedDealCreate: deal already exists for lead — skip", {
      jobId: job.id,
      leadId,
      tenantId,
    });
    return;
  }

  const lead = (await leadStore.getById(leadId)) as LeadRow | undefined;
  if (!lead) {
    throw new Error(`converted Lead not found in store: ${leadId}`);
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
      // instanceId — passing instanceId targets an existing instance and the
      // row is never persisted (mirrors the synchronous middleware).
      entityName: "Deal",
      correlationId: leadId,
      causationId: "LeadConvertedToClient",
      idempotencyKey:
        job.idempotencyKey ?? `lead-converted:${tenantId}:${leadId}`,
    }
  );

  if (!result.success) {
    throw new Error(
      `Deal.create failed for lead ${leadId}: ${result.error ?? "unknown"}`
    );
  }
};

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
