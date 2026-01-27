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
import { toast } from "sonner";
import { createCard, deleteCard, updateCard } from "./actions/cards";
import { BoardCard } from "./components/board-card";
import { CanvasViewport } from "./components/canvas-viewport";
import { GridLayer } from "./components/grid-layer";
import { calculateFitToScreen } from "./components/viewport-controls";
import {
  type BoardState,
  type CommandBoardCard,
  INITIAL_BOARD_STATE,
  type Point,
  type ViewportPreferences,
  type ViewportState,
} from "./types";

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
  const dragStateRef = useRef<{
    isDragging: boolean;
    cardId: string | null;
    startPosition: Point | null;
    cardStartPosition: Point | null;
  }>({
    isDragging: false,
    cardId: null,
    startPosition: null,
    cardStartPosition: null,
  });

  const [state, setState] = useState<BoardState>({
    ...INITIAL_BOARD_STATE,
    cards: initialCards,
  });

  const [gridSize, setGridSize] = useState(40);
  const [showGrid, setShowGrid] = useState(true);
  const [snapToGrid, setSnapToGrid] = useState(true);

  const [showSettings, setShowSettings] = useState(false);
  const [showEmptyState, setShowEmptyState] = useState(
    initialCards.length === 0
  );

  const { updateCursor, updateSelectedCard, updateDragging, clearPresence } =
    useCommandBoardPresence();
  const broadcast = useBroadcastEvent();

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
      } catch {}
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
      title: "New Card",
      cardType: "generic",
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
      toast.success("Card added successfully");
      broadcast({ type: "CARD_ADDED", cardId: newCard.id });
    } else {
      toast.error(result.error || "Failed to add card");
    }
  }, [boardId, state.cards.length, broadcast]);

  const handleCardClick = useCallback(
    (cardId: string) => {
      if (!canEdit) {
        return;
      }

      updateSelectedCard(cardId);
      setState((prev) => {
        const isAlreadySelected = prev.selectedCardIds.includes(cardId);
        return {
          ...prev,
          selectedCardIds: isAlreadySelected ? [] : [cardId],
        };
      });
    },
    [canEdit, updateSelectedCard]
  );

  const handlePositionChange = useCallback(
    async (cardId: string, position: { x: number; y: number }) => {
      if (!canEdit) {
        return;
      }

      const gridSnapEnabled = snapToGrid;
      const snapSize = gridSnapEnabled ? gridSize : 1;

      const finalPosition = {
        x: Math.round(position.x / snapSize) * snapSize,
        y: Math.round(position.y / snapSize) * snapSize,
      };

      setState((prev) => ({
        ...prev,
        cards: prev.cards.map((c) =>
          c.id === cardId
            ? {
                ...c,
                position: {
                  ...c.position,
                  x: finalPosition.x,
                  y: finalPosition.y,
                },
              }
            : c
        ),
      }));

      const result = await updateCard({
        id: cardId,
        position: finalPosition,
      });

      if (result.success) {
        broadcast({
          type: "CARD_MOVED",
          cardId,
          x: finalPosition.x,
          y: finalPosition.y,
        });
      } else {
        toast.error(result.error || "Failed to save card position");
      }
    },
    [canEdit, snapToGrid, gridSize, broadcast]
  );

  const _handleDragStart = useCallback(
    (e: MouseEvent, cardId: string) => {
      if (!canEdit) {
        return;
      }

      const card = state.cards.find((c) => c.id === cardId);
      if (!card) {
        return;
      }

      const container = containerRef.current;
      if (!container) {
        return;
      }

      const rect = container.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      dragStateRef.current = {
        isDragging: true,
        cardId,
        startPosition: { x: mouseX, y: mouseY },
        cardStartPosition: { x: card.position.x, y: card.position.y },
      };

      updateDragging(true);
    },
    [canEdit, state.cards, updateDragging]
  );

  const handleDrag = useCallback(
    (e: MouseEvent) => {
      if (!(dragStateRef.current.isDragging && dragStateRef.current.cardId)) {
        return;
      }

      const container = containerRef.current;
      if (!container) {
        return;
      }

      const rect = container.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const deltaX = mouseX - (dragStateRef.current.startPosition?.x ?? 0);
      const deltaY = mouseY - (dragStateRef.current.startPosition?.y ?? 0);

      const newX =
        (dragStateRef.current.cardStartPosition?.x ?? 0) +
        deltaX / state.viewport.zoom;
      const newY =
        (dragStateRef.current.cardStartPosition?.y ?? 0) +
        deltaY / state.viewport.zoom;

      setState((prev) => ({
        ...prev,
        cards: prev.cards.map((card) =>
          card.id === dragStateRef.current.cardId
            ? {
                ...card,
                position: {
                  ...card.position,
                  x: newX,
                  y: newY,
                },
              }
            : card
        ),
      }));
    },
    [state.viewport.zoom]
  );

  const handleDragEnd = useCallback(async () => {
    if (!(dragStateRef.current.isDragging && dragStateRef.current.cardId)) {
      return;
    }

    const card = state.cards.find((c) => c.id === dragStateRef.current.cardId);
    if (!card) {
      return;
    }

    const gridSnapEnabled = snapToGrid;
    const snapSize = gridSnapEnabled ? gridSize : 1;

    const finalPosition = {
      x: Math.round(card.position.x / snapSize) * snapSize,
      y: Math.round(card.position.y / snapSize) * snapSize,
    };

    setState((prev) => ({
      ...prev,
      cards: prev.cards.map((c) =>
        c.id === dragStateRef.current.cardId
          ? {
              ...c,
              position: {
                ...c.position,
                x: finalPosition.x,
                y: finalPosition.y,
              },
            }
          : c
      ),
    }));

    const result = await updateCard({
      id: dragStateRef.current.cardId,
      position: finalPosition,
    });

    if (result.success) {
      toast.success("Card position saved");
      broadcast({
        type: "CARD_MOVED",
        cardId: dragStateRef.current.cardId,
        x: finalPosition.x,
        y: finalPosition.y,
      });
    } else {
      toast.error(result.error || "Failed to save card position");
    }

    updateDragging(false);
    dragStateRef.current = {
      isDragging: false,
      cardId: null,
      startPosition: null,
      cardStartPosition: null,
    };
  }, [snapToGrid, gridSize, state.cards, broadcast, updateDragging]);

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
        toast.success("Card deleted successfully");
        broadcast({ type: "CARD_DELETED", cardId });
      } else {
        toast.error(result.error || "Failed to delete card");
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

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!canEdit) {
        return;
      }

      if (
        (e.key === "Delete" || e.key === "Backspace") &&
        state.selectedCardIds.length > 0
      ) {
        state.selectedCardIds.forEach((id) => handleDeleteCard(id));
      }

      if (e.key === "Escape") {
        updateSelectedCard(null);
        setState((prev) => ({ ...prev, selectedCardIds: [] }));
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
    ]
  );

  useEffect(() => {
    window.addEventListener("mousemove", handleDrag);
    window.addEventListener("mouseup", handleDragEnd);

    return () => {
      window.removeEventListener("mousemove", handleDrag);
      window.removeEventListener("mouseup", handleDragEnd);
    };
  }, [handleDrag, handleDragEnd]);

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
          <h1 className="font-semibold text-foreground text-lg">
            Command Board
          </h1>
          {state.cards.length > 0 && (
            <span className="text-muted-foreground text-sm">
              ({state.cards.length}{" "}
              {state.cards.length === 1 ? "card" : "cards"})
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {canEdit && (
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
        <div className="border-b bg-muted/50 px-4 py-3">
          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2">
              <input
                checked={showGrid}
                className="h-4 w-4"
                onChange={(e) => setShowGrid(e.target.checked)}
                type="checkbox"
              />
              <span className="text-foreground text-sm">Show Grid</span>
            </label>

            <label className="flex items-center gap-2">
              <input
                checked={snapToGrid}
                className="h-4 w-4"
                onChange={(e) => setSnapToGrid(e.target.checked)}
                type="checkbox"
              />
              <span className="text-foreground text-sm">Snap to Grid</span>
            </label>

            <div className="flex items-center gap-2">
              <span className="text-foreground text-sm">Grid Size:</span>
              <select
                className="rounded-md border bg-background px-2 py-1 text-sm"
                onChange={(e) => setGridSize(Number(e.target.value))}
                value={gridSize}
              >
                <option value={20}>20px</option>
                <option value={40}>40px</option>
                <option value={60}>60px</option>
              </select>
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
        showControls={false}
      >
        <div className="relative min-h-[4000px] min-w-[4000px]">
          <GridLayer
            className="absolute inset-0"
            gridSize={gridSize}
            showGrid={showGrid}
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
              onPositionChange={handlePositionChange}
              snapToGridEnabled={snapToGrid}
              viewportZoom={state.viewport.zoom}
            />
          ))}

          {showEmptyState && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <p className="mb-4 text-lg text-muted-foreground">
                  No cards on the board yet
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
                      xmlns="http://www.w3.org/2000/svg"
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
