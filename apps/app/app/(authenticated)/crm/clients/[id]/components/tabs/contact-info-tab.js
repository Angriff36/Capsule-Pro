"use client";

Object.defineProperty(exports, "__esModule", { value: true });
exports.ContactInfoTab = ContactInfoTab;
const badge_1 = require("@repo/design-system/components/ui/badge");
const button_1 = require("@repo/design-system/components/ui/button");
const card_1 = require("@repo/design-system/components/ui/card");
const input_1 = require("@repo/design-system/components/ui/input");
const label_1 = require("@repo/design-system/components/ui/label");
const textarea_1 = require("@repo/design-system/components/ui/textarea");
const lucide_react_1 = require("lucide-react");
const react_1 = require("react");
const sonner_1 = require("sonner");
const actions_1 = require("../../../actions");
function ContactInfoTab({ client, onEdit }) {
  const [isEditing, setIsEditing] = (0, react_1.useState)(false);
  const [isLoading, setIsLoading] = (0, react_1.useState)(false);
  const [formData, setFormData] = (0, react_1.useState)({
    company_name: client.company_name || "",
    first_name: client.first_name || "",
    last_name: client.last_name || "",
    email: client.email || "",
    phone: client.phone || "",
    website: client.website || "",
    addressLine1: client.addressLine1 || "",
    addressLine2: client.addressLine2 || "",
    city: client.city || "",
    stateProvince: client.stateProvince || "",
    postalCode: client.postalCode || "",
    countryCode: client.countryCode || "",
    taxId: client.taxId || "",
    notes: client.notes || "",
    tags: client.tags.join(", "),
  });
  const handleSave = async () => {
    setIsLoading(true);
    try {
      await (0, actions_1.updateClient)(client.id, {
        company_name: formData.company_name || undefined,
        first_name: formData.first_name || undefined,
        last_name: formData.last_name || undefined,
        email: formData.email || undefined,
        phone: formData.phone || undefined,
        website: formData.website || undefined,
        addressLine1: formData.addressLine1 || undefined,
        addressLine2: formData.addressLine2 || undefined,
        city: formData.city || undefined,
        stateProvince: formData.stateProvince || undefined,
        postalCode: formData.postalCode || undefined,
        countryCode: formData.countryCode || undefined,
        taxId: formData.taxId || undefined,
        notes: formData.notes || undefined,
        tags: formData.tags
          ? formData.tags
              .split(",")
              .map((t) => t.trim())
              .filter(Boolean)
          : undefined,
      });
      sonner_1.toast.success("Client updated successfully");
      setIsEditing(false);
      if (onEdit) onEdit();
    } catch (error) {
      sonner_1.toast.error("Failed to update client", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsLoading(false);
    }
  };
  const handleCancel = () => {
    setFormData({
      company_name: client.company_name || "",
      first_name: client.first_name || "",
      last_name: client.last_name || "",
      email: client.email || "",
      phone: client.phone || "",
      website: client.website || "",
      addressLine1: client.addressLine1 || "",
      addressLine2: client.addressLine2 || "",
      city: client.city || "",
      stateProvince: client.stateProvince || "",
      postalCode: client.postalCode || "",
      countryCode: client.countryCode || "",
      taxId: client.taxId || "",
      notes: client.notes || "",
      tags: client.tags.join(", "),
    });
    setIsEditing(false);
  };
  const getFullAddress = () => {
    const parts = [];
    if (client.addressLine1) parts.push(client.addressLine1);
    if (client.addressLine2) parts.push(client.addressLine2);
    if (client.city || client.stateProvince || client.postalCode) {
      const cityParts = [];
      if (client.city) cityParts.push(client.city);
      if (client.stateProvince) cityParts.push(client.stateProvince);
      if (client.postalCode) cityParts.push(client.postalCode);
      parts.push(cityParts.join(", "));
    }
    if (client.countryCode) parts.push(client.countryCode);
    return parts.join(", ") || "No address on file";
  };
  if (isEditing) {
    return (
      <card_1.Card>
        <card_1.CardHeader>
          <card_1.CardTitle>Edit Contact Information</card_1.CardTitle>
        </card_1.CardHeader>
        <card_1.CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label_1.Label htmlFor="company_name">Company Name</label_1.Label>
              <input_1.Input
                id="company_name"
                onChange={(e) =>
                  setFormData({ ...formData, company_name: e.target.value })
                }
                placeholder="Acme Catering Co."
                value={formData.company_name}
              />
            </div>
            <div className="space-y-2" />
            <div className="space-y-2">
              <label_1.Label htmlFor="first_name">First Name</label_1.Label>
              <input_1.Input
                id="first_name"
                onChange={(e) =>
                  setFormData({ ...formData, first_name: e.target.value })
                }
                placeholder="John"
                value={formData.first_name}
              />
            </div>
            <div className="space-y-2">
              <label_1.Label htmlFor="last_name">Last Name</label_1.Label>
              <input_1.Input
                id="last_name"
                onChange={(e) =>
                  setFormData({ ...formData, last_name: e.target.value })
                }
                placeholder="Doe"
                value={formData.last_name}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label_1.Label htmlFor="email">Email</label_1.Label>
              <input_1.Input
                id="email"
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                placeholder="john@example.com"
                type="email"
                value={formData.email}
              />
            </div>
            <div className="space-y-2">
              <label_1.Label htmlFor="phone">Phone</label_1.Label>
              <input_1.Input
                id="phone"
                onChange={(e) =>
                  setFormData({ ...formData, phone: e.target.value })
                }
                placeholder="(555) 123-4567"
                type="tel"
                value={formData.phone}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label_1.Label htmlFor="website">Website</label_1.Label>
            <input_1.Input
              id="website"
              onChange={(e) =>
                setFormData({ ...formData, website: e.target.value })
              }
              placeholder="https://example.com"
              type="url"
              value={formData.website}
            />
          </div>

          <div className="space-y-2">
            <label_1.Label>Address</label_1.Label>
            <div className="grid grid-cols-2 gap-4">
              <input_1.Input
                onChange={(e) =>
                  setFormData({ ...formData, addressLine1: e.target.value })
                }
                placeholder="Address Line 1"
                value={formData.addressLine1}
              />
              <input_1.Input
                onChange={(e) =>
                  setFormData({ ...formData, addressLine2: e.target.value })
                }
                placeholder="Address Line 2"
                value={formData.addressLine2}
              />
              <input_1.Input
                onChange={(e) =>
                  setFormData({ ...formData, city: e.target.value })
                }
                placeholder="City"
                value={formData.city}
              />
              <input_1.Input
                onChange={(e) =>
                  setFormData({ ...formData, stateProvince: e.target.value })
                }
                placeholder="State/Province"
                value={formData.stateProvince}
              />
              <input_1.Input
                onChange={(e) =>
                  setFormData({ ...formData, postalCode: e.target.value })
                }
                placeholder="Postal Code"
                value={formData.postalCode}
              />
              <input_1.Input
                onChange={(e) =>
                  setFormData({ ...formData, countryCode: e.target.value })
                }
                placeholder="Country Code"
                value={formData.countryCode}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label_1.Label htmlFor="taxId">Tax ID</label_1.Label>
              <input_1.Input
                id="taxId"
                onChange={(e) =>
                  setFormData({ ...formData, taxId: e.target.value })
                }
                placeholder="12-3456789"
                value={formData.taxId}
              />
            </div>
            <div className="space-y-2">
              <label_1.Label htmlFor="tags">
                Tags (comma-separated)
              </label_1.Label>
              <input_1.Input
                id="tags"
                onChange={(e) =>
                  setFormData({ ...formData, tags: e.target.value })
                }
                placeholder="vip, repeat, corporate"
                value={formData.tags}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label_1.Label htmlFor="notes">Notes</label_1.Label>
            <textarea_1.Textarea
              id="notes"
              onChange={(e) =>
                setFormData({ ...formData, notes: e.target.value })
              }
              placeholder="Additional notes about this client..."
              rows={3}
              value={formData.notes}
            />
          </div>

          <div className="flex gap-2">
            <button_1.Button disabled={isLoading} onClick={handleSave}>
              <lucide_react_1.CheckIcon className="h-4 w-4 mr-2" />
              Save
            </button_1.Button>
            <button_1.Button
              disabled={isLoading}
              onClick={handleCancel}
              variant="outline"
            >
              <lucide_react_1.XIcon className="h-4 w-4 mr-2" />
              Cancel
            </button_1.Button>
          </div>
        </card_1.CardContent>
      </card_1.Card>
    );
  }
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Contact Information</h2>
        <button_1.Button
          onClick={() => setIsEditing(true)}
          size="sm"
          variant="outline"
        >
          <lucide_react_1.PencilIcon className="h-4 w-4 mr-2" />
          Edit
        </button_1.Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Name/Company */}
        <card_1.Card>
          <card_1.CardHeader className="pb-3">
            <card_1.CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              {client.clientType === "company" ? (
                <lucide_react_1.Building2Icon className="h-4 w-4" />
              ) : (
                <lucide_react_1.UserIcon className="h-4 w-4" />
              )}
              {client.clientType === "company" ? "Company" : "Name"}
            </card_1.CardTitle>
          </card_1.CardHeader>
          <card_1.CardContent>
            {client.company_name && (
              <div className="font-semibold">{client.company_name}</div>
            )}
            {(client.first_name || client.last_name) && (
              <div className="font-semibold">
                {client.first_name} {client.last_name}
              </div>
            )}
            {!(
              client.company_name ||
              client.first_name ||
              client.last_name
            ) && <div className="text-muted-foreground">Not set</div>}
          </card_1.CardContent>
        </card_1.Card>

        {/* Contact Details */}
        <card_1.Card>
          <card_1.CardHeader className="pb-3">
            <card_1.CardTitle className="text-sm font-medium text-muted-foreground">
              Contact Details
            </card_1.CardTitle>
          </card_1.CardHeader>
          <card_1.CardContent className="space-y-2">
            {client.email && (
              <div className="flex items-center gap-2">
                <lucide_react_1.MailIcon className="h-4 w-4 text-muted-foreground" />
                <a
                  className="text-sm hover:underline"
                  href={`mailto:${client.email}`}
                >
                  {client.email}
                </a>
              </div>
            )}
            {client.phone && (
              <div className="flex items-center gap-2">
                <lucide_react_1.PhoneIcon className="h-4 w-4 text-muted-foreground" />
                <a
                  className="text-sm hover:underline"
                  href={`tel:${client.phone}`}
                >
                  {client.phone}
                </a>
              </div>
            )}
            {client.website && (
              <div className="flex items-center gap-2">
                <lucide_react_1.GlobeIcon className="h-4 w-4 text-muted-foreground" />
                <a
                  className="text-sm hover:underline"
                  href={client.website}
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  {client.website}
                </a>
              </div>
            )}
            {!(client.email || client.phone || client.website) && (
              <div className="text-muted-foreground text-sm">
                No contact details
              </div>
            )}
          </card_1.CardContent>
        </card_1.Card>

        {/* Address */}
        <card_1.Card className="md:col-span-2">
          <card_1.CardHeader className="pb-3">
            <card_1.CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <lucide_react_1.MapPinIcon className="h-4 w-4" />
              Address
            </card_1.CardTitle>
          </card_1.CardHeader>
          <card_1.CardContent>
            <div className="whitespace-pre-line text-sm">
              {getFullAddress()}
            </div>
          </card_1.CardContent>
        </card_1.Card>

        {/* Tags */}
        {client.tags && client.tags.length > 0 && (
          <card_1.Card className="md:col-span-2">
            <card_1.CardHeader className="pb-3">
              <card_1.CardTitle className="text-sm font-medium text-muted-foreground">
                Tags
              </card_1.CardTitle>
            </card_1.CardHeader>
            <card_1.CardContent>
              <div className="flex flex-wrap gap-2">
                {client.tags.map((tag) => (
                  <badge_1.Badge key={tag} variant="secondary">
                    {tag}
                  </badge_1.Badge>
                ))}
              </div>
            </card_1.CardContent>
          </card_1.Card>
        )}

        {/* Notes */}
        {client.notes && (
          <card_1.Card className="md:col-span-2">
            <card_1.CardHeader className="pb-3">
              <card_1.CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <lucide_react_1.FileTextIcon className="h-4 w-4" />
                Notes
              </card_1.CardTitle>
            </card_1.CardHeader>
            <card_1.CardContent>
              <p className="text-sm whitespace-pre-line">{client.notes}</p>
            </card_1.CardContent>
          </card_1.Card>
        )}

        {/* Tax Info */}
        {(client.taxExempt || client.taxId || client.defaultPaymentTerms) && (
          <card_1.Card className="md:col-span-2">
            <card_1.CardHeader className="pb-3">
              <card_1.CardTitle className="text-sm font-medium text-muted-foreground">
                Tax & Payment Information
              </card_1.CardTitle>
            </card_1.CardHeader>
            <card_1.CardContent className="grid grid-cols-3 gap-4 text-sm">
              {client.taxExempt && (
                <div>
                  <span className="text-muted-foreground">Tax Status: </span>
                  <badge_1.Badge variant="secondary">Tax Exempt</badge_1.Badge>
                </div>
              )}
              {client.taxId && (
                <div>
                  <span className="text-muted-foreground">Tax ID: </span>
                  {client.taxId}
                </div>
              )}
              {client.defaultPaymentTerms && (
                <div>
                  <span className="text-muted-foreground">Payment Terms: </span>
                  Net {client.defaultPaymentTerms} days
                </div>
              )}
            </card_1.CardContent>
          </card_1.Card>
        )}
      </div>
    </div>
  );
}
