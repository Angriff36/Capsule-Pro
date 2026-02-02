import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { Button } from "@repo/design-system/components/ui/button";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTenantIdForOrg } from "../../../lib/tenant";
import { Header } from "../../components/header";
import { KitchenDashboardClient } from "./kitchen-dashboard-client";
import type { KitchenEvent } from "./types";

const KitchenDashboardPage = async () => {
  const { orgId } = await auth();

  if (!orgId) {
    notFound();
  }

  const tenantId = await getTenantIdForOrg(orgId);

  const events = await database.event.findMany({
    where: {
      tenantId,
      deletedAt: null,
    },
    select: {
      id: true,
      title: true,
      eventNumber: true,
      status: true,
      eventType: true,
      eventDate: true,
      guestCount: true,
      venueName: true,
      venueAddress: true,
      notes: true,
      tags: true,
      createdAt: true,
    },
    orderBy: [{ eventDate: "desc" }, { createdAt: "desc" }],
  });

  const serializedEvents: KitchenEvent[] = events.map((event) => ({
    id: event.id,
    title: event.title,
    eventNumber: event.eventNumber,
    status: event.status,
    eventType: event.eventType,
    eventDate: event.eventDate.toISOString(),
    guestCount: event.guestCount,
    venueName: event.venueName,
    venueAddress: event.venueAddress,
    notes: event.notes,
    tags: event.tags,
    createdAt: event.createdAt.toISOString(),
  }));

  const initialNow = new Date().toISOString();

  return (
    <>
      <Header page="Kitchen Dashboard" pages={["Events"]}>
        <div className="flex items-center gap-2">
          <Button asChild size="sm" variant="secondary">
            <Link href="/events">All Events</Link>
          </Button>
          <Button asChild size="sm" variant="secondary">
            <Link href="/events/reports">Reports</Link>
          </Button>
          <Button asChild size="sm" variant="secondary">
            <Link href="/events/import">Import</Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/events/new">New Event</Link>
          </Button>
        </div>
      </Header>
      <KitchenDashboardClient events={serializedEvents} initialNow={initialNow} />
    </>
  );
};

export default KitchenDashboardPage;
