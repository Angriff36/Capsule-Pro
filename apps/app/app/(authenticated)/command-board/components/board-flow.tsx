"use client";

import {
  Background,
  BackgroundVariant,
  Controls,
  type EdgeChange,
  MiniMap,
  type Node,
  type NodeChange,
  ReactFlow,
  SelectionMode,
  useEdgesState,
  useNodesState,
  useReactFlow,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { Button } from "@repo/design-system/components/ui/button";
import {
  Calendar,
  ClipboardList,
  FolderSearch,
  LayoutGrid,
  Users,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import type { BoardDelta } from "../actions/boards";
import {
  addProjection,
  batchRemoveProjections,
  batchUpdatePositions,
  removeProjection,
  toggleProjectionPin,
  updateProjectionPosition,
} from "../actions/projections";
import { useBoardSync } from "../hooks/use-board-sync";
import { useLiveblocksSync } from "../hooks/use-liveblocks-sync";
import { edgeTypes, nodeTypes } from "../nodes/node-types";
import { RELATIONSHIP_STYLES } from "../types/board";
import { ENTITY_TYPE_LABELS, type EntityType } from "../types/entities";
import type {
  BoardEdge,
  EventQuickAction,
  ProjectionNode,
  TaskQuickAction,
} from "../types/flow";
import {
  annotationToEdge,
  connectionToEdge,
  projectionToNode,
} from "../types/flow";
import type {
  BoardAnnotation,
  BoardProjection,
  DerivedConnection,
  ResolvedEntity,
} from "../types/index";
import type { BoardMutation } from "../types/manifest-plan";

// ============================================================================
// Types
// ============================================================================

interface BoardFlowProps {
  boardId: string;
  projections: BoardProjection[];
  entities: Map<string, ResolvedEntity>;
  derivedConnections: DerivedConnection[];
  annotations: BoardAnnotation[];
  activePreviewMutations: BoardMutation[];
  /** Current board mode - live or simulation */
  boardMode?: "live" | "simulation";
  /** Simulation delta for "what-if" diff overlay */
  simulationDelta?: BoardDelta | null;
  onOpenDetail: (entityType: string, entityId: string) => void;
  onProjectionAdded?: (projection: BoardProjection) => void;
  onProjectionRemoved?: (projectionId: string) => void;
  /** Callback to open the entity browser panel */
  onOpenEntityBrowser?: () => void;
}

// ============================================================================
// MiniMap Color Mapping
// ============================================================================

/** Hex colors for entity types used in the MiniMap */
const ENTITY_MINIMAP_COLORS: Record<string, string> = {
  event: "#f97316",
  client: "#22c55e",
  prep_task: "#10b981",
  kitchen_task: "#14b8a6",
  employee: "#f59e0b",
  inventory_item: "#3b82f6",
  recipe: "#ec4899",
  dish: "#f43f5e",
  proposal: "#8b5cf6",
  shipment: "#06b6d4",
  note: "#78716c",
};

const DEFAULT_MINIMAP_COLOR = "#9ca3af";

// ============================================================================
// RTS-style Edge Auto-Pan Hook
// ============================================================================

/**
 * Pans the React Flow viewport when the mouse is near the edge of the canvas,
 * like an RTS game. Speed scales linearly from 0 at the outer edge of the
 * threshold zone to MAX_SPEED at the very edge of the container.
 */
function useEdgePan(containerRef: React.RefObject<HTMLDivElement | null>) {
  const { getViewport, setViewport } = useReactFlow();

  // Pixels from the container edge that trigger panning
  const EDGE_THRESHOLD = 80;
  // Maximum pan speed in flow-units per frame (~60fps)
  const MAX_SPEED = 12;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    // Current mouse position relative to the container, updated on mousemove
    let mouseX = -1;
    let mouseY = -1;
    let rafId: number | null = null;

    function computeVelocity(pos: number, size: number): number {
      // Distance from near edge
      const nearDist = pos;
      // Distance from far edge
      const farDist = size - pos;

      if (nearDist < EDGE_THRESHOLD) {
        // Closer to 0 → stronger pull in negative direction
        return -MAX_SPEED * (1 - nearDist / EDGE_THRESHOLD);
      }
      if (farDist < EDGE_THRESHOLD) {
        // Closer to size → stronger pull in positive direction
        return MAX_SPEED * (1 - farDist / EDGE_THRESHOLD);
      }
      return 0;
    }

    function tick() {
      if (mouseX < 0 || mouseY < 0) {
        rafId = requestAnimationFrame(tick);
        return;
      }

      const el = containerRef.current;
      if (!el) {
        return;
      }
      const { width, height } = el.getBoundingClientRect();
      const vx = computeVelocity(mouseX, width);
      const vy = computeVelocity(mouseY, height);

      if (vx !== 0 || vy !== 0) {
        const { x, y, zoom } = getViewport();
        setViewport({ x: x - vx, y: y - vy, zoom });
      }

      rafId = requestAnimationFrame(tick);
    }

    function onMouseMove(e: MouseEvent) {
      // container is non-null here — guarded above before addEventListener
      const rect = (container as HTMLDivElement).getBoundingClientRect();
      mouseX = e.clientX - rect.left;
      mouseY = e.clientY - rect.top;
    }

    function onMouseLeave() {
      mouseX = -1;
      mouseY = -1;
    }

    container.addEventListener("mousemove", onMouseMove);
    container.addEventListener("mouseleave", onMouseLeave);
    rafId = requestAnimationFrame(tick);

    return () => {
      container.removeEventListener("mousemove", onMouseMove);
      container.removeEventListener("mouseleave", onMouseLeave);
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
      }
    };
  }, [containerRef, getViewport, setViewport]);
}

