import type {
  CommandBoard,
  CommandBoardCard,
  CreateBoardInput,
  UpdateBoardInput,
} from "../types";
export type BoardResult = {
  success: boolean;
  board?: CommandBoard;
  error?: string;
};
export interface CommandBoardWithCards extends CommandBoard {
  cards: CommandBoardCard[];
}
export declare function getCommandBoard(
  boardId: string
): Promise<CommandBoardWithCards | null>;
export declare function listCommandBoards(): Promise<CommandBoard[]>;
export declare function createCommandBoard(
  input: CreateBoardInput
): Promise<BoardResult>;
export declare function updateCommandBoard(
  input: UpdateBoardInput
): Promise<BoardResult>;
export declare function deleteCommandBoard(
  boardId: string
): Promise<BoardResult>;
//# sourceMappingURL=boards.d.ts.map
