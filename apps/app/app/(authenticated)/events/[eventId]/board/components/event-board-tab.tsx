import { getEventBoardData, getStaffPalette } from "../actions";
import { BoardClient } from "./board-client";

/**
 * Read-only server loader for the Command Board tab. Board creation is
 * deferred to the client (BoardClient mounts on tab activation), so viewing
 * the event page never fires a governed CommandBoard.create write.
 */
export async function EventBoardTab({ eventId }: { eventId: string }) {
  const [data, palette] = await Promise.all([
    getEventBoardData(eventId),
    getStaffPalette(),
  ]);
  return (
    <BoardClient
      eventId={eventId}
      initialBoardId={data.boardId}
      initialData={data}
      palette={palette}
    />
  );
}
