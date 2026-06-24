/**
 * Proposal-lifecycle → Lead-status middleware (CRM pipeline propagation).
 *
 * Completes "as a proposal moves through its lifecycle, advance the originating
 * Lead's pipeline stage" — the loop that keeps the sales funnel honest:
 *   - ProposalCreated / ProposalSent → Lead.status = "proposal"
 *   - ProposalAccepted               → Lead.status = "won"
 *   - ProposalRejected               → Lead.status = "lost"
 *
 * WHY this is middleware and not a reaction (the crux):
 * The Lead to advance is identified by `Proposal.leadId`, which is the proposal's
 * OWN field. Only `create` takes `leadId` as a param; `send`/`accept`/`reject` are
 * MUTATE commands that take no `leadId` (their emitted payload is
 * `{ ...commandInput, result }` where `result` is the last mutate's scalar), and
 * declared event fields are never auto-populated from `self.*`. So a reaction
 * structurally cannot read `leadId` for three of the four events.
 *
 * Worse, `Lead.update` (lead-rules.manifest:88) is a FULL-FIELD mutate guarded by
 * `contactName != ""` and `isConverted == false`: it re-writes companyName,
 * contactName, contactEmail, … on every call. A reaction could only pass
 * `{ leadId, status }`, which would BLANK the lead's other fields AND trip the
 * contactName guard. The propagation therefore MUST load the Lead and re-pass its
 * existing fields — only possible in middleware.
 *
 * Guard-safe / FSM-aware: the Lead status FSM (lead-rules.manifest:36-39) only
 * permits `→ "proposal"` from `"qualified"`, `→ "won"` from `"proposal"`, and
 * `→ "lost"` from `{"contacted","qualified","proposal"}`. Self-transitions are NOT
 * exempt in this runtime, so dispatching an out-of-state transition would produce a
 * swallowed mutate failure. This middleware reads the Lead's CURRENT status and
 * skips cleanly when the transition isn't applicable (already-advanced leads, leads
 * still earlier in the funnel, archived/converted leads). Every skip and failure
 * reports through `onDiagnostic` — never silent.
 *
 * Precedents: contract-signed-event-confirm-middleware (load subject + guard target
 * status) and lead-converted-deal-create-middleware (load Lead + field passthrough).
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

export interface ProposalLeadStatusDiagnostic {
  detail?: Record<string, unknown>;
  leadId?: string;
  proposalId?: string;
  reason: string;
  stage: string;
  status?: string;
  tenantId?: string;
}

export interface ProposalLifecycleLeadStatusMiddlewareOptions {
  dispatchCommand: DispatchCommand;
  onDiagnostic?: (diag: ProposalLeadStatusDiagnostic) => void;
  storeProvider: (entityName: string) => Store | undefined;
}

interface ProposalLike {
  leadId?: unknown;
  tenantId?: unknown;
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
 * Per-event target status + the set of CURRENT lead statuses from which that
 * transition is legal (mirrors the Lead FSM, lead-rules.manifest:36-39). A current
 * status outside the `from` set — including the target itself (self-transition) —
 * is skipped rather than dispatched into a swallowed failure.
 */
const TRANSITIONS: Record<string, { from: ReadonlySet<string>; to: string }> = {
  ProposalCreated: { to: "proposal", from: new Set(["qualified"]) },
  ProposalSent: { to: "proposal", from: new Set(["qualified"]) },
  ProposalAccepted: { to: "won", from: new Set(["proposal"]) },
  ProposalRejected: {
    to: "lost",
    from: new Set(["contacted", "qualified", "proposal"]),
  },
};

const defaultDiagnostic = (diag: ProposalLeadStatusDiagnostic): void => {
  // eslint-disable-next-line no-console
  console.warn(`[proposal-lead:${diag.stage}] ${diag.reason}`, {
    proposalId: diag.proposalId,
    leadId: diag.leadId,
    status: diag.status,
    tenantId: diag.tenantId,
    ...diag.detail,
  });
};

