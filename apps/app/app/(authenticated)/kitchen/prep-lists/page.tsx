import { auth } from "@repo/auth/server";
import { loadRecentEventsForPrepList } from "@/app/lib/convex/kitchen-task-loaders";
import { captureException } from "@sentry/nextjs";
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

  const params = searchParams ? await searchParams : {};
  const eventId = params.eventId;

  const availableEvents = await loadRecentEventsForPrepList();

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
          eventDate: e.eventDate,
          guestCount: e.guestCount,
        }))}
        eventId={eventId ?? availableEvents[0]?.id ?? ""}
        initialPrepList={initialPrepList}
      />
    </>
  );
};

export default KitchenPrepListsPage;
