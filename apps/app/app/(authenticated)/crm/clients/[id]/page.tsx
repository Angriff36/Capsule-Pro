import { notFound } from "next/navigation";
import { getClientById } from "../actions";
import { ClientDetailClient } from "./components/client-detail-client";

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  try {
    const client = await getClientById(id);

    return <ClientDetailClient client={client} />;
  } catch (error) {
    notFound();
  }
}

export const metadata = {
  title: "Client Details",
  description: "View and manage client information.",
};
