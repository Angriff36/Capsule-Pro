import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
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
import { Bell, BellOff, CheckCircle } from "lucide-react";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import { NotificationsClient } from "./notifications-client";

export default async function NotificationsPage() {
  const { orgId, userId } = await auth();
  if (!(orgId && userId)) {
    return null;
  }

  const tenantId = await getTenantIdForOrg(orgId);

  const rawNotifications = await database.notification.findMany({
    where: { tenantId },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const notifications = rawNotifications.map((n) => ({
    tenantId: n.tenantId,
    id: n.id,
    recipientEmployeeId: n.recipientEmployeeId,
    notificationType: n.notificationType,
    title: n.title,
    body: n.body,
    actionUrl: n.actionUrl,
    isRead: n.isRead,
    readAt: n.readAt?.toISOString() ?? null,
    createdAt: n.createdAt.toISOString(),
    correlationId: n.correlationId,
  }));

  const total = notifications.length;
  const unreadCount = notifications.filter((n) => !n.isRead).length;
  const readCount = total - unreadCount;

  return (
    <PageCanvas>
      <CommandBand>
        <CommandBandHeader>
          <div className="space-y-4">
            <MonoLabel tone="dark">Collaboration / Notifications</MonoLabel>
            <DisplayHeading>Notification Center</DisplayHeading>
            <CommandBandLede>
              View and manage your in-app notifications. Mark items as read,
              dismiss alerts, or remove notifications you no longer need.
            </CommandBandLede>
          </div>
        </CommandBandHeader>
        <CommandBandBody>
          <MetricBand cols={3}>
            <MetricCell>
              <MetricLabel>Total</MetricLabel>
              <MetricValue>
                <Bell className="mr-2 inline h-5 w-5" />
                {total}
              </MetricValue>
              <p className="text-sm text-white/70">All notifications</p>
            </MetricCell>
            <MetricCell>
              <MetricLabel>Unread</MetricLabel>
              <MetricValue>
                <CheckCircle className="mr-2 inline h-5 w-5" />
                {unreadCount}
              </MetricValue>
              <p className="text-sm text-white/70">Require attention</p>
            </MetricCell>
            <MetricCell>
              <MetricLabel>Read</MetricLabel>
              <MetricValue>
                <BellOff className="mr-2 inline h-5 w-5" />
                {readCount}
              </MetricValue>
              <p className="text-sm text-white/70">Already viewed</p>
            </MetricCell>
          </MetricBand>
        </CommandBandBody>
      </CommandBand>

      <OperationalColumn>
        <NotificationsClient initialNotifications={notifications} />
      </OperationalColumn>
    </PageCanvas>
  );
}
