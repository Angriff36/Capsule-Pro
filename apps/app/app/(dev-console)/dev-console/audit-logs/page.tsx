import { AuditLogsClient } from "./audit-logs-client";

const DevConsoleAuditLogsPage = () => (
  <div className="dev-console-stack">
    <header className="dev-console-header">
      <div>
        <p className="dev-console-breadcrumb">Developers / Observability</p>
        <h1 className="dev-console-title">Audit Logs</h1>
      </div>
    </header>

    <AuditLogsClient />
  </div>
);

export default DevConsoleAuditLogsPage;
