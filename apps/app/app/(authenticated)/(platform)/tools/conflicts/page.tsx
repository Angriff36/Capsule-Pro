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
import { ShieldAlert } from "lucide-react";
import { ConflictsClient } from "./conflicts-client";

export const metadata = {
  title: "Conflict Detection | Tools",
  description:
    "Detect and resolve scheduling, equipment, inventory, and venue conflicts across your operations.",
};

export default function ConflictsPage() {
  return (
    <PageCanvas>
      <CommandBand>
        <CommandBandHeader>
          <div className="space-y-4">
            <MonoLabel tone="dark">Tools / Conflict Detection</MonoLabel>
            <DisplayHeading>Conflict Detection</DisplayHeading>
            <CommandBandLede>
              Identify and resolve conflicts across employees, equipment,
              inventory, and venues before they become operational issues.
            </CommandBandLede>
          </div>
        </CommandBandHeader>
        <CommandBandBody>
          <MetricBand cols={4}>
            <MetricCell>
              <MetricLabel>Detection engine</MetricLabel>
              <MetricValue>
                <ShieldAlert className="mr-2 inline h-5 w-5" />
                Active
              </MetricValue>
              <p className="text-sm text-white/70">Automated scanning</p>
            </MetricCell>
            <MetricCell>
              <MetricLabel>Scheduling</MetricLabel>
              <MetricValue>Conflicts</MetricValue>
              <p className="text-sm text-white/70">Double-bookings</p>
            </MetricCell>
            <MetricCell>
              <MetricLabel>Equipment</MetricLabel>
              <MetricValue>Overlaps</MetricValue>
              <p className="text-sm text-white/70">Resource conflicts</p>
            </MetricCell>
            <MetricCell>
              <MetricLabel>Inventory</MetricLabel>
              <MetricValue>Shortages</MetricValue>
              <p className="text-sm text-white/70">Stock conflicts</p>
            </MetricCell>
          </MetricBand>
        </CommandBandBody>
      </CommandBand>

      <OperationalColumn>
        <ConflictsClient />
      </OperationalColumn>
    </PageCanvas>
  );
}
