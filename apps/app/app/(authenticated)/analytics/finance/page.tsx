import { FinanceAnalyticsPageClient } from "./FinanceAnalyticsPageClient";

const AnalyticsFinancePage = () => (
  <div className="space-y-6">
    <div>
      <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
        Analytics
      </p>
      <h1 className="text-2xl font-semibold">Finance Snapshot</h1>
      <p className="text-sm text-muted-foreground">
        Monitor cash, margins, and alerts before approving the next cycle.
      </p>
    </div>

    <FinanceAnalyticsPageClient />
  </div>
);

export default AnalyticsFinancePage;
