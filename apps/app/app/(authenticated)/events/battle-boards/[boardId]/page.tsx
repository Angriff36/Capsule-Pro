import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { notFound } from "next/navigation";
import { getTenantIdForOrg } from "../../../../lib/tenant";
import { Header } from "../../../components/header";
import { BattleBoardEditorClient } from "./battle-board-editor-client";

type PageProps = {
  params: Promise<{ boardId: string }>;
};

const BattleBoardDetailPage = async ({ params }: PageProps) => {
  const { orgId } = await auth();
  const { boardId } = await params;

  if (!orgId) {
    notFound();
  }

  const tenantId = await getTenantIdForOrg(orgId);

  const board = await database.battle_boards.findFirst({
    where: {
      id: boardId,
      tenant_id: tenantId,
      deleted_at: null,
    },
  });

  if (!board) {
    notFound();
  }

  // Fetch event data if linked
  let event = null;
  if (board.event_id) {
    event = await database.events.findFirst({
      where: {
        id: board.event_id,
        tenant_id: tenantId,
        deleted_at: null,
      },
      select: {
        id: true,
        event_number: true,
        title: true,
        event_date: true,
        venue_name: true,
        venue_address: true,
        guest_count: true,
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
                  eventNumber: event.event_number,
                  title: event.title,
                  eventDate: event.event_date.toISOString(),
                  venueName: event.venue_name,
                  venueAddress: event.venue_address,
                  guestCount: event.guest_count,
                }
              : null
          }
        />
      </div>
    </>
  );
};

export default BattleBoardDetailPage;
