import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { notFound } from "next/navigation";
import { getTenantIdForOrg } from "../../../../lib/tenant";
import { Header } from "../../../components/header";
import { BattleBoardEditorClient } from "./battle-board-editor-client";

interface PageProps {
  params: Promise<{ boardId: string }>;
}

const BattleBoardDetailPage = async ({ params }: PageProps) => {
  const { orgId } = await auth();
  const { boardId } = await params;

  if (!orgId) {
    notFound();
  }

  const tenantId = await getTenantIdForOrg(orgId);

  const board = await database.battleBoard.findFirst({
    where: {
      id: boardId,
      tenantId,
      deletedAt: null,
    },
  });

  if (!board) {
    notFound();
  }

  // Fetch event data if linked
  let event = null;
  if (board.eventId) {
    event = await database.event.findFirst({
      where: {
        id: board.eventId,
        tenantId,
        deletedAt: null,
      },
      select: {
        id: true,
        eventNumber: true,
        title: true,
        eventDate: true,
        venueName: true,
        venueAddress: true,
        guestCount: true,
      },
    });
  }

  return (
    <>
      <Header page={board.board_name} pages={["Events", "Battle Boards"]} />
      <div className="flex flex-1 flex-col p-4 pt-0">
        <BattleBoardEditorClient
          board={{
            id: board.id,
            boardName: board.board_name,
            boardType: board.board_type,
            status: board.status,
            boardData: board.boardData as Record<string, unknown>,
            notes: board.notes,
            isTemplate: board.is_template,
            createdAt: board.createdAt.toISOString(),
            updatedAt: board.updatedAt.toISOString(),
          }}
          event={
            event
              ? {
                  id: event.id,
                  eventNumber: event.eventNumber,
                  title: event.title,
                  eventDate: event.eventDate.toISOString(),
                  venueName: event.venueName,
                  venueAddress: event.venueAddress,
                  guestCount: event.guestCount,
                }
              : null
          }
        />
      </div>
    </>
  );
};

export default BattleBoardDetailPage;
