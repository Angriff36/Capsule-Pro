import {
  listClients,
  listContractSignatures,
  listEventContracts,
  listEvents,
} from "@/app/lib/manifest-client.generated";
/**
 * @module PublicContractSigningPage
 * @intent Public page for clients to view and sign contracts without authentication
 * @responsibility Display contract details, capture signature, handle signing process
 * @domain Events
 * @tags contracts, public, signing
 * @canonical true
 */

import { notFound } from "next/navigation";
import { ContractSigningClient } from "./contract-signing-client";

interface PublicContractSigningPageProps {
  params: Promise<{
    token: string;
  }>;
}

const PublicContractSigningPage = async ({
  params,
}: PublicContractSigningPageProps) => {
  const { token } = await params;

  if (!token) {
    notFound();
  }

  // Find contract by signing token
  let contract: Awaited<ReturnType<typeof listEventContracts>>["data"][number] | null = null;
  try {
    contract =
      (await listEventContracts()).data.find(
        (row) =>
          !row.deletedAt &&
          (((row as unknown as { signingToken?: string }).signingToken ?? "") ===
            token)
      ) ??
      (await listEventContracts()).data.find((row) => row.id === token) ??
      null;
  } catch {
    notFound();
  }

  if (!contract) {
    notFound();
  }

  // Get event details
  let event: Awaited<ReturnType<typeof listEvents>>["data"][number] | null = null;
  try {
    event =
      (await listEvents()).data.find(
        (row) =>
          row.id === contract.eventId &&
          row.tenantId === contract.tenantId &&
          !row.deletedAt
      ) ?? null;
  } catch {
    event = null;
  }

  // Get client details
  let client:
    | {
        company_name: string | null;
        first_name: string | null;
        last_name: string | null;
        email: string | null;
      }
    | null;
  try {
    const matched = (await listClients()).data.find(
      (row) =>
        row.id === contract.clientId &&
        row.tenantId === contract.tenantId &&
        !row.deletedAt
    );
    client = matched
      ? {
          company_name: matched.companyName ?? null,
          first_name: matched.firstName ?? null,
          last_name: matched.lastName ?? null,
          email: matched.email ?? null,
        }
      : null;
  } catch {
    client = null;
  }

  // Get existing signatures
  let signatures: Array<{
    id: string;
    signerName: string | null;
    signerEmail: string | null;
    signedAt: Date;
  }>;
  try {
    signatures = (await listContractSignatures()).data.filter(
      (row) => row.contractId === contract.id && !row.deletedAt
    );
  } catch {
    signatures = [];
  }

  // Check if expired
  const isExpired =
    contract.expiresAt && new Date(contract.expiresAt) < new Date();

  return (
    <ContractSigningClient
      client={
        client
          ? {
              company_name: client.company_name,
              first_name: client.first_name,
              last_name: client.last_name,
              email: client.email,
            }
          : null
      }
      contract={{
        id: contract.id,
        title: contract.title,
        status: contract.status,
        documentUrl: contract.documentUrl,
        documentType: contract.documentType,
        notes: contract.notes,
        expiresAt: contract.expiresAt?.toISOString() ?? null,
        contractNumber: contract.contractNumber,
      }}
      event={
        event
          ? {
              title: event.title,
              eventDate: event.eventDate?.toISOString() ?? null,
              venueName: event.venueName,
            }
          : null
      }
      isExpired={isExpired ?? false}
      organization="Unknown Organization"
      signatures={signatures.map((s) => ({
        id: s.id,
        signerName: s.signerName ?? "",
        signerEmail: s.signerEmail,
        signedAt: s.signedAt.toISOString(),
      }))}
      signingToken={token}
    />
  );
};

export default PublicContractSigningPage;
