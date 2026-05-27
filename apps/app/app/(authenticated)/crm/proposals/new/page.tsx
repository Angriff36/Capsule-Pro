/**
 * New Proposal Page
 *
 * Form for creating a new proposal
 */

import {
  CommandBand,
  CommandBandHeader,
  CommandBandLede,
  DisplayHeading,
  MonoLabel,
  OperationalColumn,
  PageCanvas,
} from "@repo/design-system/components/blocks/page-shell";
import { Button } from "@repo/design-system/components/ui/button";
import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { createProposal } from "../actions";
import { ProposalForm } from "../components/proposal-form";

export const metadata: Metadata = {
  title: "New Proposal",
  description: "Create a new event proposal for a client",
};

async function handleCreate(
  _previousState: { redirect: string } | null,
  formData: FormData
) {
  "use server";

  const lineItemsJson = formData.get("lineItems") as string;
  let lineItems: Array<{
    itemType: string;
    description: string;
    quantity: number;
    unitPrice: number;
    notes?: string;
  }> = [];
  if (lineItemsJson) {
    try {
      lineItems = JSON.parse(lineItemsJson);
    } catch {
      lineItems = [];
    }
  }

  const toUuid = (v: FormDataEntryValue | null): string | null => {
    if (!v || v === "__none__" || v === "") {
      return null;
    }
    return v as string;
  };

  const input = {
    title: formData.get("title") as string,
    clientId: toUuid(formData.get("clientId")),
    leadId: toUuid(formData.get("leadId")),
    eventId: toUuid(formData.get("eventId")),
    eventDate: formData.get("eventDate") as string | null,
    eventType: (() => {
      const v = formData.get("eventType") as string | null;
      return v === "__none__" || v === "" ? null : v;
    })(),
    guestCount: formData.get("guestCount")
      ? Number(formData.get("guestCount"))
      : null,
    venueName: formData.get("venueName") as string | null,
    venueAddress: formData.get("venueAddress") as string | null,
    taxRate: formData.get("taxRate") ? Number(formData.get("taxRate")) : null,
    discountAmount: formData.get("discountAmount")
      ? Number(formData.get("discountAmount"))
      : null,
    status: "draft" as const,
    validUntil: formData.get("validUntil") as string | null,
    notes: formData.get("notes") as string | null,
    termsAndConditions: formData.get("termsAndConditions") as string | null,
    lineItems,
  };

  const proposal = await createProposal(input);

  // Redirect to the proposal detail page
  return { redirect: `/crm/proposals/${proposal.id}` };
}

export default function NewProposalPage() {
  return (
    <PageCanvas>
      <CommandBand>
        <CommandBandHeader>
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Button asChild size="icon" variant="ghost">
                <Link href="/crm/proposals">
                  <ArrowLeft className="h-4 w-4" />
                </Link>
              </Button>
              <MonoLabel tone="dark">CRM / Proposals / New</MonoLabel>
            </div>
            <DisplayHeading size="md">New Proposal</DisplayHeading>
            <CommandBandLede>
              Create a new event proposal for a client
            </CommandBandLede>
          </div>
        </CommandBandHeader>
      </CommandBand>

      <OperationalColumn>
        <ProposalForm
          action={handleCreate}
          proposal={null}
          submitLabel="Create Proposal"
        />
      </OperationalColumn>
    </PageCanvas>
  );
}
