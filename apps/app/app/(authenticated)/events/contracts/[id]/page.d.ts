/**
 * @module ContractDetailPage
 * @intent Display full contract details with signatures, document viewer, and actions
 * @responsibility Render contract detail page with server-side data fetching, handle loading/error states
 * @domain Events
 * @tags contracts, events, detail-page
 * @canonical true
 */
type ContractDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};
declare const ContractDetailPage: ({
  params,
}: ContractDetailPageProps) => Promise<import("react").JSX.Element>;
export default ContractDetailPage;
//# sourceMappingURL=page.d.ts.map
