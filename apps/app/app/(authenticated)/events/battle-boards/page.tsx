import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { Badge } from "@repo/design-system/components/ui/badge";
import { Button } from "@repo/design-system/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@repo/design-system/components/ui/empty";
import {
  FileTextIcon,
  LayoutGridIcon,
  PlusIcon,
  ShieldIcon,
  UsersIcon,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTenantIdForOrg } from "../../../lib/tenant";
import { Header } from "../../components/header";

const statusVariantMap = {
  draft: "secondary",
  ready: "default",
  published: "outline",
} as const;

const statusLabelMap = {
  draft: "Draft",
  ready: "Ready",
  published: "Published",
} as const;

type BattleBoardData = {
  meta?: {
    eventName?: string;
    eventDate?: string;
  };
  staff?: Array<{ name: string }>;
  timeline?: Array<{ time: string; item: string }>;
};

const BattleBoardsPage = async () => {
  const { orgId } = await auth();

  if (!orgId) {
    notFound();
  }

  const tenantId = await getTenantIdForOrg(orgId);

  // Fetch battle boards
  const boards = await database.battle_boards.findMany({
    where: {
      tenant_id: tenantId,
      deleted_at: null,
    },
    orderBy: [{ created_at: "desc" }],
  });

  // Calculate stats
  const draftCount = boards.filter((b) => b.status === "draft").length;
  const readyCount = boards.filter((b) => b.status === "ready").length;
  const publishedCount = boards.filter((b) => b.status === "published").length;
  const totalStaff = boards.reduce((sum, b) => {
    const data = b.boardData as BattleBoardData;
    return sum + (data?.staff?.length ?? 0);
  }, 0);

  return (
    <>
      <Header page="Battle Boards" pages={["Events"]}>
        <div className="flex items-center gap-2">
          <Button asChild variant="secondary">
            <Link href="/events">Events</Link>
          </Button>
          <Button asChild variant="secondary">
            <Link href="/events/reports">
              <FileTextIcon className="mr-2 h-4 w-4" />
              Reports
            </Link>
          </Button>
          <Button asChild variant="secondary">
            <Link href="/events/import">Import</Link>
          </Button>
          <Button asChild>
            <Link href="/events/battle-boards/new">
              <PlusIcon className="mr-2 h-4 w-4" />
              New Board
            </Link>
          </Button>
        </div>
      </Header>
      <div className="flex flex-1 flex-col gap-6 p-4 pt-0">
        {/* Stats Cards */}
        <section className="grid gap-4 lg:grid-cols-4">
          <Card>
            <CardHeader>
              <CardDescription>Total Boards</CardDescription>
              <CardTitle className="text-2xl">{boards.length}</CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground text-sm">
              Event battle boards
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardDescription>Draft</CardDescription>
              <CardTitle className="text-2xl">{draftCount}</CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground text-sm">
              In progress
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardDescription>Ready / Published</CardDescription>
              <CardTitle className="text-2xl">
                {readyCount + publishedCount}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground text-sm">
              Ready for printing
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardDescription>Total Staff</CardDescription>
              <CardTitle className="text-2xl">{totalStaff}</CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground text-sm flex items-center gap-1">
              <UsersIcon className="h-3.5 w-3.5" />
              Assigned across boards
            </CardContent>
          </Card>
        </section>

        {/* Battle Boards List */}
        {boards.length === 0 ? (
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <LayoutGridIcon />
              </EmptyMedia>
              <EmptyTitle>No battle boards yet</EmptyTitle>
              <EmptyDescription>
                Import an event PDF to auto-generate a battle board with staff
                assignments and timeline, or create one manually.
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button asChild>
                <Link href="/events/import">
                  <PlusIcon className="mr-2 h-4 w-4" />
                  Import Event
                </Link>
              </Button>
            </EmptyContent>
          </Empty>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
            {boards.map((board) => {
              const data = board.boardData as BattleBoardData;
              const staffCount = data?.staff?.length ?? 0;
              const timelineCount = data?.timeline?.length ?? 0;

              return (
                <Link
                  className="group"
                  href={`/events/battle-boards/${board.id}`}
                  key={board.id}
                >
                  <Card className="h-full transition hover:border-primary/40 hover:shadow-md">
                    <CardHeader className="gap-1">
                      <CardDescription className="flex items-center justify-between gap-2">
                        <span className="truncate">
                          {data?.meta?.eventDate
                            ? new Date(data.meta.eventDate).toLocaleDateString(
                                "en-US",
                                { dateStyle: "medium" }
                              )
                            : "No date"}
                        </span>
                        <Badge
                          className="capitalize"
                          variant={
                            statusVariantMap[
                              board.status as keyof typeof statusVariantMap
                            ] ?? "outline"
                          }
                        >
                          {statusLabelMap[
                            board.status as keyof typeof statusLabelMap
                          ] ?? board.status}
                        </Badge>
                      </CardDescription>
                      <CardTitle className="text-lg">
                        {board.board_name}
                      </CardTitle>
                      <CardDescription>
                        {data?.meta?.eventName || "Untitled Event"}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-3 text-sm">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <UsersIcon className="h-4 w-4" />
                        <span>{staffCount} staff assigned</span>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <ShieldIcon className="h-4 w-4" />
                        <span>{timelineCount} timeline items</span>
                      </div>
                      {board.is_template && (
                        <Badge className="w-fit" variant="outline">
                          Template
                        </Badge>
                      )}
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
};

export default BattleBoardsPage;
