import { listCommandBoardCards, listCommandBoardConnections, listCommandBoardGroups, listCommandBoards } from "@/app/lib/manifest-client.generated";
import { auth } from "@repo/auth/server";
import {
  CommandBand,
  CommandBandActions,
  CommandBandHeader,
  CommandBandLede,
  DisplayHeading,
  MonoLabel,
  OperationalColumn,
  PageCanvas,
} from "@repo/design-system/components/blocks/page-shell";
import { Badge } from "@repo/design-system/components/ui/badge";
import { Button } from "@repo/design-system/components/ui/button";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTenantIdForOrg } from "../../../lib/tenant";
import { BoardCanvas } from "./board-canvas";

interface PageProps {
  readonly params: Promise<{ id: string }>;
}

const BoardDetailPage = async ({ params }: PageProps) => {
  const { id } = await params;
  const { orgId } = await auth();

  if (!orgId) {
    notFound();
  }

  const tenantId = await getTenantIdForOrg(orgId);

  const board = (await listCommandBoards()).data[0] ?? null;

  if (!board) {
    notFound();
  }

  const [cards, connections, groups] = await Promise.all([
    (await listCommandBoardCards()).data,
    (await listCommandBoardConnections()).data,
    (await listCommandBoardGroups()).data,
  ]);

  return (
    <PageCanvas>
      <CommandBand>
        <CommandBandHeader>
          <div className="space-y-3">
            <MonoLabel tone="dark">
              <Link
                className="underline-offset-4 hover:underline"
                href="/command-board"
              >
                Command Board
              </Link>{" "}
              / {board.name}
            </MonoLabel>
            <DisplayHeading size="md">{board.name}</DisplayHeading>
            {board.description ? (
              <CommandBandLede>{board.description}</CommandBandLede>
            ) : null}
            <div className="flex items-center gap-2">
              <Badge variant="secondary">{board.status}</Badge>
              {board.isTemplate ? (
                <Badge variant="outline">Template</Badge>
              ) : null}
              <Badge variant="outline">
                {cards.length} card{cards.length === 1 ? "" : "s"}
              </Badge>
              {groups.length > 0 ? (
                <Badge variant="outline">
                  {groups.length} group{groups.length === 1 ? "" : "s"}
                </Badge>
              ) : null}
            </div>
          </div>
          <CommandBandActions>
            <Button
              asChild
              className="border-white/25 bg-transparent text-white hover:bg-white/10"
              size="sm"
              variant="outline"
            >
              <Link href="/command-board">All boards</Link>
            </Button>
          </CommandBandActions>
        </CommandBandHeader>
      </CommandBand>

      <OperationalColumn>
        <BoardCanvas
          boardId={board.id}
          cards={cards}
          connections={connections}
          groups={groups}
        />
      </OperationalColumn>
    </PageCanvas>
  );
};

export default BoardDetailPage;
