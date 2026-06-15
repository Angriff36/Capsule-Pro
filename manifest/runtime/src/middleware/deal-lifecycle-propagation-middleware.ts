/**
 * Deal-lifecycle propagation middleware (CRM pipeline, IMPLEMENTATION_PLAN P1).
 *
 * Completes two CRM propagations that the declarative DSL cannot express:
 *   - DealClosed   → mirror the outcome onto the originating Lead's status
 *                    (Deal won  → Lead "won";  Deal lost → Lead "lost").
 *   - DealAssigned → notify the assignee via Notification.create.
 *
 * WHY this is middleware and not a reaction (the crux):
 *
 * 1. DealClosed → Lead.status. The Lead to advance is `Deal.leadId` — the deal's
 *    OWN field. `close(status)` takes only `status` as a param, so the emitted
 *    payload (`{ ...commandInput, result }`) carries `status` but NOT `leadId`
 *    (declared event fields are never auto-populated from `self.*`). And
 *    `Lead.update` (lead-rules.manifest) is a FULL-FIELD mutate guarded by
 *    `contactName != ""` and `isConverted == false`: a reaction passing only
 *    `{ leadId, status }` would blank the lead's other fields AND trip the guard.
 *    The propagation must LOAD the Deal (for leadId + the authoritative outcome)
 *    and the Lead (to re-pass its existing fields) — only possible in middleware.
 *
 * 2. DealAssigned → Notification. `Notification.create` needs a `title`, which is
 *    the Deal's OWN field (not an `assign` param). `assignedTo` IS an `assign`
 *    param (so it rides the payload), but the deal title still requires loading
 *    the Deal. A create-fanout also cannot be a pure reaction here.
 *
 * Guard-safe / FSM-aware: the Lead status FSM (lead-rules.manifest) only permits
 * `→ "won"` from `"proposal"` and `→ "lost"` from `{"contacted","qualified",
 * "proposal"}`. Self-transitions are NOT exempt in this runtime, so an
 * out-of-state dispatch would be a swallowed mutate failure. This middleware reads
 * the Lead's CURRENT status and skips cleanly when the transition isn't applicable
 * (already-won/converted/archived leads, leads still earlier in the funnel). Every
 * skip and failure reports through `onDiagnostic` — never silent.
 *
 * KNOWN LIMITATION (documented, not silent): each dispatch runs as the SAME actor
 * who closed/assigned the deal, subject to the target's policy.
 * `Notification.create`'s default policy is `manager/admin` (notification-rules
 * .manifest:30), while `Deal.assign` admits `sales*` too — so a lower-privilege
 * assigner's notification leg yields a policy-denied diagnostic + skip (the runtime
 * has no per-call identity override; elevating it would be a governance change).
 * The Lead.update leg shares Deal's `sales*`/manager/admin policy, so the close
 * mirror passes for the common actor.
 *
 * Precedents: proposal-lifecycle-lead-status-middleware (load subject + Lead.update
 * full-field passthrough + FSM gate) and lead-converted-deal-create-middleware
 * (create-fanout: id in body, randomUUID, idempotencyKey).
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

export interface DealLifecyclePropagationDiagnostic {
  dealId?: string;
  detail?: Record<string, unknown>;
  leadId?: string;
  reason: string;
  stage: string;
  status?: string;
  tenantId?: string;
}

export interface DealLifecyclePropagationMiddlewareOptions {
  dispatchCommand: DispatchCommand;
  onDiagnostic?: (diag: DealLifecyclePropagationDiagnostic) => void;
  storeProvider: (entityName: string) => Store | undefined;
}

interface DealLike {
  assignedTo?: unknown;
  leadId?: unknown;
  status?: unknown;
  tenantId?: unknown;
  title?: unknown;
}

interface LeadLike {
  assignedTo?: unknown;
  companyName?: unknown;
  contactEmail?: unknown;
  contactName?: unknown;
  contactPhone?: unknown;
  convertedAt?: unknown;
  convertedToClientId?: unknown;
  deletedAt?: unknown;
  estimatedGuests?: unknown;
  estimatedValue?: unknown;
  eventDate?: unknown;
  eventType?: unknown;
  notes?: unknown;
  status?: unknown;
}

/**
 * Deal close outcome → the set of CURRENT lead statuses from which that transition
 * is legal (mirrors the Lead FSM, lead-rules.manifest). A current status outside the
 * `from` set — including the target itself (self-transition) — is skipped rather than
 * dispatched into a swallowed failure.
 */
