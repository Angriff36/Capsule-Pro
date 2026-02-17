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

import { LayoutGrid } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { toast } from "sonner";
import {
  batchRemoveProjections,
  batchUpdatePositions,
  removeProjection,
  updateProjectionPosition,
} from "../actions/projections";
import { useBoardSync } from "../hooks/use-board-sync";
import { useLiveblocksSync } from "../hooks/use-liveblocks-sync";
import { nodeTypes } from "../nodes/node-types";
import { RELATIONSHIP_STYLES } from "../types/board";
import type { BoardEdge, ProjectionNode } from "../types/flow";
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

// ============================================================================
// Types
// ============================================================================

interface BoardFlowProps {
  boardId: string;
  projections: BoardProjection[];
  entities: Map<string, ResolvedEntity>;
  derivedConnections: DerivedConnection[];
  annotations: BoardAnnotation[];
  onOpenDetail: (entityType: string, entityId: string) => void;
  onProjectionAdded?: (projection: BoardProjection) => void;
  onProjectionRemoved?: (projectionId: string) => void;
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
  onOpenDetail,
  onProjectionAdded,
  onProjectionRemoved,
}: BoardFlowProps) {
  // Ref for the canvas wrapper — used by the edge-pan hook
  const containerRef = useRef<HTMLDivElement>(null);

  // RTS-style edge auto-pan
  useEdgePan(containerRef);

  // Track which nodes are currently being dragged to detect drag-end
  const draggingNodesRef = useRef<Set<string>>(new Set());

  // Refs for broadcast functions — allows callbacks defined before useBoardSync
  // to access broadcast without circular dependency issues
  const broadcastMoveRef = useRef<(id: string, x: number, y: number) => void>(
    () => {}
  );
  const broadcastRemoveRef = useRef<(id: string) => void>(() => {});

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

  // ---- Build initial nodes from projections + entities ----

  const initialNodes = useMemo(() => {
    return projections.map((projection) => {
      const key = `${projection.entityType}:${projection.entityId}`;
      const entity = entities.get(key) ?? null;
      return projectionToNode(projection, entity, {
        onOpenDetail,
        onRemove: handleRemoveProjection,
      });
    });
  }, [projections, entities, onOpenDetail, handleRemoveProjection]);

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
      onNodesChange(changes);

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
      onEdgesChange(changes);
    },
    [onEdgesChange]
  );

  // ---- Handle node deletion via keyboard ----

  const handleDelete = useCallback(
    async (deletedNodes: Node[]) => {
      if (deletedNodes.length === 0) {
        return;
      }

      const projectionIds = deletedNodes.map((n) => n.id);

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

  // ---- Empty state ----

  if (projections.length === 0) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="flex size-16 items-center justify-center rounded-2xl bg-muted">
            <LayoutGrid className="size-8 text-muted-foreground" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium text-foreground">
              No entities on this board yet
            </p>
            <p className="max-w-[300px] text-xs text-muted-foreground">
              Use the search to add events, clients, tasks, and more.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full" ref={containerRef}>
      <ReactFlow
        className="bg-background"
        deleteKeyCode={["Backspace", "Delete"]}
        edges={edges}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        maxZoom={2}
        minZoom={0.1}
        multiSelectionKeyCode="Shift"
        nodes={nodes}
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
          className="!bg-background"
          gap={20}
          size={1}
          variant={BackgroundVariant.Dots}
        />
        <Controls
          style={{
            backgroundColor: "hsl(var(--card))",
            border: "1px solid hsl(var(--border))",
            borderRadius: "6px",
          }}
        />
        <MiniMap
          maskColor="rgba(0,0,0,0.1)"
          nodeColor={minimapNodeColor}
          style={{
            backgroundColor: "hsl(var(--card))",
            border: "1px solid hsl(var(--border))",
            borderRadius: "6px",
          }}
        />
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
