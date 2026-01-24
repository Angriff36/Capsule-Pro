import { type ReactNode } from "react";
import { type BoundingBox, type Point, type ViewportState } from "../types";
interface CanvasViewportProps {
  /** Child elements to render within the viewport */
  children?: ReactNode;
  /** Additional CSS classes for the viewport container */
  className?: string;
  /** Initial viewport state */
  initialViewport?: Partial<ViewportState>;
  /** Callback when viewport changes (pan/zoom) */
  onViewportChange?: (viewport: ViewportState) => void;
  /** Whether to show viewport controls */
  showControls?: boolean;
  /** Position of viewport controls */
  controlsPosition?: "top-bar" | "floating";
  /** Whether wheel zoom is enabled */
  enableWheelZoom?: boolean;
  /** Whether panning is enabled */
  enablePan?: boolean;
  /** Whether keyboard shortcuts are enabled */
  enableKeyboardShortcuts?: boolean;
  /** Callback when a point on the canvas is clicked (canvas coordinates) */
  onCanvasClick?: (point: Point) => void;
  /** Callback when a point on the canvas is double-clicked (canvas coordinates) */
  onCanvasDoubleClick?: (point: Point) => void;
  /** Minimum zoom level */
  minZoom?: number;
  /** Maximum zoom level */
  maxZoom?: number;
  /** Function to get all content bounds for fit-to-screen */
  getContentBounds?: () => BoundingBox[];
}
export interface ViewportRef {
  zoomIn: () => void;
  zoomOut: () => void;
  resetViewport: () => void;
  setZoom: (zoom: number) => void;
}
/**
 * Custom hook for managing viewport state (zoom and pan)
 */
export declare function useViewportState(
  initialViewport?: Partial<ViewportState>,
  minZoom?: number,
  maxZoom?: number
): {
  viewport: ViewportState;
  setViewport: import("react").Dispatch<
    import("react").SetStateAction<ViewportState>
  >;
  setZoom: (zoom: number, focalPoint?: Point) => void;
  setPan: (panX: number, panY: number) => void;
  zoomIn: (focalPoint?: Point) => void;
  zoomOut: (focalPoint?: Point) => void;
  resetViewport: () => void;
  panBy: (deltaX: number, deltaY: number) => void;
};
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
export declare const CanvasViewport: import("react").ForwardRefExoticComponent<
  CanvasViewportProps & import("react").RefAttributes<ViewportRef>
>;
interface ViewportControlBarProps {
  viewport: ViewportState;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
  minZoom: number;
  maxZoom: number;
}
export type { CanvasViewportProps, ViewportControlBarProps };
//# sourceMappingURL=canvas-viewport.d.ts.map
