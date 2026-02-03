import { Separator } from "@repo/design-system/components/ui/separator";
import { FinanceAnalyticsPageClient } from "./FinanceAnalyticsPageClient";

const AnalyticsFinancePage = () => (
  <div className="flex flex-1 flex-col gap-8 p-4 pt-0">
    <div className="space-y-0.5">
      <h1 className="text-3xl font-bold tracking-tight">Finance Snapshot</h1>
      <p className="text-muted-foreground">
        Monitor cash, margins, and alerts before approving the next cycle.
      </p>
    </div>

    <Separator />

    <FinanceAnalyticsPageClient />
  </div>
);

export default AnalyticsFinancePage;
