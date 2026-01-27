"use client";

import {
  LiveCursors,
  useBroadcastEvent,
  useCommandBoardPresence,
} from "@repo/collaboration";
import { Button } from "@repo/design-system/components/ui/button";
import {
  type KeyboardEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { createCard, deleteCard, updateCard } from "../actions/cards";
import {
  type BoardState,
  type CardConnection,
  CardType,
  type CommandBoardCard,
  INITIAL_BOARD_STATE,
  type Point,
  type ViewportPreferences,
  type ViewportState,
} from "../types";
import { BoardCard } from "./board-card";
import { CanvasViewport } from "./canvas-viewport";
import { ConnectionLines } from "./connection-lines";
import { GridLayer } from "./grid-layer";
import { calculateFitToScreen } from "./viewport-controls";

const VIEWPORT_PREFERENCES_KEY = "command-board-viewport-preferences";

type BoardCanvasProps = {
  boardId: string;
  initialCards?: CommandBoardCard[];
  canEdit?: boolean;
  onCardsChange?: (cards: CommandBoardCard[]) => void;
  onViewportChange?: (viewport: ViewportState) => void;
};

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
  const [selectedCardType, setSelectedCardType] = useState<CardType>(
    CardType.generic
  );

  const [showSettings, setShowSettings] = useState(false);
  const [showEmptyState, setShowEmptyState] = useState(
    initialCards.length === 0
  );
  const [connections, setConnections] = useState<CardConnection[]>([]);
  const [selectedConnectionId, setSelectedConnectionId] = useState<
    string | null
  >(null);

  const { updateCursor, updateSelectedCard, clearPresence } =
    useCommandBoardPresence();
  const broadcast = useBroadcastEvent();

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
    };
    localStorage.setItem(VIEWPORT_PREFERENCES_KEY, JSON.stringify(prefs));
  }, [gridSize, showGrid, snapToGrid, state.viewport]);

  useEffect(() => {
    onCardsChange?.(state.cards);
  }, [state.cards, onCardsChange]);

  useEffect(() => {
    onViewportChange?.(state.viewport);
  }, [state.viewport, onViewportChange]);

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
    (cardId: string) => {
      if (!canEdit) {
        return;
      }

      updateSelectedCard(cardId);
      setSelectedConnectionId(null);
      setState((prev) => {
        const isAlreadySelected = prev.selectedCardIds.includes(cardId);
        return {
          ...prev,
          selectedCardIds: isAlreadySelected ? [] : [cardId],
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

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!canEdit) {
        return;
      }

      if (e.key === "Escape") {
        updateSelectedCard(null);
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
    ]
  );

  useEffect(
    () => () => {
      clearPresence();
    },
    [clearPresence]
  );

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
            </>
          )}

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
        <div className="relative min-h-[4000px] min-w-[4000px]">
          <GridLayer
            className="absolute inset-0"
            gridSize={gridSize}
            showGrid={showGrid}
          />

          <ConnectionLines
            cards={state.cards}
            connections={connections}
            onConnectionClick={handleConnectionClick}
            selectedConnectionId={selectedConnectionId ?? undefined}
          />

          {state.cards.map((card) => (
            <BoardCard
              canDrag={canEdit}
              card={card}
              gridSize={gridSize}
              isSelected={state.selectedCardIds.includes(card.id)}
              key={card.id}
              onClick={() => handleCardClick(card.id)}
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
    </div>
  );
}
