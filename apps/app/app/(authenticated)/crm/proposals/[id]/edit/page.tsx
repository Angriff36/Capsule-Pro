/**
 * Edit Proposal Page
 *
 * Form for editing an existing proposal
 */

import type { Proposal } from "@repo/database";
import { Button } from "@repo/design-system/components/ui/button";
import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getProposalById, updateProposal } from "../../actions";
import { ProposalForm } from "../../components/proposal-form";

interface EditProposalPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({
  params,
}: EditProposalPageProps): Promise<Metadata> {
  const { id } = await params;
  try {
    const proposal = await getProposalById(id);
    return {
      title: `Edit ${proposal.title}`,
    };
  } catch {
    return {
      title: "Proposal Not Found",
    };
  }
}

export default async function EditProposalPage({
  params,
}: EditProposalPageProps) {
  const { id } = await params;

  let proposal: Proposal | null = null;
  try {
    proposal = await getProposalById(id);
  } catch {
    notFound();
  }

  async function handleUpdate(
    _previousState: { redirect: string } | null,
    formData: FormData
  ) {
    "use server";

    const id = formData.get("proposalId") as string;
    if (!id) {
      throw new Error("Proposal ID is required");
    }

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
      status: formData.get("status") as
        | "draft"
        | "sent"
        | "viewed"
        | "accepted"
        | "rejected"
        | "expired"
        | null,
      validUntil: formData.get("validUntil") as string | null,
      notes: formData.get("notes") as string | null,
      termsAndConditions: formData.get("termsAndConditions") as string | null,
      lineItems,
    };

    await updateProposal(id, input);
    return { redirect: `/crm/proposals/${id}` };
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <Button asChild size="icon" variant="ghost">
          <Link href={`/crm/proposals/${proposal.id}`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Edit Proposal</h1>
          <p className="text-muted-foreground">
            Update proposal details and pricing
          </p>
        </div>
      </div>

      <ProposalForm
        action={handleUpdate}
        proposal={proposal}
        submitLabel="Save Changes"
      />
    </div>
  );
}
