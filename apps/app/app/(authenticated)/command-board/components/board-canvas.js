"use client";

Object.defineProperty(exports, "__esModule", { value: true });
exports.BoardCanvas = BoardCanvas;
const button_1 = require("@repo/design-system/components/ui/button");
const react_1 = require("react");
const types_1 = require("../types");
const board_card_1 = require("./board-card");
const canvas_viewport_1 = require("./canvas-viewport");
const grid_layer_1 = require("./grid-layer");
const viewport_controls_1 = require("./viewport-controls");
function BoardCanvas({
  boardId,
  initialCards = [],
  canEdit = true,
  onCardsChange,
  onViewportChange,
}) {
  const containerRef = (0, react_1.useRef)(null);
  const [state, setState] = (0, react_1.useState)({
    ...types_1.INITIAL_BOARD_STATE,
    cards: initialCards,
  });
  const [gridSize, setGridSize] = (0, react_1.useState)(40);
  const [showGrid, setShowGrid] = (0, react_1.useState)(true);
  const [snapToGrid, setSnapToGrid] = (0, react_1.useState)(true);
  const [showSettings, setShowSettings] = (0, react_1.useState)(false);
  const [showEmptyState, setShowEmptyState] = (0, react_1.useState)(
    initialCards.length === 0
  );
  (0, react_1.useEffect)(() => {
    setShowEmptyState(state.cards.length === 0);
  }, [state.cards.length]);
  (0, react_1.useEffect)(() => {
    onCardsChange?.(state.cards);
  }, [state.cards, onCardsChange]);
  (0, react_1.useEffect)(() => {
    onViewportChange?.(state.viewport);
  }, [state.viewport, onViewportChange]);
  const handleViewportChange = (0, react_1.useCallback)((viewport) => {
    setState((prev) => ({ ...prev, viewport }));
  }, []);
  const handleAddCard = (0, react_1.useCallback)(() => {
    const newCard = {
      id: `card-${Date.now()}`,
      tenantId: "",
      boardId,
      title: "New Card",
      content: "",
      cardType: "generic",
      status: "active",
      position: {
        x: 100 + state.cards.length * 20,
        y: 100 + state.cards.length * 20,
        width: 280,
        height: 180,
        zIndex: state.cards.length + 1,
      },
      color: null,
      metadata: {},
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    };
    setState((prev) => ({
      ...prev,
      cards: [...prev.cards, newCard],
      selectedCardIds: [newCard.id],
    }));
    setShowEmptyState(false);
  }, [boardId, state.cards.length]);
  const handleCardClick = (0, react_1.useCallback)(
    (cardId) => {
      if (!canEdit) return;
      setState((prev) => {
        const isSelected = prev.selectedCardIds.includes(cardId);
        return { ...prev, selectedCardIds: isSelected ? [] : [cardId] };
      });
    },
    [canEdit]
  );
  const handleCardPositionChange = (0, react_1.useCallback)(
    (cardId, position) => {
      if (!canEdit) return;
      setState((prev) => ({
        ...prev,
        cards: prev.cards.map((card) =>
          card.id === cardId
            ? { ...card, position: { ...card.position, ...position } }
            : card
        ),
        isDirty: true,
      }));
    },
    [canEdit]
  );
  const handleCardSizeChange = (0, react_1.useCallback)(
    (cardId, width, height) => {
      if (!canEdit) return;
      setState((prev) => ({
        ...prev,
        cards: prev.cards.map((card) =>
          card.id === cardId
            ? {
                ...card,
                position: { ...card.position, width, height },
              }
            : card
        ),
        isDirty: true,
      }));
    },
    [canEdit]
  );
  const handleDeleteCard = (0, react_1.useCallback)(
    (cardId) => {
      if (!canEdit) return;
      setState((prev) => ({
        ...prev,
        cards: prev.cards.filter((c) => c.id !== cardId),
        selectedCardIds: prev.selectedCardIds.filter((id) => id !== cardId),
      }));
    },
    [canEdit]
  );
  const handleFitToScreen = (0, react_1.useCallback)(() => {
    if (state.cards.length === 0 || !containerRef.current) return;
    const bounds = state.cards.map((card) => ({
      x: card.position.x,
      y: card.position.y,
      width: card.position.width,
      height: card.position.height,
    }));
    const { width, height } = containerRef.current.getBoundingClientRect();
    const newViewport = (0, viewport_controls_1.calculateFitToScreen)({
      bounds,
      containerWidth: width,
      containerHeight: height,
      padding: 40,
    });
    setState((prev) => ({ ...prev, viewport: newViewport }));
  }, [state.cards]);
  const handleKeyDown = (0, react_1.useCallback)(
    (e) => {
      if (!canEdit) return;
      if (
        (e.key === "Delete" || e.key === "Backspace") &&
        state.selectedCardIds.length > 0
      ) {
        state.selectedCardIds.forEach((id) => handleDeleteCard(id));
      }
      if (e.key === "Escape") {
        setState((prev) => ({ ...prev, selectedCardIds: [] }));
      }
      if (e.key === "a" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setState((prev) => ({
          ...prev,
          selectedCardIds: prev.cards.map((c) => c.id),
        }));
      }
    },
    [canEdit, state.selectedCardIds, state.cards, handleDeleteCard]
  );
  return (
    <div
      aria-label="Command board canvas"
      className="flex h-full flex-col overflow-hidden"
      onKeyDown={handleKeyDown}
      ref={containerRef}
      role="region"
      tabIndex={0}
    >
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
            <button_1.Button
              onClick={handleAddCard}
              size="sm"
              variant="default"
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
                <line x1="12" x2="12" y1="5" y2="19" />
                <line x1="5" x2="19" y1="12" y2="12" />
              </svg>
              Add Card
            </button_1.Button>
          )}

          <button_1.Button
            disabled={state.cards.length === 0}
            onClick={handleFitToScreen}
            size="sm"
            variant="outline"
          >
            Fit
          </button_1.Button>

          <button_1.Button
            aria-label="Board settings"
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
          </button_1.Button>
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

      <canvas_viewport_1.CanvasViewport
        enableKeyboardShortcuts={true}
        enablePan={true}
        enableWheelZoom={true}
        initialViewport={state.viewport}
        onViewportChange={handleViewportChange}
        showControls={true}
      >
        <div className="relative min-w-[4000px] min-h-[4000px]">
          <grid_layer_1.GridLayer
            className="absolute inset-0"
            gridSize={gridSize}
            showGrid={showGrid}
          />

          {state.cards.map((card) => (
            <board_card_1.BoardCard
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
                <p className="text-muted-foreground mb-4 text-lg">
                  No cards on the board yet
                </p>
                {canEdit && (
                  <button_1.Button onClick={handleAddCard} size="lg">
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
                  </button_1.Button>
                )}
              </div>
            </div>
          )}
        </div>
      </canvas_viewport_1.CanvasViewport>
    </div>
  );
}
