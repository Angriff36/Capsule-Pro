import {
  CommandBand,
  CommandBandBody,
  CommandBandHeader,
  CommandBandLede,
  DisplayHeading,
  MetricBand,
  MetricCell,
  MetricLabel,
  MetricValue,
  MonoLabel,
  OperationalColumn,
  PageCanvas,
} from "@repo/design-system/components/blocks/page-shell";
import { FileSpreadsheet } from "lucide-react";
import { AutofillReportsClient } from "./autofill-reports-client";

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
      <CommandBandBody>
        <MetricBand cols={3}>
          <MetricCell>
            <MetricLabel>Report engine</MetricLabel>
            <MetricValue>
              <FileSpreadsheet className="mr-2 inline h-5 w-5" />
              Active
            </MetricValue>
            <p className="text-sm text-white/70">Structured reports</p>
          </MetricCell>
          <MetricCell>
            <MetricLabel>Document parsing</MetricLabel>
            <MetricValue>Autofill</MetricValue>
            <p className="text-sm text-white/70">Extract & populate</p>
          </MetricCell>
          <MetricCell>
            <MetricLabel>Analytics</MetricLabel>
            <MetricValue>Waste tracking</MetricValue>
            <p className="text-sm text-white/70">Kitchen analytics</p>
          </MetricCell>
        </MetricBand>
      </CommandBandBody>
    </CommandBand>

    <OperationalColumn>
      <AutofillReportsClient />
    </OperationalColumn>
  </PageCanvas>
);

export default ToolsAutofillReportsPage;
