"use client";

import {
  LiveCursors,
  useBroadcastEvent,
  useCommandBoardPresence,
  useEventListener,
} from "@repo/collaboration";
import { Button } from "@repo/design-system/components/ui/button";
import {
  type KeyboardEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createCard, deleteCard, updateCard } from "../actions/cards";
import { getConnectionsForBoard } from "../actions/connections";
import {
  deleteGroup,
  getGroupsForBoard,
  toggleGroupCollapsed,
  updateGroup,
} from "../actions/groups";
import {
  type BoardState,
  type CardConnection,
  CardType,
  type CommandBoardCard,
  type CommandBoardGroup,
  INITIAL_BOARD_STATE,
  type Point,
  type ViewportPreferences,
  type ViewportState,
} from "../types";
import { BoardCard } from "./board-card";
import { BulkEditDialog } from "./bulk-edit-dialog";
import { CanvasViewport } from "./canvas-viewport";
import { ConnectionDialog } from "./connection-dialog";
import { ConnectionLines } from "./connection-lines";
import { CreateGroupDialog } from "./create-group-dialog";
import { GridLayer } from "./grid-layer";
import { GroupContainer } from "./group-container";
import { LayoutSwitcher } from "./layout-switcher";
import { SaveLayoutDialog } from "./save-layout-dialog";
import { calculateFitToScreen } from "./viewport-controls";

const VIEWPORT_PREFERENCES_KEY = "command-board-viewport-preferences";

interface BoardCanvasProps {
  boardId: string;
  initialCards?: CommandBoardCard[];
  canEdit?: boolean;
  onCardsChange?: (cards: CommandBoardCard[]) => void;
  onViewportChange?: (viewport: ViewportState) => void;
}

export function BoardCanvas({
  boardId,
  initialCards = [],
  canEdit = true,
  onCardsChange,
  onViewportChange,
}: BoardCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const [state, setState] = useState<BoardState>({
    ...INITIAL_BOARD_STATE,
    cards: initialCards,
  });

  const [gridSize, setGridSize] = useState(40);
  const [showGrid, setShowGrid] = useState(true);
  const [snapToGrid, setSnapToGrid] = useState(true);
  const [showConnections, setShowConnections] = useState(true);
  const [selectedCardType, setSelectedCardType] = useState<CardType>(
    CardType.generic
  );

  const [showSettings, setShowSettings] = useState(false);
  const [showEmptyState, setShowEmptyState] = useState(
    initialCards.length === 0
  );
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [connections, setConnections] = useState<CardConnection[]>([]);
  const [selectedConnectionId, setSelectedConnectionId] = useState<
    string | null
  >(null);

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

  // Groups state
  const [groups, setGroups] = useState<CommandBoardGroup[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);

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
        break;
      }
      case "CARD_UPDATED": {
        break;
      }
      default: {
        break;
      }
    }
  });

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!containerRef.current) {
        return;
      }

      const rect = containerRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      updateCursor({ x, y });
    },
    [updateCursor]
  );

  useEffect(() => {
    window.addEventListener("mousemove", handleMouseMove);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, [handleMouseMove]);

  const handleViewportChange = useCallback((viewport: ViewportState) => {
    setState((prev) => ({ ...prev, viewport }));
  }, []);

  const handleAddCard = useCallback(async () => {
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
  }, [boardId, selectedCardType, state.cards.length, broadcast]);

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
        broadcast({
          type: "CARD_MOVED",
          cardId,
          x: position.x,
          y: position.y,
        });
      } else {
        console.log(result.error ?? "Failed to save card position");
      }
    },
    [canEdit, broadcast]
  );

  const handleCardSizeChange = useCallback(
    async (cardId: string, width: number, height: number) => {
      if (!canEdit) {
        return;
      }

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

      if (!result.success) {
        console.log(result.error ?? "Failed to save card size");
      }
    },
    [canEdit]
  );

  const handleDeleteCard = useCallback(
    async (cardId: string) => {
      if (!canEdit) {
        return;
      }

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
    [canEdit, broadcast]
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
  const handleCanvasMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (!canEdit || e.button !== 0) {
        return; // Only left click
      }

      // Check if clicking on a card (target should be canvas or grid)
      const target = e.target as HTMLElement;
      if (target.closest("[data-card-id]")) {
        return; // Clicked on a card, let card handle it
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
    [canEdit, state.viewport.zoom]
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
  const handleCanvasMouseUp = useCallback(() => {
    setIsDraggingSelection(false);
    setSelectionStart(null);
    setSelectionEnd(null);
  }, []);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!canEdit) {
        return;
      }

      if (e.key === "Escape") {
        updateSelectedCard(null);
        // Cancel selection drag
        setIsDraggingSelection(false);
        setSelectionStart(null);
        setSelectionEnd(null);
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
    [groups, state.cards]
  );

  const handleGroupSizeChange = useCallback(
    (groupId: string, width: number, height: number) => {
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
    [groups]
  );

  const handleToggleGroupCollapse = useCallback(async (groupId: string) => {
    const result = await toggleGroupCollapsed(groupId);
    if (result.success && result.group) {
      const updatedGroup = result.group;
      setGroups((prev) =>
        prev.map((g) => (g.id === groupId ? updatedGroup : g))
      );
    }
  }, []);

  const handleDeleteGroup = useCallback(
    async (groupId: string) => {
      const result = await deleteGroup(groupId);
      if (result.success) {
        setGroups((prev) => prev.filter((g) => g.id !== groupId));
        if (selectedGroupId === groupId) {
          setSelectedGroupId(null);
        }
      }
    },
    [selectedGroupId]
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
        </div>
      </div>

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
          onMouseLeave={handleCanvasMouseUp}
          onMouseMove={handleCanvasMouseMove}
          onMouseUp={handleCanvasMouseUp}
        >
          <GridLayer
            className="absolute inset-0"
            gridSize={gridSize}
            showGrid={showGrid}
          />

          {showConnections && (
            <ConnectionLines
              cards={state.cards}
              connections={connections}
              onConnectionClick={handleConnectionClick}
              selectedConnectionId={selectedConnectionId ?? undefined}
            />
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
                    <BoardCard
                      canDrag={canEdit}
                      card={card}
                      gridSize={gridSize}
                      isSelected={state.selectedCardIds.includes(card.id)}
                      key={card.id}
                      onClick={(e) => handleCardClick(e, card.id)}
                      onDelete={handleDeleteCard}
                      onPositionChange={handleCardPositionChange}
                      onSizeChange={handleCardSizeChange}
                      snapToGridEnabled={snapToGrid}
                      viewportZoom={state.viewport.zoom}
                    />
                  ))}
              </GroupContainer>
            );
          })}

          {/* Cards not in any group or in collapsed groups */}
          {visibleCards
            .filter((card) => !groups.some((g) => g.cardIds.includes(card.id)))
            .map((card) => (
              <BoardCard
                canDrag={canEdit}
                card={card}
                gridSize={gridSize}
                isSelected={state.selectedCardIds.includes(card.id)}
                key={card.id}
                onClick={(e) => handleCardClick(e, card.id)}
                onDelete={handleDeleteCard}
                onPositionChange={handleCardPositionChange}
                onSizeChange={handleCardSizeChange}
                snapToGridEnabled={snapToGrid}
                viewportZoom={state.viewport.zoom}
              />
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
          // This ensures we get the latest state including any server-side defaults
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
            // If fetch fails, the optimistic update from the dialog will still work
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
    </div>
  );
}