export function createProposalLifecycleLeadStatusMiddleware(
  options: ProposalLifecycleLeadStatusMiddlewareOptions
): Middleware {
  const {
    storeProvider,
    dispatchCommand,
    onDiagnostic = defaultDiagnostic,
  } = options;

  return {
    hooks: ["after-emit"],

    async handler(ctx: MiddlewareContext): Promise<MiddlewareResult> {
      const lifecycleEvents = ctx.emittedEvents.filter(
        (event) =>
          ctx.entityName === "Proposal" && event.name in TRANSITIONS
      );

      for (const event of lifecycleEvents) {
        const spec = TRANSITIONS[event.name];
        if (!spec) continue;
        const payload = event.payload as { tenantId?: unknown } | undefined;
        const proposalId =
          asNonEmptyString(event.subject?.id) ??
          asNonEmptyString(ctx.instanceId);
        const tenantId =
          asNonEmptyString(payload?.tenantId) ??
          asNonEmptyString(
            (ctx.runtimeContext.user as { tenantId?: unknown } | undefined)
              ?.tenantId
          );
        if (!(proposalId && tenantId)) {
          onDiagnostic({
            stage: "resolve",
            reason: `${event.name} missing ${proposalId ? "tenantId" : "proposalId"}`,
            proposalId,
            tenantId,
          });
          continue;
        }

        const proposalStore = storeProvider("Proposal");
        const leadStore = storeProvider("Lead");
        if (!(proposalStore && leadStore)) {
          onDiagnostic({
            stage: "stores",
            reason: "Proposal or Lead store unavailable — lead status not advanced",
            proposalId,
            tenantId,
            detail: { proposal: !!proposalStore, lead: !!leadStore },
          });
          continue;
        }

        const proposal = (await proposalStore.getById(proposalId)) as
          | ProposalLike
          | undefined;
        if (!proposal) {
          onDiagnostic({
            stage: "load",
            reason: "proposal not found in store — cannot resolve lead",
            proposalId,
            tenantId,
          });
          continue;
        }

        const leadId = asNonEmptyString(proposal.leadId);
        if (!leadId) {
          onDiagnostic({
            stage: "leadId",
            reason: "proposal has no leadId — nothing to advance",
            proposalId,
            tenantId,
          });
          continue;
        }

        const lead = (await leadStore.getById(leadId)) as LeadLike | undefined;
        if (!lead) {
          onDiagnostic({
            stage: "lead-load",
            reason: "linked lead not found in store — cannot advance status",
            proposalId,
            leadId,
            tenantId,
          });
          continue;
        }

        // Lead.update guard `self.deletedAt == null`: an archived lead cannot be
        // updated — dispatching would only produce a swallowed guard failure.
        if (lead.deletedAt != null) {
          onDiagnostic({
            stage: "archived",
            reason: "lead is archived (deletedAt set) — skip status advance",
            proposalId,
            leadId,
            tenantId,
          });
          continue;
        }

        // Lead.update guard `self.isConverted == false`. isConverted is the
        // computed `convertedToClientId != "" and convertedAt != null`.
        const isConverted =
          asNonEmptyString(lead.convertedToClientId) !== undefined &&
          lead.convertedAt != null;
        if (isConverted) {
          onDiagnostic({
            stage: "converted",
            reason: "lead already converted to client — skip status advance",
            proposalId,
            leadId,
            tenantId,
          });
          continue;
        }

        // FSM gate: only advance when the transition is legal from the lead's
        // CURRENT status. Out-of-state (including a no-op self-transition) is
        // skipped — the runtime does not exempt self-transitions, so dispatching
        // would be a swallowed failure.
        const currentStatus = asNonEmptyString(lead.status) ?? "new";
        if (!spec.from.has(currentStatus)) {
          onDiagnostic({
            stage: "fsm",
            reason: `lead status "${currentStatus}" cannot transition to "${spec.to}" for ${event.name} — skip`,
            proposalId,
            leadId,
            tenantId,
            status: currentStatus,
          });
          continue;
        }

        // Lead.update is a full-field mutate guarded by `contactName != ""`; the
        // lead's existing contactName must be re-passed. Lead.create enforces it
        // non-empty, so this should always hold — but skip safely if data drifted.
        const contactName = asNonEmptyString(lead.contactName);
        if (!contactName) {
          onDiagnostic({
            stage: "contact-name",
            reason: "lead has empty contactName — Lead.update guard would fail; skip",
            proposalId,
            leadId,
            tenantId,
          });
          continue;
        }

        const result = await dispatchCommand(
          "update",
          {
            // Lead.update is a MUTATE on the existing Lead; the target id travels
            // BOTH in the body (`id`) and as `instanceId` so the write-back
            // persists regardless of which the engine keys persistence on. Every
            // other field is re-passed from the loaded row so the full-field
            // mutate does not blank anything — only `status` changes.
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
            status: spec.to,
            assignedTo: asString(lead.assignedTo),
            notes: asString(lead.notes),
          },
          {
            entityName: "Lead",
            instanceId: leadId,
            correlationId:
              asNonEmptyString(
                (ctx as { correlationId?: unknown }).correlationId
              ) ?? proposalId,
            causationId: event.name,
            // Keyed on the target status so each distinct stage advance for a lead
            // dispatches once; a repeat of the same event (already at target) is
            // both deduped here and skipped by the FSM gate above.
            idempotencyKey: `proposal-lead:${tenantId}:${leadId}:${spec.to}`,
          }
        );
        if (result.emittedEvents) {
          ctx.emittedEvents.push(...result.emittedEvents);
        }
        if (!result.success) {
          onDiagnostic({
            stage: "update",
            reason: `Lead.update(status="${spec.to}") failed: ${result.error ?? "unknown"}`,
            proposalId,
            leadId,
            tenantId,
            status: spec.to,
          });
          continue;
        }

        onDiagnostic({
          stage: "done",
          reason: `lead advanced to "${spec.to}" from ${event.name}`,
          proposalId,
          leadId,
          tenantId,
          status: spec.to,
        });
      }

      return {};
    },
  };
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
