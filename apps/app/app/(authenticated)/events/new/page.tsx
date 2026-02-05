import { auth } from "@repo/auth/server";
import { notFound } from "next/navigation";
import { Header } from "../../components/header";
import { createEvent } from "../actions";
import { EventForm } from "../components/event-form";

const NewEventPage = async () => {
  const { orgId } = await auth();

  if (!orgId) {
    notFound();
  }

  return (
    <>
      <Header
        page="New event"
        pages={[
          { label: "Operations", href: "/operations" },
          { label: "Events", href: "/events" },
        ]}
      />
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <EventForm action={createEvent} submitLabel="Create event" />
      </div>
    </>
  );
};

export default NewEventPage;
