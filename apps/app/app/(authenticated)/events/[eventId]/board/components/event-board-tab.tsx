import { getEventBoardData, getOrCreateEventBoard, getStaffPalette } from "../actions";
import { BoardClient } from "./board-client";

export async function EventBoardTab({ eventId }: { eventId: string }) {
  const { boardId } = await getOrCreateEventBoard(eventId);
  const [data, palette] = await Promise.all([
    getEventBoardData(eventId),
    getStaffPalette(),
  ]);
  return (
    <BoardClient
      boardId={boardId}
      eventId={eventId}
      initialData={data}
      palette={palette}
    />
  );
}
