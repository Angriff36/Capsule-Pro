/**
 * Proposals List Page
 *
 * Displays all proposals with filtering and search capabilities
 */
var __importDefault =
  (this && this.__importDefault) ||
  ((mod) => (mod && mod.__esModule ? mod : { default: mod }));
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
exports.default = ProposalsPage;
const button_1 = require("@repo/design-system/components/ui/button");
const lucide_react_1 = require("lucide-react");
const link_1 = __importDefault(require("next/link"));
const proposals_client_1 = require("./components/proposals-client");
exports.metadata = {
  title: "Proposals",
  description: "Manage client proposals and event estimates",
};
async function ProposalsPage({ searchParams }) {
  const params = await searchParams;
  const page = Number(params.page || 1);
  const search = params.search;
  const status = params.status;
  const clientId = params.clientId;
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Proposals</h1>
          <p className="text-muted-foreground">
            Manage client proposals and event estimates
          </p>
        </div>
        <button_1.Button asChild>
          <link_1.default href="/crm/proposals/new">
            <lucide_react_1.Plus className="mr-2 h-4 w-4" />
            New Proposal
          </link_1.default>
        </button_1.Button>
      </div>

      <proposals_client_1.ProposalsClient
        initialClientId={clientId}
        initialPage={page}
        initialSearch={search}
        initialStatus={status}
      />
    </div>
  );
}
