import { formatDistanceToNow } from "date-fns";
import { type CommandBoard, listCommandBoards } from "./actions/boards-crud";
import { BoardsListClient } from "./components/boards-list-client";

type CommandBoardListItem = Omit<
  CommandBoard,
  "createdAt" | "updatedAt" | "deletedAt"
> & {
  createdAt: string;
  createdAtRelative: string;
  updatedAt: string;
  deletedAt: string | null;
};

function toListItem(board: CommandBoard): CommandBoardListItem {
  return {
    ...board,
    createdAt: board.createdAt.toISOString(),
    createdAtRelative: formatDistanceToNow(board.createdAt, {
      addSuffix: true,
    }),
    updatedAt: board.updatedAt.toISOString(),
    deletedAt: board.deletedAt ? board.deletedAt.toISOString() : null,
  };
}

export default async function CommandBoardRootPage() {
  const boards = await listCommandBoards();
  return <BoardsListClient initialBoards={boards.map(toListItem)} />;
}

export const metadata = {
  title: "Command Boards",
  description:
    "Manage your strategic command boards for planning and coordination.",
};
