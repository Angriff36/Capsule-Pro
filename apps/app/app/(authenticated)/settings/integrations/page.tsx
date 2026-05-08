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
import { Plug } from "lucide-react";
import { IntegrationsClient } from "./integrations-client";

export default function IntegrationsSettingsPage() {
  return (
    <PageCanvas>
      <CommandBand>
        <CommandBandHeader>
          <div className="space-y-4">
            <MonoLabel tone="dark">Settings / Integrations</MonoLabel>
            <DisplayHeading>Integrations</DisplayHeading>
            <CommandBandLede>
              Configure external services and data connections.
            </CommandBandLede>
          </div>
        </CommandBandHeader>
        <CommandBandBody>
          <MetricBand cols={3}>
            <MetricCell>
              <MetricLabel>Integrations</MetricLabel>
              <MetricValue>
                <Plug className="mr-2 inline h-5 w-5" />3
              </MetricValue>
              <p className="text-sm text-white/70">External services</p>
            </MetricCell>
            <MetricCell>
              <MetricLabel>GoodShuffle</MetricLabel>
              <MetricValue>Sync</MetricValue>
              <p className="text-sm text-white/70">Inventory integration</p>
            </MetricCell>
            <MetricCell>
              <MetricLabel>QuickBooks</MetricLabel>
              <MetricValue>Export</MetricValue>
              <p className="text-sm text-white/70">Financial data export</p>
            </MetricCell>
          </MetricBand>
        </CommandBandBody>
      </CommandBand>

      <OperationalColumn>
        <IntegrationsClient />
      </OperationalColumn>
    </PageCanvas>
  );
}
