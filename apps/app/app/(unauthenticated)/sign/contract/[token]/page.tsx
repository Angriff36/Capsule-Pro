/**
 * @module PublicContractSigningPage
 * @intent Public page for clients to view and sign contracts without authentication
 * @responsibility Display contract details, capture signature, handle signing process
 * @domain Events
 * @tags contracts, public, signing
 * @canonical true
 */

import { database } from "@repo/database";
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
  const contract = await database.eventContract.findFirst({
    where: {
      signingToken: token,
      deletedAt: null,
    },
    select: {
      id: true,
      title: true,
      status: true,
      documentUrl: true,
      documentType: true,
      notes: true,
      expiresAt: true,
      createdAt: true,
      contractNumber: true,
      tenantId: true,
      eventId: true,
      clientId: true,
    },
  });

  if (!contract) {
    notFound();
  }

  // Get event details
  const event = await database.event.findFirst({
    where: {
      tenantId: contract.tenantId,
      id: contract.eventId,
    },
    select: {
      title: true,
      eventDate: true,
      venueName: true,
    },
  });

  // Get client details
  const client = await database.$queryRaw<
    Array<{
      company_name: string | null;
      first_name: string | null;
      last_name: string | null;
      email: string | null;
    }>
  >`
    SELECT company_name, first_name, last_name, email
    FROM tenant_crm.clients
    WHERE id = ${contract.clientId}
      AND tenant_id = ${contract.tenantId}
      AND deleted_at IS NULL
  `;

  // Get existing signatures
  const signatures = await database.contractSignature.findMany({
    where: {
      contractId: contract.id,
      tenantId: contract.tenantId,
      deletedAt: null,
    },
    select: {
      id: true,
      signerName: true,
      signerEmail: true,
      signedAt: true,
    },
    orderBy: {
      signedAt: "desc",
    },
  });

  // Get tenant/organization info
  const tenant = await database.account.findFirst({
    where: {
      id: contract.tenantId,
    },
    select: {
      name: true,
    },
  });

  // Check if expired
  const isExpired =
    contract.expiresAt && new Date(contract.expiresAt) < new Date();

  return (
    <ContractSigningClient
      client={
        client[0]
          ? {
              company_name: client[0].company_name,
              first_name: client[0].first_name,
              last_name: client[0].last_name,
              email: client[0].email,
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
              eventDate: event.eventDate.toISOString(),
              venueName: event.venueName,
            }
          : null
      }
      isExpired={isExpired ?? false}
      organization={tenant?.name || "Unknown Organization"}
      signatures={signatures.map((s) => ({
        id: s.id,
        signerName: s.signerName,
        signerEmail: s.signerEmail,
        signedAt: s.signedAt.toISOString(),
      }))}
      signingToken={token}
    />
  );
};

export default PublicContractSigningPage;
