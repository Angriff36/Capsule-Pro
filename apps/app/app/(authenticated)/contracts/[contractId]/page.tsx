/**
 * @module ContractDetailPage
 * @intent Unified contract detail page handling both EventContract and VendorContract
 * @responsibility Authenticate, resolve tenant, look up contract in EventContract (with relations)
 *   then VendorContract, compute type-specific metrics, and render PageCanvas layout
 * @domain Contracts
 * @tags contracts, detail-page, unified-view, server-page
 * @canonical true
 */

import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import {
  CommandBand,
  CommandBandActions,
  CommandBandBody,
  CommandBandHeader,
  CommandBandLede,
  DisplayHeading,
  MetricBand,
  MetricCell,
  MetricLabel,
  MetricValue,
  MonoLabel,
  OperationalColumn,
  PageCanvas,
} from "@repo/design-system/components/blocks/page-shell";
import { Button } from "@repo/design-system/components/ui/button";
import {
  FileSignature,
  ArrowLeft,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import { serializeDecimal } from "@/app/lib/decimal";
import { ContractDetailClient } from "./contract-detail-client";

// ---------------------------------------------------------------------------
// Metadata
// ---------------------------------------------------------------------------

export const metadata: Metadata = {
  title: "Contract Detail",
  description: "View contract details, signatures, compliance, and actions",
};

// ---------------------------------------------------------------------------
// Types for serialized data passed to the client component
// ---------------------------------------------------------------------------

interface SerializedEventContract {
  contractType: "event";
  id: string;
  tenantId: string;
  eventId: string;
  clientId: string;
  contractNumber: string | null;
  title: string;
  status: string;
  documentUrl: string | null;
  documentType: string | null;
  notes: string | null;
  signingToken: string | null;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
  event: {
    id: string;
    title: string;
    eventDate: string | null;
  } | null;
  client: {
    id: string;
    company_name: string | null;
    first_name: string | null;
    last_name: string | null;
  } | null;
  signatures: Array<{
    id: string;
    signedAt: string | null;
    signerName: string | null;
    signerEmail: string | null;
    ipAddress: string | null;
  }>;
}

interface SerializedVendorContract {
  contractType: "vendor";
  id: string;
  tenantId: string;
  contractNumber: string | null;
  vendorId: string | null;
  vendorName: string | null;
  contractTypeLabel: string | null;
  status: string;
  startDate: string | null;
  endDate: string | null;
  autoRenew: boolean;
  renewalTermDays: number | null;
  noticeDaysBeforeRenewal: number | null;
  paymentTerms: string | null;
  contractUrl: string | null;
  notes: string | null;
  complianceScore: number | null;
  slaBreachCount: number | null;
  onTimeDeliveryRate: number | null;
  qualityRating: number | null;
  lastComplianceReview: string | null;
  approvedBy: string | null;
  approvedAt: string | null;
  terminatedBy: string | null;
  terminatedAt: string | null;
  terminationReason: string | null;
  createdAt: string;
  updatedAt: string;
}

type SerializedContract =
  | SerializedEventContract
  | SerializedVendorContract;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function daysUntil(isoDate: string | null): number | null {
  if (!isoDate) return null;
  const target = new Date(isoDate);
  const now = new Date();
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

interface ContractDetailPageProps {
  params: Promise<{ contractId: string }>;
}

export default async function ContractDetailPage({
  params,
}: ContractDetailPageProps) {
  const { contractId } = await params;
  const { userId, orgId } = await auth();

  if (!(userId && orgId)) {
    redirect("/sign-in");
  }

  const tenantId = await getTenantIdForOrg(orgId);

  // ---------------------------------------------------------------------------
  // 1. Try EventContract first (with event, client, signatures relations)
  // ---------------------------------------------------------------------------

  let contract: SerializedContract | null = null;

  const ec = await database.eventContract.findFirst({
    where: { tenantId, id: contractId, deletedAt: null },
    select: {
      id: true,
      tenantId: true,
      eventId: true,
      clientId: true,
      contractNumber: true,
      title: true,
      status: true,
      documentUrl: true,
      documentType: true,
      notes: true,
      signingToken: true,
      expiresAt: true,
      createdAt: true,
      updatedAt: true,
      event: {
        select: { id: true, title: true, eventDate: true },
      },
      client: {
        select: {
          id: true,
          company_name: true,
          first_name: true,
          last_name: true,
        },
      },
      signatures: {
        where: { deletedAt: null },
        select: {
          id: true,
          signedAt: true,
          signerName: true,
          signerEmail: true,
          ipAddress: true,
        },
        orderBy: { signedAt: "desc" },
      },
    },
  });

  if (ec) {
    contract = {
      contractType: "event",
      id: ec.id,
      tenantId: ec.tenantId,
      eventId: ec.eventId,
      clientId: ec.clientId,
      contractNumber: ec.contractNumber,
      title: ec.title,
      status: ec.status,
      documentUrl: ec.documentUrl,
      documentType: ec.documentType,
      notes: ec.notes,
      signingToken: ec.signingToken,
      expiresAt: ec.expiresAt?.toISOString() ?? null,
      createdAt: ec.createdAt.toISOString(),
      updatedAt: ec.updatedAt.toISOString(),
      event: ec.event
        ? {
            id: ec.event.id,
            title: ec.event.title,
            eventDate: ec.event.eventDate?.toISOString() ?? null,
          }
        : null,
      client: ec.client
        ? {
            id: ec.client.id,
            company_name: ec.client.company_name,
            first_name: ec.client.first_name,
            last_name: ec.client.last_name,
          }
        : null,
      signatures: ec.signatures.map((s) => ({
        id: s.id,
        signedAt: s.signedAt?.toISOString() ?? null,
        signerName: s.signerName,
        signerEmail: s.signerEmail,
        ipAddress: s.ipAddress,
      })),
    };
  }

  // ---------------------------------------------------------------------------
  // 2. If not found, try VendorContract
  // ---------------------------------------------------------------------------

  if (!contract) {
    const vc = await database.vendorContract.findFirst({
      where: { tenantId, id: contractId, deletedAt: null },
      select: {
        id: true,
        tenantId: true,
        contractNumber: true,
        vendorId: true,
        vendorName: true,
        contractType: true,
        status: true,
        startDate: true,
        endDate: true,
        autoRenew: true,
        renewalTermDays: true,
        noticeDaysBeforeRenewal: true,
        paymentTerms: true,
        contractUrl: true,
        notes: true,
        complianceScore: true,
        slaBreachCount: true,
        onTimeDeliveryRate: true,
        qualityRating: true,
        lastComplianceReview: true,
        approvedBy: true,
        approvedAt: true,
        terminatedBy: true,
        terminatedAt: true,
        terminationReason: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (vc) {
      contract = {
        contractType: "vendor",
        id: vc.id,
        tenantId: vc.tenantId,
        contractNumber: vc.contractNumber,
        vendorId: vc.vendorId,
        vendorName: vc.vendorName,
        contractTypeLabel: vc.contractType,
        status: vc.status,
        startDate: vc.startDate?.toISOString() ?? null,
        endDate: vc.endDate?.toISOString() ?? null,
        autoRenew: vc.autoRenew,
        renewalTermDays: vc.renewalTermDays,
        noticeDaysBeforeRenewal: vc.noticeDaysBeforeRenewal,
        paymentTerms: vc.paymentTerms,
        contractUrl: vc.contractUrl,
        notes: vc.notes,
        complianceScore: vc.complianceScore,
        slaBreachCount: vc.slaBreachCount,
        onTimeDeliveryRate: serializeDecimal(vc.onTimeDeliveryRate) ?? 0,
        qualityRating: serializeDecimal(vc.qualityRating) ?? 0,
        lastComplianceReview: vc.lastComplianceReview?.toISOString() ?? null,
        approvedBy: vc.approvedBy,
        approvedAt: vc.approvedAt?.toISOString() ?? null,
        terminatedBy: vc.terminatedBy,
        terminatedAt: vc.terminatedAt?.toISOString() ?? null,
        terminationReason: vc.terminationReason,
        createdAt: vc.createdAt.toISOString(),
        updatedAt: vc.updatedAt.toISOString(),
      };
    }
  }

  // ---------------------------------------------------------------------------
  // 3. Neither found
  // ---------------------------------------------------------------------------

  if (!contract) {
    notFound();
  }

  // ---------------------------------------------------------------------------
  // 4. Compute metrics
  // ---------------------------------------------------------------------------

  const isEvent = contract.contractType === "event";
  const ecContract = isEvent
    ? (contract as SerializedEventContract)
    : null;
  const vcContract = !isEvent
    ? (contract as SerializedVendorContract)
    : null;

  const displayTitle = isEvent
    ? ecContract!.title
    : `${vcContract!.vendorName || "Vendor"} -- ${vcContract!.contractTypeLabel || "Contract"}`;

  const expiryDays = daysUntil(
    isEvent ? ecContract!.expiresAt : vcContract!.endDate,
  );

  const expiryLabel =
    expiryDays === null
      ? "\u2014"
      : expiryDays < 0
        ? `Expired ${Math.abs(expiryDays)}d ago`
        : expiryDays === 0
          ? "Expires today"
          : `${expiryDays} days`;

  // ---------------------------------------------------------------------------
  // 5. Render
  // ---------------------------------------------------------------------------

  return (
    <PageCanvas>
      <CommandBand>
        <CommandBandHeader>
          <div className="space-y-4">
            <MonoLabel tone="dark">
              <Link
                className="underline-offset-4 hover:underline"
                href="/contracts"
              >
                Contracts
              </Link>{" "}
              / {contract.contractNumber || contract.id.slice(0, 8)}
            </MonoLabel>
            <DisplayHeading>{displayTitle}</DisplayHeading>
            <CommandBandLede>
              {isEvent
                ? `Event contract with ${ecContract!.client?.company_name || ecContract!.client?.first_name || "client"} for ${ecContract!.event?.title || "an event"}.`
                : `Vendor agreement with ${vcContract!.vendorName || "vendor"} (${vcContract!.contractTypeLabel || "general"}).`}
            </CommandBandLede>
          </div>
          <CommandBandActions>
            <Button
              asChild
              className="border-white/25 bg-transparent text-white hover:bg-white/10"
              size="sm"
              variant="outline"
            >
              <Link href="/contracts">
                <ArrowLeft className="mr-2 h-4 w-4" />
                All Contracts
              </Link>
            </Button>
          </CommandBandActions>
        </CommandBandHeader>

        <CommandBandBody>
          {isEvent ? (
            <MetricBand cols={4}>
              <MetricCell>
                <MetricLabel>Status</MetricLabel>
                <MetricValue className="capitalize">
                  {ecContract!.status}
                </MetricValue>
              </MetricCell>
              <MetricCell>
                <MetricLabel>Signatures</MetricLabel>
                <MetricValue>{ecContract!.signatures.length}</MetricValue>
                <p className="text-sm text-white/70">Collected</p>
              </MetricCell>
              <MetricCell>
                <MetricLabel>Days until expiry</MetricLabel>
                <MetricValue>{expiryLabel}</MetricValue>
              </MetricCell>
              <MetricCell>
                <MetricLabel>Document</MetricLabel>
                <MetricValue>
                  {ecContract!.documentUrl
                    ? ecContract!.documentType || "Available"
                    : "None"}
                </MetricValue>
              </MetricCell>
            </MetricBand>
          ) : (
            <MetricBand cols={4}>
              <MetricCell>
                <MetricLabel>Status</MetricLabel>
                <MetricValue className="capitalize">
                  {vcContract!.status}
                </MetricValue>
              </MetricCell>
              <MetricCell>
                <MetricLabel>Compliance score</MetricLabel>
                <MetricValue>
                  {vcContract!.complianceScore !== null
                    ? `${vcContract!.complianceScore}%`
                    : "\u2014"}
                </MetricValue>
              </MetricCell>
              <MetricCell>
                <MetricLabel>SLA breaches</MetricLabel>
                <MetricValue>
                  {vcContract!.slaBreachCount ?? 0}
                </MetricValue>
              </MetricCell>
              <MetricCell>
                <MetricLabel>Days until expiry</MetricLabel>
                <MetricValue>{expiryLabel}</MetricValue>
              </MetricCell>
            </MetricBand>
          )}
        </CommandBandBody>
      </CommandBand>

      <OperationalColumn>
        <ContractDetailClient contract={contract} />
      </OperationalColumn>
    </PageCanvas>
  );
}
