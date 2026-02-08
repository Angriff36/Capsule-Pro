import { BoardsListClient } from "./components/boards-list-client";

export default async function CommandBoardRootPage() {
  return <BoardsListClient />;
}

export const metadata = {
  title: "Command Boards",
  description:
    "Manage your strategic command boards for planning and coordination.",
};
