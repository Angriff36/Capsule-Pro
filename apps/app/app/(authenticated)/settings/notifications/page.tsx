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
import { BellRing } from "lucide-react";
import { requireCurrentUser } from "@/app/lib/tenant";
import { NotificationsClient } from "./notifications-client";

export default async function NotificationsSettingsPage() {
  const user = await requireCurrentUser();

  return (
    <PageCanvas>
      <CommandBand>
        <CommandBandHeader>
          <div className="space-y-4">
            <MonoLabel tone="dark">Settings / Notifications</MonoLabel>
            <DisplayHeading>SMS Notifications</DisplayHeading>
            <CommandBandLede>
              Manage SMS automation rules, delivery history, and notification
              preferences.
            </CommandBandLede>
          </div>
        </CommandBandHeader>
        <CommandBandBody>
          <MetricBand cols={3}>
            <MetricCell>
              <MetricLabel>Notification engine</MetricLabel>
              <MetricValue>
                <BellRing className="mr-2 inline h-5 w-5" />
                Active
              </MetricValue>
              <p className="text-sm text-white/70">SMS automation rules</p>
            </MetricCell>
            <MetricCell>
              <MetricLabel>Delivery</MetricLabel>
              <MetricValue>Real-time</MetricValue>
              <p className="text-sm text-white/70">Event-triggered SMS</p>
            </MetricCell>
            <MetricCell>
              <MetricLabel>History</MetricLabel>
              <MetricValue>Full audit</MetricValue>
              <p className="text-sm text-white/70">Delivery tracking</p>
            </MetricCell>
          </MetricBand>
        </CommandBandBody>
      </CommandBand>

      <OperationalColumn>
        <NotificationsClient employeeId={user.id} />
      </OperationalColumn>
    </PageCanvas>
  );
}
