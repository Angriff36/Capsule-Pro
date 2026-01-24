export type ContractTemplateProps = {
  readonly clientName: string;
  readonly contractTitle: string;
  readonly signingUrl: string;
  readonly message?: string;
};
export declare const ContractTemplate: {
  ({
    clientName,
    contractTitle,
    signingUrl,
    message,
  }: ContractTemplateProps): import("react").JSX.Element;
  PreviewProps: {
    clientName: string;
    contractTitle: string;
    signingUrl: string;
    message: string;
  };
};
export default ContractTemplate;
//# sourceMappingURL=contract.d.ts.map
