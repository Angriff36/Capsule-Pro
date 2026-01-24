"use client";

Object.defineProperty(exports, "__esModule", { value: true });
exports.CanvasViewport = void 0;
exports.useViewportState = useViewportState;
const utils_1 = require("@repo/design-system/lib/utils");
const react_1 = require("react");
const types_1 = require("../types");
// =============================================================================
// Hook: useViewportState
// =============================================================================
/**
 * Custom hook for managing viewport state (zoom and pan)
 */
function useViewportState(
  initialViewport,
  minZoom = types_1.VIEWPORT_DEFAULTS.MIN_ZOOM,
  maxZoom = types_1.VIEWPORT_DEFAULTS.MAX_ZOOM
) {
  const [viewport, setViewport] = (0, react_1.useState)({
    zoom: initialViewport?.zoom ?? types_1.VIEWPORT_DEFAULTS.DEFAULT_ZOOM,
    panX: initialViewport?.panX ?? 0,
    panY: initialViewport?.panY ?? 0,
  });
  const setZoom = (0, react_1.useCallback)(
    (zoom, focalPoint) => {
      setViewport((prev) => {
        const newZoom = (0, types_1.clampZoom)(zoom, minZoom, maxZoom);
        // If a focal point is provided, adjust pan to keep that point stationary
        if (focalPoint) {
          const zoomRatio = newZoom / prev.zoom;
          return {
            zoom: newZoom,
            panX: focalPoint.x - (focalPoint.x - prev.panX) * zoomRatio,
            panY: focalPoint.y - (focalPoint.y - prev.panY) * zoomRatio,
          };
        }
        return { ...prev, zoom: newZoom };
      });
    },
    [minZoom, maxZoom]
  );
  const setPan = (0, react_1.useCallback)((panX, panY) => {
    setViewport((prev) => ({ ...prev, panX, panY }));
  }, []);
  const zoomIn = (0, react_1.useCallback)(
    (focalPoint) => {
      setViewport((prev) => {
        const newZoom = (0, types_1.clampZoom)(
          prev.zoom + types_1.VIEWPORT_DEFAULTS.ZOOM_STEP,
          minZoom,
          maxZoom
        );
        if (focalPoint) {
          const zoomRatio = newZoom / prev.zoom;
          return {
            zoom: newZoom,
            panX: focalPoint.x - (focalPoint.x - prev.panX) * zoomRatio,
            panY: focalPoint.y - (focalPoint.y - prev.panY) * zoomRatio,
          };
        }
        return { ...prev, zoom: newZoom };
      });
    },
    [minZoom, maxZoom]
  );
  const zoomOut = (0, react_1.useCallback)(
    (focalPoint) => {
      setViewport((prev) => {
        const newZoom = (0, types_1.clampZoom)(
          prev.zoom - types_1.VIEWPORT_DEFAULTS.ZOOM_STEP,
          minZoom,
          maxZoom
        );
        if (focalPoint) {
          const zoomRatio = newZoom / prev.zoom;
          return {
            zoom: newZoom,
            panX: focalPoint.x - (focalPoint.x - prev.panX) * zoomRatio,
            panY: focalPoint.y - (focalPoint.y - prev.panY) * zoomRatio,
          };
        }
        return { ...prev, zoom: newZoom };
      });
    },
    [minZoom, maxZoom]
  );
  const resetViewport = (0, react_1.useCallback)(() => {
    setViewport({
      zoom: types_1.VIEWPORT_DEFAULTS.DEFAULT_ZOOM,
      panX: 0,
      panY: 0,
    });
  }, []);
  const panBy = (0, react_1.useCallback)((deltaX, deltaY) => {
    setViewport((prev) => ({
      ...prev,
      panX: prev.panX + deltaX,
      panY: prev.panY + deltaY,
    }));
  }, []);
  return {
    viewport,
    setViewport,
    setZoom,
    setPan,
    zoomIn,
    zoomOut,
    resetViewport,
    panBy,
  };
}
// =============================================================================
// Component: CanvasViewport
// =============================================================================
/**
 * CanvasViewport - A zoomable and pannable viewport for canvas-based content
 *
 * Features:
 * - Mouse wheel zoom with focal point support
 * - Middle-click or Space+drag panning
 * - Keyboard shortcuts (+/- for zoom, arrows for pan, 0 to reset)
 * - Smooth CSS transitions for zoom changes
 * - Coordinate transformation between screen and canvas space
 */
