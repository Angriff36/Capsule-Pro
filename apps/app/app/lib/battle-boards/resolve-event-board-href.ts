import type { PrismaClient } from "@repo/database";

/**
 * Canonical BattleBoard surface for an event.
 * Returns the editor URL when a board exists, otherwise the filtered list.
 */
export async function resolveEventBattleBoardHref(
  database: Pick<PrismaClient, "battleBoard">,
  tenantId: string,
  eventId: string
): Promise<string> {
  const board = await database.battleBoard.findFirst({
    where: {
      tenantId,
      eventId,
      deletedAt: null,
    },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });

  if (board) {
    return `/events/battle-boards/${board.id}`;
  }

  return `/events/battle-boards?eventId=${eventId}`;
}
