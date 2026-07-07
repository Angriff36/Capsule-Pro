import {
  CommandBand,
  CommandBandHeader,
  CommandBandLede,
  DisplayHeading,
  MonoLabel,
  OperationalColumn,
  PageCanvas,
} from "@repo/design-system/components/blocks/page-shell";
import { BellIcon } from "lucide-react";
import { NotificationsClient } from "./notifications-client";

export default function SchedulingNotificationsPage() {
  return (
    <PageCanvas>
      <CommandBand>
        <CommandBandHeader>
          <div className="space-y-4">
            <MonoLabel tone="dark">Operations / Scheduling</MonoLabel>
            <DisplayHeading>
              <span className="inline-flex items-center gap-2">
                <BellIcon aria-hidden className="size-6" />
                Notifications
              </span>
            </DisplayHeading>
            <CommandBandLede>
              Shift assignments, schedule changes, time-off updates, and
              certification reminders.
            </CommandBandLede>
          </div>
        </CommandBandHeader>
      </CommandBand>

      <OperationalColumn>
        <NotificationsClient />
      </OperationalColumn>
    </PageCanvas>
  );
}
