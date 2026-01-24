/**
 * Edit Proposal Page
 *
 * Form for editing an existing proposal
 */
import type { Metadata } from "next";
interface EditProposalPageProps {
  params: Promise<{
    id: string;
  }>;
}
export declare function generateMetadata({
  params,
}: EditProposalPageProps): Promise<Metadata>;
export default function EditProposalPage({
  params,
}: EditProposalPageProps): Promise<import("react").JSX.Element>;
//# sourceMappingURL=page.d.ts.map
