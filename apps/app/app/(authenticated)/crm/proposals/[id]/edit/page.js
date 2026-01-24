/**
 * Edit Proposal Page
 *
 * Form for editing an existing proposal
 */
var __importDefault =
  (this && this.__importDefault) ||
  ((mod) => (mod && mod.__esModule ? mod : { default: mod }));
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateMetadata = generateMetadata;
exports.default = EditProposalPage;
const button_1 = require("@repo/design-system/components/ui/button");
const lucide_react_1 = require("lucide-react");
const link_1 = __importDefault(require("next/link"));
const navigation_1 = require("next/navigation");
const actions_1 = require("../../actions");
const proposal_form_1 = require("../../components/proposal-form");
async function generateMetadata({ params }) {
  const { id } = await params;
  try {
    const proposal = await (0, actions_1.getProposalById)(id);
    return {
      title: `Edit ${proposal.title}`,
    };
  } catch {
    return {
      title: "Proposal Not Found",
    };
  }
}
async function EditProposalPage({ params }) {
  const { id } = await params;
  let proposal;
  try {
    proposal = await (0, actions_1.getProposalById)(id);
  } catch {
    (0, navigation_1.notFound)();
  }
  async function handleUpdate(previousState, formData) {
    "use server";
    const id = formData.get("proposalId");
    if (!id) throw new Error("Proposal ID is required");
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
      status: formData.get("status"),
      validUntil: formData.get("validUntil"),
      notes: formData.get("notes"),
      termsAndConditions: formData.get("termsAndConditions"),
      lineItems,
    };
    await (0, actions_1.updateProposal)(id, input);
    return { redirect: `/crm/proposals/${id}` };
  }
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <button_1.Button asChild size="icon" variant="ghost">
          <link_1.default href={`/crm/proposals/${proposal.id}`}>
            <lucide_react_1.ArrowLeft className="h-4 w-4" />
          </link_1.default>
        </button_1.Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Edit Proposal</h1>
          <p className="text-muted-foreground">
            Update proposal details and pricing
          </p>
        </div>
      </div>

      <proposal_form_1.ProposalForm
        action={handleUpdate}
        proposal={proposal}
        submitLabel="Save Changes"
      />
    </div>
  );
}
