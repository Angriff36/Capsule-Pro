"use server";

import { database } from "@repo/database";
import { runManifestCommand } from "@/lib/manifest-command";
import type { ManifestUserContext } from "@/lib/manifest-command";

/**
 * Refresh inherited event snapshot on all battle boards linked to an event.
 *
 * EventUpdated reactions cannot resolve board instance ids (1:N by eventId),
 * so post-update sync is explicit and governed via BattleBoard.syncFromEvent.
 */
export async function syncBattleBoardsForEvent(
  tenantId: string,
  eventId: string,
  user: ManifestUserContext
): Promise<void> {
  const boards = await database.battleBoard.findMany({
    where: { tenantId, eventId, deletedAt: null },
    select: { id: true },
  });

  for (const board of boards) {
    const result = await runManifestCommand({
      entity: "BattleBoard",
      command: "syncFromEvent",
      instanceId: board.id,
      body: { id: board.id },
      user,
    });

    if (!result.ok) {
      console.error(
        `[syncBattleBoardsForEvent] board ${board.id} sync failed:`,
        result.message
      );
    }
  }
}
