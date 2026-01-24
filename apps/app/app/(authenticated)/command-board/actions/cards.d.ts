import type {
  CardPosition,
  CommandBoardCard,
  CreateCardInput,
  UpdateCardInput,
} from "../types";
export type CardResult = {
  success: boolean;
  card?: CommandBoardCard;
  error?: string;
};
export declare function createCard(
  boardId: string,
  input: CreateCardInput
): Promise<CardResult>;
export declare function updateCard(input: UpdateCardInput): Promise<CardResult>;
export declare function deleteCard(cardId: string): Promise<CardResult>;
export declare function batchUpdateCardPositions(
  updates: Array<{
    id: string;
    position: CardPosition;
  }>
): Promise<{
  success: number;
  failed: number;
}>;
export declare function bringCardToFront(cardId: string): Promise<CardResult>;
//# sourceMappingURL=cards.d.ts.map
