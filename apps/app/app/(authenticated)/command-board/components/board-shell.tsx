"use client";

import { ReactFlowProvider } from "@xyflow/react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { CommandBoardWithCards } from "../actions/boards";
import { useBoardHistory } from "../hooks/use-board-history";
import { useInventoryRealtime } from "../hooks/use-inventory-realtime";
import type { EntityType, ResolvedInventoryItem } from "../types/entities";
import type {
  BoardAnnotation,
  BoardProjection,
  DerivedConnection,
  ResolvedEntity,
} from "../types/index";
import type { Conflict } from "../conflict-types";
import type { SuggestedManifestPlan } from "../types/manifest-plan";
import { AiChatPanel } from "./ai-chat-panel";
import { ErrorBoundary } from "./board-error-boundary";
import { BoardFlow } from "./board-flow";
import { BoardHeader } from "./board-header";
import { BoardRoom } from "./board-room";
import { CommandPalette } from "./command-palette";
import { ConflictWarningPanel } from "./conflict-warning-panel";
import { EntityBrowser } from "./entity-browser";
import { EntityDetailPanel } from "./entity-detail-panel";
import { detectConflicts } from "../actions/conflicts";

// ============================================================================
// Types
// ============================================================================

interface BoardShellProps {
  boardId: string;
  orgId: string;
  tenantId: string;
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
  tenantId,
  board,
  projections: initialProjections,
  entitiesArray,
  derivedConnections: initialDerivedConnections,
  annotations,
}: BoardShellProps) {
  const router = useRouter();

  // ---- Reconstruct entities Map from serialized array (mutable for real-time updates) ----
  const [entities, setEntities] = useState<Map<string, ResolvedEntity>>(
    () => new Map(entitiesArray)
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
  const [activePreviewPlan, setActivePreviewPlan] =
    useState<SuggestedManifestPlan | null>(null);

  // ---- Entity browser panel state ----
  const [entityBrowserOpen, setEntityBrowserOpen] = useState(false);

  // ---- Conflict detection state ----
  const [conflicts, setConflicts] = useState<Conflict[]>([]);
  const [showConflicts, setShowConflicts] = useState(false);
  const [isLoadingConflicts, setIsLoadingConflicts] = useState(false);

  // ---- Real-time inventory update handler ----
  const handleInventoryUpdate = useCallback(
    (payload: { stockItemId: string; newQuantity: number }) => {
      // Update the entity in the map if it exists
      setEntities((prevEntities) => {
        const entityKey = `inventory_item:${payload.stockItemId}`;
        const existingEntity = prevEntities.get(entityKey);

        if (
          !existingEntity ||
          existingEntity.type !== "inventory_item"
        ) {
          return prevEntities; // No change if entity not found
        }

        // Create updated entity with new quantity
        const updatedData: ResolvedInventoryItem = {
          ...existingEntity.data,
          quantityOnHand: payload.newQuantity,
        };

        // Create new Map to trigger re-render
        const newEntities = new Map(prevEntities);
        newEntities.set(entityKey, {
          type: "inventory_item",
          data: updatedData,
        });

        return newEntities;
      });
    },
    []
  );

  // ---- Real-time inventory subscription ----
  useInventoryRealtime({
    tenantId,
    onInventoryUpdate: handleInventoryUpdate,
  });

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

  // ---- Fetch conflicts on mount ----
  const fetchConflicts = useCallback(async () => {
    setIsLoadingConflicts(true);
    try {
      const result = await detectConflicts({ boardId });
      setConflicts(result.conflicts);
      // Auto-show panel if there are conflicts
      if (result.conflicts.length > 0) {
        setShowConflicts(true);
      }
    } catch (error) {
      console.error("Failed to detect conflicts:", error);
    } finally {
      setIsLoadingConflicts(false);
    }
  }, [boardId]);

  useEffect(() => {
    fetchConflicts();
  }, [fetchConflicts]);

  return (
    <ReactFlowProvider>
      <BoardRoom boardId={boardId} orgId={orgId}>
        <div className="fixed inset-0 z-40 flex flex-col bg-background">
          {/* Board Header */}
          <BoardHeader
            aiChatOpen={aiChatOpen}
            boardDescription={board.description}
            boardId={boardId}
            boardName={board.name}
            boardStatus={board.status}
            boardTags={board.tags}
            canRedo={canRedo}
            canUndo={canUndo}
            commandPaletteOpen={commandPaletteOpen}
            conflictCount={conflicts.length}
            entityBrowserOpen={entityBrowserOpen}
            isLoadingConflicts={isLoadingConflicts}
            onExitFullscreen={handleExitFullscreen}
            onRedo={handleRedo}
            onToggleAiChat={() => setAiChatOpen((prev) => !prev)}
            onToggleCommandPalette={() =>
              setCommandPaletteOpen((prev) => !prev)
            }
            onToggleConflicts={() => {
              if (conflicts.length > 0) {
                setShowConflicts((prev) => !prev);
              } else {
                fetchConflicts();
              }
            }}
            onToggleEntityBrowser={() => setEntityBrowserOpen((prev) => !prev)}
            onUndo={handleUndo}
          />

          {/* Canvas + Entity Browser side by side */}
          <div className="relative flex flex-1 overflow-hidden">
            {/* Board Flow Canvas */}
            <div className="relative flex-1">
              <ErrorBoundary>
                <BoardFlow
                  activePreviewMutations={activePreviewPlan?.boardPreview ?? []}
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

              {/* Conflict Warning Panel Overlay */}
              {showConflicts && conflicts.length > 0 && (
                <ConflictWarningPanel
                  conflicts={conflicts}
                  onClose={() => setShowConflicts(false)}
                />
              )}
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
            onPreviewPlanChange={setActivePreviewPlan}
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
