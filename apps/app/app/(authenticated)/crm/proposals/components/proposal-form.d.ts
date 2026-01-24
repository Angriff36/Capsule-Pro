/**
 * Proposal Form Component
 *
 * Reusable form for creating and editing proposals
 */
import type { Proposal } from "@repo/database";
interface ProposalFormProps {
  proposal: Proposal | null;
  action: (
    previousState: {
      redirect: string;
    } | null,
    formData: FormData
  ) => Promise<{
    redirect: string;
  } | null>;
  submitLabel: string;
}
export declare function ProposalForm({
  proposal,
  action,
  submitLabel,
}: ProposalFormProps): import("react").JSX.Element;
//# sourceMappingURL=proposal-form.d.ts.map
