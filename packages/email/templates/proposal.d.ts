export type ProposalTemplateProps = {
  readonly recipientName: string;
  readonly proposalTitle: string;
  readonly proposalUrl: string;
  readonly message?: string;
  readonly totalAmount?: string;
};
export declare const ProposalTemplate: {
  ({
    recipientName,
    proposalTitle,
    proposalUrl,
    message,
    totalAmount,
  }: ProposalTemplateProps): import("react").JSX.Element;
  PreviewProps: {
    recipientName: string;
    proposalTitle: string;
    proposalUrl: string;
    totalAmount: string;
    message: string;
  };
};
export default ProposalTemplate;
//# sourceMappingURL=proposal.d.ts.map
