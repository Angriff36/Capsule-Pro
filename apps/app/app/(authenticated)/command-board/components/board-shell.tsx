"use client";

import { apiFetch } from "@/app/lib/api";
import { ReactFlowProvider } from "@xyflow/react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import type {
  BoardDelta,
  CommandBoardWithCards,
  SimulationContext,
} from "../actions/boards";
import {
  computeBoardDelta,
  discardSimulation,
  forkCommandBoard,
  listSimulationsForBoard,
} from "../actions/boards";
import { detectConflicts } from "../actions/conflicts";
import type { Conflict } from "../conflict-types";
import { useBoardHistory } from "../hooks/use-board-history";
import { useEntityPolling } from "../hooks/use-entity-polling";
import { useInventoryRealtime } from "../hooks/use-inventory-realtime";
import type { EntityType, ResolvedInventoryItem } from "../types/entities";
import type {
  BoardAnnotation,
  BoardProjection,
  DerivedConnection,
  ResolvedEntity,
} from "../types/index";
import type { SuggestedManifestPlan } from "../types/manifest-plan";
import type { SuggestedAction } from "../actions/suggestions-types";
import { AiChatPanel } from "./ai-chat-panel";
import { ErrorBoundary } from "./board-error-boundary";
import { BoardFlow } from "./board-flow";
import { BoardHeader } from "./board-header";
import { BoardRoom } from "./board-room";
import { CommandPalette } from "./command-palette";
import { ConflictWarningPanel } from "./conflict-warning-panel";
import { EntityBrowser } from "./entity-browser";
import { EntityDetailPanel } from "./entity-detail-panel";
import { SuggestionsPanel } from "./suggestions-panel";

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
  const [conflictsError, setConflictsError] = useState<string | null>(null);

  // ---- AI Suggestions state ----
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<SuggestedAction[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);

  // ---- Simulation mode state ----
  const [boardMode, setBoardMode] = useState<"live" | "simulation">("live");
  const [activeSimulation, setActiveSimulation] =
    useState<SimulationContext | null>(null);
  const [simulationDelta, setSimulationDelta] = useState<BoardDelta | null>(
    null
  );
  const [_availableSimulations, setAvailableSimulations] = useState<
    SimulationContext[]
  >([]);
  const [isCreatingSimulation, setIsCreatingSimulation] = useState(false);

  // ---- Real-time inventory update handler ----
  const handleInventoryUpdate = useCallback(
    (payload: { stockItemId: string; newQuantity: number }) => {
      // Update the entity in the map if it exists
      setEntities((prevEntities) => {
        const entityKey = `inventory_item:${payload.stockItemId}`;
        const existingEntity = prevEntities.get(entityKey);

        if (!existingEntity || existingEntity.type !== "inventory_item") {
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

  // ---- Entity polling for live card updates ----
  const handleEntitiesUpdate = useCallback(
    (updates: Map<string, ResolvedEntity>) => {
      setEntities((prevEntities) => {
        let hasChanges = false;
        const newEntities = new Map(prevEntities);

        for (const [key, newEntity] of updates) {
          const existingEntity = prevEntities.get(key);

          // Only update if entity actually changed
          if (
            !existingEntity ||
            existingEntity.type !== newEntity.type ||
            JSON.stringify(existingEntity.data) !==
              JSON.stringify(newEntity.data)
          ) {
            newEntities.set(key, newEntity);
            hasChanges = true;
          }
        }

        // Only return new Map if there were actual changes
        return hasChanges ? newEntities : prevEntities;
      });
    },
    []
  );

  useEntityPolling({
    projections,
    onEntitiesUpdate: handleEntitiesUpdate,
    interval: 30_000, // 30 seconds
    enabled: boardMode === "live", // Only poll in live mode, not simulation
    pauseOnHidden: true,
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
      // Cmd+S → AI Suggestions panel
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        setSuggestionsOpen((prev) => !prev);
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
    setConflictsError(null);
    try {
      const result = await detectConflicts({ boardId });
      setConflicts(result.conflicts);
      setConflictsError(null);
      // Auto-show panel if there are conflicts
      if (result.conflicts.length > 0) {
        setShowConflicts(true);
      }
    } catch (error) {
      console.error("Failed to detect conflicts:", error);
      setConflicts([]);
      const errorMessage =
        error instanceof Error ? error.message : "Unable to fetch conflicts";
      setConflictsError(errorMessage);
      setShowConflicts(true);
    } finally {
      setIsLoadingConflicts(false);
    }
  }, [boardId]);

  useEffect(() => {
    fetchConflicts();
  }, [fetchConflicts]);

  // ---- Fetch suggestions when panel opens ----
  const fetchSuggestions = useCallback(async () => {
    if (!tenantId) {
      return;
    }

    setIsLoadingSuggestions(true);
    try {
      const params = new URLSearchParams();
      params.append("maxSuggestions", "5");
      params.append("boardId", boardId);

      const response = await apiFetch(
        `/api/ai/suggestions?${params.toString()}`
      );

      if (!response.ok) {
        throw new Error("Failed to fetch suggestions");
      }

      const data = await response.json();
      setSuggestions(data.suggestions || []);
    } catch (error) {
      console.error("Failed to fetch suggestions:", error);
      setSuggestions([]);
    } finally {
      setIsLoadingSuggestions(false);
    }
  }, [tenantId, boardId]);

  // Fetch suggestions when panel opens
  useEffect(() => {
    if (suggestionsOpen && suggestions.length === 0) {
      fetchSuggestions();
    }
  }, [suggestionsOpen, suggestions.length, fetchSuggestions]);

  const handleDismissSuggestion = useCallback((suggestionId: string) => {
    setSuggestions((prev) => prev.filter((s) => s.id !== suggestionId));
  }, []);

  // ---- Simulation handlers ----
  const handleCreateSimulation = useCallback(async () => {
    setIsCreatingSimulation(true);
    try {
      const result = await forkCommandBoard(
        boardId,
        `What-if ${new Date().toLocaleString()}`
      );
      if (result.success && result.simulation) {
        const simulation = result.simulation;
        setActiveSimulation(simulation);
        setAvailableSimulations((prev) => [simulation, ...prev]);
        // Compute initial delta (empty at start)
        const delta = await computeBoardDelta({
          originalProjections: projections,
          simulatedProjections: simulation.projections,
          originalGroups: [],
          simulatedGroups: simulation.groups,
          originalAnnotations: annotations,
          simulatedAnnotations: simulation.annotations,
        });
        setSimulationDelta(delta);
        setBoardMode("simulation");
      }
    } catch (error) {
      console.error("Failed to create simulation:", error);
    } finally {
      setIsCreatingSimulation(false);
    }
  }, [boardId, projections, annotations]);

  const handleSwitchMode = useCallback(
    async (mode: "live" | "simulation") => {
      if (mode === "simulation" && !activeSimulation) {
        // Create a new simulation if none exists
        await handleCreateSimulation();
      } else {
        setBoardMode(mode);
      }
    },
    [activeSimulation, handleCreateSimulation]
  );

  const handleDiscardSimulation = useCallback(async () => {
    if (!activeSimulation) {
      return;
    }
    try {
      await discardSimulation(activeSimulation.id);
      setActiveSimulation(null);
      setSimulationDelta(null);
      setBoardMode("live");
      setAvailableSimulations((prev) =>
        prev.filter((s) => s.id !== activeSimulation.id)
      );
    } catch (error) {
      console.error("Failed to discard simulation:", error);
    }
  }, [activeSimulation]);

  // Load available simulations on mount
  useEffect(() => {
    listSimulationsForBoard(boardId)
      .then(setAvailableSimulations)
      .catch((error) => {
        console.error("Failed to load simulations:", error);
      });
  }, [boardId]);

  return (
    <ReactFlowProvider>
      <BoardRoom boardId={boardId} orgId={orgId}>
        <div className="fixed inset-0 z-40 flex flex-col bg-background">
          {/* Board Header */}
          <BoardHeader
            aiChatOpen={aiChatOpen}
            boardDescription={board.description}
            boardId={boardId}
            boardMode={boardMode}
            boardName={board.name}
            boardStatus={board.status}
            boardTags={board.tags}
            canRedo={canRedo}
            canUndo={canUndo}
            commandPaletteOpen={commandPaletteOpen}
            conflictCount={conflicts.length}
            entityBrowserOpen={entityBrowserOpen}
            isCreatingSimulation={isCreatingSimulation}
            isLoadingConflicts={isLoadingConflicts}
            isLoadingSuggestions={isLoadingSuggestions}
            onDiscardSimulation={handleDiscardSimulation}
            onExitFullscreen={handleExitFullscreen}
            onRedo={handleRedo}
            onSwitchMode={handleSwitchMode}
            onToggleAiChat={() => setAiChatOpen((prev) => !prev)}
            onToggleCommandPalette={() =>
              setCommandPaletteOpen((prev) => !prev)
            }
            onToggleConflicts={() => {
              if (conflicts.length > 0 || conflictsError) {
                setShowConflicts((prev) => !prev);
              } else {
                fetchConflicts();
              }
            }}
            onToggleEntityBrowser={() => setEntityBrowserOpen((prev) => !prev)}
            onToggleSuggestions={() => setSuggestionsOpen((prev) => !prev)}
            onUndo={handleUndo}
            simulationDelta={simulationDelta}
            suggestionsCount={suggestions.length}
            suggestionsOpen={suggestionsOpen}
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
                  boardMode={boardMode}
                  derivedConnections={derivedConnections}
                  entities={entities}
                  onOpenDetail={handleOpenDetail}
                  onOpenEntityBrowser={() => setEntityBrowserOpen(true)}
                  onProjectionAdded={handleProjectionAdded}
                  onProjectionRemoved={handleProjectionRemoved}
                  projections={
                    boardMode === "simulation" && activeSimulation
                      ? activeSimulation.projections
                      : projections
                  }
                  simulationDelta={
                    boardMode === "simulation" ? simulationDelta : null
                  }
                />
              </ErrorBoundary>

              {/* Conflict Warning Panel Overlay */}
              {showConflicts && (conflicts.length > 0 || conflictsError) && (
                <ConflictWarningPanel
                  conflicts={conflicts}
                  errorMessage={conflictsError}
                  onClose={() => setShowConflicts(false)}
                  simulationBoardId={
                    boardMode === "simulation"
                      ? activeSimulation?.id
                      : undefined
                  }
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

            {/* AI Suggestions Panel (right side) */}
            {suggestionsOpen && (
              <div className="w-80 border-l bg-background">
                <SuggestionsPanel
                  isLoading={isLoadingSuggestions}
                  onAction={(suggestion) => {
                    // Handle suggestion action based on type
                    if (suggestion.action.type === "navigate") {
                      router.push(suggestion.action.path);
                    } else if (suggestion.action.type === "bulk_create_cards") {
                      // Add cards to board - for now just dismiss
                      handleDismissSuggestion(suggestion.id);
                    }
                  }}
                  onDismiss={handleDismissSuggestion}
                  onRefresh={fetchSuggestions}
                  suggestions={suggestions}
                />
              </div>
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
