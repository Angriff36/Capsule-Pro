import { Separator } from "@repo/design-system/components/ui/separator";
import { AutofillReportsClient } from "./autofill-reports-client";

const ToolsAutofillReportsPage = () => (
  <div className="flex flex-1 flex-col gap-6 p-4 pt-0">
    <div className="space-y-0.5">
      <h1 className="text-2xl font-semibold tracking-tight">Autofill Reports</h1>
      <p className="text-muted-foreground">
        Generate structured reports from events, parse documents for autofill,
        and review kitchen waste analytics.
      </p>
    </div>
    <Separator />
    <AutofillReportsClient />
  </div>
);

export default ToolsAutofillReportsPage;
