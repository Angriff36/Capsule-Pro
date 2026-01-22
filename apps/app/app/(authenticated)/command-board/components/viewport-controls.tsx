"use client";

import { Button } from "@repo/design-system/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@repo/design-system/components/ui/tooltip";
import { cn } from "@repo/design-system/lib/utils";
import { type ReactNode, useCallback } from "react";
import {
  type BoundingBox,
  VIEWPORT_DEFAULTS,
  type ViewportState,
} from "../types";

// =============================================================================
// Types
// =============================================================================

export type ViewportControlsProps = {
  /** Current viewport state */
  viewport: ViewportState;
  /** Callback to zoom in */
  onZoomIn: () => void;
  /** Callback to zoom out */
  onZoomOut: () => void;
  /** Callback to reset viewport to default state */
  onReset: () => void;
  /** Callback to fit all content in view (optional) */
  onFitToScreen?: () => void;
  /** Minimum zoom level */
  minZoom?: number;
  /** Maximum zoom level */
  maxZoom?: number;
  /** Additional CSS classes */
  className?: string;
  /** Position of the controls */
  position?:
    | "top-left"
    | "top-right"
    | "bottom-left"
    | "bottom-right"
    | "inline";
  /** Whether controls are disabled */
  disabled?: boolean;
};

export type FitToScreenOptions = {
  /** Bounding boxes of all items to fit */
  bounds: BoundingBox[];
  /** Container dimensions */
  containerWidth: number;
  containerHeight: number;
  /** Padding around the content */
  padding?: number;
  /** Minimum zoom level */
  minZoom?: number;
  /** Maximum zoom level */
  maxZoom?: number;
};

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Calculate the viewport state needed to fit all items in view
 */
export function calculateFitToScreen(
  options: FitToScreenOptions
): ViewportState {
  const {
    bounds,
    containerWidth,
    containerHeight,
    padding = 40,
    minZoom = VIEWPORT_DEFAULTS.MIN_ZOOM,
    maxZoom = VIEWPORT_DEFAULTS.MAX_ZOOM,
  } = options;

  // If no bounds, return default viewport
  if (bounds.length === 0) {
    return {
      zoom: VIEWPORT_DEFAULTS.DEFAULT_ZOOM,
      panX: 0,
      panY: 0,
    };
  }

  // Calculate the bounding box that contains all items
  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;

  for (const box of bounds) {
    minX = Math.min(minX, box.x);
    minY = Math.min(minY, box.y);
    maxX = Math.max(maxX, box.x + box.width);
    maxY = Math.max(maxY, box.y + box.height);
  }

  const contentWidth = maxX - minX;
  const contentHeight = maxY - minY;

  // If content has no size, return default viewport
  if (contentWidth <= 0 || contentHeight <= 0) {
    return {
      zoom: VIEWPORT_DEFAULTS.DEFAULT_ZOOM,
      panX: 0,
      panY: 0,
    };
  }

  // Calculate the zoom level to fit all content
  const availableWidth = containerWidth - padding * 2;
  const availableHeight = containerHeight - padding * 2;

  const zoomX = availableWidth / contentWidth;
  const zoomY = availableHeight / contentHeight;
  const zoom = Math.min(Math.max(Math.min(zoomX, zoomY), minZoom), maxZoom);

  // Calculate the center of the content
  const contentCenterX = minX + contentWidth / 2;
  const contentCenterY = minY + contentHeight / 2;

  // Calculate pan to center the content
  const panX = containerWidth / 2 - contentCenterX * zoom;
  const panY = containerHeight / 2 - contentCenterY * zoom;

  return { zoom, panX, panY };
}

// =============================================================================
// Icon Components
// =============================================================================

function ZoomInIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
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

function ZoomOutIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
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

function FitViewIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
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

function ResetIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
    </svg>
  );
}

// =============================================================================
// Helper Components
// =============================================================================

type ControlButtonProps = {
  onClick: () => void;
  disabled?: boolean;
  tooltip: string;
  shortcut?: string;
  ariaLabel: string;
  children: ReactNode;
};

function ControlButton({
  onClick,
  disabled,
  tooltip,
  shortcut,
  ariaLabel,
  children,
}: ControlButtonProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          aria-label={ariaLabel}
          disabled={disabled}
          onClick={onClick}
          size="icon-sm"
          variant="ghost"
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent className="flex items-center gap-2" side="bottom">
        <span>{tooltip}</span>
        {shortcut && (
          <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-medium font-mono text-[10px] text-muted-foreground">
            {shortcut}
          </kbd>
        )}
      </TooltipContent>
    </Tooltip>
  );
}

