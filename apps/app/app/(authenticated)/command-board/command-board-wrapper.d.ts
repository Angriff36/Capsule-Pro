import type { CommandBoardCard } from "./types";
type CommandBoardRealtimePageProps = {
  boardId: string;
  orgId: string;
  tenantId: string;
  initialCards?: CommandBoardCard[];
};
declare function CommandBoardRealtimeContent({
  boardId,
  orgId,
  tenantId,
  initialCards,
}: CommandBoardRealtimePageProps): import("react").JSX.Element;
export { CommandBoardRealtimeContent };
//# sourceMappingURL=command-board-wrapper.d.ts.map
