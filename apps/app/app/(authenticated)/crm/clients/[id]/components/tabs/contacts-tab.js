"use client";

Object.defineProperty(exports, "__esModule", { value: true });
exports.ContactsTab = ContactsTab;
const badge_1 = require("@repo/design-system/components/ui/badge");
const button_1 = require("@repo/design-system/components/ui/button");
const card_1 = require("@repo/design-system/components/ui/card");
const checkbox_1 = require("@repo/design-system/components/ui/checkbox");
const dialog_1 = require("@repo/design-system/components/ui/dialog");
const input_1 = require("@repo/design-system/components/ui/input");
const label_1 = require("@repo/design-system/components/ui/label");
const lucide_react_1 = require("lucide-react");
const react_1 = require("react");
const sonner_1 = require("sonner");
const actions_1 = require("../../../actions");
function ContactsTab({ client }) {
  const [contacts, setContacts] = (0, react_1.useState)([]);
  const [loading, setLoading] = (0, react_1.useState)(true);
  const [dialogOpen, setDialogOpen] = (0, react_1.useState)(false);
  const [submitting, setSubmitting] = (0, react_1.useState)(false);
  const [formData, setFormData] = (0, react_1.useState)({
    first_name: "",
    last_name: "",
    title: "",
    email: "",
    phone: "",
    isPrimary: false,
    isBillingContact: false,
  });
  const fetchContacts = async () => {
    setLoading(true);
    try {
      const data = await (0, actions_1.getClientContacts)(client.id);
      setContacts(data);
    } catch (error) {
      sonner_1.toast.error("Failed to load contacts");
    } finally {
      setLoading(false);
    }
  };
  (0, react_1.useEffect)(() => {
    fetchContacts();
  }, [client.id]);
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await (0, actions_1.createClientContact)(client.id, {
        first_name: formData.first_name,
        last_name: formData.last_name,
        title: formData.title || undefined,
        email: formData.email || undefined,
        phone: formData.phone || undefined,
        isPrimary: formData.isPrimary,
        isBillingContact: formData.isBillingContact,
      });
      sonner_1.toast.success("Contact added successfully");
      setDialogOpen(false);
      setFormData({
        first_name: "",
        last_name: "",
        title: "",
        email: "",
        phone: "",
        isPrimary: false,
        isBillingContact: false,
      });
      fetchContacts();
    } catch (error) {
      sonner_1.toast.error("Failed to add contact", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setSubmitting(false);
    }
  };
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Contacts ({contacts.length})</h2>
        <dialog_1.Dialog onOpenChange={setDialogOpen} open={dialogOpen}>
          <dialog_1.DialogTrigger asChild>
            <button_1.Button>
              <lucide_react_1.PlusIcon className="h-4 w-4 mr-2" />
              Add Contact
            </button_1.Button>
          </dialog_1.DialogTrigger>
          <dialog_1.DialogContent>
            <dialog_1.DialogHeader>
              <dialog_1.DialogTitle>Add New Contact</dialog_1.DialogTitle>
            </dialog_1.DialogHeader>
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label_1.Label htmlFor="first_name">
                    First Name *
                  </label_1.Label>
                  <input_1.Input
                    id="first_name"
                    onChange={(e) =>
                      setFormData({ ...formData, first_name: e.target.value })
                    }
                    required
                    value={formData.first_name}
                  />
                </div>
                <div className="space-y-2">
                  <label_1.Label htmlFor="last_name">Last Name *</label_1.Label>
                  <input_1.Input
                    id="last_name"
                    onChange={(e) =>
                      setFormData({ ...formData, last_name: e.target.value })
                    }
                    required
                    value={formData.last_name}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label_1.Label htmlFor="title">Title</label_1.Label>
                <input_1.Input
                  id="title"
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  placeholder="Event Manager"
                  value={formData.title}
                />
              </div>
              <div className="space-y-2">
                <label_1.Label htmlFor="email">Email</label_1.Label>
                <input_1.Input
                  id="email"
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  placeholder="contact@example.com"
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
              <div className="flex gap-4">
                <div className="flex items-center space-x-2">
                  <checkbox_1.Checkbox
                    checked={formData.isPrimary}
                    id="isPrimary"
                    onCheckedChange={(checked) =>
                      setFormData({
                        ...formData,
                        isPrimary: checked,
                      })
                    }
                  />
                  <label_1.Label
                    className="flex items-center gap-2"
                    htmlFor="isPrimary"
                  >
                    <lucide_react_1.StarIcon className="h-4 w-4" />
                    Primary Contact
                  </label_1.Label>
                </div>
                <div className="flex items-center space-x-2">
                  <checkbox_1.Checkbox
                    checked={formData.isBillingContact}
                    id="isBillingContact"
                    onCheckedChange={(checked) =>
                      setFormData({
                        ...formData,
                        isBillingContact: checked,
                      })
                    }
                  />
                  <label_1.Label
                    className="flex items-center gap-2"
                    htmlFor="isBillingContact"
                  >
                    <lucide_react_1.CreditCardIcon className="h-4 w-4" />
                    Billing Contact
                  </label_1.Label>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <button_1.Button
                  onClick={() => setDialogOpen(false)}
                  type="button"
                  variant="outline"
                >
                  Cancel
                </button_1.Button>
                <button_1.Button disabled={submitting} type="submit">
                  Add Contact
                </button_1.Button>
              </div>
            </form>
          </dialog_1.DialogContent>
        </dialog_1.Dialog>
      </div>

      {loading ? (
        <div className="text-center py-8 text-muted-foreground">
          Loading contacts...
        </div>
      ) : contacts.length === 0 ? (
        <card_1.Card>
          <card_1.CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <lucide_react_1.UserIcon className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No contacts yet</h3>
            <p className="text-muted-foreground mb-4">
              Add contacts to this client to keep track of key people.
            </p>
            <button_1.Button onClick={() => setDialogOpen(true)}>
              <lucide_react_1.PlusIcon className="h-4 w-4 mr-2" />
              Add First Contact
            </button_1.Button>
          </card_1.CardContent>
        </card_1.Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {contacts.map((contact) => (
            <card_1.Card key={contact.id}>
              <card_1.CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <card_1.CardTitle className="text-base">
                    {contact.first_name} {contact.last_name}
                  </card_1.CardTitle>
                  <div className="flex gap-1">
                    {contact.isPrimary && (
                      <badge_1.Badge className="text-xs" variant="secondary">
                        <lucide_react_1.StarIcon className="h-3 w-3 mr-1" />
                        Primary
                      </badge_1.Badge>
                    )}
                    {contact.isBillingContact && (
                      <badge_1.Badge className="text-xs" variant="secondary">
                        <lucide_react_1.CreditCardIcon className="h-3 w-3 mr-1" />
                        Billing
                      </badge_1.Badge>
                    )}
                  </div>
                </div>
                {contact.title && (
                  <p className="text-sm text-muted-foreground">
                    {contact.title}
                  </p>
                )}
              </card_1.CardHeader>
              <card_1.CardContent className="space-y-2 text-sm">
                {contact.email && (
                  <div className="flex items-center gap-2">
                    <lucide_react_1.MailIcon className="h-4 w-4 text-muted-foreground" />
                    <a
                      className="hover:underline"
                      href={`mailto:${contact.email}`}
                    >
                      {contact.email}
                    </a>
                  </div>
                )}
                {contact.phone && (
                  <div className="flex items-center gap-2">
                    <lucide_react_1.PhoneIcon className="h-4 w-4 text-muted-foreground" />
                    <a
                      className="hover:underline"
                      href={`tel:${contact.phone}`}
                    >
                      {contact.phone}
                    </a>
                  </div>
                )}
              </card_1.CardContent>
            </card_1.Card>
          ))}
        </div>
      )}
    </div>
  );
}
