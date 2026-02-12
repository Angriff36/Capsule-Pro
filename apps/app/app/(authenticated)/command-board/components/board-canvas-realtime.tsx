"use client";

import {
  LiveCursors,
  useBroadcastEvent,
  useCommandBoardPresence,
  useEventListener,
} from "@repo/collaboration";
import { Button } from "@repo/design-system/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@repo/design-system/components/ui/dialog";
import { Input } from "@repo/design-system/components/ui/input";
import { Label } from "@repo/design-system/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/design-system/components/ui/select";
import type { ReplayEvent } from "@repo/realtime";
import {
  type KeyboardEvent,
  type MouseEventHandler,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";
import { createCard, deleteCard, updateCard } from "../actions/cards";
import {
  deleteConnection,
  getConnectionsForBoard,
  updateConnection,
} from "../actions/connections";
import {
  deleteGroup,
  getGroupsForBoard,
  toggleGroupCollapsed,
  updateGroup,
} from "../actions/groups";
import { useAutoSave } from "../hooks/use-auto-save";
import { useConflictResolution } from "../hooks/use-conflict-resolution";
import { useReplayEvents } from "../hooks/use-replay-events";
import { useUndoRedo } from "../hooks/use-undo-redo";
import {
  ANCHOR_DEFAULTS,
  type AnchorPoint as AnchorPointType,
  type BoardState,
  type CardConnection,
  type CardStatus,
  CardType,
  type CommandBoardCard,
  type CommandBoardGroup,
  canvasToScreen,
  type DraggingConnection as DraggingConnectionType,
  INITIAL_BOARD_STATE,
  type Point,
  type RelationshipType,
  screenToCanvas,
  type ViewportPreferences,
  type ViewportState,
} from "../types";
import { CardAnchors } from "./anchor-point";
import { AutoSaveIndicator } from "./auto-save-indicator";
import { BoardCard } from "./board-card";
import { BulkEditDialog } from "./bulk-edit-dialog";
import { CanvasViewport } from "./canvas-viewport";
import { ConflictResolutionDialog } from "./conflict-resolution-dialog";
import { ConnectionDialog } from "./connection-dialog";
import { ConnectionLines } from "./connection-lines";
import { CreateGroupDialog } from "./create-group-dialog";
import { DraftRecoveryDialog } from "./draft-recovery-dialog";
import { GridLayer } from "./grid-layer";
import { GroupContainer } from "./group-container";
import { LayoutSwitcher } from "./layout-switcher";
import { ReplayIndicator } from "./replay-indicator";
import { SaveLayoutDialog } from "./save-layout-dialog";
import { TemporaryConnectionLine } from "./temporary-connection-line";
import { calculateFitToScreen } from "./viewport-controls";

const VIEWPORT_PREFERENCES_KEY = "command-board-viewport-preferences";

interface BoardCanvasProps {
  boardId: string;
  initialCards?: CommandBoardCard[];
  canEdit?: boolean;
  onCardsChange?: (cards: CommandBoardCard[]) => void;
  onViewportChange?: (viewport: ViewportState) => void;
  // Undo/Redo state and handlers (optional - if not provided, hook will be used internally)
  canUndo?: boolean;
  canRedo?: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
}

export function BoardCanvas({
  boardId,
  initialCards = [],
  canEdit = true,
  onCardsChange,
  onViewportChange,
  canUndo: externalCanUndo,
  canRedo: externalCanRedo,
  onUndo: externalOnUndo,
  onRedo: externalOnRedo,
}: BoardCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const [state, setState] = useState<BoardState>({
    ...INITIAL_BOARD_STATE,
    cards: initialCards,
  });

  // Determine if we should use internal undo/redo or external
  const useExternalUndoRedo = externalOnUndo && externalOnRedo;

  // Initialize undo/redo system only if not provided externally
  const internalUndoRedo = useUndoRedo({
    boardId,
    initialState: {
      ...INITIAL_BOARD_STATE,
      cards: initialCards,
    },
    onStateRestore: useCallback((partialState) => {
      setState((prev) => ({
        ...prev,
        ...partialState,
      }));
    }, []),
    onRedoExecute: useCallback(
      async (item: { command: string; description?: string }) => {
        // For redo, we need to re-execute the original action
        // This is handled by individual action handlers that track their state
        toast.info(`Redo: ${item.description ?? item.command}`);
      },
      []
    ),
    enableShortcuts: !useExternalUndoRedo, // Only use shortcuts if not external
  });

  // Use external or internal undo/redo
  const _canUndo = useExternalUndoRedo
    ? (externalCanUndo ?? false)
    : internalUndoRedo.canUndo;
  const _canRedo = useExternalUndoRedo
    ? (externalCanRedo ?? false)
    : internalUndoRedo.canRedo;
  const _undo = useExternalUndoRedo ? externalOnUndo! : internalUndoRedo.undo;
  const _redo = useExternalUndoRedo ? externalOnRedo! : internalUndoRedo.redo;
  const recordAction = useExternalUndoRedo
    ? () => {
        // No-op when using external undo/redo - the parent manages the stack
      }
    : internalUndoRedo.recordAction;

  const [gridSize, setGridSize] = useState(40);
  const [showGrid, setShowGrid] = useState(true);
  const [snapToGrid, setSnapToGrid] = useState(true);
  const [showConnections, setShowConnections] = useState(true);
  const [selectedCardType, setSelectedCardType] = useState<CardType>(
    CardType.generic
  );

  // Anchor points and connection drag state
  const [showAnchors, setShowAnchors] = useState(false);
  const [hoveredAnchorId, setHoveredAnchorId] = useState<string | null>(null);
  const [draggingConnection, setDraggingConnection] =
    useState<DraggingConnectionType | null>(null);
  const [cursorPosition, setCursorPosition] = useState<Point>({ x: 0, y: 0 });

  const [showSettings, setShowSettings] = useState(false);
  const [showEmptyState, setShowEmptyState] = useState(
    initialCards.length === 0
  );
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [connections, setConnections] = useState<CardConnection[]>([]);
  const [selectedConnectionId, setSelectedConnectionId] = useState<
    string | null
  >(null);

  // Connection context menu state
  const [contextMenuConnection, setContextMenuConnection] = useState<{
    connection: CardConnection;
    x: number;
    y: number;
  } | null>(null);

  // Drag selection state
  const [isDraggingSelection, setIsDraggingSelection] = useState(false);
  const [selectionStart, setSelectionStart] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [selectionEnd, setSelectionEnd] = useState<{
    x: number;
    y: number;
  } | null>(null);

  // Layout dialog state
  const [showSaveLayoutDialog, setShowSaveLayoutDialog] = useState(false);
  // Bulk edit dialog state
  const [showBulkEditDialog, setShowBulkEditDialog] = useState(false);
  // Create group dialog state
  const [showCreateGroupDialog, setShowCreateGroupDialog] = useState(false);
  // Connection dialog state
  const [showConnectionDialog, setShowConnectionDialog] = useState(false);
  const [connectionSourceCardId, setConnectionSourceCardId] = useState<
    string | null
  >(null);
  const [connectionTargetCardId, setConnectionTargetCardId] = useState<
    string | null
  >(null);
  const [editingConnectionFromContext, setEditingConnectionFromContext] =
    useState<CardConnection | null>(null);
  const [showEditConnectionDialog, setShowEditConnectionDialog] =
    useState(false);
  const [editRelationshipType, setEditRelationshipType] =
    useState<RelationshipType>("generic");
  const [editLabel, setEditLabel] = useState<string>("");
  const [editVisible, setEditVisible] = useState<boolean>(true);
  const [isUpdatingEditDialog, setIsUpdatingEditDialog] = useState(false);
  const [errorEditDialog, setErrorEditDialog] = useState<string | null>(null);

  // Groups state
  const [groups, setGroups] = useState<CommandBoardGroup[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);

  // Auto-save state
  const [showDraftRecovery, setShowDraftRecovery] = useState(false);
  const [pendingDraft, setPendingDraft] = useState<{
    cards: typeof state.cards;
    connections: typeof connections;
    groups: typeof groups;
    viewport: typeof state.viewport;
    timestamp: Date;
  } | null>(null);

  // Conflict resolution state
  const [selectedConflict, setSelectedConflict] = useState<
    import("../lib/conflict-resolver").ConflictDetails | null
  >(null);
  const [showConflictDialog, setShowConflictDialog] = useState(false);

  // Initialize auto-save hook
  const autoSave = useAutoSave(boardId, state, {
    debounceMs: 2000,
    intervalMs: 30_000,
  });

  // Initialize conflict resolution hook
  const conflictResolution = useConflictResolution({
    boardId,
    onConflictResolved: useCallback(
      (_conflictId: string, resolvedCard: CommandBoardCard) => {
        // Update local state with resolved card
        setState((prev) => ({
          ...prev,
          cards: prev.cards.map((card) =>
            card.id === resolvedCard.id ? resolvedCard : card
          ),
        }));
        // Clear selected conflict
        setShowConflictDialog(false);
        setSelectedConflict(null);
      },
      []
    ),
    onConflictDetected: useCallback(
      (conflict: import("../lib/conflict-resolver").ConflictDetails) => {
        // Show dialog when conflict is detected
        setSelectedConflict(conflict);
        setShowConflictDialog(true);
      },
      []
    ),
    autoResolve: true,
    showToasts: true,
  });

  // Initialize replay hook - fetches and replays historical events on mount
  const replay = useReplayEvents({
    boardId,
    enabled: true,
    maxEvents: 100,
    onApplyEvents: useCallback((events: ReplayEvent[]) => {
      // Apply batch of replay events to state
      setState((prev) => {
        let updatedCards = [...prev.cards];

        for (const event of events) {
          const payload = event.payload as Record<string, unknown>;

          switch (event.eventType) {
            case "command.board.card.created": {
              // Check if card already exists (might be from initial load)
              const exists = updatedCards.some((c) => c.id === payload.cardId);
              if (!exists) {
                updatedCards.push({
                  id: payload.cardId as string,
                  tenantId: (payload.tenantId as string) ?? "",
                  boardId: (payload.boardId as string) ?? boardId,
                  title: (payload.title as string) ?? "Untitled",
                  content: (payload.content as string) ?? null,
                  cardType: (payload.cardType as CardType) ?? CardType.generic,
                  status: (payload.status as CardStatus) ?? "active",
                  position: {
                    x: (payload.positionX as number) ?? 0,
                    y: (payload.positionY as number) ?? 0,
                    width: (payload.width as number) ?? 200,
                    height: (payload.height as number) ?? 150,
                    zIndex: (payload.zIndex as number) ?? 0,
                  },
                  color: (payload.color as string) ?? null,
                  metadata: (payload.metadata as Record<string, unknown>) ?? {},
                  createdAt: (payload.createdAt as Date) ?? new Date(),
                  updatedAt: (payload.updatedAt as Date) ?? new Date(),
                  deletedAt: (payload.deletedAt as Date | null) ?? null,
                });
              }
              break;
            }

            case "command.board.card.moved": {
              const positionPayload = payload.newPosition as {
                x: number;
                y: number;
              };
              updatedCards = updatedCards.map((c) =>
                c.id === payload.cardId
                  ? {
                      ...c,
                      position: {
                        ...c.position,
                        x: positionPayload.x,
                        y: positionPayload.y,
                      },
                    }
                  : c
              );
              break;
            }

            case "command.board.card.deleted": {
              updatedCards = updatedCards.filter(
                (c) => c.id !== payload.cardId
              );
              break;
            }

            case "command.board.card.updated": {
              const changes = payload.changes as Record<string, unknown>;
              updatedCards = updatedCards.map((c) =>
                c.id === payload.cardId ? { ...c, ...changes } : c
              );
              break;
            }

            // Connection events
            case "command.board.connection.created": {
              const newConnection: CardConnection = {
                id: payload.connectionId as string,
                fromCardId: payload.fromCardId as string,
                toCardId: payload.toCardId as string,
                relationshipType:
                  (payload.relationshipType as RelationshipType) ?? "generic",
                visible: true,
              };
              setConnections((prev) => {
                const exists = prev.some((c) => c.id === newConnection.id);
                return exists ? prev : [...prev, newConnection];
              });
              break;
            }

            case "command.board.connection.deleted": {
              setConnections((prev) =>
                prev.filter((c) => c.id !== payload.connectionId)
              );
              break;
            }

            default:
              break;
          }
        }

        return { ...prev, cards: updatedCards };
      });
    }, []),
    onReplayComplete: useCallback(() => {
      // Replay is done, enable live editing
      toast.info("Board activity loaded");
    }, []),
  });

  const { updateCursor, updateSelectedCard, clearPresence } =
    useCommandBoardPresence();
  const broadcast = useBroadcastEvent();

  // Filter cards that should be visible (exclude cards in collapsed groups)
  const visibleCards = useMemo(() => {
    const collapsedGroupCardIds = new Set(
      groups.filter((g) => g.collapsed).flatMap((g) => g.cardIds)
    );
    return state.cards.filter((c) => !collapsedGroupCardIds.has(c.id));
  }, [state.cards, groups]);

  useEffect(() => {
    const autoGenerateConnections = () => {
      const _cardById = new Map(state.cards.map((card) => [card.id, card]));
      const newConnections: CardConnection[] = [];

      for (const card of state.cards) {
        const entityId = card.metadata.entityId;
        if (!entityId) {
          continue;
        }

        if (card.cardType === "client") {
          const relatedEvents = state.cards.filter(
            (c) =>
              c.cardType === "event" &&
              c.metadata.eventId === entityId &&
              c.id !== card.id
          );
          for (const eventCard of relatedEvents) {
            const connectionId = `${card.id}-${eventCard.id}-client_to_event`;
            const existingConnection = connections.find(
              (conn) => conn.id === connectionId
            );
            if (!existingConnection) {
              newConnections.push({
                id: connectionId,
                fromCardId: card.id,
                toCardId: eventCard.id,
                relationshipType: "client_to_event",
                visible: true,
              });
            }
          }
        }

        if (card.cardType === "event") {
          const eventCardId = entityId;
          const relatedTasks = state.cards.filter(
            (c) =>
              c.cardType === "task" &&
              c.metadata.eventId === eventCardId &&
              c.id !== card.id
          );
          for (const taskCard of relatedTasks) {
            const connectionId = `${card.id}-${taskCard.id}-event_to_task`;
            const existingConnection = connections.find(
              (conn) => conn.id === connectionId
            );
            if (!existingConnection) {
              newConnections.push({
                id: connectionId,
                fromCardId: card.id,
                toCardId: taskCard.id,
                relationshipType: "event_to_task",
                visible: true,
              });
            }
          }

          const relatedInventory = state.cards.filter(
            (c) =>
              c.cardType === "inventory" &&
              c.metadata.eventId === eventCardId &&
              c.id !== card.id
          );
          for (const invCard of relatedInventory) {
            const connectionId = `${card.id}-${invCard.id}-event_to_inventory`;
            const existingConnection = connections.find(
              (conn) => conn.id === connectionId
            );
            if (!existingConnection) {
              newConnections.push({
                id: connectionId,
                fromCardId: card.id,
                toCardId: invCard.id,
                relationshipType: "event_to_inventory",
                visible: true,
              });
            }
          }
        }

        if (card.cardType === "task") {
          const assignee = card.metadata.assignee;
          const assigneeId =
            assignee && typeof assignee === "object" && "id" in assignee
              ? assignee.id
              : null;
          if (assigneeId) {
            const assignedEmployee = state.cards.find(
              (c) =>
                c.cardType === "employee" &&
                c.metadata.entityId === assigneeId &&
                c.id !== card.id
            );
            if (assignedEmployee) {
              const connectionId = `${card.id}-${assignedEmployee.id}-task_to_employee`;
              const existingConnection = connections.find(
                (conn) => conn.id === connectionId
              );
              if (!existingConnection) {
                newConnections.push({
                  id: connectionId,
                  fromCardId: card.id,
                  toCardId: assignedEmployee.id,
                  relationshipType: "task_to_employee",
                  visible: true,
                });
              }
            }
          }
        }
      }

      if (newConnections.length > 0) {
        setConnections((prev) => [...prev, ...newConnections]);
      }
    };

    autoGenerateConnections();
  }, [state.cards, connections]);

  useEffect(() => {
    setShowEmptyState(state.cards.length === 0);
  }, [state.cards.length]);

  useEffect(() => {
    const saved = localStorage.getItem(VIEWPORT_PREFERENCES_KEY);
    if (saved) {
      try {
        const prefs = JSON.parse(saved) as ViewportPreferences;
        setGridSize(prefs.gridSize ?? 40);
        setShowGrid(prefs.showGrid ?? true);
        setSnapToGrid(prefs.gridSnapEnabled ?? true);
        setShowConnections(prefs.showConnections ?? true);
        setState((prev) => ({
          ...prev,
          viewport: {
            zoom: prefs.zoom ?? INITIAL_BOARD_STATE.viewport.zoom,
            panX: prefs.panX ?? 0,
            panY: prefs.panY ?? 0,
          },
        }));
      } catch {
        // Ignore invalid saved preferences
      }
    }
  }, []);

  useEffect(() => {
    const prefs: ViewportPreferences = {
      gridSize,
      showGrid,
      gridSnapEnabled: snapToGrid,
      zoom: state.viewport.zoom,
      panX: state.viewport.panX,
      panY: state.viewport.panY,
      showConnections,
    };
    localStorage.setItem(VIEWPORT_PREFERENCES_KEY, JSON.stringify(prefs));
  }, [gridSize, showGrid, snapToGrid, state.viewport, showConnections]);

  useEffect(() => {
    onCardsChange?.(state.cards);
  }, [state.cards, onCardsChange]);

  useEffect(() => {
    onViewportChange?.(state.viewport);
  }, [state.viewport, onViewportChange]);

  // Track fullscreen state changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  // Fullscreen toggle function
  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) {
      return;
    }

    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      containerRef.current.requestFullscreen();
    }
  }, []);

  // =============================================================================
  // Anchor Points & Connection Drag Handlers
  // =============================================================================

  /**
   * Check if a connection between two cards already exists
   */
  const connectionExists = useCallback(
    (fromCardId: string, toCardId: string): boolean => {
      return connections.some(
        (c) =>
          (c.fromCardId === fromCardId && c.toCardId === toCardId) ||
          (c.fromCardId === toCardId && c.toCardId === fromCardId)
      );
    },
    [connections]
  );

  /**
   * Handle mouse down on an anchor point to start connection drag
   */
  const handleAnchorMouseDown = useCallback(
    (anchor: AnchorPointType, position: { x: number; y: number }) => {
      if (!canEdit) {
        return;
      }

      // Convert screen position to canvas coordinates
      const canvasPosition = screenToCanvas(position, state.viewport);

      // Start dragging connection from this anchor
      setDraggingConnection({
        fromAnchorId: anchor.id,
        fromCardId: anchor.cardId,
        currentPoint: canvasPosition,
        fromPosition: canvasPosition,
      });

      // Show anchors if not already visible
      if (!showAnchors) {
        setShowAnchors(true);
      }

      // Set this anchor as hovered
      setHoveredAnchorId(anchor.id);
    },
    [canEdit, state.viewport, showAnchors]
  );

  /**
   * Handle mouse enter on an anchor point
   */
  const handleAnchorMouseEnter = useCallback((anchor: AnchorPointType) => {
    setHoveredAnchorId(anchor.id);
  }, []);

  /**
   * Handle mouse leave from an anchor point
   */
  const handleAnchorMouseLeave = useCallback(() => {
    setHoveredAnchorId(null);
  }, []);

  /**
   * Handle mouse move during connection drag
   */
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) {
        return;
      }

      const rect = containerRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      // Update cursor position for temporary connection line
      if (draggingConnection) {
        const canvasPoint = screenToCanvas({ x, y }, state.viewport);
        setDraggingConnection((prev) =>
          prev ? { ...prev, currentPoint: canvasPoint } : null
        );
      }

      updateCursor({ x, y });
    };

    window.addEventListener("mousemove", handleMouseMove);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, [draggingConnection, state.viewport, updateCursor]);

  /**
   * Handle mouse up to complete connection drag
   */
  const handleCanvasMouseUp = useCallback(() => {
    if (draggingConnection) {
      // Check if we dropped on another card/anchor
      const { fromCardId, currentPoint } = draggingConnection;

      // Find the card under cursor
      for (const card of state.cards) {
        const cardBox = {
          x: card.position.x,
          y: card.position.y,
          width: card.position.width,
          height: card.position.height,
        };

        // Check if cursor is within card bounds (with some padding for easier targeting)
        const hitRadius = ANCHOR_DEFAULTS.HIT_RADIUS;
        if (
          currentPoint.x >= cardBox.x - hitRadius &&
          currentPoint.x <= cardBox.x + cardBox.width + hitRadius &&
          currentPoint.y >= cardBox.y - hitRadius &&
          currentPoint.y <= cardBox.y + cardBox.height + hitRadius
        ) {
          // Found a target card
          if (card.id !== fromCardId) {
            // Check if connection already exists
            if (connectionExists(fromCardId, card.id)) {
              toast.error(
                "Connection already exists - A connection between these cards already exists."
              );
            } else {
              // Show connection dialog to confirm relationship
              setConnectionSourceCardId(fromCardId);
              setConnectionTargetCardId(card.id);
              setShowConnectionDialog(true);
            }
          }
          break;
        }
      }

      // Clear dragging state
      setDraggingConnection(null);
      setHoveredAnchorId(null);
    }
  }, [draggingConnection, state.cards, connectionExists]);

  // Cancel connection drag on Escape key
  useEffect(() => {
    const handleKeyDown = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape" && draggingConnection) {
        setDraggingConnection(null);
        setHoveredAnchorId(null);
        toast.info("Connection cancelled");
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [draggingConnection]);

  // Check if current drag target is valid (different card, no existing connection)
  const isValidConnectionTarget = useMemo(() => {
    if (!draggingConnection) {
      return false;
    }

    const { fromCardId, currentPoint } = draggingConnection;

    // Find if cursor is over any card
    for (const card of state.cards) {
      if (card.id === fromCardId) {
        continue; // Skip source card
      }

      const cardBox = {
        x: card.position.x,
        y: card.position.y,
        width: card.position.width,
        height: card.position.height,
      };

      const hitRadius = ANCHOR_DEFAULTS.HIT_RADIUS;
      if (
        currentPoint.x >= cardBox.x - hitRadius &&
        currentPoint.x <= cardBox.x + cardBox.width + hitRadius &&
        currentPoint.y >= cardBox.y - hitRadius &&
        currentPoint.y <= cardBox.y + cardBox.height + hitRadius
      ) {
        // Check if connection already exists
        return !connectionExists(fromCardId, card.id);
      }
    }

    return false;
  }, [draggingConnection, state.cards, connectionExists]);

  // =============================================================================
  // End Anchor Points & Connection Drag Handlers
  // =============================================================================

  useEventListener((event) => {
    const eventData = event.event;
    if (!eventData) {
      return;
    }

    switch (eventData.type) {
      case "CARD_DELETED": {
        setState((prev) => ({
          ...prev,
          cards: prev.cards.filter((c) => c.id !== eventData.cardId),
        }));
        break;
      }
      case "CARD_MOVED": {
        const currentCard = state.cards.find((c) => c.id === eventData.cardId);
        if (currentCard) {
          setState((prev) => ({
            ...prev,
            cards: prev.cards.map((card) =>
              card.id === eventData.cardId
                ? {
                    ...card,
                    position: {
                      ...card.position,
                      x: eventData.x,
                      y: eventData.y,
                    },
                  }
                : card
            ),
          }));
        }
        break;
      }
      case "CARD_UPDATED": {
        // Note: The current collaboration event type only includes cardId
        // Additional properties like cardData, vectorClock, timestamp, userId
        // would need to be added to the event type if needed
        const currentCard = state.cards.find((c) => c.id === eventData.cardId);
        if (currentCard) {
          // For now, just log the update - full conflict resolution
          // would require extending the event type
          console.log("Card updated via collaboration:", eventData.cardId);
        }
        break;
      }
      default: {
        break;
      }
    }
  });

  const handleViewportChange = useCallback((viewport: ViewportState) => {
    setState((prev) => ({ ...prev, viewport }));
  }, []);

  const handleAddCard = useCallback(async () => {
    // Record action before execution
    recordAction("createCard", state, `Create ${selectedCardType} card`);

    const result = await createCard(boardId, {
      title: `New ${selectedCardType.charAt(0).toUpperCase() + selectedCardType.slice(1)}`,
      cardType: selectedCardType,
      position: {
        x: 100 + state.cards.length * 20,
        y: 100 + state.cards.length * 20,
        width: 280,
        height: 180,
        zIndex: state.cards.length + 1,
      },
    });

    if (result.success && result.card) {
      const newCard = result.card;
      setState((prev) => ({
        ...prev,
        cards: [...prev.cards, newCard],
        selectedCardIds: [newCard.id],
      }));
      setShowEmptyState(false);
      console.log("Card added successfully");
      broadcast({ type: "CARD_ADDED", cardId: newCard.id });
    } else {
      console.log(result.error ?? "Failed to add card");
    }
  }, [
    boardId,
    selectedCardType,
    state.cards.length,
    broadcast,
    recordAction,
    state,
  ]);

  const handleCardClick = useCallback(
    (e: React.MouseEvent, cardId: string) => {
      if (!canEdit) {
        return;
      }

      const isShiftHeld = e.shiftKey;
      updateSelectedCard(cardId);
      setSelectedConnectionId(null);
      setState((prev) => {
        const isAlreadySelected = prev.selectedCardIds.includes(cardId);

        if (isShiftHeld) {
          // Shift+click: toggle selection
          return {
            ...prev,
            selectedCardIds: isAlreadySelected
              ? prev.selectedCardIds.filter((id) => id !== cardId)
              : [...prev.selectedCardIds, cardId],
            selectedConnectionId: null,
          };
        }

        // Normal click: replace selection with this card only
        return {
          ...prev,
          selectedCardIds: [cardId],
          selectedConnectionId: null,
        };
      });
    },
    [canEdit, updateSelectedCard]
  );

  // Unified position/size change handler using react-moveable (single interaction engine)
  const handleCardPositionChange = useCallback(
    async (cardId: string, position: Point) => {
      if (!canEdit) {
        return;
      }

      // Record action before execution
      recordAction("updateCard", state, `Move card ${cardId}`);

      // Get current card state before the change
      const currentCard = state.cards.find((c) => c.id === cardId);
      if (!currentCard) {
        return;
      }

      // Register pending change for conflict detection
      conflictResolution.registerPendingChange(cardId, currentCard, "position");

      // Optimistic update
      setState((prev) => ({
        ...prev,
        cards: prev.cards.map((card) =>
          card.id === cardId
            ? { ...card, position: { ...card.position, ...position } }
            : card
        ),
      }));

      // Persist to backend
      const result = await updateCard({
        id: cardId,
        position,
      });

      if (result.success) {
        // Mark change as synced - no conflict occurred
        conflictResolution.markAsSynced(cardId);

        broadcast({
          type: "CARD_MOVED",
          cardId,
          x: position.x,
          y: position.y,
        });
      } else {
        // Check if error is a conflict (409 status)
        if (
          result.error?.includes("409") ||
          result.error?.toLowerCase().includes("conflict")
        ) {
          toast.error("Conflict detected: Another user modified this card");
          // Keep pending change registered so conflict dialog can be shown
        } else {
          console.log(result.error ?? "Failed to save card position");
          // Clear pending change on other errors
          conflictResolution.markAsSynced(cardId);
        }
      }
    },
    [canEdit, broadcast, recordAction, state, conflictResolution]
  );

  const handleCardSizeChange = useCallback(
    async (cardId: string, width: number, height: number) => {
      if (!canEdit) {
        return;
      }

      // Record action before execution
      recordAction("updateCard", state, `Resize card ${cardId}`);

      // Get current card state before the change
      const currentCard = state.cards.find((c) => c.id === cardId);
      if (!currentCard) {
        return;
      }

      // Register pending change for conflict detection
      conflictResolution.registerPendingChange(cardId, currentCard, "position");

      // Optimistic update
      setState((prev) => ({
        ...prev,
        cards: prev.cards.map((card) =>
          card.id === cardId
            ? { ...card, position: { ...card.position, width, height } }
            : card
        ),
      }));

      // Persist to backend
      const result = await updateCard({
        id: cardId,
        position: { width, height },
      });

      if (result.success) {
        // Mark change as synced - no conflict occurred
        conflictResolution.markAsSynced(cardId);
      } else {
        // Check if error is a conflict (409 status)
        if (
          result.error?.includes("409") ||
          result.error?.toLowerCase().includes("conflict")
        ) {
          toast.error("Conflict detected: Another user modified this card");
        } else {
          console.log(result.error ?? "Failed to save card size");
          conflictResolution.markAsSynced(cardId);
        }
      }
    },
    [canEdit, recordAction, state, conflictResolution]
  );

  const handleDeleteCard = useCallback(
    async (cardId: string) => {
      if (!canEdit) {
        return;
      }

      // Record action before execution
      recordAction("deleteCard", state, `Delete card ${cardId}`);

      const result = await deleteCard(cardId);

      if (result.success) {
        setState((prev) => ({
          ...prev,
          cards: prev.cards.filter((c) => c.id !== cardId),
          selectedCardIds: prev.selectedCardIds.filter((id) => id !== cardId),
        }));
        console.log("Card deleted successfully");
        broadcast({ type: "CARD_DELETED", cardId });
      } else {
        console.log(result.error ?? "Failed to delete card");
      }
    },
    [canEdit, broadcast, recordAction, state]
  );

  const _handleFitToScreen = useCallback(() => {
    if (state.cards.length === 0 || !containerRef.current) {
      return;
    }

    const bounds = state.cards.map((card) => ({
      x: card.position.x,
      y: card.position.y,
      width: card.position.width,
      height: card.position.height,
    }));

    const { width, height } = containerRef.current.getBoundingClientRect();
    const newViewport = calculateFitToScreen({
      bounds,
      containerWidth: width,
      containerHeight: height,
      padding: 40,
    });

    setState((prev) => ({
      ...prev,
      viewport: newViewport,
    }));
  }, [state.cards]);

  const handleConnectionClick = useCallback(
    (connectionId: string) => {
      if (!canEdit) {
        return;
      }
      setSelectedConnectionId(connectionId);
      updateSelectedCard(null);
      setState((prev) => ({
        ...prev,
        selectedCardIds: [],
        selectedConnectionId: connectionId,
      }));
    },
    [canEdit, updateSelectedCard]
  );

  const handleConnectionContextMenu = useCallback(
    (connectionId: string, x: number, y: number) => {
      if (!canEdit) {
        return;
      }
      const connection = connections.find((c) => c.id === connectionId);
      if (connection) {
        setContextMenuConnection({ connection, x, y });
        setSelectedConnectionId(connectionId);
      }
    },
    [canEdit, connections]
  );

  const handleContextMenuEdit = useCallback(() => {
    if (contextMenuConnection?.connection) {
      const connection = contextMenuConnection.connection;
      setEditingConnectionFromContext(connection);
      setEditRelationshipType(connection.relationshipType);
      setEditLabel(connection.label ?? "");
      setEditVisible(connection.visible);
      setErrorEditDialog(null);
      setShowEditConnectionDialog(true);
      setContextMenuConnection(null);
    }
  }, [contextMenuConnection]);

  const handleContextMenuDelete = useCallback(async () => {
    if (contextMenuConnection?.connection) {
      // Record action before execution
      recordAction(
        "deleteConnection",
        state,
        `Delete connection ${contextMenuConnection.connection.id}`
      );

      const result = await deleteConnection(
        contextMenuConnection.connection.id
      );
      if (result.success) {
        setConnections((prev) =>
          prev.filter((c) => c.id !== contextMenuConnection?.connection.id)
        );
        toast.success("Connection deleted");
      } else {
        toast.error(result.error || "Failed to delete connection");
      }
      setContextMenuConnection(null);
    }
  }, [contextMenuConnection, recordAction, state]);

  const handleEditConnectionUpdate = useCallback(async () => {
    if (!editingConnectionFromContext) {
      return;
    }
    setIsUpdatingEditDialog(true);
    setErrorEditDialog(null);

    // Record action before execution
    recordAction(
      "updateConnection",
      state,
      `Update connection ${editingConnectionFromContext.id}`
    );

    const result = await updateConnection({
      id: editingConnectionFromContext.id,
      relationshipType: editRelationshipType,
      label: editLabel || undefined,
      visible: editVisible,
    });

    if (result.success) {
      setConnections((prev) =>
        prev.map((c) =>
          c.id === editingConnectionFromContext.id
            ? {
                ...c,
                relationshipType: editRelationshipType,
                label: editLabel,
                visible: editVisible,
              }
            : c
        )
      );
      setShowEditConnectionDialog(false);
      setEditingConnectionFromContext(null);
      toast.success("Connection updated");
    } else {
      setErrorEditDialog(result.error || "Failed to update connection");
    }

    setIsUpdatingEditDialog(false);
  }, [
    editingConnectionFromContext,
    editRelationshipType,
    editLabel,
    editVisible,
    recordAction,
    state,
  ]);

  // Close context menu on click outside or Escape
  useEffect(() => {
    const handleClick = () => setContextMenuConnection(null);
    const handleEscape = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") {
        setContextMenuConnection(null);
      }
    };
    document.addEventListener("click", handleClick);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("click", handleClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  // Helper to check if a card intersects with the selection rectangle
  const cardIntersectsSelection = useCallback(
    (card: CommandBoardCard, selStart: Point, selEnd: Point): boolean => {
      // Normalize selection rectangle (handle negative width/height)
      const minX = Math.min(selStart.x, selEnd.x);
      const maxX = Math.max(selStart.x, selEnd.x);
      const minY = Math.min(selStart.y, selEnd.y);
      const maxY = Math.max(selStart.y, selEnd.y);

      // Card bounds
      const cardLeft = card.position.x;
      const cardRight = card.position.x + card.position.width;
      const cardTop = card.position.y;
      const cardBottom = card.position.y + card.position.height;

      // Check intersection
      return !(
        cardRight < minX ||
        cardLeft > maxX ||
        cardBottom < minY ||
        cardTop > maxY
      );
    },
    []
  );

  // Handle mouse down on canvas background to start selection
  const handleCanvasMouseDown: MouseEventHandler<HTMLDivElement> = useCallback(
    (e) => {
      if (!canEdit || e.button !== 0) {
        return; // Only left click
      }

      // If we're in connection drag mode, don't start selection
      if (draggingConnection) {
        return;
      }

      // Check if clicking on a card (target should be canvas or grid)
      const target = e.target as HTMLElement;
      if (target.closest("[data-card-id]")) {
        return; // Clicked on a card, let card handle it
      }

      // Check if clicking on an anchor
      if (target.closest("[data-anchor-id]")) {
        return; // Let anchor handler take care of it
      }

      // Start selection drag
      const canvasRect = (
        e.currentTarget as HTMLElement
      ).getBoundingClientRect();
      const x = (e.clientX - canvasRect.left) / state.viewport.zoom;
      const y = (e.clientY - canvasRect.top) / state.viewport.zoom;

      setSelectionStart({ x, y });
      setSelectionEnd({ x, y });
      setIsDraggingSelection(true);

      // Clear selection when starting new drag (unless Shift is held)
      if (!e.shiftKey) {
        setState((prev) => ({
          ...prev,
          selectedCardIds: [],
        }));
      }
    },
    [canEdit, state.viewport.zoom, draggingConnection]
  );

  // Handle mouse move during selection drag
  const handleCanvasMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!(isDraggingSelection && selectionStart)) {
        return;
      }

      const canvasRect = (
        e.currentTarget as HTMLElement
      ).getBoundingClientRect();
      const x = (e.clientX - canvasRect.left) / state.viewport.zoom;
      const y = (e.clientY - canvasRect.top) / state.viewport.zoom;

      setSelectionEnd({ x, y });

      // Calculate which cards are in selection
      const cardsInSelection = state.cards.filter((card) =>
        cardIntersectsSelection(card, selectionStart, { x, y })
      );

      // Update selection (additive if Shift is held)
      setState((prev) => {
        const newSelection = e.shiftKey
          ? [
              ...new Set([
                ...prev.selectedCardIds,
                ...cardsInSelection.map((c) => c.id),
              ]),
            ]
          : cardsInSelection.map((c) => c.id);

        return {
          ...prev,
          selectedCardIds: newSelection,
        };
      });
    },
    [
      isDraggingSelection,
      selectionStart,
      state.viewport.zoom,
      state.cards,
      cardIntersectsSelection,
    ]
  );

  // Handle mouse up to end selection
  const handleCanvasSelectionMouseUp = useCallback(() => {
    setIsDraggingSelection(false);
    setSelectionStart(null);
    setSelectionEnd(null);
  }, []);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!canEdit) {
        return;
      }

      // Skip undo/redo shortcuts - handled by useUndoRedo hook
      const isCtrl = e.ctrlKey || e.metaKey;
      if (isCtrl && (e.key === "z" || e.key === "y")) {
        return; // Let the hook handle it
      }

      if (e.key === "Escape") {
        updateSelectedCard(null);
        // Cancel selection drag
        setIsDraggingSelection(false);
        setSelectionStart(null);
        setSelectionEnd(null);
        // Cancel connection drag
        if (draggingConnection) {
          setDraggingConnection(null);
          setHoveredAnchorId(null);
        }
        setState((prev) => ({
          ...prev,
          selectedCardIds: [],
          selectedConnectionId: null,
        }));
      }

      if (
        (e.key === "Delete" || e.key === "Backspace") &&
        state.selectedCardIds.length > 0
      ) {
        state.selectedCardIds.forEach((id) => handleDeleteCard(id));
      }

      if (e.key === "a" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setState((prev) => ({
          ...prev,
          selectedCardIds: prev.cards.map((c) => c.id),
        }));
      }

      // Ctrl+E / Cmd+E to open bulk edit dialog
      if (
        e.key === "e" &&
        (e.metaKey || e.ctrlKey) &&
        state.selectedCardIds.length >= 2
      ) {
        e.preventDefault();
        setShowBulkEditDialog(true);
      }

      // F key to toggle fullscreen (when not in an input)
      if (e.key === "f" && !e.metaKey && !e.ctrlKey) {
        const target = e.target as HTMLElement;
        if (target.tagName !== "INPUT" && target.tagName !== "TEXTAREA") {
          e.preventDefault();
          toggleFullscreen();
        }
      }

      const selectedCard =
        state.selectedCardIds.length === 1
          ? state.cards.find((c) => c.id === state.selectedCardIds[0])
          : null;

      if (selectedCard && !e.metaKey && !e.ctrlKey) {
        const nudgedX =
          e.key === "ArrowLeft"
            ? -gridSize
            : e.key === "ArrowRight"
              ? gridSize
              : e.key === "ArrowUp"
                ? -gridSize
                : e.key === "ArrowDown"
                  ? gridSize
                  : 0;

        const nudgedY =
          e.key === "ArrowLeft"
            ? 0
            : e.key === "ArrowRight"
              ? 0
              : e.key === "ArrowUp"
                ? -gridSize
                : e.key === "ArrowDown"
                  ? gridSize
                  : 0;

        if (nudgedX !== 0 || nudgedY !== 0) {
          e.preventDefault();

          const updatedCards = state.cards.map((card) =>
            card.id === selectedCard.id
              ? {
                  ...card,
                  position: {
                    ...card.position,
                    x: card.position.x + nudgedX,
                    y: card.position.y + nudgedY,
                  },
                }
              : card
          );

          setState((prev) => ({
            ...prev,
            cards: updatedCards,
          }));

          // Persist nudged position
          void handleCardPositionChange(selectedCard.id, {
            x: selectedCard.position.x + nudgedX,
            y: selectedCard.position.y + nudgedY,
          });
        }
      }
    },
    [
      canEdit,
      state.selectedCardIds,
      state.cards,
      handleDeleteCard,
      gridSize,
      updateSelectedCard,
      handleCardPositionChange,
      toggleFullscreen,
      draggingConnection,
    ]
  );

  useEffect(
    () => () => {
      clearPresence();
    },
    [clearPresence]
  );

  // Fetch groups for this board
  useEffect(() => {
    const fetchGroups = async () => {
      const result = await getGroupsForBoard(boardId);
      if (result.success && result.groups) {
        setGroups(result.groups);
      }
    };
    fetchGroups().catch((error) => {
      console.log("Failed to fetch groups:", error);
    });
  }, [boardId]);

  // Fetch connections for this board from database
  useEffect(() => {
    const fetchConnections = async () => {
      const result = await getConnectionsForBoard(boardId);
      if (result.success && result.connections) {
        // Merge database connections with existing auto-generated connections
        // Database connections take precedence (update or replace auto-generated)
        const dbConnectionIds = new Set(result.connections.map((c) => c.id));
        const autoGenConnections = connections.filter(
          (c) => !dbConnectionIds.has(c.id)
        );
        setConnections([...result.connections, ...autoGenConnections]);
      }
    };
    fetchConnections().catch((error) => {
      console.log("Failed to fetch connections:", error);
    });
    // Only run on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boardId, connections]);

  // Group handlers
  const handleGroupPositionChange = useCallback(
    (groupId: string, position: Point) => {
      // Find the current group to calculate delta
      const currentGroup = groups.find((g) => g.id === groupId);
      if (!currentGroup) {
        return;
      }

      // Record action before execution
      recordAction("updateGroup", state, `Move group ${groupId}`);

      const deltaX =
        (position.x ?? currentGroup.position.x) - currentGroup.position.x;
      const deltaY =
        (position.y ?? currentGroup.position.y) - currentGroup.position.y;

      // Update group position
      setGroups((prev) =>
        prev.map((g) =>
          g.id === groupId
            ? { ...g, position: { ...g.position, ...position } }
            : g
        )
      );

      // Move all cards in the group by the same delta
      if (deltaX !== 0 || deltaY !== 0) {
        setState((prev) => ({
          ...prev,
          cards: prev.cards.map((card) =>
            currentGroup.cardIds.includes(card.id)
              ? {
                  ...card,
                  position: {
                    ...card.position,
                    x: card.position.x + deltaX,
                    y: card.position.y + deltaY,
                  },
                }
              : card
          ),
        }));

        // Persist card position changes
        for (const cardId of currentGroup.cardIds) {
          const card = state.cards.find((c) => c.id === cardId);
          if (card) {
            updateCard({
              id: cardId,
              position: {
                x: card.position.x + deltaX,
                y: card.position.y + deltaY,
              },
            }).catch((error) => {
              console.log("Failed to update card position:", error);
            });
          }
        }
      }

      // Persist the group position change
      updateGroup({
        id: groupId,
        position: {
          x: position.x ?? currentGroup.position.x,
          y: position.y ?? currentGroup.position.y,
          width: currentGroup.position.width,
          height: currentGroup.position.height,
          zIndex: currentGroup.position.zIndex,
        },
      }).catch((error) => {
        console.log("Failed to update group position:", error);
      });
    },
    [groups, state.cards, recordAction, state]
  );

  const handleGroupSizeChange = useCallback(
    (groupId: string, width: number, height: number) => {
      // Record action before execution
      recordAction("updateGroup", state, `Resize group ${groupId}`);

      setGroups((prev) =>
        prev.map((g) =>
          g.id === groupId
            ? {
                ...g,
                position: { ...g.position, width, height },
              }
            : g
        )
      );

      // Persist the change
      const group = groups.find((g) => g.id === groupId);
      if (group) {
        updateGroup({
          id: groupId,
          position: {
            x: group.position.x,
            y: group.position.y,
            width,
            height,
            zIndex: group.position.zIndex,
          },
        }).catch((error) => {
          console.log("Failed to update group size:", error);
        });
      }
    },
    [groups, recordAction, state]
  );

  const handleToggleGroupCollapse = useCallback(
    async (groupId: string) => {
      // Record action before execution
      recordAction("toggleGroupCollapsed", state, `Toggle group ${groupId}`);

      const result = await toggleGroupCollapsed(groupId);
      if (result.success && result.group) {
        const updatedGroup = result.group;
        setGroups((prev) =>
          prev.map((g) => (g.id === groupId ? updatedGroup : g))
        );
      }
    },
    [recordAction, state]
  );

  const handleDeleteGroup = useCallback(
    async (groupId: string) => {
      // Record action before execution
      recordAction("deleteGroup", state, `Delete group ${groupId}`);

      const result = await deleteGroup(groupId);
      if (result.success) {
        setGroups((prev) => prev.filter((g) => g.id !== groupId));
        if (selectedGroupId === groupId) {
          setSelectedGroupId(null);
        }
      }
    },
    [selectedGroupId, recordAction, state]
  );

  const handleGroupClick = useCallback(
    (e: React.MouseEvent, groupId: string) => {
      if (!canEdit) {
        return;
      }
      e.stopPropagation();
      setSelectedGroupId(groupId);
      setState((prev) => ({
        ...prev,
        selectedCardIds: [],
        selectedConnectionId: null,
      }));
    },
    [canEdit]
  );

  const handleCreateGroup = useCallback(() => {
    // Refresh groups after creating a new one
    const refreshGroups = async () => {
      const result = await getGroupsForBoard(boardId);
      if (result.success && result.groups) {
        setGroups(result.groups);
      }
    };
    refreshGroups().catch((error) => {
      console.log("Failed to refresh groups:", error);
    });
  }, [boardId]);

  // Connection handlers
  const handleRefreshConnections = useCallback(async () => {
    const result = await getConnectionsForBoard(boardId);
    if (result.success && result.connections) {
      setConnections(result.connections);
    }
  }, [boardId]);

  const handleConnectionCreated = useCallback(() => {
    handleRefreshConnections();
  }, [handleRefreshConnections]);

  const _handleConnectionDeleted = useCallback(async () => {
    // Refresh connections after deletion
    await handleRefreshConnections();
    setSelectedConnectionId(null);
    setState((prev) => ({
      ...prev,
      selectedConnectionId: null,
    }));
  }, [handleRefreshConnections]);

  // Check for drafts on mount
  useEffect(() => {
    const checkForDrafts = async () => {
      try {
        // Check localStorage for crash recovery draft
        const storageKey = `command-board-draft-${boardId}`;
        const localDraft = localStorage.getItem(storageKey);

        // Check server for draft
        const response = await fetch(`/api/command-board/${boardId}/draft`);
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.draft) {
            // Found server draft
            setPendingDraft({
              cards: data.draft.cards,
              connections: data.draft.connections ?? [],
              groups: data.draft.groups ?? [],
              viewport: data.draft.viewport,
              timestamp: new Date(data.draft.updatedAt),
            });
            setShowDraftRecovery(true);
          } else if (localDraft) {
            // Fall back to localStorage draft
            const parsedDraft = JSON.parse(localDraft) as {
              cards: typeof state.cards;
              connections: typeof connections;
              groups: typeof groups;
              viewport: typeof state.viewport;
              timestamp: string;
            };
            setPendingDraft({
              ...parsedDraft,
              timestamp: new Date(parsedDraft.timestamp),
            });
            setShowDraftRecovery(true);
          }
        } else if (localDraft) {
          // Server failed but localStorage has draft
          const parsedDraft = JSON.parse(localDraft) as {
            cards: typeof state.cards;
            connections: typeof connections;
            groups: typeof groups;
            viewport: typeof state.viewport;
            timestamp: string;
          };
          setPendingDraft({
            ...parsedDraft,
            timestamp: new Date(parsedDraft.timestamp),
          });
          setShowDraftRecovery(true);
        }
      } catch {
        // Silently fail - no draft recovery
      }
    };

    checkForDrafts();
    // Only run on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boardId]);

  // Draft recovery handlers
  const handleRestoreDraft = useCallback(() => {
    if (!pendingDraft) {
      return;
    }

    setState((prev) => ({
      ...prev,
      cards: pendingDraft.cards,
      viewport: pendingDraft.viewport,
    }));
    setConnections(pendingDraft.connections);
    setGroups(pendingDraft.groups);

    setShowDraftRecovery(false);
    setPendingDraft(null);
    toast.success("Draft restored successfully");
  }, [pendingDraft]);

  const handleDiscardDraft = useCallback(() => {
    // Clear draft from both storage locations
    autoSave.clearDraft();

    setShowDraftRecovery(false);
    setPendingDraft(null);
    toast.info("Draft discarded");
  }, [autoSave]);

  const handleCancelDraftRecovery = useCallback(() => {
    setShowDraftRecovery(false);
    setPendingDraft(null);
  }, []);

  // Helper function to get card bounding box
  const getCardBox = useCallback((card: CommandBoardCard) => {
    return {
      x: card.position.x,
      y: card.position.y,
      width: card.position.width,
      height: card.position.height,
    };
  }, []);

  return (
    <div
      aria-label="Command board canvas"
      className="flex h-full flex-col overflow-hidden"
      onKeyDown={handleKeyDown}
      ref={containerRef}
      role="region"
    >
      <LiveCursors
        containerRef={containerRef as React.RefObject<HTMLDivElement>}
      />
      <div className="flex items-center justify-between border-b bg-background px-4 py-2">
        <div className="flex items-center gap-2">
          <h1 className="font-semibold text-lg text-foreground">
            Command Board
          </h1>
          {state.cards.length > 0 && (
            <span className="text-sm text-muted-foreground">
              ({state.cards.length}{" "}
              {state.cards.length === 1 ? "card" : "cards"})
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {canEdit && (
            <>
              <div className="relative">
                <select
                  className="appearance-none rounded-md border bg-background pr-8 pl-3 py-1.5 text-sm font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  onChange={(e) =>
                    setSelectedCardType(e.target.value as CardType)
                  }
                  value={selectedCardType}
                >
                  <option value={CardType.generic}>Note</option>
                  <option value={CardType.task}>Task</option>
                  <option value={CardType.event}>Event</option>
                  <option value={CardType.client}>Client</option>
                  <option value={CardType.employee}>Staff</option>
                  <option value={CardType.inventory}>Inventory</option>
                  <option value={CardType.recipe}>Recipe</option>
                </select>
                <svg
                  className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
                  fill="none"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </div>
              <Button onClick={handleAddCard} size="sm" variant="default">
                <svg
                  className="mr-2 h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <line x1="12" x2="12" y1="5" y2="19" />
                  <line x1="5" x2="19" y1="12" y2="12" />
                </svg>
                Add Card
              </Button>

              {/* Toggle Anchor Points Button */}
              <Button
                onClick={() => setShowAnchors((prev) => !prev)}
                size="sm"
                title={
                  showAnchors
                    ? "Hide connection points"
                    : "Show connection points"
                }
                variant={showAnchors ? "default" : "outline"}
              >
                <svg
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <circle cx="12" cy="12" r="10" />
                  <circle cx="12" cy="12" r="3" />
                  <circle cx="6" cy="12" r="1.5" />
                  <circle cx="18" cy="12" r="1.5" />
                  <circle cx="12" cy="6" r="1.5" />
                  <circle cx="12" cy="18" r="1.5" />
                </svg>
                {showAnchors && <span className="ml-2">Anchors</span>}
              </Button>

              {/* Bulk Edit Button - only show when 2+ cards selected */}
              {state.selectedCardIds.length >= 2 && (
                <Button
                  onClick={() => setShowBulkEditDialog(true)}
                  size="sm"
                  variant="secondary"
                >
                  <svg
                    className="mr-2 h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                    <path d="m15 5 4 4" />
                  </svg>
                  Edit {state.selectedCardIds.length} Cards
                </Button>
              )}

              {/* Create Group Button - only show when 2+ cards selected */}
              {state.selectedCardIds.length >= 2 && (
                <Button
                  onClick={() => setShowCreateGroupDialog(true)}
                  size="sm"
                  variant="secondary"
                >
                  <svg
                    className="mr-2 h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <rect height="7" width="7" x="3" y="3" />
                    <rect height="7" width="7" x="14" y="3" />
                    <rect height="7" width="7" x="14" y="14" />
                    <rect height="7" width="7" x="3" y="14" />
                  </svg>
                  Group {state.selectedCardIds.length} Cards
                </Button>
              )}

              {/* Create Connection Button - show when exactly 2 cards selected */}
              {state.selectedCardIds.length === 2 && (
                <Button
                  onClick={() => {
                    setConnectionSourceCardId(state.selectedCardIds[0] ?? null);
                    setConnectionTargetCardId(state.selectedCardIds[1] ?? null);
                    setShowConnectionDialog(true);
                  }}
                  size="sm"
                  variant="secondary"
                >
                  <svg
                    className="mr-2 h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                  </svg>
                  Connect Cards
                </Button>
              )}
            </>
          )}

          <LayoutSwitcher
            boardId={boardId}
            currentGridSize={gridSize}
            currentShowGrid={showGrid}
            currentSnapToGrid={snapToGrid}
            currentViewport={state.viewport}
            currentVisibleCards={state.cards.map((c) => c.id)}
            onLoadLayout={(
              viewport,
              _visibleCards,
              newGridSize,
              newShowGrid,
              newSnapToGrid
            ) => {
              setGridSize(newGridSize);
              setShowGrid(newShowGrid);
              setSnapToGrid(newSnapToGrid);
              handleViewportChange(viewport);
            }}
            onSaveClick={() => setShowSaveLayoutDialog(true)}
          />

          <Button
            onClick={toggleFullscreen}
            size="sm"
            title={
              isFullscreen ? "Exit fullscreen (Esc)" : "Enter fullscreen (F)"
            }
            variant="outline"
          >
            {isFullscreen ? (
              <svg
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3" />
              </svg>
            ) : (
              <svg
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
              </svg>
            )}
          </Button>

          <Button
            onClick={() => setShowSettings((prev) => !prev)}
            size="sm"
            variant="outline"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <circle cx="12" cy="12" r="3" />
              <path d="M12 1v6m0 6v6" />
              <path d="M4.22 4.22l4.24 4.24m6.36 6.36l4.24 4.24" />
              <path d="M1 12h6m6 0h6" />
              <path d="M4.22 19.78l4.24-4.24m6.36-6.36l4.24-4.24" />
            </svg>
          </Button>

          <AutoSaveIndicator
            hasUnsavedChanges={autoSave.hasUnsavedChanges}
            isSaving={autoSave.isSaving}
            lastSavedAt={autoSave.lastSavedAt}
            onSaveNow={autoSave.saveNow}
          />
        </div>
      </div>

      {/* Replay Progress Indicator */}
      <ReplayIndicator
        onDismiss={() => {
          // Allow dismissing indicator but replay continues
        }}
        onSkip={replay.skipReplay}
        processedCount={replay.processedCount}
        state={replay.state}
        totalCount={replay.totalCount}
      />

      {showSettings && (
        <div className="border-b bg-muted/30 px-4 py-3 backdrop-blur-sm">
          <div className="flex flex-wrap items-center gap-6">
            <label className="group flex cursor-pointer items-center gap-2.5 transition-colors hover:bg-accent/50 -mx-1.5 rounded px-1.5 py-1">
              <input
                checked={showGrid}
                className="h-4 w-4 rounded border-primary text-primary focus:ring-primary focus:ring-2 focus:ring-offset-0"
                onChange={(e) => setShowGrid(e.target.checked)}
                type="checkbox"
              />
              <span className="text-sm text-foreground group-hover:text-foreground">
                Show Grid
              </span>
            </label>

            <label className="group flex cursor-pointer items-center gap-2.5 transition-colors hover:bg-accent/50 -mx-1.5 rounded px-1.5 py-1">
              <input
                checked={snapToGrid}
                className="h-4 w-4 rounded border-primary text-primary focus:ring-primary focus:ring-2 focus:ring-offset-0"
                onChange={(e) => setSnapToGrid(e.target.checked)}
                type="checkbox"
              />
              <span className="text-sm text-foreground group-hover:text-foreground">
                Snap to Grid
              </span>
            </label>

            <label className="group flex cursor-pointer items-center gap-2.5 transition-colors hover:bg-accent/50 -mx-1.5 rounded px-1.5 py-1">
              <input
                checked={showConnections}
                className="h-4 w-4 rounded border-primary text-primary focus:ring-primary focus:ring-2 focus:ring-offset-0"
                onChange={(e) => setShowConnections(e.target.checked)}
                type="checkbox"
              />
              <span className="text-sm text-foreground group-hover:text-foreground">
                Show Connections
              </span>
            </label>

            <div className="flex items-center gap-2.5">
              <span className="text-sm text-muted-foreground">Grid Size:</span>
              <div className="relative">
                <select
                  className="appearance-none rounded-md border bg-background pr-8 pl-3 text-sm font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  onChange={(e) => setGridSize(Number(e.target.value))}
                  value={gridSize}
                >
                  <option value={20}>20px</option>
                  <option value={40}>40px</option>
                  <option value={60}>60px</option>
                </select>
                <svg
                  className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
                  fill="none"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      )}

      <CanvasViewport
        enableKeyboardShortcuts={true}
        enablePan={true}
        enableWheelZoom={true}
        initialViewport={state.viewport}
        onViewportChange={handleViewportChange}
        showControls={true}
      >
        <div
          className="relative min-h-[4000px] min-w-[4000px]"
          onMouseDown={handleCanvasMouseDown}
          onMouseLeave={handleCanvasSelectionMouseUp}
          onMouseMove={handleCanvasMouseMove}
          onMouseUp={handleCanvasMouseUp}
        >
          <GridLayer
            className="absolute inset-0"
            gridSize={gridSize}
            showGrid={showGrid}
          />

          {showConnections && (
            <svg
              className="absolute inset-0 pointer-events-none"
              style={{ zIndex: 1 }}
            >
              <g>
                {/* Existing connection lines */}
                <ConnectionLines
                  cards={state.cards}
                  connections={connections}
                  onConnectionClick={handleConnectionClick}
                  onContextMenu={handleConnectionContextMenu}
                  selectedConnectionId={selectedConnectionId ?? undefined}
                />

                {/* Temporary connection line during drag */}
                {draggingConnection && (
                  <TemporaryConnectionLine
                    endPoint={draggingConnection.currentPoint}
                    isValid={isValidConnectionTarget}
                    startPoint={draggingConnection.fromPosition}
                    viewportZoom={state.viewport.zoom}
                  />
                )}
              </g>
            </svg>
          )}

          {/* Selection rectangle (marquee) */}
          {isDraggingSelection && selectionStart && selectionEnd && (
            <div
              className="pointer-events-none absolute border-2 border-primary bg-primary/10"
              style={{
                left: `${Math.min(selectionStart.x, selectionEnd.x)}px`,
                top: `${Math.min(selectionStart.y, selectionEnd.y)}px`,
                width: `${Math.abs(selectionEnd.x - selectionStart.x)}px`,
                height: `${Math.abs(selectionEnd.y - selectionStart.y)}px`,
                zIndex: 9999,
              }}
            />
          )}

          {/* Groups - render before cards so cards appear on top */}
          {groups.map((group) => {
            const cardsInGroup = state.cards.filter((c) =>
              group.cardIds.includes(c.id)
            );
            return (
              <GroupContainer
                canDrag={canEdit}
                canResize={true}
                gridSize={gridSize}
                group={group}
                isSelected={selectedGroupId === group.id}
                key={group.id}
                onClick={(e) => handleGroupClick(e, group.id)}
                onDelete={handleDeleteGroup}
                onPositionChange={handleGroupPositionChange}
                onSizeChange={handleGroupSizeChange}
                onToggleCollapse={handleToggleGroupCollapse}
                snapToGridEnabled={snapToGrid}
                viewportZoom={state.viewport.zoom}
              >
                {/* Cards in this group are rendered inside */}
                {!group.collapsed &&
                  cardsInGroup.map((card) => (
                    <div className="relative" key={card.id}>
                      <BoardCard
                        canDrag={canEdit}
                        card={card}
                        gridSize={gridSize}
                        isSelected={state.selectedCardIds.includes(card.id)}
                        onClick={(e) => handleCardClick(e, card.id)}
                        onDelete={handleDeleteCard}
                        onPositionChange={handleCardPositionChange}
                        onSizeChange={handleCardSizeChange}
                        snapToGridEnabled={snapToGrid}
                        viewportZoom={state.viewport.zoom}
                      />
                      {/* Anchor points for this card */}
                      {showAnchors && (
                        <CardAnchors
                          activeAnchorId={
                            draggingConnection?.fromAnchorId ?? null
                          }
                          canvasToScreen={(point) =>
                            canvasToScreen(point, state.viewport)
                          }
                          cardBox={getCardBox(card)}
                          cardId={card.id}
                          hoveredAnchorId={hoveredAnchorId}
                          onAnchorMouseDown={handleAnchorMouseDown}
                          onAnchorMouseEnter={handleAnchorMouseEnter}
                          onAnchorMouseLeave={handleAnchorMouseLeave}
                          showAnchors={showAnchors}
                        />
                      )}
                    </div>
                  ))}
              </GroupContainer>
            );
          })}

          {/* Cards not in any group or in collapsed groups */}
          {visibleCards
            .filter((card) => !groups.some((g) => g.cardIds.includes(card.id)))
            .map((card) => (
              <div className="relative" key={card.id}>
                <BoardCard
                  canDrag={canEdit}
                  card={card}
                  gridSize={gridSize}
                  isSelected={state.selectedCardIds.includes(card.id)}
                  onClick={(e) => handleCardClick(e, card.id)}
                  onDelete={handleDeleteCard}
                  onPositionChange={handleCardPositionChange}
                  onSizeChange={handleCardSizeChange}
                  snapToGridEnabled={snapToGrid}
                  viewportZoom={state.viewport.zoom}
                />
                {/* Anchor points for this card */}
                {showAnchors && (
                  <CardAnchors
                    activeAnchorId={draggingConnection?.fromAnchorId ?? null}
                    canvasToScreen={(point) =>
                      canvasToScreen(point, state.viewport)
                    }
                    cardBox={getCardBox(card)}
                    cardId={card.id}
                    hoveredAnchorId={hoveredAnchorId}
                    onAnchorMouseDown={handleAnchorMouseDown}
                    onAnchorMouseEnter={handleAnchorMouseEnter}
                    onAnchorMouseLeave={handleAnchorMouseLeave}
                    showAnchors={showAnchors}
                  />
                )}
              </div>
            ))}

          {showEmptyState && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                {/* Empty state illustration */}
                <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-muted/50">
                  <svg
                    className="h-12 w-12 text-muted-foreground/40"
                    fill="none"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="1.5"
                    viewBox="0 0 24 24"
                  >
                    <rect height="18" rx="2" width="18" x="3" y="3" />
                    <line x1="9" x2="15" y1="9" y2="9" />
                    <line x1="9" x2="15" y1="15" y2="15" />
                  </svg>
                </div>
                <h2 className="mb-2 text-xl font-semibold text-foreground">
                  Your board is empty
                </h2>
                <p className="mb-6 text-muted-foreground">
                  Start by adding your first card to organize your strategic
                  view
                </p>
                {canEdit && (
                  <Button onClick={handleAddCard} size="lg">
                    <svg
                      className="mr-2 h-5 w-5"
                      fill="none"
                      stroke="currentColor"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      viewBox="0 0 24 24"
                    >
                      <line x1="12" x2="12" y1="5" y2="19" />
                      <line x1="5" x2="19" y1="12" y2="12" />
                    </svg>
                    Add Your First Card
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </CanvasViewport>

      {/* Save Layout Dialog */}
      <SaveLayoutDialog
        boardId={boardId}
        gridSize={gridSize}
        onOpenChange={setShowSaveLayoutDialog}
        onSave={() => {
          // Optional: refresh layouts list
        }}
        open={showSaveLayoutDialog}
        showGrid={showGrid}
        snapToGrid={snapToGrid}
        viewport={state.viewport}
        visibleCards={state.cards.map((c) => c.id)}
      />

      {/* Bulk Edit Dialog */}
      <BulkEditDialog
        onOpenChange={setShowBulkEditDialog}
        onUpdate={async () => {
          // Refresh cards from server after bulk update
          // This ensures we get latest state including any server-side defaults
          const updatedIds = state.selectedCardIds;
          if (updatedIds.length === 0) {
            return;
          }

          // Fetch updated cards
          try {
            const response = await fetch(`/api/command-board/${boardId}/cards`);
            if (response.ok) {
              const data = await response.json();
              if (data.cards) {
                setState((prev) => ({
                  ...prev,
                  cards: data.cards,
                }));
              }
            }
          } catch {
            // If fetch fails, optimistic update from dialog will still work
            console.log("Failed to refresh cards after bulk update");
          }
        }}
        open={showBulkEditDialog}
        selectedCards={state.cards.filter((c) =>
          state.selectedCardIds.includes(c.id)
        )}
      />

      {/* Create Group Dialog */}
      <CreateGroupDialog
        boardId={boardId}
        onCreate={handleCreateGroup}
        onOpenChange={setShowCreateGroupDialog}
        open={showCreateGroupDialog}
        selectedCards={state.cards.filter((c) =>
          state.selectedCardIds.includes(c.id)
        )}
      />

      {/* Connection Dialog */}
      <ConnectionDialog
        boardId={boardId}
        cards={state.cards}
        onCreate={handleConnectionCreated}
        onOpenChange={setShowConnectionDialog}
        open={showConnectionDialog}
        sourceCardId={connectionSourceCardId}
        targetCardId={connectionTargetCardId}
      />

      {/* Connection Context Menu (Right-click on connections) */}
      {contextMenuConnection && (
        <div
          className="fixed z-[99999] rounded-md border bg-popover p-1 shadow-lg"
          style={{
            left: `${contextMenuConnection.x}px`,
            top: `${contextMenuConnection.y}px`,
          }}
        >
          <button
            className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-accent"
            onClick={handleContextMenuEdit}
            type="button"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
              <path d="m15 5 4 4" />
            </svg>
            Edit Connection
          </button>
          <button
            className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-destructive hover:bg-destructive/10"
            onClick={handleContextMenuDelete}
            type="button"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <path d="M3 6h18" />
              <path d="M19 6v14c0 1-1 2-2H7c-1 0-2-1-2V6" />
              <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
            </svg>
            Delete Connection
          </button>
        </div>
      )}

      {/* Edit Connection Dialog */}
      <Dialog
        onOpenChange={setShowEditConnectionDialog}
        open={showEditConnectionDialog}
      >
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Connection</DialogTitle>
            <DialogDescription>
              Update connection properties between cards.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="relationshipType">Relationship Type</Label>
              <Select
                onValueChange={(value) =>
                  setEditRelationshipType(value as RelationshipType)
                }
                value={editRelationshipType}
              >
                <SelectTrigger id="relationshipType">
                  <SelectValue placeholder="Select relationship type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="generic">Generic</SelectItem>
                  <SelectItem value="client_to_event">
                    Client to Event
                  </SelectItem>
                  <SelectItem value="event_to_task">Event to Task</SelectItem>
                  <SelectItem value="task_to_employee">
                    Task to Employee
                  </SelectItem>
                  <SelectItem value="event_to_inventory">
                    Event to Inventory
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="label">Label (optional)</Label>
              <Input
                id="label"
                onChange={(e) => setEditLabel(e.target.value)}
                placeholder="Custom label for connection"
                value={editLabel}
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                checked={editVisible}
                className="h-4 w-4 rounded border-primary text-primary focus:ring-primary focus:ring-2 focus:ring-offset-0"
                id="visible"
                onChange={(e) => setEditVisible(e.target.checked)}
                type="checkbox"
              />
              <Label className="cursor-pointer" htmlFor="visible">
                Visible
              </Label>
            </div>
            {errorEditDialog && (
              <div className="text-sm text-destructive">{errorEditDialog}</div>
            )}
          </div>
          <DialogFooter>
            <Button
              onClick={() => setShowEditConnectionDialog(false)}
              type="button"
              variant="outline"
            >
              Cancel
            </Button>
            <Button
              disabled={isUpdatingEditDialog}
              onClick={handleEditConnectionUpdate}
              type="button"
            >
              {isUpdatingEditDialog ? "Updating..." : "Update Connection"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Draft Recovery Dialog */}
      <DraftRecoveryDialog
        draftTimestamp={pendingDraft?.timestamp ?? null}
        onCancel={handleCancelDraftRecovery}
        onDiscard={handleDiscardDraft}
        onRestore={handleRestoreDraft}
        open={showDraftRecovery}
      />

      {/* Conflict Resolution Dialog */}
      {selectedConflict && (
        <ConflictResolutionDialog
          conflict={selectedConflict}
          onClose={() => {
            setShowConflictDialog(false);
            setSelectedConflict(null);
          }}
          onResolve={(resolution) => {
            conflictResolution.resolveConflict(
              selectedConflict.conflictId,
              resolution.strategy,
              resolution.strategy === "merge"
                ? resolution.mergeOptions
                : undefined
            );
            setShowConflictDialog(false);
          }}
          open={showConflictDialog}
        />
      )}
    </div>
  );
}
