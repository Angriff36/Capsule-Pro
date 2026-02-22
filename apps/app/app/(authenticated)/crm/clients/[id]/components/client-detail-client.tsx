"use client";

import { ClientQuickStatsBlock } from "@repo/design-system/components/blocks/client-quick-stats-block";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@repo/design-system/components/ui/alert-dialog";
import { Badge } from "@repo/design-system/components/ui/badge";
import { Button } from "@repo/design-system/components/ui/button";
import { Separator } from "@repo/design-system/components/ui/separator";
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
  KanbanIcon,
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
import { AddToBoardDialog } from "../../../../command-board/components/add-to-board-dialog";
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

interface ClientDetailProps {
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
}

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
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <Button
            className="mt-1"
            onClick={() => router.back()}
            size="sm"
            variant="ghost"
          >
            <ArrowLeftIcon className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight">
                {getClientDisplayName()}
              </h1>
              <Badge variant="outline">{client.clientType}</Badge>
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground mt-2">
              {client.email && (
                <div className="flex items-center gap-1.5">
                  <MailIcon className="h-3.5 w-3.5" />
                  {client.email}
                </div>
              )}
              {client.phone && (
                <div className="flex items-center gap-1.5">
                  <PhoneIcon className="h-3.5 w-3.5" />
                  {client.phone}
                </div>
              )}
              {client.source && (
                <span className="text-xs">via {client.source}</span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <AddToBoardDialog
            defaultBoardDescription={`Client: ${getClientDisplayName()}`}
            defaultBoardName={`Client: ${getClientDisplayName()}`}
            entityId={clientId}
            entityType="client"
            trigger={
              <Button variant="outline">
                <KanbanIcon className="h-4 w-4 mr-2" />
                Add to Board
              </Button>
            }
          />
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button disabled={isDeleting} variant="outline">
                <TrashIcon className="h-4 w-4 mr-2" />
                Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete client?</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete this client? This action
                  cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  onClick={handleDelete}
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <Separator />

      {/* Quick Stats */}
      <section>
        <h2 className="text-sm font-medium text-muted-foreground mb-3">
          Overview
        </h2>
        <ClientQuickStatsBlock
          stats={[
            {
              label: "Total Events",
              value: client.eventCount,
              icon: CalendarIcon,
            },
            {
              label: "Interactions",
              value: client.interactionCount,
              icon: MessageSquareIcon,
            },
            {
              label: "Total Revenue",
              value: client.totalRevenue
                ? `$${Number(client.totalRevenue.total).toLocaleString()}`
                : "$0",
              icon: DollarSignIcon,
            },
            {
              label: "Contacts",
              value: client.contacts.length,
              icon: UsersIcon,
            },
          ]}
        />
      </section>

      <Separator />

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
