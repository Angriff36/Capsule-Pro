/**
 * New Proposal Page
 *
 * Form for creating a new proposal
 */

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

async function handleCreate(formData: FormData) {
  "use server";

  const lineItemsJson = formData.get("lineItems") as string;
  let lineItems = [];
  if (lineItemsJson) {
    try {
      lineItems = JSON.parse(lineItemsJson);
    } catch {
      lineItems = [];
    }
  }

  const input = {
    title: formData.get("title") as string,
    clientId: formData.get("clientId") as string | null,
    leadId: formData.get("leadId") as string | null,
    eventId: formData.get("eventId") as string | null,
    eventDate: formData.get("eventDate") as string | null,
    eventType: formData.get("eventType") as string | null,
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
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <Button asChild size="icon" variant="ghost">
          <Link href="/crm/proposals">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">New Proposal</h1>
          <p className="text-muted-foreground">
            Create a new event proposal for a client
          </p>
        </div>
      </div>

      <ProposalForm
        action={handleCreate}
        proposal={null}
        submitLabel="Create Proposal"
      />
    </div>
  );
}
