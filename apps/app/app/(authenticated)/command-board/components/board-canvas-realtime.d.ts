import { type CommandBoardCard, type ViewportState } from "../types";
type BoardCanvasProps = {
  boardId: string;
  initialCards?: CommandBoardCard[];
  canEdit?: boolean;
  onCardsChange?: (cards: CommandBoardCard[]) => void;
  onViewportChange?: (viewport: ViewportState) => void;
};
export declare function BoardCanvas({
  boardId,
  initialCards,
  canEdit,
  onCardsChange,
  onViewportChange,
}: BoardCanvasProps): import("react").JSX.Element;
//# sourceMappingURL=board-canvas-realtime.d.ts.map
