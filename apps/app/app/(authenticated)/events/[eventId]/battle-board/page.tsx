import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { notFound } from "next/navigation";
import { getTenantIdForOrg } from "../../../../lib/tenant";
import { Header } from "../../../components/header";
import { getEventStaff, getTimelineTasks } from "./actions/tasks";
import { Timeline } from "./components/timeline";

type BattleBoardPageProps = {
  params: Promise<{
    eventId: string;
  }>;
};

const BattleBoardPage = async ({ params }: BattleBoardPageProps) => {
  const { eventId } = await params;
  const { orgId } = await auth();

  if (!orgId) {
    notFound();
  }

  const tenantId = await getTenantIdForOrg(orgId);

  const event = await database.event.findUnique({
    where: {
      tenantId_id: {
        tenantId,
        id: eventId,
      },
    },
  });

  if (!event || event.deletedAt) {
    notFound();
  }

  const [tasks, staff] = await Promise.all([
    getTimelineTasks(eventId),
    getEventStaff(eventId),
  ]);

  return (
    <>
      <Header
        page={event.title}
        pages={["Operations", "Events", "Battle Board"]}
      >
        <a
          className="inline-flex h-9 items-center justify-center whitespace-nowrap rounded-md px-4 py-2 font-medium text-sm transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
          href={`/events/${eventId}`}
        >
          Back to Event
        </a>
      </Header>
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
