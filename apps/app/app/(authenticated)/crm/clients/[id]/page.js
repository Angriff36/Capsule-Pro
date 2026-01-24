Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
exports.default = ClientDetailPage;
const navigation_1 = require("next/navigation");
const actions_1 = require("../actions");
const client_detail_client_1 = require("./components/client-detail-client");
async function ClientDetailPage({ params }) {
  const { id } = await params;
  try {
    const client = await (0, actions_1.getClientById)(id);
    return <client_detail_client_1.ClientDetailClient client={client} />;
  } catch (error) {
    (0, navigation_1.notFound)();
  }
}
exports.metadata = {
  title: "Client Details",
  description: "View and manage client information.",
};
