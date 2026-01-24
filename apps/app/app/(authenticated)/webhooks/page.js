Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const webhooks_1 = require("@repo/webhooks");
const navigation_1 = require("next/navigation");
exports.metadata = {
  title: "Webhooks",
  description: "Send webhooks to your users.",
};
const WebhooksPage = async () => {
  const response = await webhooks_1.webhooks.getAppPortal();
  if (!response?.url) {
    (0, navigation_1.notFound)();
  }
  return (
    <div className="h-full w-full overflow-hidden">
      <iframe
        allow="clipboard-write"
        className="h-full w-full border-none"
        loading="lazy"
        src={response.url}
        title="Webhooks"
      />
    </div>
  );
};
exports.default = WebhooksPage;
