import type { CommandBoardCard, Point } from "../types";
type DraggableCardProps = {
  /** The card to render */
  card: CommandBoardCard;
  /** Whether the card is selected */
  isSelected: boolean;
  /** Whether dragging is enabled */
  canDrag: boolean;
  /** Whether resizing is enabled */
  canResize?: boolean;
  /** Grid size for snapping */
  gridSize: number;
  /** Whether snap to grid is enabled */
  snapToGridEnabled: boolean;
  /** Current viewport zoom level */
  viewportZoom: number;
  /** Callback when card position changes */
  onPositionChange: (cardId: string, position: Point) => void;
  /** Callback when card size changes */
  onSizeChange?: (cardId: string, width: number, height: number) => void;
  /** Callback when card is clicked */
  onClick: () => void;
  /** Callback when card is deleted */
  onDelete?: (cardId: string) => void;
  /** Additional CSS classes */
  className?: string;
  /** Card content renderer */
  children: React.ReactNode;
};
/**
 * DraggableCard - A card component with drag and resize capabilities using react-moveable
 *
 * This component wraps card content and provides drag/resize functionality.
 * It works in world coordinates (canvas space) and respects the viewport transform.
 */
export declare const DraggableCard: import("react").NamedExoticComponent<DraggableCardProps>;
//# sourceMappingURL=draggable-card.d.ts.map
