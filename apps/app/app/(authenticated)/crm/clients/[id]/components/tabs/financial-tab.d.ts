interface FinancialTabProps {
  client: {
    totalRevenue: {
      total: string;
    } | null;
    defaultPaymentTerms: number | null;
    taxExempt: boolean;
    taxId: string | null;
    eventCount: number;
    createdAt: Date;
  };
}
export declare function FinancialTab({
  client,
}: FinancialTabProps): import("react").JSX.Element;
//# sourceMappingURL=financial-tab.d.ts.map
