import { Header } from "../../../components/header";
import { getBoardFull } from "../actions";
import { BattleBoardEditorClient } from "./battle-board-editor-client";

interface PageProps {
  params: Promise<{ boardId: string }>;
}

const BattleBoardDetailPage = async ({ params }: PageProps) => {
  const { boardId } = await params;
  const full = await getBoardFull(boardId);

  return (
    <>
      <Header
        page={full.event_name || "Battle Board"}
        pages={[
          { label: "Events", href: "/events" },
          { label: "Battle Boards", href: "/events/battle-boards" },
        ]}
      />
      <div className="flex flex-1 flex-col p-4 pt-0">
        <BattleBoardEditorClient boardId={boardId} initialBoard={full} />
      </div>
    </>
  );
};

export default BattleBoardDetailPage;
