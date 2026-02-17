"use client";

import { ReactFlowProvider } from "@xyflow/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { CommandBoardWithCards } from "../actions/boards";
import { useBoardHistory } from "../hooks/use-board-history";
import type { EntityType } from "../types/entities";
import type {
  BoardAnnotation,
  BoardProjection,
  DerivedConnection,
  ResolvedEntity,
} from "../types/index";
import { AiChatPanel } from "./ai-chat-panel";
import { ErrorBoundary } from "./board-error-boundary";
import { BoardFlow } from "./board-flow";
import { BoardHeader } from "./board-header";
import { BoardRoom } from "./board-room";
import { CommandPalette } from "./command-palette";
import { EntityBrowser } from "./entity-browser";
import { EntityDetailPanel } from "./entity-detail-panel";

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
  const router = useRouter();

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

  // Exit board → navigate back to board list
  const handleExitFullscreen = useCallback(() => {
    router.push("/command-board");
  }, [router]);

  // ---- Undo/Redo history ----
  const { canUndo, canRedo, pushState, undo, redo } = useBoardHistory();

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
      pushState(projections);
      setProjections((prev) => [...prev, projection]);
    },
    [pushState, projections]
  );

  const handleProjectionRemoved = useCallback(
    (projectionId: string) => {
      pushState(projections);
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
    [pushState, projections]
  );

  // ---- Undo handler ----
  const handleUndo = useCallback(() => {
    const restored = undo(projections);
    setProjections(restored);
  }, [undo, projections]);

  // ---- Redo handler ----
  const handleRedo = useCallback(() => {
    const restored = redo(projections);
    setProjections(restored);
  }, [redo, projections]);

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
      // Cmd+Z → Undo
      if ((e.metaKey || e.ctrlKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        if (canUndo) {
          handleUndo();
        }
      }
      // Cmd+Shift+Z → Redo
      if ((e.metaKey || e.ctrlKey) && e.key === "z" && e.shiftKey) {
        e.preventDefault();
        if (canRedo) {
          handleRedo();
        }
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [canUndo, canRedo, handleUndo, handleRedo]);

  return (
    <ReactFlowProvider>
      <BoardRoom boardId={boardId} orgId={orgId}>
        <div className="fixed inset-0 z-40 flex flex-col bg-background">
          {/* Board Header */}
          <BoardHeader
            boardDescription={board.description}
            boardId={boardId}
            boardName={board.name}
            boardStatus={board.status}
            boardTags={board.tags}
            canRedo={canRedo}
            canUndo={canUndo}
            entityBrowserOpen={entityBrowserOpen}
            onExitFullscreen={handleExitFullscreen}
            onRedo={handleRedo}
            onToggleEntityBrowser={() => setEntityBrowserOpen((prev) => !prev)}
            onUndo={handleUndo}
          />

          {/* Canvas + Entity Browser side by side */}
          <div className="relative flex flex-1 overflow-hidden">
            {/* Board Flow Canvas */}
            <div className="relative flex-1">
              <ErrorBoundary>
                <BoardFlow
                  annotations={annotations}
                  boardId={boardId}
                  derivedConnections={derivedConnections}
                  entities={entities}
                  onOpenDetail={handleOpenDetail}
                  onProjectionAdded={handleProjectionAdded}
                  onProjectionRemoved={handleProjectionRemoved}
                  projections={projections}
                />
              </ErrorBoundary>
            </div>

            {/* Entity Browser Panel (right side) */}
            {entityBrowserOpen && (
              <EntityBrowser
                boardId={boardId}
                onClose={() => setEntityBrowserOpen(false)}
                onProjectionAdded={handleProjectionAdded}
                projections={projections}
              />
            )}
          </div>

          {/* Command Palette (Cmd+K) */}
          <CommandPalette
            boardId={boardId}
            onOpenChange={setCommandPaletteOpen}
            onProjectionAdded={handleProjectionAdded}
            open={commandPaletteOpen}
          />

          {/* AI Chat Panel (Cmd+J) */}
          <AiChatPanel
            boardId={boardId}
            onOpenChange={setAiChatOpen}
            onProjectionAdded={handleProjectionAdded}
            open={aiChatOpen}
          />

          {/* Entity Detail Panel */}
          <EntityDetailPanel
            entityId={openDetailEntity?.entityId ?? ""}
            entityType={(openDetailEntity?.entityType ?? "") as EntityType}
            onOpenChange={(open) => {
              if (!open) {
                handleCloseDetail();
              }
            }}
            open={openDetailEntity !== null}
          />
        </div>
      </BoardRoom>
    </ReactFlowProvider>
  );
}
