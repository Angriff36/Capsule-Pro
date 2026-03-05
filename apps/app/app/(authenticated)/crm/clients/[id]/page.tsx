import { notFound } from "next/navigation";
import { getClientById, getClientCommunicationPreferences } from "../actions";
import { ClientDetailClient } from "./components/client-detail-client";

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  try {
    const client = await getClientById(id);
    const communicationPreferences = await getClientCommunicationPreferences(id);

    return <ClientDetailClient client={client} communicationPreferences={communicationPreferences} />;
  } catch (_error) {
    notFound();
  }
}

export const metadata = {
  title: "Client Details",
  description: "View and manage client information.",
};
