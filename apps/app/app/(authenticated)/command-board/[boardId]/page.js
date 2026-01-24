Object.defineProperty(exports, "__esModule", { value: true });
exports.default = CommandBoardPage;
const server_1 = require("@repo/auth/server");
const database_1 = require("@repo/database");
const navigation_1 = require("next/navigation");
const tenant_1 = require("../../../lib/tenant");
const boards_1 = require("../actions/boards");
const command_board_wrapper_1 = require("../command-board-wrapper");
async function CommandBoardPage({ params }) {
  const { boardId } = await params;
  const { orgId } = await (0, server_1.auth)();
  if (!orgId) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-destructive text-sm">Organization not found</div>
      </div>
    );
  }
  const tenantId = await (0, tenant_1.getTenantIdForOrg)(orgId);
  // Handle "default" boardId - find first board or create one
  const actualBoardId = boardId;
  if (boardId === "default") {
    const boards = await (0, boards_1.listCommandBoards)();
    if (boards.length > 0) {
      // Redirect to the first board
      (0, navigation_1.redirect)(`/command-board/${boards[0].id}`);
    } else {
      // Create a new board with a generated UUID
      const newBoard = await database_1.database.commandBoard.create({
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
      (0, navigation_1.redirect)(`/command-board/${newBoard.id}`);
    }
  }
  // Validate UUID format
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(actualBoardId)) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-destructive text-sm">Invalid board ID format</div>
      </div>
    );
  }
  // Fetch board data on the server
  let boardData = await (0, boards_1.getCommandBoard)(actualBoardId);
  // If board doesn't exist, create it automatically
  if (!boardData) {
    try {
      const board = await database_1.database.commandBoard.create({
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
      boardData = await (0, boards_1.getCommandBoard)(actualBoardId);
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
    <command_board_wrapper_1.CommandBoardRealtimeContent
      boardId={boardData.id}
      initialCards={boardData.cards}
      orgId={orgId}
      tenantId={tenantId}
    />
  );
}
