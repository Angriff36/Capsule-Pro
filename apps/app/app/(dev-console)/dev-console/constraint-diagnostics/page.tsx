import { ConstraintDiagnosticsClient } from "./constraint-diagnostics-client";

const DevConsoleConstraintDiagnosticsPage = () => (
  <div className="dev-console-stack">
    <header className="dev-console-header">
      <div>
        <p className="dev-console-breadcrumb">Developers / Observability</p>
        <h1 className="dev-console-title">Constraint Diagnostics</h1>
      </div>
    </header>

    <ConstraintDiagnosticsClient />
  </div>
);

export default DevConsoleConstraintDiagnosticsPage;
