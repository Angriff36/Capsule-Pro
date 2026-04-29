import { ApiKeysClient } from "./api-keys-client";

const DevConsoleApiKeysPage = () => (
  <div className="dev-console-stack">
    <header className="dev-console-header">
      <div>
        <p className="dev-console-breadcrumb">Developers / Security</p>
        <h1 className="dev-console-title">API Keys</h1>
      </div>
    </header>

    <ApiKeysClient />
  </div>
);

export default DevConsoleApiKeysPage;
