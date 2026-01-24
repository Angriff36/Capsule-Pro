"use client";

Object.defineProperty(exports, "__esModule", { value: true });
exports.ClientDetailClient = ClientDetailClient;
const badge_1 = require("@repo/design-system/components/ui/badge");
const button_1 = require("@repo/design-system/components/ui/button");
const card_1 = require("@repo/design-system/components/ui/card");
const tabs_1 = require("@repo/design-system/components/ui/tabs");
const lucide_react_1 = require("lucide-react");
const navigation_1 = require("next/navigation");
const react_1 = require("react");
const sonner_1 = require("sonner");
const actions_1 = require("../../actions");
const communications_tab_1 = require("./tabs/communications-tab");
const contact_info_tab_1 = require("./tabs/contact-info-tab");
const contacts_tab_1 = require("./tabs/contacts-tab");
const events_tab_1 = require("./tabs/events-tab");
const financial_tab_1 = require("./tabs/financial-tab");
const preferences_tab_1 = require("./tabs/preferences-tab");
function ClientDetailClient({ client }) {
  const router = (0, navigation_1.useRouter)();
  const params = (0, navigation_1.useParams)();
  const clientId = params.id;
  const [isEditing, setIsEditing] = (0, react_1.useState)(false);
  const [isDeleting, setIsDeleting] = (0, react_1.useState)(false);
  const [activeTab, setActiveTab] = (0, react_1.useState)("contact");
  const getClientDisplayName = () => {
    if (client.clientType === "company" && client.company_name) {
      return client.company_name;
    }
    if (client.first_name || client.last_name) {
      return `${client.first_name || ""} ${client.last_name || ""}`.trim();
    }
    return client.email || "Unnamed Client";
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
    return parts.join("\n") || "No address on file";
  };
  const handleDelete = async () => {
    if (
      !confirm(
        "Are you sure you want to delete this client? This action cannot be undone."
      )
    ) {
      return;
    }
    setIsDeleting(true);
    try {
      await (0, actions_1.deleteClient)(clientId);
      sonner_1.toast.success("Client deleted successfully");
      router.push("/crm/clients");
    } catch (error) {
      sonner_1.toast.error("Failed to delete client", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsDeleting(false);
    }
  };
  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button_1.Button
            onClick={() => router.back()}
            size="sm"
            variant="ghost"
          >
            <lucide_react_1.ArrowLeftIcon className="h-4 w-4 mr-2" />
            Back
          </button_1.Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight">
                {getClientDisplayName()}
              </h1>
              <badge_1.Badge variant="outline">
                {client.clientType}
              </badge_1.Badge>
            </div>
            <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
              {client.email && (
                <div className="flex items-center gap-1">
                  <lucide_react_1.MailIcon className="h-3 w-3" />
                  {client.email}
                </div>
              )}
              {client.phone && (
                <div className="flex items-center gap-1">
                  <lucide_react_1.PhoneIcon className="h-3 w-3" />
                  {client.phone}
                </div>
              )}
              {client.source && (
                <badge_1.Badge className="text-xs" variant="secondary">
                  Source: {client.source}
                </badge_1.Badge>
              )}
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <button_1.Button
            disabled={isDeleting}
            onClick={handleDelete}
            variant="outline"
          >
            <lucide_react_1.TrashIcon className="h-4 w-4 mr-2" />
            Delete
          </button_1.Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <card_1.Card>
          <card_1.CardHeader className="pb-2">
            <card_1.CardTitle className="text-sm font-medium text-muted-foreground">
              Total Events
            </card_1.CardTitle>
          </card_1.CardHeader>
          <card_1.CardContent>
            <div className="text-2xl font-bold">{client.eventCount}</div>
          </card_1.CardContent>
        </card_1.Card>
        <card_1.Card>
          <card_1.CardHeader className="pb-2">
            <card_1.CardTitle className="text-sm font-medium text-muted-foreground">
              Interactions
            </card_1.CardTitle>
          </card_1.CardHeader>
          <card_1.CardContent>
            <div className="text-2xl font-bold">{client.interactionCount}</div>
          </card_1.CardContent>
        </card_1.Card>
        <card_1.Card>
          <card_1.CardHeader className="pb-2">
            <card_1.CardTitle className="text-sm font-medium text-muted-foreground">
              Total Revenue
            </card_1.CardTitle>
          </card_1.CardHeader>
          <card_1.CardContent>
            <div className="text-2xl font-bold">
              {client.totalRevenue
                ? `$${Number(client.totalRevenue.total).toLocaleString()}`
                : "$0"}
            </div>
          </card_1.CardContent>
        </card_1.Card>
        <card_1.Card>
          <card_1.CardHeader className="pb-2">
            <card_1.CardTitle className="text-sm font-medium text-muted-foreground">
              Contacts
            </card_1.CardTitle>
          </card_1.CardHeader>
          <card_1.CardContent>
            <div className="text-2xl font-bold">{client.contacts.length}</div>
          </card_1.CardContent>
        </card_1.Card>
      </div>

      {/* Tabs */}
      <tabs_1.Tabs onValueChange={setActiveTab} value={activeTab}>
        <tabs_1.TabsList className="grid w-full grid-cols-6">
          <tabs_1.TabsTrigger value="contact">
            <lucide_react_1.UserIcon className="h-4 w-4 mr-2" />
            Contact
          </tabs_1.TabsTrigger>
          <tabs_1.TabsTrigger value="contacts">
            <lucide_react_1.UsersIcon className="h-4 w-4 mr-2" />
            Contacts
          </tabs_1.TabsTrigger>
          <tabs_1.TabsTrigger value="events">
            <lucide_react_1.CalendarIcon className="h-4 w-4 mr-2" />
            Events
          </tabs_1.TabsTrigger>
          <tabs_1.TabsTrigger value="communications">
            <lucide_react_1.MessageSquareIcon className="h-4 w-4 mr-2" />
            Communications
          </tabs_1.TabsTrigger>
          <tabs_1.TabsTrigger value="preferences">
            <lucide_react_1.TagIcon className="h-4 w-4 mr-2" />
            Preferences
          </tabs_1.TabsTrigger>
          <tabs_1.TabsTrigger value="financial">
            <lucide_react_1.DollarSignIcon className="h-4 w-4 mr-2" />
            Financial
          </tabs_1.TabsTrigger>
        </tabs_1.TabsList>

        <tabs_1.TabsContent className="mt-6" value="contact">
          <contact_info_tab_1.ContactInfoTab
            client={client}
            onEdit={() => setIsEditing(true)}
          />
        </tabs_1.TabsContent>

        <tabs_1.TabsContent className="mt-6" value="contacts">
          <contacts_tab_1.ContactsTab client={client} />
        </tabs_1.TabsContent>

        <tabs_1.TabsContent className="mt-6" value="events">
          <events_tab_1.EventsTab clientId={clientId} />
        </tabs_1.TabsContent>

        <tabs_1.TabsContent className="mt-6" value="communications">
          <communications_tab_1.CommunicationsTab clientId={clientId} />
        </tabs_1.TabsContent>

        <tabs_1.TabsContent className="mt-6" value="preferences">
          <preferences_tab_1.PreferencesTab client={client} />
        </tabs_1.TabsContent>

        <tabs_1.TabsContent className="mt-6" value="financial">
          <financial_tab_1.FinancialTab client={client} />
        </tabs_1.TabsContent>
      </tabs_1.Tabs>
    </div>
  );
}
