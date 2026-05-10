/**
 * @module AuditLogPage
 * @intent Server component for the audit log settings page
 * @responsibility Fetch audit log metrics and render Cohere shell
 * @domain Settings
 * @tags audit-log, settings, page
 * @canonical true
 */

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
import { FileText } from "lucide-react";
import { AuditLogClient } from "./audit-log-client";

export default async function AuditLogPage() {
  return (
    <PageCanvas>
      <CommandBand>
        <CommandBandHeader>
          <div className="space-y-4">
            <MonoLabel tone="dark">Settings / Audit Log</MonoLabel>
            <DisplayHeading>Audit Log</DisplayHeading>
            <CommandBandLede>
              Track changes to settings, configurations, and data across your
              organization.
            </CommandBandLede>
          </div>
        </CommandBandHeader>
        <CommandBandBody>
          <MetricBand cols={3}>
            <MetricCell>
              <MetricLabel>Compliance tracking</MetricLabel>
              <MetricValue>
                <FileText className="mr-2 inline h-5 w-5" />
                Active
              </MetricValue>
              <p className="text-sm text-white/70">Platform audit log</p>
            </MetricCell>
            <MetricCell>
              <MetricLabel>Filter by</MetricLabel>
              <MetricValue>Action</MetricValue>
              <p className="text-sm text-white/70">Created, updated, deleted</p>
            </MetricCell>
            <MetricCell>
              <MetricLabel>Filter by</MetricLabel>
              <MetricValue>Table</MetricValue>
              <p className="text-sm text-white/70">All tracked entities</p>
            </MetricCell>
          </MetricBand>
        </CommandBandBody>
      </CommandBand>

      <OperationalColumn>
        <AuditLogClient />
      </OperationalColumn>
    </PageCanvas>
  );
}
