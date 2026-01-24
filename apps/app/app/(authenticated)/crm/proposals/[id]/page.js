/**
 * Proposal Detail Page
 *
 * Displays a single proposal with all details and line items
 */
var __importDefault =
  (this && this.__importDefault) ||
  ((mod) => (mod && mod.__esModule ? mod : { default: mod }));
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateMetadata = generateMetadata;
exports.default = ProposalDetailPage;
const badge_1 = require("@repo/design-system/components/ui/badge");
const button_1 = require("@repo/design-system/components/ui/button");
const card_1 = require("@repo/design-system/components/ui/card");
const separator_1 = require("@repo/design-system/components/ui/separator");
const table_1 = require("@repo/design-system/components/ui/table");
const date_fns_1 = require("date-fns");
const lucide_react_1 = require("lucide-react");
const link_1 = __importDefault(require("next/link"));
const navigation_1 = require("next/navigation");
const actions_1 = require("../actions");
async function generateMetadata({ params }) {
  const { id } = await params;
  try {
    const proposal = await (0, actions_1.getProposalById)(id);
    return {
      title: `${proposal.title} - ${proposal.proposalNumber}`,
      description: `Proposal for ${proposal.title}`,
    };
  } catch {
    return {
      title: "Proposal Not Found",
    };
  }
}
async function ProposalDetailPage({ params }) {
  const { id } = await params;
  let proposal;
  try {
    proposal = await (0, actions_1.getProposalById)(id);
  } catch {
    (0, navigation_1.notFound)();
  }
  const statusVariants = {
    draft: "default",
    sent: "secondary",
    viewed: "outline",
    accepted: "default",
    rejected: "destructive",
    expired: "secondary",
  };
  const statusLabels = {
    draft: "Draft",
    sent: "Sent",
    viewed: "Viewed",
    accepted: "Accepted",
    rejected: "Rejected",
    expired: "Expired",
  };
  function getClientName() {
    if (proposal.client?.company_name) return proposal.client.company_name;
    if (proposal.client) {
      return (
        `${proposal.client.first_name || ""} ${proposal.client.last_name || ""}`.trim() ||
        "No name"
      );
    }
    if (proposal.lead?.company_name) return proposal.lead.company_name;
    if (proposal.lead) {
      return (
        `${proposal.lead.first_name || ""} ${proposal.lead.last_name || ""}`.trim() ||
        "No name"
      );
    }
    return "No client";
  }
  function getClientEmail() {
    return proposal.client?.email || proposal.lead?.email || null;
  }
  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button_1.Button asChild size="icon" variant="ghost">
            <link_1.default href="/crm/proposals">
              <lucide_react_1.ArrowLeft className="h-4 w-4" />
            </link_1.default>
          </button_1.Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight">
                {proposal.title}
              </h1>
              <badge_1.Badge
                variant={
                  (proposal.status && statusVariants[proposal.status]) ||
                  "default"
                }
              >
                {(proposal.status && statusLabels[proposal.status]) ||
                  proposal.status ||
                  "Unknown"}
              </badge_1.Badge>
            </div>
            <p className="text-muted-foreground">
              {proposal.proposalNumber} • Created{" "}
              {(0, date_fns_1.format)(
                new Date(proposal.createdAt),
                "MMM d, yyyy"
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {proposal.status === "draft" && (
            <form
              action={`/api/crm/proposals/${proposal.id}/send`}
              method="POST"
            >
              <button_1.Button type="submit">
                <lucide_react_1.Send className="mr-2 h-4 w-4" />
                Send Proposal
              </button_1.Button>
            </form>
          )}
          <button_1.Button asChild variant="outline">
            <link_1.default href={`/crm/proposals/${proposal.id}/edit`}>
              <lucide_react_1.Edit className="mr-2 h-4 w-4" />
              Edit
            </link_1.default>
          </button_1.Button>
          <button_1.Button variant="outline">
            <lucide_react_1.Download className="mr-2 h-4 w-4" />
            Export PDF
          </button_1.Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Event Details */}
          <card_1.Card>
            <card_1.CardHeader>
              <card_1.CardTitle>Event Details</card_1.CardTitle>
            </card_1.CardHeader>
            <card_1.CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="flex items-center gap-3">
                  <lucide_react_1.Calendar className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Event Date</p>
                    <p className="font-medium">
                      {proposal.eventDate
                        ? (0, date_fns_1.format)(
                            new Date(proposal.eventDate),
                            "EEEE, MMMM d, yyyy"
                          )
                        : "Not set"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <lucide_react_1.Users className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Guest Count</p>
                    <p className="font-medium">
                      {proposal.guestCount
                        ? proposal.guestCount.toLocaleString()
                        : "Not set"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <lucide_react_1.FileText className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Event Type</p>
                    <p className="font-medium">
                      {proposal.eventType || "Not specified"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <lucide_react_1.MapPin className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Venue</p>
                    <p className="font-medium">
                      {proposal.venueName || "Not set"}
                      {proposal.venueAddress && (
                        <span className="text-muted-foreground">
                          {" "}
                          - {proposal.venueAddress}
                        </span>
                      )}
                    </p>
                  </div>
                </div>
              </div>
              {proposal.notes && (
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Notes</p>
                  <p className="text-sm">{proposal.notes}</p>
                </div>
              )}
            </card_1.CardContent>
          </card_1.Card>

          {/* Line Items */}
          <card_1.Card>
            <card_1.CardHeader>
              <card_1.CardTitle>Proposal Items</card_1.CardTitle>
              <card_1.CardDescription>
                Detailed breakdown of services and pricing
              </card_1.CardDescription>
            </card_1.CardHeader>
            <card_1.CardContent>
              {proposal.lineItems.length > 0 ? (
                <table_1.Table>
                  <table_1.TableHeader>
                    <table_1.TableRow>
                      <table_1.TableHead>Item</table_1.TableHead>
                      <table_1.TableHead>Type</table_1.TableHead>
                      <table_1.TableHead className="text-right">
                        Quantity
                      </table_1.TableHead>
                      <table_1.TableHead className="text-right">
                        Unit Price
                      </table_1.TableHead>
                      <table_1.TableHead className="text-right">
                        Total
                      </table_1.TableHead>
                    </table_1.TableRow>
                  </table_1.TableHeader>
                  <table_1.TableBody>
                    {proposal.lineItems.map((item) => (
                      <table_1.TableRow key={item.id}>
                        <table_1.TableCell>
                          <div>
                            <p className="font-medium">{item.description}</p>
                            {item.notes && (
                              <p className="text-sm text-muted-foreground">
                                {item.notes}
                              </p>
                            )}
                          </div>
                        </table_1.TableCell>
                        <table_1.TableCell>
                          <badge_1.Badge className="text-xs" variant="outline">
                            {item.itemType}
                          </badge_1.Badge>
                        </table_1.TableCell>
                        <table_1.TableCell className="text-right">
                          {item.quantity}
                        </table_1.TableCell>
                        <table_1.TableCell className="text-right">
                          ${item.unitPrice.toFixed(2)}
                        </table_1.TableCell>
                        <table_1.TableCell className="text-right font-medium">
                          ${item.total?.toFixed(2) ?? "0.00"}
                        </table_1.TableCell>
                      </table_1.TableRow>
                    ))}
                  </table_1.TableBody>
                </table_1.Table>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  No line items added yet
                </p>
              )}
            </card_1.CardContent>
          </card_1.Card>

          {/* Terms */}
          {proposal.termsAndConditions && (
            <card_1.Card>
              <card_1.CardHeader>
                <card_1.CardTitle>Terms & Conditions</card_1.CardTitle>
              </card_1.CardHeader>
              <card_1.CardContent>
                <p className="text-sm whitespace-pre-line">
                  {proposal.termsAndConditions}
                </p>
              </card_1.CardContent>
            </card_1.Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Client Info */}
          <card_1.Card>
            <card_1.CardHeader>
              <card_1.CardTitle>Client Information</card_1.CardTitle>
            </card_1.CardHeader>
            <card_1.CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <lucide_react_1.Building className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Client</p>
                  <p className="font-medium">{getClientName()}</p>
                </div>
              </div>
              {getClientEmail() && (
                <div className="flex items-center gap-3">
                  <lucide_react_1.Mail className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Email</p>
                    <p className="font-medium">{getClientEmail()}</p>
                  </div>
                </div>
              )}
              {proposal.client?.phone && (
                <div className="flex items-center gap-3">
                  <lucide_react_1.User className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Phone</p>
                    <p className="font-medium">{proposal.client.phone}</p>
                  </div>
                </div>
              )}
              {proposal.event && (
                <div>
                  <p className="text-sm text-muted-foreground">Linked Event</p>
                  <button_1.Button
                    asChild
                    className="p-0 h-auto"
                    variant="link"
                  >
                    <link_1.default href={`/events/${proposal.event.id}`}>
                      {proposal.event.name}
                    </link_1.default>
                  </button_1.Button>
                </div>
              )}
            </card_1.CardContent>
          </card_1.Card>

          {/* Pricing Summary */}
          <card_1.Card>
            <card_1.CardHeader>
              <card_1.CardTitle>Pricing Summary</card_1.CardTitle>
            </card_1.CardHeader>
            <card_1.CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-medium">
                  ${proposal.subtotal?.toFixed(2) ?? "0.00"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tax Rate</span>
                <span className="font-medium">{proposal.taxRate}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tax Amount</span>
                <span className="font-medium">
                  ${proposal.taxAmount?.toFixed(2) ?? "0.00"}
                </span>
              </div>
              {(proposal.discountAmount ?? 0) > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Discount</span>
                  <span className="font-medium">
                    -${proposal.discountAmount?.toFixed(2) ?? "0.00"}
                  </span>
                </div>
              )}
              <separator_1.Separator />
              <div className="flex justify-between text-lg font-bold">
                <span>Total</span>
                <span>${proposal.total?.toFixed(2) ?? "0.00"}</span>
              </div>
            </card_1.CardContent>
          </card_1.Card>

          {/* Status Timeline */}
          <card_1.Card>
            <card_1.CardHeader>
              <card_1.CardTitle>Status Timeline</card_1.CardTitle>
            </card_1.CardHeader>
            <card_1.CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Created</span>
                <span className="text-sm">
                  {(0, date_fns_1.format)(
                    new Date(proposal.createdAt),
                    "MMM d, yyyy"
                  )}
                </span>
              </div>
              {proposal.validUntil && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    Valid Until
                  </span>
                  <span className="text-sm">
                    {(0, date_fns_1.format)(
                      new Date(proposal.validUntil),
                      "MMM d, yyyy"
                    )}
                  </span>
                </div>
              )}
              {proposal.sentAt && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Sent</span>
                  <span className="text-sm">
                    {(0, date_fns_1.format)(
                      new Date(proposal.sentAt),
                      "MMM d, yyyy"
                    )}
                  </span>
                </div>
              )}
              {proposal.viewedAt && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Viewed</span>
                  <span className="text-sm">
                    {(0, date_fns_1.format)(
                      new Date(proposal.viewedAt),
                      "MMM d, yyyy"
                    )}
                  </span>
                </div>
              )}
              {proposal.acceptedAt && (
                <div className="flex items-center justify-between text-green-600">
                  <span className="text-sm font-medium">Accepted</span>
                  <span className="text-sm font-medium">
                    {(0, date_fns_1.format)(
                      new Date(proposal.acceptedAt),
                      "MMM d, yyyy"
                    )}
                  </span>
                </div>
              )}
              {proposal.rejectedAt && (
                <div className="flex items-center justify-between text-red-600">
                  <span className="text-sm font-medium">Rejected</span>
                  <span className="text-sm font-medium">
                    {(0, date_fns_1.format)(
                      new Date(proposal.rejectedAt),
                      "MMM d, yyyy"
                    )}
                  </span>
                </div>
              )}
            </card_1.CardContent>
          </card_1.Card>
        </div>
      </div>
    </div>
  );
}
