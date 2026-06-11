/**
 * Event Tree Command Board — atomic commit orchestrator.
 *
 * Executes every draft card's governed command (EventStaff.assign) AND flips
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
  tenantId: string;
  role: string;
}

export interface DraftCardRow {
  id: string;
  title: string;
  content: string;
  cardType: string;
  status: string;
  color: string;
  groupId: string;
  metadata: unknown; // Prisma Json — string OR object depending on the read path
}

export interface CommandCall {
  entity: string;
  command: string;
  body: Record<string, unknown>;
  instanceId?: string;
}

export interface CommitDeps {
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
  loadDraftCards: (
    tx: unknown,
    boardId: string,
    tenantId: string
  ) => Promise<DraftCardRow[]>;
  transact: <T>(fn: (tx: unknown) => Promise<T>) => Promise<T>;
  runCommand: (
    tx: unknown,
    params: CommandCall & { user: ManifestUser }
  ) => Promise<
    { success: true; instanceId?: string } | { success: false; error?: string }
  >;
}

export type CommitResult =
  | { success: true; committedCount: number }
  | { success: false; error: string; failedCardId?: string };

// ---------------------------------------------------------------------------
// Draft envelope contract (mirrors apps/app board/draft-metadata.ts)
// ---------------------------------------------------------------------------

const DRAFT_METADATA_KEY = "eventBoardDraft";

interface DraftAction {
  kind: string;
  entityType: string;
  entityId: string;
  params: Record<string, string>;
}

interface DraftEnvelope {
  draftAction: DraftAction;
  draftState: "draft" | "committed" | "failed";
  committedRecordId: string | null;
}

function isDraftEnvelope(value: unknown): value is DraftEnvelope {
  if (typeof value !== "object" || value === null) return false;
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
        // Only assign-staff drafts are committable today; later kinds
        // (add-dish, assign-vehicle, ...) are skipped, not failed.
        if (envelope.draftAction.kind !== "assign-staff") {
          continue;
        }

        // 1. Governed domain write: EventStaff.assign.
        const assign = await deps.runCommand(tx, {
          entity: "EventStaff",
          command: "assign",
          body: {
            eventId,
            staffMemberId: envelope.draftAction.entityId,
            role: envelope.draftAction.params.role ?? "",
            notes: "",
            shiftStart: envelope.draftAction.params.shiftStart ?? "",
            shiftEnd: envelope.draftAction.params.shiftEnd ?? "",
          },
          user,
        });
        if (!assign.success) {
          throw new CommitError(
            `EventStaff.assign failed for card ${card.id}: ${assign.error ?? "unknown error"}`,
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
