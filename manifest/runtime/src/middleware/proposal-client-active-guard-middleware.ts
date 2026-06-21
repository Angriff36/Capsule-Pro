/**
 * Proposal.send → "client must be active" cross-entity guard middleware.
 *
 * WHY this is middleware and not a constraint (the crux):
 * The rule "you cannot send a proposal to an archived client" is a CROSS-ENTITY
 * precondition: it depends on the linked `Client`'s archived state, not on any
 * field of the Proposal that the DSL can usefully gate, and definitely not on a
 * `send` input param (`send` takes only `userId` — `clientId` is the Proposal's
 * OWN field). The Manifest DSL's `guard`/`constraint` expressions can reference
 * only `self.*`, `user.*`, `context.*`, and command params — they cannot load
 * another entity's live state. So there is no declarative way to express
 * `clientMustBeActive`. The documented escape hatch for multi-hop derivations is
 * a runtime middleware that loads the related entity. This runs at the
 * `before-guard` hook (after policies, before the command's own guards/actions)
 * and SHORT-CIRCUITS the send when the referenced Client is archived.
 *
 * Note: Client has NO `status` field — "archived" IS the soft-delete tombstone
 * (`Client.archive` sets `deletedAt = now()`, `reactivate` clears it;
 * `computed isArchived = self.deletedAt != null`). So the active check is simply
 * `client.deletedAt == null`. This is the cross-entity sibling of the
 * EventStaff.assign → staffMustBeActive guard (see
 * event-staff-active-guard-middleware.ts), except the link is the Proposal's own
 * field, so it is a TWO-HOP load (Proposal → Client) rather than a param lookup.
 *
 * Fail-open by design (validation, not infra enforcement): if the Proposal/Client
 * store is unavailable, the proposal row is not found, the proposal has no client
 * attached (sending clientless proposals is allowed today — the `warnNoClient`
 * warning covers that case), or the client row is not found, the command
 * proceeds. The middleware ONLY blocks when it positively finds the Client row AND
 * it is archived (`deletedAt` set). Every block reports through `onDiagnostic` —
 * never silent.
 */

import type {
  CommandResult,
  Middleware,
  MiddlewareContext,
  MiddlewareResult,
  Store,
} from "@angriff36/manifest";

export interface ProposalClientActiveGuardDiagnostic {
  clientId?: string;
  detail?: Record<string, unknown>;
  proposalId?: string;
  reason: string;
  stage: string;
  tenantId?: string;
}

export interface ProposalClientActiveGuardMiddlewareOptions {
  onDiagnostic?: (diag: ProposalClientActiveGuardDiagnostic) => void;
  storeProvider: (entityName: string) => Store | undefined;
}

interface ProposalLike {
  clientId?: unknown;
}

interface ClientLike {
  deletedAt?: unknown;
  tenantId?: unknown;
}

const defaultDiagnostic = (diag: ProposalClientActiveGuardDiagnostic): void => {
  // eslint-disable-next-line no-console
  console.warn(`[proposal-client-active:${diag.stage}] ${diag.reason}`, {
    proposalId: diag.proposalId,
    clientId: diag.clientId,
    tenantId: diag.tenantId,
    ...diag.detail,
  });
};

export function createProposalClientActiveGuardMiddleware(
  options: ProposalClientActiveGuardMiddlewareOptions
): Middleware {
  const { storeProvider, onDiagnostic = defaultDiagnostic } = options;

  return {
    hooks: ["before-guard"],

    async handler(ctx: MiddlewareContext): Promise<MiddlewareResult> {
      // Scope strictly to `send`. create/update operate on a draft the staff is
      // assembling; accept/reject/markViewed are client-driven (via the public
      // token) — blocking those on a later archive would strand a live deal. The
      // outbound action is the one that must not target an archived client.
      if (!(ctx.entityName === "Proposal" && ctx.command.name === "send")) {
        return {};
      }

      const proposalId = asNonEmptyString(ctx.input.id);
      // The command resolves the subject by id; a missing id is its own concern.
      if (!proposalId) {
        return {};
      }

      const proposalStore = storeProvider("Proposal");
      if (!proposalStore) {
        onDiagnostic({
          stage: "store",
          reason: "Proposal store unavailable — client active check skipped",
          proposalId,
        });
        return {};
      }

      const proposal = (await proposalStore.getById(proposalId)) as
        | ProposalLike
        | undefined;
      if (!proposal) {
        // Not found — the command's own subject resolution handles that.
        onDiagnostic({
          stage: "load-proposal",
          reason: "Proposal not found — client active check skipped",
          proposalId,
        });
        return {};
      }

      const clientId = asNonEmptyString(proposal.clientId);
      // A clientless proposal is allowed to send (warnNoClient covers it).
      if (!clientId) {
        return {};
      }

      const clientStore = storeProvider("Client");
      if (!clientStore) {
        onDiagnostic({
          stage: "store",
          reason: "Client store unavailable — active check skipped",
          proposalId,
          clientId,
        });
        return {};
      }

      const client = (await clientStore.getById(clientId)) as
        | ClientLike
        | undefined;
      if (!client) {
        // Out of scope: "not found" is not "archived".
        onDiagnostic({
          stage: "load-client",
          reason: "Client not found — active check skipped",
          proposalId,
          clientId,
        });
        return {};
      }

      // Client has no status field — archived IS the soft-delete tombstone.
      const archived = client.deletedAt != null;
      if (archived) {
        const reason = `Cannot send proposal ${proposalId}: client ${clientId} is archived`;
        onDiagnostic({
          stage: "blocked",
          reason,
          proposalId,
          clientId,
          tenantId: asNonEmptyString(client.tenantId),
        });
        return {
          shortCircuit: true,
          result: {
            success: false,
            error: reason,
            emittedEvents: [],
          } satisfies CommandResult,
        };
      }

      return {};
    },
  };
}

function asNonEmptyString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}
