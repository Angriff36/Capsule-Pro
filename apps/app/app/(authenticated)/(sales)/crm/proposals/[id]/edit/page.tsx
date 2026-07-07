/**
 * Edit Proposal Page
 *
 * Form for editing an existing proposal
 */

import type { Proposal } from "@repo/database";
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
    <PageCanvas>
      <CommandBand>
        <CommandBandHeader>
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Button asChild size="icon" variant="ghost">
                <Link href={`/crm/proposals/${proposal.id}`}>
                  <ArrowLeft className="h-4 w-4" />
                </Link>
              </Button>
              <MonoLabel tone="dark">CRM / Proposals / Edit</MonoLabel>
            </div>
            <DisplayHeading size="md">Edit Proposal</DisplayHeading>
            <CommandBandLede>
              Update proposal details and pricing
            </CommandBandLede>
          </div>
        </CommandBandHeader>
      </CommandBand>

      <OperationalColumn>
        <ProposalForm
          action={handleUpdate}
          proposal={proposal}
          submitLabel="Save Changes"
        />
      </OperationalColumn>
    </PageCanvas>
  );
}
