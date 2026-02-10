import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { redirect } from "next/navigation";
import { getTenantIdForOrg } from "../../../lib/tenant";
import { getCommandBoard, listCommandBoards } from "../actions/boards";
import { CommandBoardRealtimeContent } from "../command-board-wrapper";

// UUID regex constant at top level for performance
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface CommandBoardPageProps {
  params: Promise<{ boardId: string }>;
}

export default async function CommandBoardPage({
  params,
}: CommandBoardPageProps) {
  const { boardId } = await params;
  const { orgId } = await auth();

  if (!orgId) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-destructive text-sm">Organization not found</div>
      </div>
    );
  }

  const tenantId = await getTenantIdForOrg(orgId);

  // Handle "default" boardId - find first board or create one
  const actualBoardId = boardId;
  if (boardId === "default") {
    const boards = await listCommandBoards();
    if (boards.length > 0) {
      // Redirect to the first board
      redirect(`/command-board/${boards[0].id}`);
    } else {
      // Create a new board with a generated UUID
      const newBoard = await database.commandBoard.create({
        data: {
          tenantId,
          name: "Default Command Board",
          description: "Default command board",
          eventId: null,
          isTemplate: false,
          tags: [],
        },
      });
      // Redirect to the newly created board
      redirect(`/command-board/${newBoard.id}`);
    }
  }

  // Validate UUID format
  if (!UUID_REGEX.test(actualBoardId)) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-destructive text-sm">Invalid board ID format</div>
      </div>
    );
  }

  // Fetch board data on the server
  let boardData = await getCommandBoard(actualBoardId);

  // If board doesn't exist, create it automatically
  if (!boardData) {
    try {
      const _board = await database.commandBoard.create({
        data: {
          tenantId,
          id: actualBoardId,
          name: `Command Board ${actualBoardId.slice(0, 8)}`,
          description: "Auto-created command board",
          eventId: null,
          isTemplate: false,
          tags: [],
        },
      });

      // Fetch the newly created board with cards
      boardData = await getCommandBoard(actualBoardId);
    } catch (error) {
      return (
        <div className="flex h-full items-center justify-center">
          <div className="text-destructive text-sm">
            Failed to create board:{" "}
            {error instanceof Error ? error.message : "Unknown error"}
          </div>
        </div>
      );
    }
  }

  if (!boardData) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-destructive text-sm">Failed to load board</div>
      </div>
    );
  }

  return (
    <CommandBoardRealtimeContent
      boardDescription={boardData.description}
      boardId={boardData.id}
      boardName={boardData.name}
      boardStatus={boardData.status}
      boardTags={boardData.tags}
      initialCards={boardData.cards}
      orgId={orgId}
      tenantId={tenantId}
    />
  );
}
