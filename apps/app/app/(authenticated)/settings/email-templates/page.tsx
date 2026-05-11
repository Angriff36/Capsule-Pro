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
import { Mail } from "lucide-react";
import { requireManagerUser } from "@/app/lib/auth-guards";
import { EmailTemplatesClient } from "./components/email-templates-client";

export const metadata = {
  title: "Email Templates",
  description:
    "Create and manage branded email templates for proposals, confirmations, reminders, and follow-ups.",
};

export default async function EmailTemplatesPage() {
  await requireManagerUser();

  return (
    <PageCanvas>
      <CommandBand>
        <CommandBandHeader>
          <div className="space-y-4">
            <MonoLabel tone="dark">Settings / Email Templates</MonoLabel>
            <DisplayHeading>Email Templates</DisplayHeading>
            <CommandBandLede>
              Create and manage branded email templates for proposals,
              confirmations, reminders, and follow-ups.
            </CommandBandLede>
          </div>
        </CommandBandHeader>
        <CommandBandBody>
          <MetricBand cols={3}>
            <MetricCell>
              <MetricLabel>Template engine</MetricLabel>
              <MetricValue>
                <Mail className="mr-2 inline h-5 w-5" />
                Active
              </MetricValue>
              <p className="text-sm text-white/70">Branded templates</p>
            </MetricCell>
            <MetricCell>
              <MetricLabel>Merge fields</MetricLabel>
              <MetricValue>Dynamic</MetricValue>
              <p className="text-sm text-white/70">Personalization tokens</p>
            </MetricCell>
            <MetricCell>
              <MetricLabel>Types</MetricLabel>
              <MetricValue>7</MetricValue>
              <p className="text-sm text-white/70">Template categories</p>
            </MetricCell>
          </MetricBand>
        </CommandBandBody>
      </CommandBand>

      <OperationalColumn>
        <EmailTemplatesClient />
      </OperationalColumn>
    </PageCanvas>
  );
}
