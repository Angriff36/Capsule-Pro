"use client";

Object.defineProperty(exports, "__esModule", { value: true });
exports.ProposalForm = ProposalForm;
const badge_1 = require("@repo/design-system/components/ui/badge");
const button_1 = require("@repo/design-system/components/ui/button");
const card_1 = require("@repo/design-system/components/ui/card");
const input_1 = require("@repo/design-system/components/ui/input");
const label_1 = require("@repo/design-system/components/ui/label");
const select_1 = require("@repo/design-system/components/ui/select");
const separator_1 = require("@repo/design-system/components/ui/separator");
const table_1 = require("@repo/design-system/components/ui/table");
const textarea_1 = require("@repo/design-system/components/ui/textarea");
const date_fns_1 = require("date-fns");
const lucide_react_1 = require("lucide-react");
const navigation_1 = require("next/navigation");
const react_1 = require("react");
const sonner_1 = require("sonner");
const itemTypes = [
  { value: "menu", label: "Menu Item" },
  { value: "service", label: "Service" },
  { value: "rental", label: "Rental Equipment" },
  { value: "staff", label: "Staffing" },
  { value: "fee", label: "Fee" },
  { value: "discount", label: "Discount" },
];
const eventTypes = [
  "Wedding",
  "Corporate Event",
  "Social Gathering",
  "Birthday Party",
  "Anniversary",
  "Graduation",
  "Holiday Party",
  "Fundraiser",
  "Other",
];
function getClientDisplayName(client) {
  if (client.company_name) return client.company_name;
  return (
    `${client.first_name || ""} ${client.last_name || ""}`.trim() || "No name"
  );
}
function ProposalForm({ proposal, action, submitLabel }) {
  const router = (0, navigation_1.useRouter)();
  const [state, formAction, isPending] = (0, react_1.useActionState)(
    action,
    null
  );
  const [clients, setClients] = (0, react_1.useState)([]);
  const [isLoadingClients, setIsLoadingClients] = (0, react_1.useState)(true);
  const [lineItems, setLineItems] = (0, react_1.useState)([]);
  const [newItem, setNewItem] = (0, react_1.useState)({
    itemType: "menu",
    description: "",
    quantity: 1,
    unitPrice: 0,
  });
  // Calculate totals
  const subtotal = lineItems.reduce(
    (sum, item) => sum + item.quantity * item.unitPrice,
    0
  );
  const taxRate = proposal?.taxRate
    ? typeof proposal.taxRate === "number"
      ? proposal.taxRate
      : Number(proposal.taxRate)
    : 0;
  const taxAmount = subtotal * (taxRate / 100);
  const discountAmount = proposal?.discountAmount
    ? typeof proposal.discountAmount === "number"
      ? proposal.discountAmount
      : Number(proposal.discountAmount)
    : 0;
  const total = subtotal + taxAmount - discountAmount;
  // Fetch clients on mount
  (0, react_1.useEffect)(() => {
    async function fetchClients() {
      try {
        const response = await fetch("/api/crm/clients?limit=1000");
        if (!response.ok) throw new Error("Failed to fetch clients");
        const data = await response.json();
        setClients(data.data || []);
      } catch (error) {
        console.error("Error fetching clients:", error);
        sonner_1.toast.error("Failed to load clients", {
          description: error instanceof Error ? error.message : "Unknown error",
        });
      } finally {
        setIsLoadingClients(false);
      }
    }
    fetchClients();
  }, []);
  // Handle redirect after successful submission
  (0, react_1.useEffect)(() => {
    if (state && typeof state === "object" && "redirect" in state) {
      router.push(state.redirect);
    }
  }, [state, router]);
  const addLineItem = () => {
    if (!(newItem.description && newItem.itemType)) {
      sonner_1.toast.error("Please fill in the required line item fields");
      return;
    }
    setLineItems([
      ...lineItems,
      {
        id: `temp-${Date.now()}`,
        itemType: newItem.itemType,
        description: newItem.description,
        quantity: newItem.quantity || 1,
        unitPrice: newItem.unitPrice || 0,
        notes: newItem.notes,
      },
    ]);
    setNewItem({
      itemType: "menu",
      description: "",
      quantity: 1,
      unitPrice: 0,
    });
  };
  const removeLineItem = (id) => {
    setLineItems(lineItems.filter((item) => item.id !== id));
  };
  const formatDateValue = (date) => {
    if (!date) return "";
    if (typeof date === "string") return date;
    return (0, date_fns_1.format)(date, "yyyy-MM-dd");
  };
  return (
    <form action={formAction} className="space-y-6">
      {proposal?.id && (
        <input name="proposalId" type="hidden" value={proposal.id} />
      )}
      <input name="lineItems" type="hidden" value={JSON.stringify(lineItems)} />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Info */}
          <card_1.Card>
            <card_1.CardHeader>
              <card_1.CardTitle>Basic Information</card_1.CardTitle>
              <card_1.CardDescription>
                Core details about the proposal
              </card_1.CardDescription>
            </card_1.CardHeader>
            <card_1.CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label_1.Label htmlFor="title">
                    Proposal Title *
                  </label_1.Label>
                  <input_1.Input
                    defaultValue={proposal?.title || ""}
                    id="title"
                    name="title"
                    placeholder="Annual Company Gala"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label_1.Label htmlFor="clientId">Client</label_1.Label>
                  <select_1.Select
                    defaultValue={proposal?.clientId || ""}
                    name="clientId"
                  >
                    <select_1.SelectTrigger>
                      <select_1.SelectValue placeholder="Select a client" />
                    </select_1.SelectTrigger>
                    <select_1.SelectContent>
                      <select_1.SelectItem value="">
                        No client selected
                      </select_1.SelectItem>
                      {isLoadingClients ? (
                        <select_1.SelectItem disabled value="loading">
                          Loading clients...
                        </select_1.SelectItem>
                      ) : (
                        clients.map((client) => (
                          <select_1.SelectItem
                            key={client.id}
                            value={client.id}
                          >
                            {getClientDisplayName(client)}
                          </select_1.SelectItem>
                        ))
                      )}
                    </select_1.SelectContent>
                  </select_1.Select>
                </div>

                <div className="space-y-2">
                  <label_1.Label htmlFor="eventType">Event Type</label_1.Label>
                  <select_1.Select
                    defaultValue={proposal?.eventType || ""}
                    name="eventType"
                  >
                    <select_1.SelectTrigger>
                      <select_1.SelectValue placeholder="Select event type" />
                    </select_1.SelectTrigger>
                    <select_1.SelectContent>
                      <select_1.SelectItem value="">
                        Not specified
                      </select_1.SelectItem>
                      {eventTypes.map((type) => (
                        <select_1.SelectItem key={type} value={type}>
                          {type}
                        </select_1.SelectItem>
                      ))}
                    </select_1.SelectContent>
                  </select_1.Select>
                </div>

                <div className="space-y-2">
                  <label_1.Label htmlFor="eventDate">Event Date</label_1.Label>
                  <input_1.Input
                    defaultValue={formatDateValue(proposal?.eventDate)}
                    id="eventDate"
                    name="eventDate"
                    type="date"
                  />
                </div>

                <div className="space-y-2">
                  <label_1.Label htmlFor="guestCount">
                    Guest Count
                  </label_1.Label>
                  <input_1.Input
                    defaultValue={proposal?.guestCount || ""}
                    id="guestCount"
                    min="0"
                    name="guestCount"
                    placeholder="100"
                    type="number"
                  />
                </div>

                <div className="space-y-2">
                  <label_1.Label htmlFor="status">Status</label_1.Label>
                  <select_1.Select
                    defaultValue={proposal?.status || "draft"}
                    name="status"
                  >
                    <select_1.SelectTrigger>
                      <select_1.SelectValue placeholder="Select status" />
                    </select_1.SelectTrigger>
                    <select_1.SelectContent>
                      <select_1.SelectItem value="draft">
                        Draft
                      </select_1.SelectItem>
                      <select_1.SelectItem value="sent">
                        Sent
                      </select_1.SelectItem>
                      <select_1.SelectItem value="viewed">
                        Viewed
                      </select_1.SelectItem>
                      <select_1.SelectItem value="accepted">
                        Accepted
                      </select_1.SelectItem>
                      <select_1.SelectItem value="rejected">
                        Rejected
                      </select_1.SelectItem>
                      <select_1.SelectItem value="expired">
                        Expired
                      </select_1.SelectItem>
                    </select_1.SelectContent>
                  </select_1.Select>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label_1.Label htmlFor="venueName">Venue Name</label_1.Label>
                  <input_1.Input
                    defaultValue={proposal?.venueName || ""}
                    id="venueName"
                    name="venueName"
                    placeholder="Grand Ballroom"
                  />
                </div>

                <div className="space-y-2">
                  <label_1.Label htmlFor="venueAddress">
                    Venue Address
                  </label_1.Label>
                  <input_1.Input
                    defaultValue={proposal?.venueAddress || ""}
                    id="venueAddress"
                    name="venueAddress"
                    placeholder="123 Main St, City, State 12345"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label_1.Label htmlFor="notes">Notes</label_1.Label>
                <textarea_1.Textarea
                  defaultValue={proposal?.notes || ""}
                  id="notes"
                  name="notes"
                  placeholder="Additional notes about the proposal..."
                  rows={3}
                />
              </div>
            </card_1.CardContent>
          </card_1.Card>

          {/* Line Items */}
          <card_1.Card>
            <card_1.CardHeader>
              <card_1.CardTitle>Proposal Items</card_1.CardTitle>
              <card_1.CardDescription>
                Add menu items, services, and fees
              </card_1.CardDescription>
            </card_1.CardHeader>
            <card_1.CardContent className="space-y-4">
              {/* Add new line item */}
              <div className="flex flex-col gap-3 p-4 border rounded-lg bg-muted/50">
                <div className="grid gap-3 md:grid-cols-5">
                  <div className="space-y-1">
                    <label_1.Label className="text-xs" htmlFor="new-item-type">
                      Type
                    </label_1.Label>
                    <select_1.Select
                      onValueChange={(value) =>
                        setNewItem({ ...newItem, itemType: value })
                      }
                      value={newItem.itemType}
                    >
                      <select_1.SelectTrigger id="new-item-type">
                        <select_1.SelectValue />
                      </select_1.SelectTrigger>
                      <select_1.SelectContent>
                        {itemTypes.map((type) => (
                          <select_1.SelectItem
                            key={type.value}
                            value={type.value}
                          >
                            {type.label}
                          </select_1.SelectItem>
                        ))}
                      </select_1.SelectContent>
                    </select_1.Select>
                  </div>

                  <div className="space-y-1 md:col-span-2">
                    <label_1.Label className="text-xs" htmlFor="new-item-desc">
                      Description
                    </label_1.Label>
                    <input_1.Input
                      id="new-item-desc"
                      onChange={(e) =>
                        setNewItem({ ...newItem, description: e.target.value })
                      }
                      placeholder="Item description"
                      value={newItem.description}
                    />
                  </div>

                  <div className="space-y-1">
                    <label_1.Label className="text-xs" htmlFor="new-item-qty">
                      Qty
                    </label_1.Label>
                    <input_1.Input
                      id="new-item-qty"
                      min="0"
                      onChange={(e) =>
                        setNewItem({
                          ...newItem,
                          quantity: Number.parseFloat(e.target.value) || 0,
                        })
                      }
                      placeholder="1"
                      type="number"
                      value={newItem.quantity}
                    />
                  </div>

                  <div className="space-y-1">
                    <label_1.Label className="text-xs" htmlFor="new-item-price">
                      Unit Price
                    </label_1.Label>
                    <input_1.Input
                      id="new-item-price"
                      min="0"
                      onChange={(e) =>
                        setNewItem({
                          ...newItem,
                          unitPrice: Number.parseFloat(e.target.value) || 0,
                        })
                      }
                      placeholder="0.00"
                      step="0.01"
                      type="number"
                      value={newItem.unitPrice}
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <button_1.Button
                    onClick={addLineItem}
                    size="sm"
                    type="button"
                    variant="secondary"
                  >
                    <lucide_react_1.Plus className="mr-2 h-4 w-4" />
                    Add Item
                  </button_1.Button>
                </div>
              </div>

              {/* Line items table */}
              {lineItems.length > 0 && (
                <div className="border rounded-lg">
                  <table_1.Table>
                    <table_1.TableHeader>
                      <table_1.TableRow>
                        <table_1.TableHead>Type</table_1.TableHead>
                        <table_1.TableHead>Description</table_1.TableHead>
                        <table_1.TableHead className="text-right">
                          Quantity
                        </table_1.TableHead>
                        <table_1.TableHead className="text-right">
                          Unit Price
                        </table_1.TableHead>
                        <table_1.TableHead className="text-right">
                          Total
                        </table_1.TableHead>
                        <table_1.TableHead />
                      </table_1.TableRow>
                    </table_1.TableHeader>
                    <table_1.TableBody>
                      {lineItems.map((item) => (
                        <table_1.TableRow key={item.id}>
                          <table_1.TableCell>
                            <badge_1.Badge
                              className="text-xs"
                              variant="outline"
                            >
                              {itemTypes.find((t) => t.value === item.itemType)
                                ?.label || item.itemType}
                            </badge_1.Badge>
                          </table_1.TableCell>
                          <table_1.TableCell>
                            {item.description}
                          </table_1.TableCell>
                          <table_1.TableCell className="text-right">
                            {item.quantity}
                          </table_1.TableCell>
                          <table_1.TableCell className="text-right">
                            ${item.unitPrice.toFixed(2)}
                          </table_1.TableCell>
                          <table_1.TableCell className="text-right font-medium">
                            ${(item.quantity * item.unitPrice).toFixed(2)}
                          </table_1.TableCell>
                          <table_1.TableCell className="text-right">
                            <button_1.Button
                              onClick={() => removeLineItem(item.id)}
                              size="icon"
                              type="button"
                              variant="ghost"
                            >
                              <lucide_react_1.Trash2 className="h-4 w-4 text-destructive" />
                            </button_1.Button>
                          </table_1.TableCell>
                        </table_1.TableRow>
                      ))}
                    </table_1.TableBody>
                  </table_1.Table>
                </div>
              )}

              {lineItems.length === 0 && (
                <p className="text-center text-muted-foreground py-8">
                  No items added yet. Add items above to build your proposal.
                </p>
              )}
            </card_1.CardContent>
          </card_1.Card>

          {/* Terms */}
          <card_1.Card>
            <card_1.CardHeader>
              <card_1.CardTitle>Terms & Conditions</card_1.CardTitle>
            </card_1.CardHeader>
            <card_1.CardContent>
              <textarea_1.Textarea
                defaultValue={proposal?.termsAndConditions || ""}
                name="termsAndConditions"
                placeholder="Enter terms and conditions for this proposal..."
                rows={6}
              />
            </card_1.CardContent>
          </card_1.Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Pricing */}
          <card_1.Card>
            <card_1.CardHeader>
              <card_1.CardTitle>Pricing</card_1.CardTitle>
            </card_1.CardHeader>
            <card_1.CardContent className="space-y-4">
              <div className="space-y-2">
                <label_1.Label htmlFor="taxRate">Tax Rate (%)</label_1.Label>
                <input_1.Input
                  defaultValue={
                    proposal?.taxRate
                      ? typeof proposal.taxRate === "number"
                        ? proposal.taxRate
                        : Number(proposal.taxRate)
                      : 0
                  }
                  id="taxRate"
                  min="0"
                  name="taxRate"
                  placeholder="8.5"
                  step="0.01"
                  type="number"
                />
              </div>

              <div className="space-y-2">
                <label_1.Label htmlFor="discountAmount">
                  Discount Amount
                </label_1.Label>
                <input_1.Input
                  defaultValue={
                    proposal?.discountAmount
                      ? typeof proposal.discountAmount === "number"
                        ? proposal.discountAmount
                        : Number(proposal.discountAmount)
                      : 0
                  }
                  id="discountAmount"
                  min="0"
                  name="discountAmount"
                  placeholder="0.00"
                  step="0.01"
                  type="number"
                />
              </div>

              <separator_1.Separator />

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-medium">${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    Tax ({taxRate}%)
                  </span>
                  <span className="font-medium">${taxAmount.toFixed(2)}</span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between text-sm text-green-600">
                    <span>Discount</span>
                    <span className="font-medium">
                      -${discountAmount.toFixed(2)}
                    </span>
                  </div>
                )}
                <separator_1.Separator />
                <div className="flex justify-between text-lg font-bold">
                  <span>Total</span>
                  <span>${total.toFixed(2)}</span>
                </div>
              </div>
            </card_1.CardContent>
          </card_1.Card>

          {/* Valid Until */}
          <card_1.Card>
            <card_1.CardHeader>
              <card_1.CardTitle>Expiration</card_1.CardTitle>
            </card_1.CardHeader>
            <card_1.CardContent className="space-y-4">
              <div className="space-y-2">
                <label_1.Label htmlFor="validUntil">Valid Until</label_1.Label>
                <input_1.Input
                  defaultValue={formatDateValue(proposal?.validUntil)}
                  id="validUntil"
                  name="validUntil"
                  type="date"
                />
                <p className="text-xs text-muted-foreground">
                  Leave empty for no expiration
                </p>
              </div>
            </card_1.CardContent>
          </card_1.Card>

          {/* Submit */}
          <div className="flex flex-col gap-2">
            <button_1.Button
              className="w-full"
              disabled={isPending}
              type="submit"
            >
              {isPending ? "Saving..." : submitLabel}
            </button_1.Button>
            <button_1.Button
              disabled={isPending}
              onClick={() => router.back()}
              type="button"
              variant="outline"
            >
              Cancel
            </button_1.Button>
          </div>
        </div>
      </div>
    </form>
  );
}
