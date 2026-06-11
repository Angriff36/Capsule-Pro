/**
 * Event Tree Command Board — atomic commit orchestrator.
 *
 * Executes every draft card's governed command (EventStaff.create) AND flips
 * the card's draft envelope to "committed" — all inside ONE database
 * transaction supplied by the caller via `deps.transact`. Any failure throws
 * out of the transaction callback so EVERYTHING rolls back (no half-committed
 * boards).
 *
 * This module is pure: no Prisma, no Manifest runtime, no Next.js imports.
 * All IO arrives through dependency injection (CommitDeps), so the
 * orchestration logic is unit-testable without a database. Production wiring
 * lives in apps/api/app/api/command-board/[boardId]/commit/route.ts.
 *
 * The draft-envelope JSON contract mirrors
 * apps/app/app/(authenticated)/events/[eventId]/board/draft-metadata.ts
 * (apps/api must not import from apps/app, so the small normalize/parse
 * helpers are re-implemented here with an identical contract).
 */

export interface ManifestUser {
  id: string;
  role: string;
  tenantId: string;
}

export interface DraftCardRow {
  cardType: string;
  color: string;
  content: string;
  groupId: string;
  id: string;
  metadata: unknown; // Prisma Json — string OR object depending on the read path
  status: string;
  title: string;
}

export interface CommandCall {
  body: Record<string, unknown>;
  command: string;
  entity: string;
  instanceId?: string;
}

export interface CommitDeps {
  loadDraftCards: (
    tx: unknown,
    boardId: string,
    tenantId: string
  ) => Promise<DraftCardRow[]>;
  /**
   * Row-lock the board (SELECT ... FOR UPDATE) and return its eventId.
   * Returns null when the board does not exist (or is soft-deleted).
   * The lock serializes concurrent commits of the same board: a second
   * committer blocks until the first transaction ends, then sees the flipped
   * cards and no-ops.
   */
  lockBoard: (
    tx: unknown,
    boardId: string,
    tenantId: string
  ) => Promise<{ eventId: string | null } | null>;
  runCommand: (
    tx: unknown,
    params: CommandCall & { user: ManifestUser }
  ) => Promise<
    { success: true; instanceId?: string } | { success: false; error?: string }
  >;
  transact: <T>(fn: (tx: unknown) => Promise<T>) => Promise<T>;
}

export type CommitResult =
  | { success: true; committedCount: number }
  | { success: false; error: string; failedCardId?: string };

// ---------------------------------------------------------------------------
// Draft envelope contract (mirrors apps/app board/draft-metadata.ts)
// ---------------------------------------------------------------------------

const DRAFT_METADATA_KEY = "eventBoardDraft";

interface DraftAction {
  entityId: string;
  entityType: string;
  kind: string;
  params: Record<string, string>;
}

interface DraftEnvelope {
  committedRecordId: string | null;
  draftAction: DraftAction;
  draftState: "draft" | "committed" | "failed";
}

function isDraftEnvelope(value: unknown): value is DraftEnvelope {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const v = value as Record<string, unknown>;
  const action = v.draftAction as Record<string, unknown> | undefined;
  return (
    typeof action === "object" &&
    action !== null &&
    typeof action.kind === "string" &&
    typeof action.entityId === "string" &&
    typeof action.params === "object" &&
    action.params !== null &&
    (v.draftState === "draft" ||
      v.draftState === "committed" ||
      v.draftState === "failed")
  );
}

/** Normalizes Prisma Json (string | object | null) to a plain record. */
function normalizeMetadata(metadata: unknown): Record<string, unknown> {
  if (
    typeof metadata === "object" &&
    metadata !== null &&
    !Array.isArray(metadata)
  ) {
    return metadata as Record<string, unknown>;
  }
  if (typeof metadata === "string") {
    try {
      const parsed = JSON.parse(metadata);
      return typeof parsed === "object" &&
        parsed !== null &&
        !Array.isArray(parsed)
        ? parsed
        : {};
    } catch {
      return {};
    }
  }
  return {};
}

// ---------------------------------------------------------------------------
// Draft kind → governed domain command
// ---------------------------------------------------------------------------

/**
 * Maps a draft action to its governed create command, or null for kinds that
 * are not committable yet (skipped, not failed). Throws CommitError for
 * malformed params on a known kind — the card is real but unusable.
 */
