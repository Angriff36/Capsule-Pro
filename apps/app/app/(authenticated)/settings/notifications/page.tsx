import { requireCurrentUser } from "@/app/lib/tenant";
import { NotificationsClient } from "./notifications-client";

export default async function NotificationsSettingsPage() {
  const user = await requireCurrentUser();

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 pt-0">
      <div className="space-y-0.5">
        <h1 className="text-2xl font-semibold tracking-tight">
          SMS Notifications
        </h1>
        <p className="text-muted-foreground">
          Manage SMS automation rules, delivery history, and notification
          preferences.
        </p>
      </div>
      <NotificationsClient employeeId={user.id} />
    </div>
  );
}
