/**
 * @module ContractTemplatesPage
 * @intent Server page for contract template management
 * @responsibility Fetch contract templates and delegate to client component
 * @domain Contracts
 * @tags contracts, templates, server-page
 * @canonical true
 */

import { auth } from "@repo/auth/server";
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
import { log } from "@repo/observability/log";
import { FileText } from "lucide-react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import { TemplatesClient } from "./templates-client";

export const metadata: Metadata = {
  title: "Contract Templates",
  description: "Create reusable templates for event and vendor contracts",
};

export default async function ContractTemplatesPage() {
  const { userId, orgId } = await auth();
  if (!(userId && orgId)) {
    redirect("/sign-in");
  }

  const tenantId = await getTenantIdForOrg(orgId);

  let templates: Array<{
    id: string;
    name: string;
    type: "event" | "vendor";
    description: string | null;
    usageCount: number;
    lastModified: string;
    createdAt: string;
  }> = [];

  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:2223"}/api/contracts/templates?tenantId=${tenantId}`,
      { cache: "no-store" }
    );
    if (res.ok) {
      const json = (await res.json()) as {
        data: typeof templates;
      };
      templates = json.data;
    }
  } catch (error) {
    log.error("Failed to fetch contract templates:", error);
  }

  const totalCount = templates.length;
  const eventCount = templates.filter((t) => t.type === "event").length;
  const vendorCount = templates.filter((t) => t.type === "vendor").length;
  const lastUpdated =
    templates.length > 0
      ? templates.reduce((latest, t) =>
          t.lastModified > latest.lastModified ? t : latest
        ).lastModified
      : null;

  return (
    <PageCanvas>
      <CommandBand>
        <CommandBandHeader>
          <div className="space-y-4">
            <MonoLabel tone="dark">Operations / Contracts</MonoLabel>
            <DisplayHeading>Contract Templates</DisplayHeading>
            <CommandBandLede>
              Create reusable templates for event and vendor contracts. Standardize
              terms, clauses, and structures across your organization.
            </CommandBandLede>
          </div>
          <CommandBandActions>
            <a
              className="inline-flex items-center gap-2 rounded-md border border-white/25 bg-transparent px-3 py-1.5 text-sm text-white hover:bg-white/10"
              href="/contracts"
            >
              <FileText className="h-4 w-4" />
              All Contracts
            </a>
          </CommandBandActions>
        </CommandBandHeader>

        <CommandBandBody>
          <MetricBand cols={4}>
            <MetricCell>
              <MetricLabel>Total Templates</MetricLabel>
              <MetricValue>{totalCount}</MetricValue>
            </MetricCell>
            <MetricCell>
              <MetricLabel>Event Templates</MetricLabel>
              <MetricValue>{eventCount}</MetricValue>
            </MetricCell>
            <MetricCell>
              <MetricLabel>Vendor Templates</MetricLabel>
              <MetricValue>{vendorCount}</MetricValue>
            </MetricCell>
            <MetricCell>
              <MetricLabel>Last Updated</MetricLabel>
              <MetricValue>
                {lastUpdated
                  ? new Date(lastUpdated).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })
                  : "\u2014"}
              </MetricValue>
            </MetricCell>
          </MetricBand>
        </CommandBandBody>
      </CommandBand>

      <OperationalColumn>
        <TemplatesClient templates={templates} />
      </OperationalColumn>
    </PageCanvas>
  );
}
