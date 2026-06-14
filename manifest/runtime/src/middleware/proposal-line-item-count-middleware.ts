/**
 * ProposalLineItem → Proposal.lineItemCount middleware.
 *
 * Completes the propagation "adding/removing a proposal line item keeps the
 * proposal's `lineItemCount` truthful" — the bookkeeping that unblocks
 * `Proposal.send`.
 *
 * WHY this matters (the deadlock it fixes):
 * `Proposal.create` sets `lineItemCount = 0` and nothing ever changed it, while
 * `Proposal.send` gates on `constraint blockNoLineItems:block self.hasLineItems`
 * where `hasLineItems = self.lineItemCount > 0`. Two compounding defects made
 * EVERY send fail: (1) `lineItemCount` was never incremented when line items were
 * created, and (2) the gate referenced a COMPUTED (`hasLineItems`) — and the
 * runtime does NOT resolve computeds inside :block/:warn constraints (only inside
 * guards), so the gate evaluated falsy even when a count existed. (2) is fixed in
 * source by inlining the gate to the stored `self.lineItemCount > 0`; (1) is fixed
 * here.
 *
 * WHY middleware and not a reaction (the crux):
 * The parent to update is identified by `ProposalLineItem.proposalId`. On the
 * CREATE leg that value IS a `create` input param, so it rides the emitted payload
 * (`payload.proposalId`) and a reaction could read it. But on the REMOVE leg,
 * `ProposalLineItem.remove(userId)` does NOT take `proposalId` — it is the line
 * item's OWN field — and declared event fields are never auto-populated from
 * `self.*`, so `ProposalLineItemRemoved.proposalId` is undefined in the payload
 * and a `resolve payload.proposalId` reaction would silently no-op (the same class
 * the P0 effort eliminated). One middleware handles both legs symmetrically:
 * resolve the parent id from the payload when present, else load the line item
 * from the store and read `self.proposalId`, then dispatch the governed
 * increment/decrement command.
 *
 * Idempotent per line item per direction (`...:inc`/`...:dec`) so a re-emitted
 * Created/Removed event cannot double-count. Every skip/failure reports through
 * `onDiagnostic` — never silent.
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

export interface ProposalLineItemCountDiagnostic {
  detail?: Record<string, unknown>;
  direction?: "inc" | "dec";
  lineItemId?: string;
  proposalId?: string;
  reason: string;
  stage: string;
  tenantId?: string;
}

export interface ProposalLineItemCountMiddlewareOptions {
  dispatchCommand: DispatchCommand;
  onDiagnostic?: (diag: ProposalLineItemCountDiagnostic) => void;
  storeProvider: (entityName: string) => Store | undefined;
}

interface LineItemLike {
  proposalId?: unknown;
  tenantId?: unknown;
}

const defaultDiagnostic = (diag: ProposalLineItemCountDiagnostic): void => {
  // eslint-disable-next-line no-console
  console.warn(`[proposal-line-count:${diag.stage}] ${diag.reason}`, {
    lineItemId: diag.lineItemId,
    proposalId: diag.proposalId,
    tenantId: diag.tenantId,
    direction: diag.direction,
    ...diag.detail,
  });
};

/** Maps the source line-item event to the proposal command + idempotency suffix. */
const LEG: Record<
  string,
  { command: string; direction: "inc" | "dec"; sourceCommand: string }
> = {
  ProposalLineItemCreated: {
    command: "incrementLineItemCount",
    direction: "inc",
    sourceCommand: "create",
  },
  ProposalLineItemRemoved: {
    command: "decrementLineItemCount",
    direction: "dec",
    sourceCommand: "remove",
  },
};

export function createProposalLineItemCountMiddleware(
  options: ProposalLineItemCountMiddlewareOptions
): Middleware {
  const {
    storeProvider,
    dispatchCommand,
    onDiagnostic = defaultDiagnostic,
  } = options;

  return {
    hooks: ["after-emit"],

    async handler(ctx: MiddlewareContext): Promise<MiddlewareResult> {
      if (ctx.entityName !== "ProposalLineItem") {
        return {};
      }

      const relevant = ctx.emittedEvents.filter((event) => {
        const leg = LEG[event.name];
        return leg !== undefined && ctx.command.name === leg.sourceCommand;
      });

      for (const event of relevant) {
        const leg = LEG[event.name];
        const payload = event.payload as
          | { proposalId?: unknown; tenantId?: unknown }
          | undefined;
        const lineItemId =
          asNonEmptyString(event.subject?.id) ??
          asNonEmptyString(ctx.instanceId);
        const tenantId =
          asNonEmptyString(payload?.tenantId) ??
          asNonEmptyString(
            (ctx.runtimeContext.user as { tenantId?: unknown } | undefined)
              ?.tenantId
          );
        if (!(lineItemId && tenantId)) {
          onDiagnostic({
            stage: "resolve",
            reason: `${event.name} missing ${lineItemId ? "tenantId" : "lineItemId"}`,
            lineItemId,
            tenantId,
            direction: leg.direction,
          });
          continue;
        }

        const lineItemStore = storeProvider("ProposalLineItem");
        const proposalStore = storeProvider("Proposal");
        if (!(lineItemStore && proposalStore)) {
          onDiagnostic({
            stage: "stores",
            reason:
              "ProposalLineItem or Proposal store unavailable — count not updated",
            lineItemId,
            tenantId,
            direction: leg.direction,
            detail: { lineItem: !!lineItemStore, proposal: !!proposalStore },
          });
          continue;
        }

        // On `create`, proposalId is a command input param → on the payload. On
        // `remove` it is the line item's OWN field → load the row to read it.
        let proposalId = asNonEmptyString(payload?.proposalId);
        if (!proposalId) {
          const row = (await lineItemStore.getById(lineItemId)) as
            | LineItemLike
            | undefined;
          proposalId = asNonEmptyString(row?.proposalId);
        }
        if (!proposalId) {
          onDiagnostic({
            stage: "proposalId",
            reason: "line item has no proposalId — cannot adjust parent count",
            lineItemId,
            tenantId,
            direction: leg.direction,
          });
          continue;
        }

        const result = await dispatchCommand(
          leg.command,
          {
            // A mutate on the existing Proposal. The target id is supplied BOTH in
            // the body (`id`) AND as `instanceId` so the write-back persists to the
            // right row regardless of which the engine keys persistence on
            // (mirrors contract-signed-event-confirm-middleware).
            id: proposalId,
            tenantId,
          },
          {
            entityName: "Proposal",
            instanceId: proposalId,
            correlationId:
              asNonEmptyString(
                (ctx as { correlationId?: unknown }).correlationId
              ) ?? lineItemId,
            causationId: event.name,
            idempotencyKey: `proposal-line-count:${tenantId}:${lineItemId}:${leg.direction}`,
          }
        );
        if (result.emittedEvents) {
          ctx.emittedEvents.push(...result.emittedEvents);
        }
        if (!result.success) {
          onDiagnostic({
            stage: "dispatch",
            reason: `Proposal.${leg.command} failed: ${result.error ?? "unknown"}`,
            lineItemId,
            proposalId,
            tenantId,
            direction: leg.direction,
          });
          continue;
        }

        onDiagnostic({
          stage: "done",
          reason: `proposal line item count ${leg.direction === "inc" ? "incremented" : "decremented"}`,
          lineItemId,
          proposalId,
          tenantId,
          direction: leg.direction,
        });
      }

      return {};
    },
  };
}

function asNonEmptyString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}
