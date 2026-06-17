import { listBattleBoards } from "@/app/lib/manifest-client.generated";

/**
 * Canonical BattleBoard surface for an event.
 * Returns the editor URL when a board exists, otherwise the filtered list.
 */
export async function resolveEventBattleBoardHref(
  database: Pick<PrismaClient, "battleBoard">,
  tenantId: string,
  eventId: string
): Promise<string> {
  const board = (await listBattleBoards()).data[0] ?? null;

  if (board) {
    return `/events/battle-boards/${board.id}`;
  }

  return `/events/battle-boards?eventId=${eventId}`;
}
