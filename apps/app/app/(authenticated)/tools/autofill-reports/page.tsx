import {
  CommandBand,
  CommandBandHeader,
  CommandBandLede,
  DisplayHeading,
  MonoLabel,
  OperationalColumn,
  PageCanvas,
} from "@repo/design-system/components/blocks/page-shell";
import { AutofillReportsClient } from "./autofill-reports-client";

// No metric band here on purpose: this page has no computed stats, and the
// previous band dressed static marketing labels ("Active", "Autofill") as
// metric values.
const ToolsAutofillReportsPage = () => (
  <PageCanvas>
    <CommandBand>
      <CommandBandHeader>
        <div className="space-y-4">
          <MonoLabel tone="dark">Tools / Autofill Reports</MonoLabel>
          <DisplayHeading>Autofill Reports</DisplayHeading>
          <CommandBandLede>
            Generate structured reports from events, parse documents for
            autofill, and review kitchen waste analytics.
          </CommandBandLede>
        </div>
      </CommandBandHeader>
    </CommandBand>

    <OperationalColumn>
      <AutofillReportsClient />
    </OperationalColumn>
  </PageCanvas>
);

export default ToolsAutofillReportsPage;
