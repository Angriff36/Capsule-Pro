import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { Button } from "@repo/design-system/components/ui/button";
import Link from "next/link";
import { notFound } from "next/navigation";
import { resolveEventBattleBoardHref } from "../../../../../lib/battle-boards/resolve-event-board-href";
import { getTenantIdForOrg } from "../../../../../lib/tenant";
import { Header } from "../../../../components/header";
import { getEventStaff, getTimelineTasks } from "./actions/tasks";
import { BattleBoardExportButton } from "./components/battle-board-export-button";
import { Timeline } from "./components/timeline";

interface BattleBoardPageProps {
  params: Promise<{
    eventId: string;
  }>;
}

const BattleBoardPage = async ({ params }: BattleBoardPageProps) => {
  const { eventId } = await params;
  const { orgId } = await auth();

  if (!orgId) {
    notFound();
  }

  const tenantId = await getTenantIdForOrg(orgId);

  const event = await database.event.findFirst({
    where: {
      tenantId,
      id: eventId,
      deletedAt: null,
    },
  });

  if (!event) {
    notFound();
  }

  const [tasks, staff, canonicalBattleBoardHref] = await Promise.all([
    getTimelineTasks(eventId),
    getEventStaff(eventId),
    resolveEventBattleBoardHref(database, tenantId, eventId),
  ]);

  return (
    <>
      <Header
        page={`${event.title} — Event Timeline`}
        pages={[
          { label: "Events", href: "/events" },
          { label: "Event Timeline", href: `/events/${eventId}/battle-board` },
        ]}
      >
        <Button asChild size="sm" variant="outline">
          <Link href={canonicalBattleBoardHref}>Manifest Battle Board</Link>
        </Button>
        <BattleBoardExportButton eventId={eventId} eventName={event.title} />
        <Button asChild size="sm" variant="ghost">
          <Link href={`/events/${eventId}`}>Back to Event</Link>
        </Button>
      </Header>
      <div className="mx-4 mb-4 rounded-md border border-border bg-muted/40 px-4 py-3 text-muted-foreground text-sm">
        This Gantt timeline uses legacy <code>timeline_tasks</code> data. For
        print-ready staff assignments, open the{" "}
        <Link
          className="font-medium text-foreground underline-offset-4 hover:underline"
          href={canonicalBattleBoardHref}
        >
          canonical Battle Board
        </Link>
        .
      </div>
      <Timeline
        eventDate={event.eventDate}
        eventId={eventId}
        initialStaff={staff}
        initialTasks={tasks}
      />
    </>
  );
};

export default BattleBoardPage;
