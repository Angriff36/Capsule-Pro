import type { CommandBoardCard } from "../types";
type BoardCardProps = {
  card: CommandBoardCard;
  isSelected: boolean;
  canDrag: boolean;
  gridSize: number;
  snapToGridEnabled: boolean;
  viewportZoom: number;
  onClick: () => void;
  onPositionChange: (
    cardId: string,
    position: {
      x: number;
      y: number;
    }
  ) => void;
  onSizeChange?: (cardId: string, width: number, height: number) => void;
  onDelete: (cardId: string) => void;
  className?: string;
};
export declare const BoardCard: import("react").NamedExoticComponent<BoardCardProps>;
//# sourceMappingURL=board-card.d.ts.map