// ============================================================================
// Inner Component (must be inside ReactFlowProvider)
// ============================================================================

function BoardFlowInner({
  boardId,
  projections,
  entities,
  derivedConnections,
  annotations,
  activePreviewMutations,
  boardMode = "live",
  simulationDelta,
  onOpenDetail,
  onProjectionAdded,
  onProjectionRemoved,
  onOpenEntityBrowser,
}: BoardFlowProps) {
  // Ref for the canvas wrapper — used by the edge-pan hook
  const containerRef = useRef<HTMLDivElement>(null);
  const { screenToFlowPosition } = useReactFlow();

  // RTS-style edge auto-pan
  useEdgePan(containerRef);

  // Track which nodes are currently being dragged to detect drag-end
  const draggingNodesRef = useRef<Set<string>>(new Set());

  // Track external drag-over state for visual feedback
  const [isDragOver, setIsDragOver] = useState(false);

  // Track if we're currently processing a drop to prevent duplicates
  const isDroppingRef = useRef(false);

  // Refs for broadcast functions — allows callbacks defined before useBoardSync
  // to access broadcast without circular dependency issues
  const broadcastMoveRef = useRef<(id: string, x: number, y: number) => void>(
    () => {
      // noop
    }
  );
  const broadcastRemoveRef = useRef<(id: string) => void>(() => {
    // noop
  });

  // ---- Callbacks for node data ----

  const handleRemoveProjection = useCallback(
    async (projectionId: string) => {
      try {
        await removeProjection(projectionId);
        onProjectionRemoved?.(projectionId);
        broadcastRemoveRef.current(projectionId);
      } catch (error) {
        console.error(
          "[BoardFlow] Failed to remove projection:",
          projectionId,
          error
        );
        toast.error("Failed to remove entity from board");
      }
    },
    [onProjectionRemoved]
  );

  const handleTogglePin = useCallback(async (projectionId: string) => {
    try {
      const updated = await toggleProjectionPin(projectionId);
      toast.success(updated.pinned ? "Entity pinned" : "Entity unpinned");
    } catch (error) {
      console.error("[BoardFlow] Failed to toggle pin:", projectionId, error);
      toast.error("Failed to toggle pin");
    }
  }, []);

  // ---- Quick action handlers for tasks and events ----

  const handleTaskAction = useCallback(
    async (entityType: string, entityId: string, action: TaskQuickAction) => {
      try {
        const isPrepTask = entityType === "prep_task";
        const baseUrl = isPrepTask
          ? "/api/kitchen/prep-tasks/commands"
          : "/api/kitchen/kitchen-tasks/commands";

        const response = await fetch(`${baseUrl}/${action}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: entityId }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error ?? `Failed to ${action} task`);
        }

        const actionLabels: Record<TaskQuickAction, string> = {
          complete: "completed",
          start: "started",
          cancel: "canceled",
          claim: "claimed",
          release: "released",
        };
        toast.success(`Task ${actionLabels[action]}`);

        // Trigger a refresh to update the card data
        onProjectionAdded?.(undefined as unknown as BoardProjection);
      } catch (error) {
        console.error("[BoardFlow] Task action failed:", action, error);
        toast.error(
          error instanceof Error ? error.message : `Failed to ${action} task`
        );
      }
    },
    [onProjectionAdded]
  );

  const handleEventAction = useCallback(
    async (entityId: string, action: EventQuickAction) => {
      try {
        // Map quick actions to event status changes
        const statusMap: Record<EventQuickAction, string> = {
          confirm: "confirmed",
          tentative: "tentative",
          cancel: "cancelled",
          complete: "completed",
        };

        const response = await fetch("/api/events/event/commands/update", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: entityId, status: statusMap[action] }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error ?? `Failed to ${action} event`);
        }

        const actionLabels: Record<EventQuickAction, string> = {
          confirm: "confirmed",
          tentative: "marked as tentative",
          cancel: "cancelled",
          complete: "marked as completed",
        };
        toast.success(`Event ${actionLabels[action]}`);

        // Trigger a refresh to update the card data
        onProjectionAdded?.(undefined as unknown as BoardProjection);
      } catch (error) {
        console.error("[BoardFlow] Event action failed:", action, error);
        toast.error(
          error instanceof Error ? error.message : `Failed to ${action} event`
        );
      }
    },
    [onProjectionAdded]
  );

  // ---- Build initial nodes from projections + entities ----

  const initialNodes = useMemo(() => {
    return projections.map((projection) => {
      const key = `${projection.entityType}:${projection.entityId}`;
      const entity = entities.get(key) ?? null;
      return projectionToNode(projection, entity, {
        onOpenDetail,
        onRemove: handleRemoveProjection,
        onTogglePin: handleTogglePin,
        onTaskAction: handleTaskAction,
        onEventAction: handleEventAction,
      });
    });
  }, [
    projections,
    entities,
    onOpenDetail,
    handleRemoveProjection,
    handleTogglePin,
    handleTaskAction,
    handleEventAction,
  ]);

  // ---- Build initial edges from derived connections + annotations ----

  const initialEdges = useMemo(() => {
    const derivedEdges: BoardEdge[] = derivedConnections.map((conn) => {
      const edge = connectionToEdge(conn);

      // Apply relationship-specific styling from RELATIONSHIP_STYLES
      const styleKey =
        conn.relationshipType as keyof typeof RELATIONSHIP_STYLES;
      const relStyle =
        RELATIONSHIP_STYLES[styleKey] ?? RELATIONSHIP_STYLES.generic;
      const dashArray =
        "strokeDasharray" in relStyle
          ? (relStyle as { strokeDasharray: string }).strokeDasharray
          : undefined;

      return {
        ...edge,
        style: {
          stroke: relStyle.color,
          strokeDasharray: dashArray,
        },
      };
    });

    const annotationEdges: BoardEdge[] = annotations
      .map(annotationToEdge)
      .filter((edge): edge is BoardEdge => edge !== null);

    return [...derivedEdges, ...annotationEdges];
  }, [derivedConnections, annotations]);

  // ---- React Flow state (must come before sync hooks that use setNodes) ----

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Sync nodes when projections/entities change externally
  useEffect(() => {
    setNodes(initialNodes);
  }, [initialNodes, setNodes]);

  // Sync edges when connections/annotations change externally
  useEffect(() => {
    setEdges(initialEdges);
  }, [initialEdges, setEdges]);

  // ---- Preview layer (ghost mutations before approval) ----

  // ---- Simulation delta state (for "what-if" diff overlay) ----
  const simulationState = useMemo(() => {
    if (boardMode !== "simulation" || !simulationDelta) {
      return {
        addedEntityIds: new Set<string>(),
        removedProjectionIds: new Set<string>(),
        modifiedProjectionIds: new Set<string>(),
        modifications: new Map<
          string,
          Array<{ field: string; original: unknown; simulated: unknown }>
        >(),
      };
    }

    const addedEntityIds = new Set<string>(
      simulationDelta.addedProjections.map((p) => p.entityId)
    );
    const removedProjectionIds = new Set<string>(
      simulationDelta.removedProjectionIds
    );
    const modifiedProjectionIds = new Set<string>(
      simulationDelta.modifiedProjections.map((m) => m.id)
    );
    const modifications = new Map<
      string,
      Array<{ field: string; original: unknown; simulated: unknown }>
    >();

    for (const mod of simulationDelta.modifiedProjections) {
      const existing = modifications.get(mod.id) ?? [];
      existing.push({
        field: mod.field,
        original: mod.original,
        simulated: mod.simulated,
      });
      modifications.set(mod.id, existing);
    }

    return {
      addedEntityIds,
      removedProjectionIds,
      modifiedProjectionIds,
      modifications,
    };
  }, [boardMode, simulationDelta]);

  const previewState = useMemo(() => {
    const removedNodeIds = new Set<string>();
    const removedEdgeIds = new Set<string>();
    const movedNodePositions = new Map<string, { x: number; y: number }>();
    const highlightedNodeColors = new Map<string, string>();
    const previewAddNodes = activePreviewMutations.filter(
      (mutation): mutation is Extract<BoardMutation, { type: "addNode" }> =>
        mutation.type === "addNode"
    );
    const previewAddEdges = activePreviewMutations.filter(
      (mutation): mutation is Extract<BoardMutation, { type: "addEdge" }> =>
        mutation.type === "addEdge"
    );

    for (const mutation of activePreviewMutations) {
      switch (mutation.type) {
        case "removeNode":
          removedNodeIds.add(mutation.projectionId);
          break;
        case "removeEdge":
          removedEdgeIds.add(mutation.edgeId);
          break;
        case "moveNode":
          movedNodePositions.set(mutation.projectionId, {
            x: mutation.positionX,
            y: mutation.positionY,
          });
          break;
        case "highlightNode":
          highlightedNodeColors.set(
            mutation.projectionId,
            mutation.color ?? "#f59e0b"
          );
          break;
        default:
          break;
      }
    }

    return {
      removedNodeIds,
      removedEdgeIds,
      movedNodePositions,
      highlightedNodeColors,
      previewAddNodes,
      previewAddEdges,
    };
  }, [activePreviewMutations]);

  const renderedNodes = useMemo(() => {
    const persistedNodes = nodes
      .filter((node) => !previewState.removedNodeIds.has(node.id))
      .map((node) => {
        const moved = previewState.movedNodePositions.get(node.id);
        const highlightColor = previewState.highlightedNodeColors.get(node.id);

        // Check simulation state for this node
        const nodeData = node.data as
          | { projection?: BoardProjection }
          | undefined;
        const projection = nodeData?.projection;
        const entityId = projection?.entityId ?? "";
        const projectionId = node.id;

        // Determine simulation styling
        let simulationStyle: React.CSSProperties = {};
        let simulationClassName = "";

        if (boardMode === "simulation" && simulationDelta) {
          if (simulationState.removedProjectionIds.has(projectionId)) {
            // Removed in simulation - red border with strike-through effect
            simulationStyle = {
              opacity: 0.5,
              boxShadow: "0 0 0 3px #ef4444",
            };
            simulationClassName = "simulation-removed";
          } else if (simulationState.modifiedProjectionIds.has(projectionId)) {
            // Modified in simulation - yellow/amber border
            simulationStyle = {
              boxShadow: "0 0 0 3px #f59e0b",
            };
            simulationClassName = "simulation-modified";
          } else if (simulationState.addedEntityIds.has(entityId)) {
            // Added in simulation - green border
            simulationStyle = {
              boxShadow: "0 0 0 3px #22c55e",
            };
            simulationClassName = "simulation-added";
          }
        }

        if (
          !(moved || highlightColor) &&
          Object.keys(simulationStyle).length === 0
        ) {
          return node;
        }

        return {
          ...node,
          position: moved ?? node.position,
          className: `${node.className ?? ""} ${simulationClassName}`.trim(),
          style: {
            ...node.style,
            ...(highlightColor
              ? {
                  boxShadow: `0 0 0 2px ${highlightColor}`,
                }
              : {}),
            ...simulationStyle,
          },
        };
      });

    // Add ghost nodes from preview mutations
    const ghostNodes = previewState.previewAddNodes.map((mutation) => {
      const projection: BoardProjection = {
        id: mutation.previewNodeId,
        tenantId: "preview",
        boardId,
        entityType: mutation.entityType,
        entityId: mutation.entityId,
        positionX: Math.round(mutation.positionX),
        positionY: Math.round(mutation.positionY),
        width: mutation.width ?? 280,
        height: mutation.height ?? 180,
        zIndex: 9999,
        colorOverride: null,
        collapsed: false,
        groupId: null,
        pinned: false,
      };

      const key = `${mutation.entityType}:${mutation.entityId}`;
      const entity = entities.get(key) ?? null;
      const ghostNode = projectionToNode(projection, entity, {
        onOpenDetail: () => {
          // preview nodes are read-only
        },
        onRemove: () => {
          // preview nodes are read-only
        },
        onTogglePin: () => {
          // preview nodes are read-only
        },
        onTaskAction: async () => {
          // preview nodes are read-only
        },
        onEventAction: async () => {
          // preview nodes are read-only
        },
      });

      return {
        ...ghostNode,
        draggable: false,
        selectable: false,
        style: {
          ...ghostNode.style,
          opacity: 0.7,
          border: "2px dashed #3b82f6",
        },
      };
    });

    return [...persistedNodes, ...ghostNodes];
  }, [
    boardId,
    entities,
    nodes,
    previewState,
    boardMode,
    simulationDelta,
    simulationState,
  ]);

  const renderedEdges = useMemo(() => {
    const persistedEdges = edges.filter(
      (edge) => !previewState.removedEdgeIds.has(edge.id)
    );

    const ghostEdges: BoardEdge[] = previewState.previewAddEdges.map(
      (mutation) => ({
        id:
          mutation.edgeId ??
          `preview-edge-${mutation.sourceProjectionId}-${mutation.targetProjectionId}-${mutation.label ?? "link"}`,
        source: mutation.sourceProjectionId,
        target: mutation.targetProjectionId,
        type: "smoothstep",
        label: mutation.label,
        animated: true,
        style: {
          stroke: mutation.color ?? "#3b82f6",
          strokeDasharray: (() => {
            if (mutation.style === "dotted") {
              return "2,2";
            }
            if (mutation.style === "dashed") {
              return "5,5";
            }
            return undefined;
          })(),
        },
        data: {
          derived: false,
          annotationId: "preview",
          label: mutation.label ?? null,
          style: mutation.style ?? null,
        },
      })
    );

    return [...persistedEdges, ...ghostEdges];
  }, [edges, previewState]);

  // ---- Realtime sync via Liveblocks ----

  const {
    setBroadcast,
    broadcastMove,
    broadcastAdd: _broadcastAdd,
    broadcastRemove,
    broadcastRefresh: _broadcastRefresh,
    handleEvent,
  } = useBoardSync({
    onRemoteMove: useCallback(
      (projectionId: string, x: number, y: number) => {
        // Apply remote position change to local nodes without persisting
        setNodes((nds) =>
          nds.map((n) =>
            n.id === projectionId ? { ...n, position: { x, y } } : n
          )
        );
      },
      [setNodes]
    ),
    onRemoteAdd: useCallback(
      (_projectionId: string) => {
        // Trigger a full refresh to pick up the new projection
        onProjectionAdded?.(undefined as unknown as BoardProjection);
      },
      [onProjectionAdded]
    ),
    onRemoteRemove: useCallback(
      (projectionId: string) => {
        onProjectionRemoved?.(projectionId);
      },
      [onProjectionRemoved]
    ),
    onRemoteRefresh: useCallback(() => {
      // Full board refresh — parent component should re-fetch
      onProjectionAdded?.(undefined as unknown as BoardProjection);
    }, [onProjectionAdded]),
  });

  // Keep refs in sync with the latest broadcast functions
  broadcastMoveRef.current = broadcastMove;
  broadcastRemoveRef.current = broadcastRemove;

  // Wire Liveblocks broadcast/event hooks into the sync system
  useLiveblocksSync(setBroadcast, handleEvent);

  // ---- Handle node position changes (drag persistence) ----

  const handleNodesChange = useCallback(
    (changes: NodeChange<ProjectionNode>[]) => {
      // Let React Flow apply all changes first
      onNodesChange(
        changes.filter(
          (change) => !("id" in change && change.id.startsWith("preview:"))
        )
      );

      for (const change of changes) {
        if (change.type !== "position") {
          continue;
        }

        if (change.dragging) {
          // Node is being dragged — track it and broadcast position to peers
          draggingNodesRef.current.add(change.id);
          if (change.position) {
            broadcastMoveRef.current(
              change.id,
              change.position.x,
              change.position.y
            );
          }
        } else if (draggingNodesRef.current.has(change.id)) {
          // Drag ended — persist position
          draggingNodesRef.current.delete(change.id);

          if (change.position) {
            // Check if multiple nodes were being dragged (group move)
            // If so, batch-update all of them
            const selectedNodes = nodes.filter(
              (n) => n.selected && n.id !== change.id
            );

            if (selectedNodes.length > 0) {
              // Multi-node drag: batch update all selected nodes + the changed one
              // We need to read the latest positions from the nodes state after the change
              // Use a microtask to ensure React Flow has applied the changes
              const changedId = change.id;
              const changedPosition = change.position;

              queueMicrotask(() => {
                setNodes((currentNodes) => {
                  const updates: Array<{ id: string; x: number; y: number }> =
                    [];

                  for (const node of currentNodes) {
                    if (node.selected || node.id === changedId) {
                      const pos =
                        node.id === changedId ? changedPosition : node.position;
                      updates.push({
                        id: node.id,
                        x: pos.x,
                        y: pos.y,
                      });
                    }
                  }

                  if (updates.length > 0) {
                    batchUpdatePositions(updates).catch((error) => {
                      console.error(
                        "[BoardFlow] Failed to batch update positions:",
                        error
                      );
                      toast.error("Failed to save positions");
                    });
                  }

                  // Return unchanged — we're just reading state
                  return currentNodes;
                });
              });
            } else {
              // Single node drag
              updateProjectionPosition(change.id, {
                x: change.position.x,
                y: change.position.y,
              }).catch((error) => {
                console.error(
                  "[BoardFlow] Failed to update position:",
                  change.id,
                  error
                );
                toast.error("Failed to save position");
              });
            }
          }
        }
      }
    },
    [onNodesChange, nodes, setNodes]
  );

  // ---- Handle edge changes ----

  const handleEdgesChange = useCallback(
    (changes: EdgeChange<BoardEdge>[]) => {
      onEdgesChange(
        changes.filter(
          (change) => !("id" in change && change.id.startsWith("preview-edge-"))
        )
      );
    },
    [onEdgesChange]
  );

  // ---- Handle node deletion via keyboard ----

  const handleDelete = useCallback(
    async (deletedNodes: Node[]) => {
      if (deletedNodes.length === 0) {
        return;
      }

      const projectionIds = deletedNodes
        .map((n) => n.id)
        .filter((id) => !id.startsWith("preview:"));

      if (projectionIds.length === 0) {
        return;
      }

      try {
        if (projectionIds.length === 1) {
          await removeProjection(projectionIds[0]);
          onProjectionRemoved?.(projectionIds[0]);
          broadcastRemoveRef.current(projectionIds[0]);
        } else {
          await batchRemoveProjections(projectionIds);
          for (const id of projectionIds) {
            onProjectionRemoved?.(id);
            broadcastRemoveRef.current(id);
          }
        }

        toast.success(
          projectionIds.length === 1
            ? "Entity removed from board"
            : `${projectionIds.length} entities removed from board`
        );
      } catch (error) {
        console.error(
          "[BoardFlow] Failed to delete projections:",
          projectionIds,
          error
        );
        toast.error("Failed to remove entities from board");
      }
    },
    [onProjectionRemoved]
  );

  // ---- MiniMap node color ----

  const minimapNodeColor = useCallback((node: Node) => {
    const data = node.data as { projection?: BoardProjection } | undefined;
    const entityType = data?.projection?.entityType;
    if (!entityType) {
      return DEFAULT_MINIMAP_COLOR;
    }
    return ENTITY_MINIMAP_COLORS[entityType] ?? DEFAULT_MINIMAP_COLOR;
  }, []);

  // ---- External drag-and-drop handlers ----

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    // Only reset if we're leaving the container entirely
    const rect = containerRef.current?.getBoundingClientRect();
    if (rect) {
      const isOutside =
        e.clientX < rect.left ||
        e.clientX > rect.right ||
        e.clientY < rect.top ||
        e.clientY > rect.bottom;
      if (isOutside) {
        setIsDragOver(false);
      }
    }
  }, []);

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);

      // Prevent duplicate drops
      if (isDroppingRef.current) {
        return;
      }

      // Get the drag data
      const jsonData = e.dataTransfer.getData("application/json");
      if (!jsonData) {
        return;
      }

      let dragData: {
        entityType: EntityType;
        entityId: string;
        title: string;
      };
      try {
        dragData = JSON.parse(jsonData);
      } catch {
        console.error("[BoardFlow] Failed to parse drag data");
        return;
      }

      // Check if entity is already on board
      const key = `${dragData.entityType}:${dragData.entityId}`;
      if (entities.has(key)) {
        const label =
          ENTITY_TYPE_LABELS[dragData.entityType] ?? dragData.entityType;
        toast.info(`This ${label.toLowerCase()} is already on the board`);
        return;
      }

      isDroppingRef.current = true;

      try {
        // Convert screen position to flow position
        const flowPosition = screenToFlowPosition({
          x: e.clientX,
          y: e.clientY,
        });

        const result = await addProjection(boardId, {
          entityType: dragData.entityType,
          entityId: dragData.entityId,
          positionX: Math.round(flowPosition.x),
          positionY: Math.round(flowPosition.y),
        });

        if (result.success && result.projection) {
          onProjectionAdded?.(result.projection);
          const label =
            ENTITY_TYPE_LABELS[dragData.entityType] ?? dragData.entityType;
          toast.success(`${label} added to board`);
        } else {
          const errorMsg = result.error ?? "Failed to add entity";
          if (
            errorMsg.includes("already exists") ||
            errorMsg.includes("already on this board")
          ) {
            const label =
              ENTITY_TYPE_LABELS[dragData.entityType] ?? dragData.entityType;
            toast.info(`This ${label.toLowerCase()} is already on the board`);
          } else {
            toast.error(errorMsg);
          }
        }
      } catch (error) {
        console.error("[BoardFlow] Failed to add entity via drop:", error);
        toast.error("Failed to add entity to board");
      } finally {
        isDroppingRef.current = false;
      }
    },
    [boardId, entities, onProjectionAdded, screenToFlowPosition]
  );

  // ---- Empty state ----

  if (projections.length === 0 && previewState.previewAddNodes.length === 0) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="flex size-16 items-center justify-center rounded-2xl bg-muted">
            <LayoutGrid className="size-8 text-muted-foreground" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium text-foreground">
              No entities on this board yet
            </p>
            <p className="max-w-[300px] text-xs text-muted-foreground">
              Add events, clients, tasks, and more to get started.
            </p>
          </div>

          {/* Quick action buttons */}
          {onOpenEntityBrowser && (
            <div className="flex flex-wrap justify-center gap-2 pt-2">
              <Button
                className="gap-1.5"
                onClick={onOpenEntityBrowser}
                size="sm"
                variant="outline"
              >
                <Calendar className="size-4" />
                Events
              </Button>
              <Button
                className="gap-1.5"
                onClick={onOpenEntityBrowser}
                size="sm"
                variant="outline"
              >
                <Users className="size-4" />
                Clients
              </Button>
              <Button
                className="gap-1.5"
                onClick={onOpenEntityBrowser}
                size="sm"
                variant="outline"
              >
                <ClipboardList className="size-4" />
                Tasks
              </Button>
              <Button
                className="gap-1.5"
                onClick={onOpenEntityBrowser}
                size="sm"
                variant="default"
              >
                <FolderSearch className="size-4" />
                Browse All
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      aria-label="Command board canvas - drag entities here to add them"
      className={`h-full w-full ${isDragOver ? "ring-2 ring-primary/50 ring-inset bg-primary/5" : ""}`}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      ref={containerRef}
      role="application"
    >
      {/* Simulation Mode Indicator */}
      {boardMode === "simulation" && simulationDelta && (
        <div className="absolute left-4 top-4 z-10 rounded-lg border border-amber-500/50 bg-amber-50 px-3 py-2 shadow-md dark:bg-amber-950/50">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 animate-pulse rounded-full bg-amber-500" />
            <span className="text-xs font-medium text-amber-700 dark:text-amber-300">
              Simulation Mode
            </span>
          </div>
          {simulationDelta.summary.totalChanges > 0 && (
            <div className="mt-1 flex gap-3 text-xs text-amber-600 dark:text-amber-400">
              {simulationDelta.summary.additions > 0 && (
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-green-500" />+
                  {simulationDelta.summary.additions}
                </span>
              )}
              {simulationDelta.summary.removals > 0 && (
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-red-500" />-
                  {simulationDelta.summary.removals}
                </span>
              )}
              {simulationDelta.summary.modifications > 0 && (
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-amber-500" />~
                  {simulationDelta.summary.modifications}
                </span>
              )}
            </div>
          )}
        </div>
      )}
      <ReactFlow
        className="bg-background"
        deleteKeyCode={["Backspace", "Delete"]}
        edges={renderedEdges}
        edgeTypes={edgeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        maxZoom={2}
        minZoom={0.1}
        multiSelectionKeyCode="Shift"
        nodes={renderedNodes}
        nodeTypes={nodeTypes}
        onEdgesChange={handleEdgesChange}
        onNodesChange={handleNodesChange}
        onNodesDelete={handleDelete}
        panActivationKeyCode="Space"
        panOnDrag={[1, 2]}
        proOptions={{ hideAttribution: true }}
        selectionMode={SelectionMode.Partial}
        selectionOnDrag
        snapGrid={[20, 20]}
        snapToGrid
      >
        <Background
          color="var(--border)"
          gap={20}
          size={1}
          variant={BackgroundVariant.Dots}
        />
        <Controls />
        <MiniMap maskColor="rgba(0,0,0,0.1)" nodeColor={minimapNodeColor} />
      </ReactFlow>
    </div>
  );
}

// ============================================================================
// Exported Component (ReactFlowProvider is in BoardShell)
// ============================================================================

export function BoardFlow(props: BoardFlowProps) {
  return <BoardFlowInner {...props} />;
}
