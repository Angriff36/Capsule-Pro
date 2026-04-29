import { WebhooksClient } from "./webhooks-client";

const DevConsoleWebhooksPage = () => (
  <div className="dev-console-stack">
    <header className="dev-console-header">
      <div>
        <p className="dev-console-breadcrumb">Developers / Integrations</p>
        <h1 className="dev-console-title">Webhooks</h1>
      </div>
    </header>

    <WebhooksClient />
  </div>
);

export default DevConsoleWebhooksPage;
