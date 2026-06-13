/**
 * Public Proposal Draft View Page
 *
 * Public page for clients to view AI-generated proposal drafts without authentication
 */

import { notFound } from "next/navigation";
import { ProposalDraftClient } from "./proposal-draft-client";

interface PublicProposalDraftPageProps {
  params: Promise<{
    token: string;
  }>;
}

const PublicProposalDraftPage = async ({
  params,
}: PublicProposalDraftPageProps) => {
  const { token } = await params;

  if (!token) {
    notFound();
  }

  // Fetch proposal data server-side
  const baseUrl =
    process.env.NEXT_PUBLIC_API_URL ||
    `http://localhost:${process.env.PORT || 2223}`;

  let proposal;
  try {
    const response = await fetch(`${baseUrl}/api/public/proposals-draft/${token}`, {
      cache: "no-store",
    });
    if (response.ok) {
      const data = await response.json();
      proposal = data.proposal;
    }
  } catch (error) {
    console.error("Error fetching proposal:", error);
  }

  if (!proposal) {
    notFound();
  }

  // Check if expired
  const isExpired =
    proposal.expiresAt && new Date(proposal.expiresAt) < new Date();

  return (
    <ProposalDraftClient
      initialProposal={proposal}
      isExpired={isExpired || false}
      magicToken={token}
    />
  );
};

export default PublicProposalDraftPage;