const CLOSE_OUTCOMES: Record<string, { from: ReadonlySet<string> }> = {
  won: { from: new Set(["proposal"]) },
  lost: { from: new Set(["contacted", "qualified", "proposal"]) },
};

const defaultDiagnostic = (
  diag: DealLifecyclePropagationDiagnostic
): void => {
  // eslint-disable-next-line no-console
  console.warn(`[deal-lifecycle:${diag.stage}] ${diag.reason}`, {
    dealId: diag.dealId,
    leadId: diag.leadId,
    status: diag.status,
    tenantId: diag.tenantId,
    ...diag.detail,
  });
};

export function createDealLifecyclePropagationMiddleware(
  options: DealLifecyclePropagationMiddlewareOptions
): Middleware {
  const {
    storeProvider,
    dispatchCommand,
    onDiagnostic = defaultDiagnostic,
  } = options;

  return {
    hooks: ["after-emit"],

    async handler(ctx: MiddlewareContext): Promise<MiddlewareResult> {
      if (ctx.entityName !== "Deal") {
        return {};
      }

      for (const event of ctx.emittedEvents) {
        if (event.name === "DealClosed") {
          await mirrorLeadStatus(event, ctx);
        } else if (event.name === "DealAssigned") {
          await notifyAssignee(event, ctx);
        }
      }

      return {};
    },
  };

  /** DealClosed → Lead.update(status = won|lost), FSM-gated, full-field passthrough. */
  async function mirrorLeadStatus(
    // biome-ignore lint/suspicious/noExplicitAny: structural emitted-event row.
    event: any,
    ctx: MiddlewareContext
  ): Promise<void> {
    const payload = event.payload as { tenantId?: unknown } | undefined;
    const dealId =
      asNonEmptyString(event.subject?.id) ?? asNonEmptyString(ctx.instanceId);
    const tenantId = resolveTenantId(payload, ctx);
    if (!(dealId && tenantId)) {
      onDiagnostic({
        stage: "resolve",
        reason: `DealClosed missing ${dealId ? "tenantId" : "dealId"}`,
        dealId,
        tenantId,
      });
      return;
    }

    const dealStore = storeProvider("Deal");
    const leadStore = storeProvider("Lead");
    if (!(dealStore && leadStore)) {
      onDiagnostic({
        stage: "stores",
        reason: "Deal or Lead store unavailable — lead status not mirrored",
        dealId,
        tenantId,
        detail: { deal: !!dealStore, lead: !!leadStore },
      });
      return;
    }

    const deal = (await dealStore.getById(dealId)) as DealLike | undefined;
    if (!deal) {
      onDiagnostic({
        stage: "load",
        reason: "closed deal not found in store — cannot resolve lead",
        dealId,
        tenantId,
      });
      return;
    }

    // Read the authoritative post-mutation outcome off the loaded deal (won|lost).
    const outcome = asNonEmptyString(deal.status);
    if (!(outcome && outcome in CLOSE_OUTCOMES)) {
      onDiagnostic({
        stage: "outcome",
        reason: `deal status "${outcome ?? "<none>"}" is not a won/lost close — skip`,
        dealId,
        tenantId,
        status: outcome,
      });
      return;
    }
    const spec = CLOSE_OUTCOMES[outcome];

    const leadId = asNonEmptyString(deal.leadId);
    if (!leadId) {
      onDiagnostic({
        stage: "leadId",
        reason: "deal has no leadId — nothing to mirror",
        dealId,
        tenantId,
      });
      return;
    }

    const lead = (await leadStore.getById(leadId)) as LeadLike | undefined;
    if (!lead) {
      onDiagnostic({
        stage: "lead-load",
        reason: "linked lead not found in store — cannot mirror status",
        dealId,
        leadId,
        tenantId,
      });
      return;
    }

    // Lead.update guard `self.deletedAt == null`.
    if (lead.deletedAt != null) {
      onDiagnostic({
        stage: "archived",
        reason: "lead is archived (deletedAt set) — skip status mirror",
        dealId,
        leadId,
        tenantId,
      });
      return;
    }

    // Lead.update guard `self.isConverted == false` (computed
    // `convertedToClientId != "" and convertedAt != null`).
    const isConverted =
      asNonEmptyString(lead.convertedToClientId) !== undefined &&
      lead.convertedAt != null;
    if (isConverted) {
      onDiagnostic({
        stage: "converted",
        reason: "lead already converted to client — skip status mirror",
        dealId,
        leadId,
        tenantId,
      });
      return;
    }

    // FSM gate: only mirror when the transition is legal from the lead's CURRENT
    // status. Out-of-state (including a no-op self-transition) is skipped — the
    // runtime does not exempt self-transitions, so dispatching would be a swallowed
    // failure. A lead already "won" (the common case for a converted lead) is skipped.
    const currentStatus = asNonEmptyString(lead.status) ?? "new";
    if (!spec.from.has(currentStatus)) {
      onDiagnostic({
        stage: "fsm",
        reason: `lead status "${currentStatus}" cannot transition to "${outcome}" — skip`,
        dealId,
        leadId,
        tenantId,
        status: currentStatus,
      });
      return;
    }

    // Lead.update is a full-field mutate guarded by `contactName != ""`; the lead's
    // existing contactName must be re-passed. Lead.create enforces it non-empty, so
    // this should always hold — but skip safely if data drifted.
    const contactName = asNonEmptyString(lead.contactName);
    if (!contactName) {
      onDiagnostic({
        stage: "contact-name",
        reason: "lead has empty contactName — Lead.update guard would fail; skip",
        dealId,
        leadId,
        tenantId,
      });
      return;
    }

    const result = await dispatchCommand(
      "update",
      {
        // Lead.update is a MUTATE on the existing Lead; the target id travels BOTH
        // in the body (`id`) and as `instanceId`. Every other field is re-passed
        // from the loaded row so the full-field mutate blanks nothing — only
        // `status` changes.
        id: leadId,
        tenantId,
        companyName: asString(lead.companyName),
        contactName,
        contactEmail: asString(lead.contactEmail),
        contactPhone: asString(lead.contactPhone),
        eventType: asString(lead.eventType),
        eventDate: lead.eventDate ?? null,
        estimatedGuests: asFiniteNumber(lead.estimatedGuests) ?? 0,
        estimatedValue: asFiniteNumber(lead.estimatedValue) ?? 0,
        status: outcome,
        assignedTo: asString(lead.assignedTo),
        notes: asString(lead.notes),
      },
      {
        entityName: "Lead",
        instanceId: leadId,
        correlationId:
          asNonEmptyString((ctx as { correlationId?: unknown }).correlationId) ??
          dealId,
        causationId: "DealClosed",
        // Keyed on the outcome so each distinct close mirror dispatches once; a
        // repeat of the same close is both deduped here and skipped by the FSM gate.
        idempotencyKey: `deal-lead:${tenantId}:${leadId}:${outcome}`,
      }
    );
    if (result.emittedEvents) {
      ctx.emittedEvents.push(...result.emittedEvents);
    }
    if (!result.success) {
      onDiagnostic({
        stage: "update",
        reason: `Lead.update(status="${outcome}") failed: ${result.error ?? "unknown"}`,
        dealId,
        leadId,
        tenantId,
        status: outcome,
      });
      return;
    }

    onDiagnostic({
      stage: "done",
      reason: `lead mirrored to "${outcome}" from DealClosed`,
      dealId,
      leadId,
      tenantId,
      status: outcome,
    });
  }

  /** DealAssigned → Notification.create for the assignee. */
  async function notifyAssignee(
    // biome-ignore lint/suspicious/noExplicitAny: structural emitted-event row.
    event: any,
    ctx: MiddlewareContext
  ): Promise<void> {
    const payload = event.payload as
      | { assignedTo?: unknown; tenantId?: unknown }
      | undefined;
    const dealId =
      asNonEmptyString(event.subject?.id) ?? asNonEmptyString(ctx.instanceId);
    const tenantId = resolveTenantId(payload, ctx);
    if (!(dealId && tenantId)) {
      onDiagnostic({
        stage: "notify-resolve",
        reason: `DealAssigned missing ${dealId ? "tenantId" : "dealId"}`,
        dealId,
        tenantId,
      });
      return;
    }

    const dealStore = storeProvider("Deal");
    const notificationStore = storeProvider("Notification");
    if (!(dealStore && notificationStore)) {
      onDiagnostic({
        stage: "notify-stores",
        reason: "Deal or Notification store unavailable — assignee not notified",
        dealId,
        tenantId,
        detail: { deal: !!dealStore, notification: !!notificationStore },
      });
      return;
    }

    const deal = (await dealStore.getById(dealId)) as DealLike | undefined;
    if (!deal) {
      onDiagnostic({
        stage: "notify-load",
        reason: "assigned deal not found in store — cannot build notification",
        dealId,
        tenantId,
      });
      return;
    }

    // `assignedTo` is an `assign` input param, so it rides the payload; fall back to
    // the loaded deal's own field for resilience.
    const recipient =
      asNonEmptyString(payload?.assignedTo) ?? asNonEmptyString(deal.assignedTo);
    if (!recipient) {
      onDiagnostic({
        stage: "recipient",
        reason: "DealAssigned has no assignee — nothing to notify",
        dealId,
        tenantId,
      });
      return;
    }

    const dealTitle = asNonEmptyString(deal.title) ?? "a deal";

    const notificationId = randomUUID();
    const result = await dispatchCommand(
      "create",
      {
        // For a create the new id travels in the body, NOT as instanceId.
        id: notificationId,
        tenantId,
        recipientEmployeeId: recipient,
        notificationType: "deal_assigned",
        title: `Deal assigned: ${dealTitle}`,
        body: `You have been assigned the deal "${dealTitle}".`,
        actionUrl: "",
        correlationId: dealId,
      },
      {
        entityName: "Notification",
        correlationId:
          asNonEmptyString((ctx as { correlationId?: unknown }).correlationId) ??
          dealId,
        causationId: "DealAssigned",
        // Keyed on (deal, recipient): a re-emitted assignment to the same person
        // dedups, while a genuine reassignment to a different person notifies anew.
        idempotencyKey: `deal-notify:${tenantId}:${dealId}:${recipient}`,
      }
    );
    if (result.emittedEvents) {
      ctx.emittedEvents.push(...result.emittedEvents);
    }
    if (!result.success) {
      onDiagnostic({
        stage: "notify-create",
        // The common cause is the manager/admin policy on Notification.create when
        // a sales_rep made the assignment — surfaced, not silent.
        reason: `Notification.create failed (policy or guard): ${result.error ?? "unknown"}`,
        dealId,
        tenantId,
        detail: { recipient },
      });
      return;
    }

    onDiagnostic({
      stage: "notify-done",
      reason: `assignee notified of deal assignment ("${dealTitle}")`,
      dealId,
      tenantId,
      detail: { recipient },
    });
  }
}

function resolveTenantId(
  payload: { tenantId?: unknown } | undefined,
  ctx: MiddlewareContext
): string | undefined {
  return (
    asNonEmptyString(payload?.tenantId) ??
    asNonEmptyString(
      (ctx.runtimeContext.user as { tenantId?: unknown } | undefined)?.tenantId
    )
  );
}

function asNonEmptyString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function asFiniteNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  // estimatedValue is a `decimal`/`money` — stores may surface it as a string.
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}
