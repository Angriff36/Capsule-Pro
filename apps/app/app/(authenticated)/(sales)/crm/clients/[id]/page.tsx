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

    return (
      <ClientDetailClient
        client={{
          ...client,
          company_name: client.companyName,
          first_name: client.firstName,
          last_name: client.lastName,
          contacts: client.contacts.map((contact) => ({
            ...contact,
            first_name: contact.firstName,
            last_name: contact.lastName,
          })),
        }}
      />
    );
  } catch {
    notFound();
  }
}

export const metadata = {
  title: "Client Details",
  description: "View and manage client information.",
};
