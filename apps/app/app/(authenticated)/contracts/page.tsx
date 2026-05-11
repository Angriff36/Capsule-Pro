/**
 * @module ContractsPage
 * @intent Unified contract listing aggregating EventContract + VendorContract
 * @responsibility Fetch both contract types via Prisma, compute summary
 *   statistics, and delegate rendering to the client component
 * @domain Contracts
 * @tags contracts, unified-view, server-page
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
import { FileSignature, Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import { ContractsPageClient } from "./contracts-page-client";

export const metadata: Metadata = {
  title: "Contracts",
  description: "Unified view of event and vendor contracts across all statuses",
};

export default async function ContractsPage() {
  const { userId, orgId } = await auth();
  if (!(userId && orgId)) {
    redirect("/sign-in");
  }

  const tenantId = await getTenantIdForOrg(orgId);

  const [eventContracts, vendorContracts] = await Promise.all([
    database.eventContract.findMany({
      where: { tenantId, deletedAt: null },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        contractNumber: true,
        title: true,
        status: true,
        expiresAt: true,
        createdAt: true,
        event: {
          select: { id: true, title: true },
        },
        client: {
          select: {
            id: true,
            company_name: true,
            first_name: true,
            last_name: true,
          },
        },
      },
    }),
    database.vendorContract.findMany({
      where: { tenantId, deletedAt: null },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        contractNumber: true,
        vendorName: true,
        contractType: true,
        status: true,
        endDate: true,
        complianceScore: true,
        autoRenew: true,
        createdAt: true,
      },
    }),
  ]);

  // Build unified list with serializable primitives
  const unified = [
    ...eventContracts.map((ec) => ({
      id: ec.id,
      type: "event" as const,
      contractNumber: ec.contractNumber,
      title: ec.title,
      status: ec.status,
      partyName:
        ec.client?.company_name ||
        [ec.client?.first_name, ec.client?.last_name]
          .filter(Boolean)
          .join(" ")
          .trim() ||
        null,
      expiresAt: ec.expiresAt?.toISOString() ?? null,
      createdAt: ec.createdAt.toISOString(),
      complianceScore: null as number | null,
    })),
    ...vendorContracts.map((vc) => ({
      id: vc.id,
      type: "vendor" as const,
      contractNumber: vc.contractNumber,
      title: `${vc.vendorName || "Vendor"} \u2014 ${vc.contractType}`,
      status: vc.status,
      partyName: vc.vendorName,
      expiresAt: vc.endDate?.toISOString() ?? null,
      createdAt: vc.createdAt.toISOString(),
      complianceScore: vc.complianceScore,
    })),
  ];

  // Compute metrics
  const totalCount = unified.length;
  const activeCount = unified.filter(
    (c) => c.status === "signed" || c.status === "active"
  ).length;
  const awaitingSignatureCount = unified.filter(
    (c) => c.status === "sent" || c.status === "submitted"
  ).length;

  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
  const expiringCount = unified.filter((c) => {
    if (!c.expiresAt) return false;
    const exp = new Date(c.expiresAt);
    return (
      exp <= thirtyDaysFromNow &&
      !["signed", "cancelled", "terminated", "expired"].includes(c.status)
    );
  }).length;

  const vendorScores = vendorContracts
    .map((vc) => vc.complianceScore)
    .filter((s): s is number => s !== null);
  const avgCompliance =
    vendorScores.length > 0
      ? Math.round(
          vendorScores.reduce((a, b) => a + b, 0) / vendorScores.length
        )
      : null;

  return (
    <PageCanvas>
      <CommandBand>
        <CommandBandHeader>
          <div className="space-y-4">
            <MonoLabel tone="dark">Operations / Contracts</MonoLabel>
            <DisplayHeading>Contracts</DisplayHeading>
            <CommandBandLede>
              Unified view of event and vendor contracts. Track signatures,
              expiration, compliance, and renewal status across your portfolio.
            </CommandBandLede>
          </div>
          <CommandBandActions>
            <Button asChild size="sm">
              <Link href="/events/contracts">
                <Plus className="mr-2 h-4 w-4" />
                New Contract
              </Link>
            </Button>
            <Button
              asChild
              className="border-white/25 bg-transparent text-white hover:bg-white/10"
              size="sm"
              variant="outline"
            >
              <Link href="/events/contracts">
                <FileSignature className="mr-2 h-4 w-4" />
                Event Contracts
              </Link>
            </Button>
            <Button
              asChild
              className="border-white/25 bg-transparent text-white hover:bg-white/10"
              size="sm"
              variant="outline"
            >
              <Link href="/procurement/vendor-contracts">Vendor Contracts</Link>
            </Button>
          </CommandBandActions>
        </CommandBandHeader>

        <CommandBandBody>
          <MetricBand cols={4}>
            <MetricCell>
              <MetricLabel>Total contracts</MetricLabel>
              <MetricValue>{totalCount}</MetricValue>
              <p className="text-sm text-white/70">Event + vendor</p>
            </MetricCell>
            <MetricCell>
              <MetricLabel>Active</MetricLabel>
              <MetricValue>{activeCount}</MetricValue>
              <p className="text-sm text-white/70">Signed or active</p>
            </MetricCell>
            <MetricCell>
              <MetricLabel>Awaiting signature</MetricLabel>
              <MetricValue>{awaitingSignatureCount}</MetricValue>
              <p className="text-sm text-white/70">Sent or submitted</p>
            </MetricCell>
            <MetricCell>
              <MetricLabel>Expiring soon</MetricLabel>
              <MetricValue>{expiringCount}</MetricValue>
              <p className="text-sm text-white/70">Within 30 days</p>
            </MetricCell>
            <MetricCell>
              <MetricLabel>Vendor compliance</MetricLabel>
              <MetricValue>
                {avgCompliance !== null ? `${avgCompliance}%` : "—"}
              </MetricValue>
              <p className="text-sm text-white/70">Avg across vendors</p>
            </MetricCell>
          </MetricBand>
        </CommandBandBody>
      </CommandBand>

      <OperationalColumn>
        <ContractsPageClient contracts={unified} />
      </OperationalColumn>
    </PageCanvas>
  );
}
