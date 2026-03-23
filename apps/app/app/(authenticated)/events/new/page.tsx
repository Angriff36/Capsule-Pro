import { auth } from "@repo/auth/server";
import { notFound } from "next/navigation";
import { Header } from "../../components/header";
import { NewEventClient } from "./new-event-client";

const NewEventPage = async () => {
  const { orgId } = await auth();

  if (!orgId) {
    notFound();
  }

  return (
    <>
      <Header page="New event" pages={[{ label: "Events", href: "/events" }]} />
      <NewEventClient orgId={orgId} />
    </>
  );
};

export default NewEventPage;