function buildDomainCommand(
  action: DraftAction,
  eventId: string,
  cardId: string
): CommandCall | null {
  if (action.kind === "assign-staff") {
    // Engine datetime contract = epoch milliseconds: ISO strings are REJECTED
    // with E_TYPE_DATETIME at create validation, so parse the envelope's ISO
    // shift times here.
    const shiftStartMs = Date.parse(action.params.shiftStart ?? "");
    const shiftEndMs = Date.parse(action.params.shiftEnd ?? "");
    if (Number.isNaN(shiftStartMs) || Number.isNaN(shiftEndMs)) {
      throw new CommitError(`Invalid shift times on card ${cardId}`, cardId);
    }
    return {
      entity: "EventStaff",
      command: "create",
      body: {
        eventId,
        staffMemberId: action.entityId,
        role: action.params.role ?? "",
        notes: "",
        shiftStart: shiftStartMs,
        shiftEnd: shiftEndMs,
      },
    };
  }

  if (action.kind === "add-dish") {
    // quantityServings is an int command param — the envelope stores strings.
    const quantity = Number.parseInt(action.params.quantityServings ?? "", 10);
    if (Number.isNaN(quantity) || quantity <= 0) {
      throw new CommitError(`Invalid dish quantity on card ${cardId}`, cardId);
    }
    return {
      entity: "EventDish",
      command: "create",
      body: {
        eventId,
        dishId: action.entityId,
        quantityServings: quantity,
        specialInstructions: action.params.specialInstructions ?? "",
        course: action.params.course ?? "",
      },
    };
  }

  return null;
}

// ---------------------------------------------------------------------------
// Orchestrator
// ---------------------------------------------------------------------------

/**
 * Internal control-flow error for EXPECTED commit failures (governed-command
 * rejections, board validation) whose messages are safe to surface to the
 * client as a 422. Unexpected errors (tx timeout, connection failure,
 * TypeError, ...) are NOT wrapped — they propagate out of
 * commitEventBoardDrafts for the route to capture and mask as a generic 500.
 */
class CommitError extends Error {
  readonly failedCardId?: string;

  constructor(message: string, failedCardId?: string) {
    super(message);
    this.name = "CommitError";
    this.failedCardId = failedCardId;
  }
}

export async function commitEventBoardDrafts(
  deps: CommitDeps,
  input: { boardId: string; eventId: string; user: ManifestUser }
): Promise<CommitResult> {
  const { boardId, eventId, user } = input;

  try {
    const committedCount = await deps.transact(async (tx) => {
      // FIRST operation: row-lock the board (FOR UPDATE). Serializes
      // concurrent commits of the same board and validates board↔event.
      const board = await deps.lockBoard(tx, boardId, user.tenantId);
      if (!board) {
        throw new CommitError("Board not found");
      }
      if (board.eventId && board.eventId !== eventId) {
        throw new CommitError("Board does not belong to this event");
      }

      const cards = await deps.loadDraftCards(tx, boardId, user.tenantId);
      let committed = 0;

      for (const card of cards) {
        const metadata = normalizeMetadata(card.metadata);
        const envelope = metadata[DRAFT_METADATA_KEY];
        if (!isDraftEnvelope(envelope) || envelope.draftState !== "draft") {
          continue;
        }
        // Committable kinds: assign-staff, add-dish. Unknown kinds
        // (assign-vehicle, ... — no data model yet) are skipped, not failed.
        const domainCall = buildDomainCommand(
          envelope.draftAction,
          eventId,
          card.id
        );
        if (!domainCall) {
          continue;
        }

        // 1. Governed domain write (EventStaff.create / EventDish.create —
        //    the engine only auto-instantiates commands named `create`).
        const assign = await deps.runCommand(tx, { ...domainCall, user });
        if (!assign.success) {
          throw new CommitError(
            `${domainCall.entity}.${domainCall.command} failed for card ${card.id}: ${assign.error ?? "unknown error"}`,
            card.id
          );
        }

        // 2. Flip the card's envelope to committed. CommandBoardCard.update is
        //    a FULL-FIELD command (every mutate runs), so the current values of
        //    all other fields must be passed back unchanged — only newMetadata
        //    actually changes. Merge existing metadata keys; don't drop them.
        const flippedEnvelope: DraftEnvelope = {
          ...envelope,
          draftState: "committed",
          committedRecordId: assign.instanceId ?? null,
        };
        const flip = await deps.runCommand(tx, {
          entity: "CommandBoardCard",
          command: "update",
          instanceId: card.id,
          body: {
            newTitle: card.title,
            newContent: card.content,
            newCardType: card.cardType,
            newStatus: card.status,
            newColor: card.color,
            newMetadata: JSON.stringify({
              ...metadata,
              [DRAFT_METADATA_KEY]: flippedEnvelope,
            }),
            newGroupId: card.groupId,
          },
          user,
        });
        if (!flip.success) {
          throw new CommitError(
            `CommandBoardCard.update failed for card ${card.id}: ${flip.error ?? "unknown error"}`,
            card.id
          );
        }

        committed += 1;
      }

      return committed;
    });

    return { success: true, committedCount };
  } catch (error) {
    if (error instanceof CommitError) {
      return {
        success: false,
        error: error.message,
        ...(error.failedCardId ? { failedCardId: error.failedCardId } : {}),
      };
    }
    // Unexpected failure (tx timeout, connection error, programming bug):
    // propagate to the caller — the route captures it and masks the message.
    throw error;
  }
}
