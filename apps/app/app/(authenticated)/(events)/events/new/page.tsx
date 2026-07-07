import { auth } from "@repo/auth/server";
import { notFound } from "next/navigation";
import { Header } from "../../../components/header";
import { loadEventDraft } from "../actions";
import { NewEventClient } from "./new-event-client";

interface NewEventPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

const NewEventPage = async ({ searchParams }: NewEventPageProps) => {
  const { orgId } = await auth();

  if (!orgId) {
    notFound();
  }

  const resolved = await searchParams;
  const rawEventId = resolved.eventId;
  const resumeEventId =
    typeof rawEventId === "string" && rawEventId.length > 0
      ? rawEventId
      : undefined;
  // Load the draft server-side for instant resume (read-only, constitution §3).
  const initialSnapshot = resumeEventId
    ? await loadEventDraft(resumeEventId)
    : null;

  return (
    <>
      <Header page="New event" pages={[{ label: "Events", href: "/events" }]} />
      <NewEventClient
        initialEventId={initialSnapshot?.eventId ?? resumeEventId}
        initialSnapshot={initialSnapshot}
      />
    </>
  );
};

export default NewEventPage;
