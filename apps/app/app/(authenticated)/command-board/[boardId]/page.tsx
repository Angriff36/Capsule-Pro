import { auth } from "@repo/auth/server";
import { redirect } from "next/navigation";
import { autoPopulateBoard } from "../actions/auto-populate";
import { getCommandBoard, listCommandBoards } from "../actions/boards";
import { deriveConnections } from "../actions/derive-connections";
import { getProjectionsForBoard } from "../actions/projections";
import { resolveEntities } from "../actions/resolve-entities";
import { BoardShell } from "../components/board-shell";

// UUID regex constant at top level for performance
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface CommandBoardPageProperties {
  params: Promise<{ boardId: string }>;
}

export default async function CommandBoardPage({
  params,
}: CommandBoardPageProperties) {
  const { boardId } = await params;
  const { orgId } = await auth();

  if (!orgId) {
    redirect("/sign-in");
  }

  // Handle "default" board — redirect to first existing board or board list
  if (boardId === "default") {
    const boards = await listCommandBoards();
    if (boards.length > 0) {
      redirect(`/command-board/${boards[0].id}`);
    }
    // No boards exist — redirect to board list to create one
    redirect("/command-board");
  }

  // Validate UUID format
  if (!UUID_REGEX.test(boardId)) {
    redirect("/command-board");
  }

  // Fetch board
  const board = await getCommandBoard(boardId);
  if (!board) {
    redirect("/command-board");
  }

  // Auto-populate board if enabled — creates projections for matching entities
  // that aren't already on the board. Runs before fetching projections so the
  // newly created ones are included in the initial render.
  const autoPopResult = await autoPopulateBoard(boardId);
  if (!autoPopResult.success) {
    console.error(
      "[CommandBoardPage] Auto-populate failed:",
      autoPopResult.error
    );
  } else if (autoPopResult.newProjections.length > 0) {
    console.info(
      `[CommandBoardPage] Auto-populated ${autoPopResult.newProjections.length} new projections ` +
        `(${autoPopResult.matchedCount} matched, ${autoPopResult.skippedCount} skipped)`
    );
  }

  // Fetch projections for this board (includes any just auto-populated)
  const projections = await getProjectionsForBoard(boardId);

  // Resolve entities and derive connections in parallel
  const entityRefs = projections.map((p) => ({
    entityType: p.entityType,
    entityId: p.entityId,
  }));

  const [entitiesResult, derivedConnections] = await Promise.all([
    resolveEntities(entityRefs),
    deriveConnections(
      projections.map((p) => ({
        id: p.id,
        entityType: p.entityType,
        entityId: p.entityId,
      }))
    ),
  ]);

  // Extract the entities Map from the result wrapper, fall back to empty Map on failure
  const entitiesMap = entitiesResult.data ?? new Map();
  if (!entitiesResult.success) {
    console.error(
      "[CommandBoardPage] Failed to resolve entities:",
      entitiesResult.error
    );
  }

  // Serialize the Map for client component (Maps can't be passed as React props)
  const entitiesArray = Array.from(entitiesMap.entries());

  return (
    <BoardShell
      annotations={[]}
      board={board}
      boardId={boardId}
      derivedConnections={derivedConnections}
      entitiesArray={entitiesArray}
      orgId={orgId}
      projections={projections}
    />
  );
}
