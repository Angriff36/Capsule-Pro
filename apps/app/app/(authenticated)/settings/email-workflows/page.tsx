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
import { Workflow } from "lucide-react";
import { EmailWorkflowsClient } from "./components/email-workflows-client";

export const metadata = {
  title: "Email Workflows",
  description:
    "Configure automated email triggers for events, proposals, contracts, and more.",
};

export default function EmailWorkflowsPage() {
  return (
    <PageCanvas>
      <CommandBand>
        <CommandBandHeader>
          <div className="space-y-4">
            <MonoLabel tone="dark">Settings / Email Workflows</MonoLabel>
            <DisplayHeading>Email Workflows</DisplayHeading>
            <CommandBandLede>
              Configure automated email triggers for events, proposals,
              contracts, and more.
            </CommandBandLede>
          </div>
        </CommandBandHeader>
        <CommandBandBody>
          <MetricBand cols={3}>
            <MetricCell>
              <MetricLabel>Workflow engine</MetricLabel>
              <MetricValue>
                <Workflow className="mr-2 inline h-5 w-5" />
                Active
              </MetricValue>
              <p className="text-sm text-white/70">Automated triggers</p>
            </MetricCell>
            <MetricCell>
              <MetricLabel>Trigger types</MetricLabel>
              <MetricValue>Event-driven</MetricValue>
              <p className="text-sm text-white/70">Multi-domain support</p>
            </MetricCell>
            <MetricCell>
              <MetricLabel>Recipients</MetricLabel>
              <MetricValue>Flexible</MetricValue>
              <p className="text-sm text-white/70">Dynamic routing</p>
            </MetricCell>
          </MetricBand>
        </CommandBandBody>
      </CommandBand>

      <OperationalColumn>
        <EmailWorkflowsClient />
      </OperationalColumn>
    </PageCanvas>
  );
}
