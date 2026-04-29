/**
 * @module AuditLogPage
 * @intent Server component wrapper for the audit log settings page
 * @responsibility Render the page layout and delegate to the client component
 * @domain Settings
 * @tags audit-log, settings, page
 * @canonical true
 */

import { AuditLogClient } from "./audit-log-client";

const AuditLogPage = () => (
  <div className="flex flex-1 flex-col gap-6 p-4 pt-0">
    <div className="space-y-0.5">
      <h1 className="text-3xl font-bold tracking-tight">Audit Log</h1>
      <p className="text-muted-foreground">
        View a history of changes made to settings and configurations.
      </p>
    </div>
    <AuditLogClient />
  </div>
);

export default AuditLogPage;