// =============================================================================
// Main Component
// =============================================================================

/**
 * ViewportControls - A reusable component for viewport zoom and pan controls
 *
 * Features:
 * - Zoom in/out buttons with keyboard shortcut hints
 * - Zoom level display (clickable to reset)
 * - Reset viewport button
 * - Fit-to-screen button (optional)
 * - Multiple positioning options
 * - Accessible with proper ARIA labels
 * - Tooltips with keyboard shortcut hints
 */
export function ViewportControls({
  viewport,
  onZoomIn,
  onZoomOut,
  onReset,
  onFitToScreen,
  minZoom = VIEWPORT_DEFAULTS.MIN_ZOOM,
  maxZoom = VIEWPORT_DEFAULTS.MAX_ZOOM,
  className,
  position = "inline",
  disabled = false,
}: ViewportControlsProps) {
  const zoomPercentage = Math.round(viewport.zoom * 100);
  const canZoomIn = viewport.zoom < maxZoom;
  const canZoomOut = viewport.zoom > minZoom;

  // Position styles for floating controls
  const positionStyles: Record<Exclude<typeof position, "inline">, string> = {
    "top-left": "absolute top-3 left-3",
    "top-right": "absolute top-3 right-3",
    "bottom-left": "absolute bottom-3 left-3",
    "bottom-right": "absolute bottom-3 right-3",
  };

  const containerClassName = cn(
    "flex items-center gap-1 rounded-lg border bg-background/95 p-1 shadow-sm backdrop-blur-sm",
    position !== "inline" && positionStyles[position],
    disabled && "pointer-events-none opacity-50",
    className
  );

  return (
    <div
      aria-label="Viewport controls"
      className={containerClassName}
      role="toolbar"
    >
      {/* Zoom Controls Group */}
      <div className="flex items-center gap-0.5">
        {/* Zoom Out Button */}
        <ControlButton
          ariaLabel={`Zoom out. Current zoom: ${zoomPercentage}%`}
          disabled={disabled || !canZoomOut}
          onClick={onZoomOut}
          shortcut="-"
          tooltip="Zoom out"
        >
          <ZoomOutIcon className="h-4 w-4" />
        </ControlButton>

        {/* Zoom Level Display / Reset Button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              aria-label={`Current zoom: ${zoomPercentage}%. Click to reset to 100%`}
              className="min-w-[3.5rem] px-2 font-mono text-xs"
              disabled={disabled}
              onClick={onReset}
              size="sm"
              variant="ghost"
            >
              {zoomPercentage}%
            </Button>
          </TooltipTrigger>
          <TooltipContent className="flex items-center gap-2" side="bottom">
            <span>Reset zoom to 100%</span>
            <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-medium font-mono text-[10px] text-muted-foreground">
              0
            </kbd>
          </TooltipContent>
        </Tooltip>

        {/* Zoom In Button */}
        <ControlButton
          ariaLabel={`Zoom in. Current zoom: ${zoomPercentage}%`}
          disabled={disabled || !canZoomIn}
          onClick={onZoomIn}
          shortcut="+"
          tooltip="Zoom in"
        >
          <ZoomInIcon className="h-4 w-4" />
        </ControlButton>
      </div>

      {/* Divider */}
      <div aria-hidden="true" className="mx-1 h-5 w-px bg-border" />

      {/* Action Controls Group */}
      <div className="flex items-center gap-0.5">
        {/* Reset Button */}
        <ControlButton
          ariaLabel="Reset viewport to default position and zoom"
          disabled={disabled}
          onClick={onReset}
          shortcut="0"
          tooltip="Reset viewport"
        >
          <ResetIcon className="h-4 w-4" />
        </ControlButton>

        {/* Fit to Screen Button */}
        {onFitToScreen && (
          <ControlButton
            ariaLabel="Fit all content to screen"
            disabled={disabled}
            onClick={onFitToScreen}
            shortcut="F"
            tooltip="Fit to screen"
          >
            <FitViewIcon className="h-4 w-4" />
          </ControlButton>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// Preset Zoom Levels Component
// =============================================================================

type ZoomPresetsProps = {
  onZoomTo: (zoom: number) => void;
  currentZoom: number;
  presets?: number[];
  className?: string;
  disabled?: boolean;
};

/**
 * ZoomPresets - Quick zoom level selection buttons
 */
export function ZoomPresets({
  onZoomTo,
  currentZoom,
  presets = [0.5, 0.75, 1, 1.5, 2],
  className,
  disabled = false,
}: ZoomPresetsProps) {
  return (
    <div
      aria-label="Zoom presets"
      className={cn(
        "flex items-center gap-1 rounded-lg border bg-background/95 p-1 shadow-sm backdrop-blur-sm",
        disabled && "pointer-events-none opacity-50",
        className
      )}
      role="toolbar"
    >
      {presets.map((preset) => {
        const percentage = Math.round(preset * 100);
        const isActive = Math.abs(currentZoom - preset) < 0.01;

        return (
          <Button
            aria-label={`Set zoom to ${percentage}%`}
            aria-pressed={isActive}
            className="min-w-[3rem] px-2 font-mono text-xs"
            disabled={disabled}
            key={preset}
            onClick={() => onZoomTo(preset)}
            size="sm"
            variant={isActive ? "secondary" : "ghost"}
          >
            {percentage}%
          </Button>
        );
      })}
    </div>
  );
}

// =============================================================================
// Combined Viewport Toolbar
// =============================================================================

interface ViewportToolbarProps extends Omit<ViewportControlsProps, "position"> {
  /** Show zoom presets */
  showPresets?: boolean;
  /** Zoom preset values */
  presets?: number[];
  /** Callback to set specific zoom level */
  onZoomTo?: (zoom: number) => void;
  /** Position of the toolbar */
  position?: "top" | "bottom";
  /** Show pan coordinates */
  showPanCoordinates?: boolean;
}

/**
 * ViewportToolbar - Full viewport control toolbar with optional presets
 */
export function ViewportToolbar({
  viewport,
  onZoomIn,
  onZoomOut,
  onReset,
  onFitToScreen,
  onZoomTo,
  minZoom,
  maxZoom,
  className,
  position = "top",
  showPresets = false,
  presets,
  showPanCoordinates = true,
  disabled = false,
}: ViewportToolbarProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-between border-b bg-background px-4 py-2",
        position === "bottom" && "border-t border-b-0",
        className
      )}
    >
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground text-sm">Viewport</span>
      </div>

      <div className="flex items-center gap-2">
        {showPresets && onZoomTo && (
          <ZoomPresets
            currentZoom={viewport.zoom}
            disabled={disabled}
            onZoomTo={onZoomTo}
            presets={presets}
          />
        )}
        <ViewportControls
          disabled={disabled}
          maxZoom={maxZoom}
          minZoom={minZoom}
          onFitToScreen={onFitToScreen}
          onReset={onReset}
          onZoomIn={onZoomIn}
          onZoomOut={onZoomOut}
          viewport={viewport}
        />
      </div>

      {showPanCoordinates && (
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground text-xs">
            Pan: ({Math.round(viewport.panX)}, {Math.round(viewport.panY)})
          </span>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// Hook: useViewportControls
// =============================================================================

type UseViewportControlsOptions = {
  /** Initial viewport state */
  initialViewport?: Partial<ViewportState>;
  /** Minimum zoom level */
  minZoom?: number;
  /** Maximum zoom level */
  maxZoom?: number;
  /** Container ref for fit-to-screen calculations */
  containerRef?: React.RefObject<HTMLElement>;
  /** Function to get all content bounds for fit-to-screen */
  getContentBounds?: () => BoundingBox[];
};

/**
 * Hook for managing viewport controls with fit-to-screen support
 */
export function useViewportControls(options: UseViewportControlsOptions = {}) {
  const {
    containerRef,
    getContentBounds,
    minZoom = VIEWPORT_DEFAULTS.MIN_ZOOM,
    maxZoom = VIEWPORT_DEFAULTS.MAX_ZOOM,
  } = options;

  const fitToScreen = useCallback(() => {
    if (!(containerRef?.current && getContentBounds)) {
      return null;
    }

    const bounds = getContentBounds();
    const { width, height } = containerRef.current.getBoundingClientRect();

    return calculateFitToScreen({
      bounds,
      containerWidth: width,
      containerHeight: height,
      minZoom,
      maxZoom,
    });
  }, [containerRef, getContentBounds, minZoom, maxZoom]);

  return {
    fitToScreen,
    calculateFitToScreen,
  };
}
