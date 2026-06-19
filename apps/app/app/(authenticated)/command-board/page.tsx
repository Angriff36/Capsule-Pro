import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import {
  CommandBand,
  CommandBandActions,
  CommandBandBody,
  CommandBandHeader,
  CommandBandLede,
  DisplayHeading,
  MetricBand,
  MetricCell,
  MetricLabel,
  MetricValue,
  MonoLabel,
  OperationalColumn,
  OperationalRow,
  PageCanvas,
  SectionHeader,
} from "@repo/design-system/components/blocks/page-shell";
import { Badge } from "@repo/design-system/components/ui/badge";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@repo/design-system/components/ui/empty";
import { LayoutDashboard } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTenantIdForOrg } from "../../lib/tenant";
import { NewBoardDialog } from "./new-board-dialog";

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

const statusTone = (status: string): "default" | "secondary" | "outline" => {
  if (status === "active") {
    return "default";
  }
  if (status === "archived") {
    return "outline";
  }
  return "secondary";
};

const CommandBoardPage = async () => {
  const { orgId } = await auth();

  if (!orgId) {
    notFound();
  }

  const tenantId = await getTenantIdForOrg(orgId);

  const boards = await database.commandBoard.findMany({
    where: { tenantId, deletedAt: null },
    select: {
      id: true,
      name: true,
      description: true,
      status: true,
      isTemplate: true,
      tags: true,
      createdAt: true,
      updatedAt: true,
      _count: { select: { cards: true, connections: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  const activeCount = boards.filter((b) => b.status === "active").length;
  const draftCount = boards.filter((b) => b.status === "draft").length;
  const templateCount = boards.filter((b) => b.isTemplate).length;

  const stats = [
    {
      label: "Total boards",
      value: String(boards.length),
      note: `${activeCount} active`,
    },
    {
      label: "Drafts",
      value: String(draftCount),
      note: "Awaiting activation",
    },
    {
      label: "Templates",
      value: String(templateCount),
      note: "Reusable layouts",
    },
  ];

  return (
    <PageCanvas>
      <CommandBand>
        <CommandBandHeader>
          <div className="space-y-4">
            <MonoLabel tone="dark">Events / Event boards</MonoLabel>
            <DisplayHeading>Plan events on the tree</DisplayHeading>
            <CommandBandLede>
              Each board is an Event-tree workspace: assemble staff, menu, and
              logistics with draft → commit, then execution flows to the Battle
              Board. (Not the global Command Board ops surface — see VISION.md.)
            </CommandBandLede>
          </div>
          <CommandBandActions>
            <NewBoardDialog />
          </CommandBandActions>
        </CommandBandHeader>

        <CommandBandBody>
          <MetricBand>
            {stats.map((item) => (
              <MetricCell key={item.label}>
                <MetricLabel>{item.label}</MetricLabel>
                <MetricValue>{item.value}</MetricValue>
                <div className="text-white/55 text-xs">{item.note}</div>
              </MetricCell>
            ))}
          </MetricBand>
        </CommandBandBody>
      </CommandBand>

      <OperationalColumn>
        <section className="space-y-6">
          <SectionHeader
            count={`${boards.length} board${boards.length === 1 ? "" : "s"}`}
            description="Sorted by most recently touched."
            eyebrow="Boards"
            title="Your event boards"
          />

          {boards.length === 0 ? (
            <OperationalRow density="comfortable">
              <Empty>
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <LayoutDashboard />
                  </EmptyMedia>
                  <EmptyTitle>No event boards yet</EmptyTitle>
                  <EmptyDescription>
                    Create a board to start assembling an event on the tree.
                  </EmptyDescription>
                </EmptyHeader>
                <EmptyContent>
                  <NewBoardDialog />
                </EmptyContent>
              </Empty>
            </OperationalRow>
          ) : (
            <ul className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {boards.map((board) => (
                <li key={board.id}>
                  <Link
                    className="block h-full rounded-xl border border-border bg-card p-5 transition-colors hover:border-foreground/20 hover:bg-accent/30"
                    href={`/command-board/${board.id}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-medium text-base leading-tight">
                        {board.name}
                      </h3>
                      <Badge variant={statusTone(board.status)}>
                        {board.status}
                      </Badge>
                    </div>
                    {board.description ? (
                      <p className="mt-2 line-clamp-2 text-muted-foreground text-sm">
                        {board.description}
                      </p>
                    ) : null}
                    <dl className="mt-4 flex items-center gap-4 text-muted-foreground text-xs">
                      <div>
                        <dt className="sr-only">Cards</dt>
                        <dd>{board._count.cards} cards</dd>
                      </div>
                      <div>
                        <dt className="sr-only">Connections</dt>
                        <dd>{board._count.connections} connections</dd>
                      </div>
                      <div className="ml-auto">
                        <dt className="sr-only">Updated</dt>
                        <dd>{dateFormatter.format(board.updatedAt)}</dd>
                      </div>
                    </dl>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </OperationalColumn>
    </PageCanvas>
  );
};

export default CommandBoardPage;
