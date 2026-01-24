/**
 * Proposal Detail Page
 *
 * Displays a single proposal with all details and line items
 */
import type { Metadata } from "next";
interface ProposalPageProps {
  params: Promise<{
    id: string;
  }>;
}
export declare function generateMetadata({
  params,
}: ProposalPageProps): Promise<Metadata>;
export default function ProposalDetailPage({
  params,
}: ProposalPageProps): Promise<import("react").JSX.Element>;
//# sourceMappingURL=page.d.ts.map
