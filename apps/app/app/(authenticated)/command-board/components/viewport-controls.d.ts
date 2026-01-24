import { type BoundingBox, type ViewportState } from "../types";
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
/**
 * Calculate the viewport state needed to fit all items in view
 */
export declare function calculateFitToScreen(
  options: FitToScreenOptions
): ViewportState;
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
export declare function ViewportControls({
  viewport,
  onZoomIn,
  onZoomOut,
  onReset,
  onFitToScreen,
  minZoom,
  maxZoom,
  className,
  position,
  disabled,
}: ViewportControlsProps): import("react").JSX.Element;
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
export declare function ZoomPresets({
  onZoomTo,
  currentZoom,
  presets,
  className,
  disabled,
}: ZoomPresetsProps): import("react").JSX.Element;
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
export declare function ViewportToolbar({
  viewport,
  onZoomIn,
  onZoomOut,
  onReset,
  onFitToScreen,
  onZoomTo,
  minZoom,
  maxZoom,
  className,
  position,
  showPresets,
  presets,
  showPanCoordinates,
  disabled,
}: ViewportToolbarProps): import("react").JSX.Element;
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
export declare function useViewportControls(
  options?: UseViewportControlsOptions
): {
  fitToScreen: () => ViewportState | null;
  calculateFitToScreen: typeof calculateFitToScreen;
};
//# sourceMappingURL=viewport-controls.d.ts.map