exports.CanvasViewport = (0, react_1.forwardRef)(function CanvasViewport(
  {
    children,
    className,
    initialViewport,
    onViewportChange,
    showControls = true,
    enableWheelZoom = true,
    enablePan = true,
    enableKeyboardShortcuts = true,
    onCanvasClick,
    onCanvasDoubleClick,
    minZoom = types_1.VIEWPORT_DEFAULTS.MIN_ZOOM,
    maxZoom = types_1.VIEWPORT_DEFAULTS.MAX_ZOOM,
  },
  ref
) {
  const containerRef = (0, react_1.useRef)(null);
  const contentRef = (0, react_1.useRef)(null);
  const { viewport, setViewport, zoomIn, zoomOut, resetViewport, panBy } =
    useViewportState(initialViewport, minZoom, maxZoom);
  // Expose zoom functions via ref for external control
  (0, react_1.useImperativeHandle)(
    ref,
    () => ({
      zoomIn,
      zoomOut,
      resetViewport,
      setZoom: (zoom) => setViewport((prev) => ({ ...prev, zoom })),
    }),
    [zoomIn, zoomOut, resetViewport, setViewport]
  );
  const [panState, setPanState] = (0, react_1.useState)({
    isPanning: false,
    startX: 0,
    startY: 0,
    startPanX: 0,
    startPanY: 0,
  });
  const [isSpacePressed, setIsSpacePressed] = (0, react_1.useState)(false);
  // Notify parent of viewport changes
  (0, react_1.useEffect)(() => {
    onViewportChange?.(viewport);
  }, [viewport, onViewportChange]);
  // Get mouse position relative to the container
  const getMousePosition = (0, react_1.useCallback)((e) => {
    if (!containerRef.current) {
      return { x: 0, y: 0 };
    }
    const rect = containerRef.current.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  }, []);
  // Handle wheel zoom
  const handleWheel = (0, react_1.useCallback)(
    (e) => {
      if (!enableWheelZoom) {
        return;
      }
      e.preventDefault();
      const mousePos = getMousePosition(e);
      const delta =
        e.deltaY > 0
          ? -types_1.VIEWPORT_DEFAULTS.ZOOM_STEP
          : types_1.VIEWPORT_DEFAULTS.ZOOM_STEP;
      setViewport((prev) => {
        const newZoom = (0, types_1.clampZoom)(
          prev.zoom + delta,
          minZoom,
          maxZoom
        );
        const zoomRatio = newZoom / prev.zoom;
        return {
          zoom: newZoom,
          panX: mousePos.x - (mousePos.x - prev.panX) * zoomRatio,
          panY: mousePos.y - (mousePos.y - prev.panY) * zoomRatio,
        };
      });
    },
    [enableWheelZoom, getMousePosition, setViewport, minZoom, maxZoom]
  );
  // Handle mouse down for panning
  const handleMouseDown = (0, react_1.useCallback)(
    (e) => {
      if (!enablePan) {
        return;
      }
      // Middle click or space+left click initiates panning
      const shouldPan = e.button === 1 || (e.button === 0 && isSpacePressed);
      if (shouldPan) {
        e.preventDefault();
        setPanState({
          isPanning: true,
          startX: e.clientX,
          startY: e.clientY,
          startPanX: viewport.panX,
          startPanY: viewport.panY,
        });
      }
    },
    [enablePan, isSpacePressed, viewport.panX, viewport.panY]
  );
  // Handle mouse move for panning
  const handleMouseMove = (0, react_1.useCallback)(
    (e) => {
      if (!panState.isPanning) return;
      const deltaX = e.clientX - panState.startX;
      const deltaY = e.clientY - panState.startY;
      setViewport((prev) => ({
        ...prev,
        panX: panState.startPanX + deltaX,
        panY: panState.startPanY + deltaY,
      }));
    },
    [panState, setViewport]
  );
  // Handle mouse up to end panning
  const handleMouseUp = (0, react_1.useCallback)(() => {
    if (panState.isPanning) {
      setPanState((prev) => ({ ...prev, isPanning: false }));
    }
  }, [panState.isPanning]);
  // Handle click on canvas
  const handleClick = (0, react_1.useCallback)(
    (e) => {
      if (!onCanvasClick || panState.isPanning) return;
      // Don't trigger click if we just finished panning
      const target = e.target;
      if (target !== containerRef.current && target !== contentRef.current) {
        return; // Click was on a child element
      }
      const mousePos = getMousePosition(e);
      const canvasPos = (0, types_1.screenToCanvas)(mousePos, viewport);
      onCanvasClick(canvasPos);
    },
    [onCanvasClick, panState.isPanning, getMousePosition, viewport]
  );
  // Handle double-click on canvas
  const handleDoubleClick = (0, react_1.useCallback)(
    (e) => {
      if (!onCanvasDoubleClick) return;
      const target = e.target;
      if (target !== containerRef.current && target !== contentRef.current) {
        return; // Click was on a child element
      }
      const mousePos = getMousePosition(e);
      const canvasPos = (0, types_1.screenToCanvas)(mousePos, viewport);
      onCanvasDoubleClick(canvasPos);
    },
    [onCanvasDoubleClick, getMousePosition, viewport]
  );
  // Handle keyboard events
  const handleKeyDown = (0, react_1.useCallback)(
    (e) => {
      if (!enableKeyboardShortcuts) return;
      // Track space key for space+drag panning
      if (e.code === "Space") {
        e.preventDefault();
        setIsSpacePressed(true);
        return;
      }
      // Zoom controls
      if (e.key === "=" || e.key === "+") {
        e.preventDefault();
        zoomIn();
        return;
      }
      if (e.key === "-" || e.key === "_") {
        e.preventDefault();
        zoomOut();
        return;
      }
      // Reset viewport
      if (e.key === "0") {
        e.preventDefault();
        resetViewport();
        return;
      }
      // Arrow key panning
      const panAmount = types_1.VIEWPORT_DEFAULTS.PAN_STEP;
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        panBy(panAmount, 0);
        return;
      }
      if (e.key === "ArrowRight") {
        e.preventDefault();
        panBy(-panAmount, 0);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        panBy(0, panAmount);
        return;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        panBy(0, -panAmount);
        return;
      }
    },
    [enableKeyboardShortcuts, zoomIn, zoomOut, resetViewport, panBy]
  );
  const handleKeyUp = (0, react_1.useCallback)((e) => {
    if (e.code === "Space") {
      setIsSpacePressed(false);
    }
  }, []);
  // Add global mouse up listener for ending pan outside container
  (0, react_1.useEffect)(() => {
    const handleGlobalMouseUp = () => {
      if (panState.isPanning) {
        setPanState((prev) => ({ ...prev, isPanning: false }));
      }
    };
    window.addEventListener("mouseup", handleGlobalMouseUp);
    return () => window.removeEventListener("mouseup", handleGlobalMouseUp);
  }, [panState.isPanning]);
  // Calculate transform style with smooth transitions for non-drag interactions
  const transformStyle = {
    transform: `translate(${viewport.panX}px, ${viewport.panY}px) scale(${viewport.zoom})`,
    transformOrigin: "0 0",
    transition: panState.isPanning ? "none" : "transform 0.15s ease-out",
  };
  // Calculate cursor style based on state
  const getCursorStyle = () => {
    if (panState.isPanning) return "grabbing";
    if (isSpacePressed) return "grab";
    return "default";
  };
  return (
    <div className="relative flex h-full w-full flex-col">
      {/* Viewport Controls */}
      {showControls && (
        <ViewportControlBar
          maxZoom={maxZoom}
          minZoom={minZoom}
          onReset={resetViewport}
          onZoomIn={() => zoomIn()}
          onZoomOut={() => zoomOut()}
          viewport={viewport}
        />
      )}

      {/* Canvas Container */}
      <div
        aria-label="Canvas viewport - Use mouse wheel to zoom, middle-click or space+drag to pan, arrow keys to navigate"
        className={(0, utils_1.cn)(
          "relative flex-1 overflow-hidden bg-muted/30",
          className
        )}
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
        onKeyDown={handleKeyDown}
        onKeyUp={handleKeyUp}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onWheel={handleWheel}
        ref={containerRef}
        role="application"
        style={{ cursor: getCursorStyle() }}
        tabIndex={0}
      >
        {/* Transformed Content Layer */}
        <div
          className="pointer-events-none absolute inset-0"
          ref={contentRef}
          style={transformStyle}
        >
          <div className="pointer-events-auto">{children}</div>
        </div>

        {/* Keyboard Shortcuts Hint (bottom-left) */}
        {enableKeyboardShortcuts && (
          <div className="pointer-events-none absolute bottom-3 left-3 text-muted-foreground text-xs opacity-50">
            <span className="hidden sm:inline">
              Scroll to zoom | Space+drag to pan | 0 to reset
            </span>
          </div>
        )}
      </div>
    </div>
  );
});
function ViewportControlBar({
  viewport,
  onZoomIn,
  onZoomOut,
  onReset,
  minZoom,
  maxZoom,
}) {
  const zoomPercentage = Math.round(viewport.zoom * 100);
  const canZoomIn = viewport.zoom < maxZoom;
  const canZoomOut = viewport.zoom > minZoom;
  return (
    <div className="flex items-center justify-between border-b bg-background px-4 py-2">
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground text-sm">Viewport</span>
      </div>

      <div className="flex items-center gap-1">
        {/* Zoom Out Button */}
        <button
          aria-label="Zoom out"
          className={(0, utils_1.cn)(
            "inline-flex h-8 w-8 items-center justify-center rounded-md text-sm transition-colors",
            "hover:bg-accent hover:text-accent-foreground",
            "disabled:pointer-events-none disabled:opacity-50"
          )}
          disabled={!canZoomOut}
          onClick={onZoomOut}
          title="Zoom out (-)"
          type="button"
        >
          <ZoomOutIcon className="h-4 w-4" />
        </button>

        {/* Zoom Level Display */}
        <button
          aria-label={`Current zoom: ${zoomPercentage}%. Click to reset to 100%`}
          className={(0, utils_1.cn)(
            "inline-flex h-8 min-w-[4rem] items-center justify-center rounded-md px-2 font-medium text-sm transition-colors",
            "hover:bg-accent hover:text-accent-foreground"
          )}
          onClick={onReset}
          title="Reset zoom (0)"
          type="button"
        >
          {zoomPercentage}%
        </button>

        {/* Zoom In Button */}
        <button
          aria-label="Zoom in"
          className={(0, utils_1.cn)(
            "inline-flex h-8 w-8 items-center justify-center rounded-md text-sm transition-colors",
            "hover:bg-accent hover:text-accent-foreground",
            "disabled:pointer-events-none disabled:opacity-50"
          )}
          disabled={!canZoomIn}
          onClick={onZoomIn}
          title="Zoom in (+)"
          type="button"
        >
          <ZoomInIcon className="h-4 w-4" />
        </button>

        {/* Divider */}
        <div className="mx-2 h-5 w-px bg-border" />

        {/* Fit to View Button */}
        <button
          aria-label="Fit to view"
          className={(0, utils_1.cn)(
            "inline-flex h-8 items-center justify-center gap-1.5 rounded-md px-2.5 text-sm transition-colors",
            "hover:bg-accent hover:text-accent-foreground"
          )}
          onClick={onReset}
          title="Reset viewport (0)"
          type="button"
        >
          <FitViewIcon className="h-4 w-4" />
          <span className="hidden sm:inline">Fit</span>
        </button>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-muted-foreground text-xs">
          Pan: ({Math.round(viewport.panX)}, {Math.round(viewport.panY)})
        </span>
      </div>
    </div>
  );
}
// =============================================================================
// Icon Components
// =============================================================================
function ZoomInIcon({ className }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="11" cy="11" r="8" />
      <line x1="21" x2="16.65" y1="21" y2="16.65" />
      <line x1="11" x2="11" y1="8" y2="14" />
      <line x1="8" x2="14" y1="11" y2="11" />
    </svg>
  );
}
function ZoomOutIcon({ className }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="11" cy="11" r="8" />
      <line x1="21" x2="16.65" y1="21" y2="16.65" />
      <line x1="8" x2="14" y1="11" y2="11" />
    </svg>
  );
}
function FitViewIcon({ className }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M8 3H5a2 2 0 0 0-2 2v3" />
      <path d="M21 8V5a2 2 0 0 0-2-2h-3" />
      <path d="M3 16v3a2 2 0 0 0 2 2h3" />
      <path d="M16 21h3a2 2 0 0 0 2-2v-3" />
    </svg>
  );
}
