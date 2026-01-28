"use client";

import { Badge } from "@repo/design-system/components/ui/badge";
import { Button } from "@repo/design-system/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@repo/design-system/components/ui/tabs";
import {
  ArrowLeftIcon,
  CalendarIcon,
  DollarSignIcon,
  MailIcon,
  MessageSquareIcon,
  PhoneIcon,
  TagIcon,
  TrashIcon,
  UserIcon,
  UsersIcon,
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { deleteClient } from "../../actions";
import { CommunicationsTab } from "./tabs/communications-tab";
import { ContactInfoTab } from "./tabs/contact-info-tab";
import { ContactsTab } from "./tabs/contacts-tab";
import { EventsTab } from "./tabs/events-tab";
import { FinancialTab } from "./tabs/financial-tab";
import { PreferencesTab } from "./tabs/preferences-tab";

/**
 * Valid preference value types based on common use cases.
 * Preferences can store various data types like strings, numbers, booleans,
 * null, JSON objects, or arrays.
 */
type PreferenceValue =
  | string
  | number
  | boolean
  | null
  | Record<string, unknown>
  | unknown[];

type ClientDetailProps = {
  client: {
    id: string;
    tenantId: string;
    clientType: string;
    company_name: string | null;
    first_name: string | null;
    last_name: string | null;
    email: string | null;
    phone: string | null;
    website: string | null;
    addressLine1: string | null;
    addressLine2: string | null;
    city: string | null;
    stateProvince: string | null;
    postalCode: string | null;
    countryCode: string | null;
    defaultPaymentTerms: number | null;
    taxExempt: boolean;
    taxId: string | null;
    notes: string | null;
    tags: string[];
    source: string | null;
    assignedTo: string | null;
    createdAt: Date;
    updatedAt: Date;
    contacts: Array<{
      id: string;
      tenantId: string;
      createdAt: Date;
      updatedAt: Date;
      deletedAt: Date | null;
      first_name: string;
      last_name: string;
      title: string | null;
      email: string | null;
      phone: string | null;
      isPrimary: boolean;
      isBillingContact: boolean;
    }>;
    preferences: Array<{
      id: string;
      preferenceType: string;
      preferenceKey: string;
      preferenceValue: PreferenceValue;
      notes: string | null;
    }>;
    interactionCount: number;
    eventCount: number;
    totalRevenue: { total: string } | null;
  };
};

export function ClientDetailClient({ client }: ClientDetailProps) {
  const router = useRouter();
  const params = useParams();
  const clientId = (params?.id as string) ?? "";

  const [_isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [activeTab, setActiveTab] = useState("contact");

  const getClientDisplayName = () => {
    if (client.clientType === "company" && client.company_name) {
      return client.company_name;
    }
    if (client.first_name || client.last_name) {
      return `${client.first_name || ""} ${client.last_name || ""}`.trim();
    }
    return client.email || "Unnamed Client";
  };

  const _getFullAddress = () => {
    const parts: string[] = [];
    if (client.addressLine1) {
      parts.push(client.addressLine1);
    }
    if (client.addressLine2) {
      parts.push(client.addressLine2);
    }
    if (client.city || client.stateProvince || client.postalCode) {
      const cityParts: string[] = [];
      if (client.city) {
        cityParts.push(client.city);
      }
      if (client.stateProvince) {
        cityParts.push(client.stateProvince);
      }
      if (client.postalCode) {
        cityParts.push(client.postalCode);
      }
      parts.push(cityParts.join(", "));
    }
    if (client.countryCode) {
      parts.push(client.countryCode);
    }
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
      await deleteClient(clientId);
      toast.success("Client deleted successfully");
      router.push("/crm/clients");
    } catch (error) {
      toast.error("Failed to delete client", {
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
          <Button onClick={() => router.back()} size="sm" variant="ghost">
            <ArrowLeftIcon className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight">
                {getClientDisplayName()}
              </h1>
              <Badge variant="outline">{client.clientType}</Badge>
            </div>
            <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
              {client.email && (
                <div className="flex items-center gap-1">
                  <MailIcon className="h-3 w-3" />
                  {client.email}
                </div>
              )}
              {client.phone && (
                <div className="flex items-center gap-1">
                  <PhoneIcon className="h-3 w-3" />
                  {client.phone}
                </div>
              )}
              {client.source && (
                <Badge className="text-xs" variant="secondary">
                  Source: {client.source}
                </Badge>
              )}
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            disabled={isDeleting}
            onClick={handleDelete}
            variant="outline"
          >
            <TrashIcon className="h-4 w-4 mr-2" />
            Delete
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Events
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{client.eventCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Interactions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{client.interactionCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {client.totalRevenue
                ? `$${Number(client.totalRevenue.total).toLocaleString()}`
                : "$0"}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Contacts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{client.contacts.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs onValueChange={setActiveTab} value={activeTab}>
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="contact">
            <UserIcon className="h-4 w-4 mr-2" />
            Contact
          </TabsTrigger>
          <TabsTrigger value="contacts">
            <UsersIcon className="h-4 w-4 mr-2" />
            Contacts
          </TabsTrigger>
          <TabsTrigger value="events">
            <CalendarIcon className="h-4 w-4 mr-2" />
            Events
          </TabsTrigger>
          <TabsTrigger value="communications">
            <MessageSquareIcon className="h-4 w-4 mr-2" />
            Communications
          </TabsTrigger>
          <TabsTrigger value="preferences">
            <TagIcon className="h-4 w-4 mr-2" />
            Preferences
          </TabsTrigger>
          <TabsTrigger value="financial">
            <DollarSignIcon className="h-4 w-4 mr-2" />
            Financial
          </TabsTrigger>
        </TabsList>

        <TabsContent className="mt-6" value="contact">
          <ContactInfoTab client={client} onEdit={() => setIsEditing(true)} />
        </TabsContent>

        <TabsContent className="mt-6" value="contacts">
          <ContactsTab client={client} />
        </TabsContent>

        <TabsContent className="mt-6" value="events">
          <EventsTab clientId={clientId} />
        </TabsContent>

        <TabsContent className="mt-6" value="communications">
          <CommunicationsTab clientId={clientId} />
        </TabsContent>

        <TabsContent className="mt-6" value="preferences">
          <PreferencesTab client={client} />
        </TabsContent>

        <TabsContent className="mt-6" value="financial">
          <FinancialTab client={client} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
