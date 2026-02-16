"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ReactFlowProvider } from "@xyflow/react";
import { AiChatPanel } from "./ai-chat-panel";
import { BoardHeader } from "./board-header";
import { BoardFlow } from "./board-flow";
import { BoardRoom } from "./board-room";
import { CommandPalette } from "./command-palette";
import { EntityBrowser } from "./entity-browser";
import { EntityDetailPanel } from "./entity-detail-panel";
import type { EntityType } from "../types/entities";
import type {
  BoardProjection,
  ResolvedEntity,
  DerivedConnection,
  BoardAnnotation,
} from "../types/index";
import type { CommandBoardWithCards } from "../actions/boards";

// ============================================================================
// Types
// ============================================================================

interface BoardShellProps {
  boardId: string;
  orgId: string;
  board: CommandBoardWithCards;
  projections: BoardProjection[];
  entitiesArray: [string, ResolvedEntity][];
  derivedConnections: DerivedConnection[];
  annotations: BoardAnnotation[];
}

interface OpenDetailEntity {
  entityType: string;
  entityId: string;
}

// ============================================================================
// Board Shell — Client Component
// ============================================================================

/**
 * BoardShell wraps the entire command board UI:
 * - BoardHeader at the top (name, status, actions)
 * - BoardFlow canvas as the main content area
 * - Entity detail panel (Sheet) when an entity is selected
 */
export function BoardShell({
  boardId,
  orgId,
  board,
  projections: initialProjections,
  entitiesArray,
  derivedConnections: initialDerivedConnections,
  annotations,
}: BoardShellProps) {
  // ---- Reconstruct entities Map from serialized array ----
  const entities = useMemo(
    () => new Map<string, ResolvedEntity>(entitiesArray),
    [entitiesArray]
  );

  // ---- Local projection state for optimistic updates ----
  const [projections, setProjections] =
    useState<BoardProjection[]>(initialProjections);
  const [derivedConnections, setDerivedConnections] = useState<
    DerivedConnection[]
  >(initialDerivedConnections);

  // ---- Entity detail panel state ----
  const [openDetailEntity, setOpenDetailEntity] =
    useState<OpenDetailEntity | null>(null);

  // ---- Command palette state ----
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);

  // ---- AI chat panel state ----
  const [aiChatOpen, setAiChatOpen] = useState(false);

  // ---- Entity browser panel state ----
  const [entityBrowserOpen, setEntityBrowserOpen] = useState(false);

  // ---- Keyboard shortcuts ----
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Cmd+K → Command palette
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setCommandPaletteOpen((prev) => !prev);
      }
      // Cmd+J → AI chat panel
      if ((e.metaKey || e.ctrlKey) && e.key === "j") {
        e.preventDefault();
        setAiChatOpen((prev) => !prev);
      }
      // Cmd+E → Entity browser
      if ((e.metaKey || e.ctrlKey) && e.key === "e") {
        e.preventDefault();
        setEntityBrowserOpen((prev) => !prev);
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  // ---- Callbacks ----

  const handleOpenDetail = useCallback(
    (entityType: string, entityId: string) => {
      setOpenDetailEntity({ entityType, entityId });
    },
    []
  );

  const handleCloseDetail = useCallback(() => {
    setOpenDetailEntity(null);
  }, []);

  const handleProjectionAdded = useCallback(
    (projection: BoardProjection) => {
      setProjections((prev) => [...prev, projection]);
    },
    []
  );

  const handleProjectionRemoved = useCallback(
    (projectionId: string) => {
      setProjections((prev) => prev.filter((p) => p.id !== projectionId));
      // Remove any derived connections that reference the removed projection
      setDerivedConnections((prev) =>
        prev.filter(
          (c) =>
            c.fromProjectionId !== projectionId &&
            c.toProjectionId !== projectionId
        )
      );
    },
    []
  );

  return (
    <ReactFlowProvider>
    <BoardRoom boardId={boardId} orgId={orgId}>
      <div className="flex h-full flex-col">
        {/* Board Header */}
        <BoardHeader
          boardId={boardId}
          boardName={board.name}
          boardStatus={board.status}
          boardDescription={board.description}
          boardTags={board.tags}
          canUndo={false}
          canRedo={false}
          entityBrowserOpen={entityBrowserOpen}
          onToggleEntityBrowser={() => setEntityBrowserOpen((prev) => !prev)}
        />

        {/* Canvas + Entity Browser side by side */}
        <div className="relative flex flex-1 overflow-hidden">
          {/* Board Flow Canvas */}
          <div className="relative flex-1">
            <BoardFlow
              boardId={boardId}
              projections={projections}
              entities={entities}
              derivedConnections={derivedConnections}
              annotations={annotations}
              onOpenDetail={handleOpenDetail}
              onProjectionAdded={handleProjectionAdded}
              onProjectionRemoved={handleProjectionRemoved}
            />
          </div>

          {/* Entity Browser Panel (right side) */}
          {entityBrowserOpen && (
            <EntityBrowser
              boardId={boardId}
              onClose={() => setEntityBrowserOpen(false)}
              onProjectionAdded={handleProjectionAdded}
            />
          )}
        </div>

        {/* Command Palette (Cmd+K) */}
        <CommandPalette
          boardId={boardId}
          open={commandPaletteOpen}
          onOpenChange={setCommandPaletteOpen}
          onProjectionAdded={handleProjectionAdded}
        />

        {/* AI Chat Panel (Cmd+J) */}
        <AiChatPanel
          boardId={boardId}
          open={aiChatOpen}
          onOpenChange={setAiChatOpen}
          onProjectionAdded={handleProjectionAdded}
        />

        {/* Entity Detail Panel */}
        <EntityDetailPanel
          entityType={(openDetailEntity?.entityType ?? "") as EntityType}
          entityId={openDetailEntity?.entityId ?? ""}
          open={openDetailEntity !== null}
          onOpenChange={(open) => {
            if (!open) handleCloseDetail();
          }}
        />
      </div>
    </BoardRoom>
    </ReactFlowProvider>
  );
}
