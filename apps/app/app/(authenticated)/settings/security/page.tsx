/**
 * @module SettingsSecurityPage
 * @intent Server component for security settings — API keys and role policies
 * @responsibility Render Cohere shell and delegate to SecurityClient
 * @domain Settings / Security
 * @tags settings, security, server-page
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
import { Shield } from "lucide-react";
import { SecurityClient } from "./security-client";

export default function SettingsSecurityPage() {
  return (
    <PageCanvas>
      <CommandBand>
        <CommandBandHeader>
          <div className="space-y-4">
            <MonoLabel tone="dark">Settings / Security</MonoLabel>
            <DisplayHeading>Security</DisplayHeading>
            <CommandBandLede>
              Review security policies, manage API keys, and access controls.
            </CommandBandLede>
          </div>
        </CommandBandHeader>
        <CommandBandBody>
          <MetricBand cols={3}>
            <MetricCell>
              <MetricLabel>Access control</MetricLabel>
              <MetricValue>
                <Shield className="mr-2 inline h-5 w-5" />
                Active
              </MetricValue>
              <p className="text-sm text-white/70">API key management</p>
            </MetricCell>
            <MetricCell>
              <MetricLabel>API keys</MetricLabel>
              <MetricValue>Scoped</MetricValue>
              <p className="text-sm text-white/70">Per-key permissions</p>
            </MetricCell>
            <MetricCell>
              <MetricLabel>Role policies</MetricLabel>
              <MetricValue>Enforced</MetricValue>
              <p className="text-sm text-white/70">Role-based access</p>
            </MetricCell>
          </MetricBand>
        </CommandBandBody>
      </CommandBand>

      <OperationalColumn>
        <SecurityClient />
      </OperationalColumn>
    </PageCanvas>
  );
}
