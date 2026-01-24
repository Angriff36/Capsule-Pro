/**
 * New Proposal Page
 *
 * Form for creating a new proposal
 */
var __importDefault =
  (this && this.__importDefault) ||
  ((mod) => (mod && mod.__esModule ? mod : { default: mod }));
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
exports.default = NewProposalPage;
const button_1 = require("@repo/design-system/components/ui/button");
const lucide_react_1 = require("lucide-react");
const link_1 = __importDefault(require("next/link"));
const actions_1 = require("../actions");
const proposal_form_1 = require("../components/proposal-form");
exports.metadata = {
  title: "New Proposal",
  description: "Create a new event proposal for a client",
};
async function handleCreate(previousState, formData) {
  "use server";
  const lineItemsJson = formData.get("lineItems");
  let lineItems = [];
  if (lineItemsJson) {
    try {
      lineItems = JSON.parse(lineItemsJson);
    } catch {
      lineItems = [];
    }
  }
  const input = {
    title: formData.get("title"),
    clientId: formData.get("clientId"),
    leadId: formData.get("leadId"),
    eventId: formData.get("eventId"),
    eventDate: formData.get("eventDate"),
    eventType: formData.get("eventType"),
    guestCount: formData.get("guestCount")
      ? Number(formData.get("guestCount"))
      : null,
    venueName: formData.get("venueName"),
    venueAddress: formData.get("venueAddress"),
    taxRate: formData.get("taxRate") ? Number(formData.get("taxRate")) : null,
    discountAmount: formData.get("discountAmount")
      ? Number(formData.get("discountAmount"))
      : null,
    status: "draft",
    validUntil: formData.get("validUntil"),
    notes: formData.get("notes"),
    termsAndConditions: formData.get("termsAndConditions"),
    lineItems,
  };
  const proposal = await (0, actions_1.createProposal)(input);
  // Redirect to the proposal detail page
  return { redirect: `/crm/proposals/${proposal.id}` };
}
function NewProposalPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <button_1.Button asChild size="icon" variant="ghost">
          <link_1.default href="/crm/proposals">
            <lucide_react_1.ArrowLeft className="h-4 w-4" />
          </link_1.default>
        </button_1.Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">New Proposal</h1>
          <p className="text-muted-foreground">
            Create a new event proposal for a client
          </p>
        </div>
      </div>

      <proposal_form_1.ProposalForm
        action={handleCreate}
        proposal={null}
        submitLabel="Create Proposal"
      />
    </div>
  );
}
