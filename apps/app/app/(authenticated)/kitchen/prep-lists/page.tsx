import { auth } from "@repo/auth/server";
import { database, Prisma } from "@repo/database";
import { captureException } from "@sentry/nextjs";
import { getTenantIdForOrg } from "../../../lib/tenant";
import { Header } from "../../components/header";
import { generatePrepList, type PrepListGenerationResult } from "./actions";
import { PrepListClient } from "./prep-list-client";

interface PrepListPageProps {
  searchParams?: Promise<{ eventId?: string }>;
}

const KitchenPrepListsPage = async ({ searchParams }: PrepListPageProps) => {
  const { orgId } = await auth();

  if (!orgId) {
    return null;
  }

  const tenantId = await getTenantIdForOrg(orgId);

  const params = searchParams ? await searchParams : {};
  const eventId = params.eventId;

  const availableEvents = await database.$queryRaw<
    Array<{
      id: string;
      title: string;
      event_date: Date;
      guest_count: number;
    }>
  >(
    Prisma.sql`
      SELECT 
        e.id,
        e.title,
        e.event_date,
        e.guest_count
      FROM tenant_events.events e
      WHERE e.tenant_id = ${tenantId}
        AND e.deleted_at IS NULL
        AND e.event_date >= CURRENT_DATE - INTERVAL '30 days'
      ORDER BY e.event_date ASC
      LIMIT 20
    `
  );

  let initialPrepList: PrepListGenerationResult | null = null;
  if (eventId) {
    try {
      initialPrepList = await generatePrepList({ eventId });
    } catch (error) {
      captureException(error);
    }
  }

  return (
    <>
      <Header page="Prep Lists" pages={["Kitchen Ops"]} />
      <PrepListClient
        availableEvents={availableEvents.map((e) => ({
          id: e.id,
          title: e.title,
          eventDate: e.event_date,
          guestCount: e.guest_count,
        }))}
        eventId={eventId ?? availableEvents[0]?.id ?? ""}
        initialPrepList={initialPrepList}
      />
    </>
  );
};

export default KitchenPrepListsPage;
