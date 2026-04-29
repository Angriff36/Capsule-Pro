import { NotificationsClient } from "./notifications-client";

const NotificationsSettingsPage = () => (
  <div className="flex flex-1 flex-col gap-6 p-4 pt-0">
    <div className="space-y-0.5">
      <h1 className="text-3xl font-bold tracking-tight">SMS Notifications</h1>
      <p className="text-muted-foreground">
        Manage SMS automation rules and view delivery history.
      </p>
    </div>
    <NotificationsClient />
  </div>
);

export default NotificationsSettingsPage;
