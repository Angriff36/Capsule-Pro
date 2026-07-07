"use client";

import {
  CommandBand,
  CommandBandActions,
  CommandBandHeader,
  CommandBandLede,
  DisplayHeading,
  MetricBand,
  MetricCell,
  MetricLabel,
  MetricValue,
  MonoLabel,
  PageBody,
  PageCanvas,
} from "@repo/design-system/components/blocks/page-shell";
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
    <PageCanvas>
      <CommandBand>
        <CommandBandHeader>
          <div>
            <MonoLabel tone="dark">Client Detail</MonoLabel>
            <div className="mt-1 flex items-center gap-3">
              <DisplayHeading size="md">
                {getClientDisplayName()}
              </DisplayHeading>
              <Badge variant="outline">{client.clientType}</Badge>
            </div>
            <CommandBandLede className="mt-2">
              <span className="inline-flex flex-wrap items-center gap-x-4 gap-y-1">
                {client.email && (
                  <span className="inline-flex items-center gap-1.5">
                    <MailIcon className="h-3.5 w-3.5" />
                    {client.email}
                  </span>
                )}
                {client.phone && (
                  <span className="inline-flex items-center gap-1.5">
                    <PhoneIcon className="h-3.5 w-3.5" />
                    {client.phone}
                  </span>
                )}
                {client.source && (
                  <span className="text-xs">via {client.source}</span>
                )}
              </span>
            </CommandBandLede>
          </div>
          <CommandBandActions>
            <Button
              className="mt-1"
              onClick={() => router.back()}
              size="sm"
              variant="on-dark"
            >
              <ArrowLeftIcon className="mr-2 h-4 w-4" />
              Back
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button disabled={isDeleting} variant="on-dark">
                  <TrashIcon className="mr-2 h-4 w-4" />
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
          </CommandBandActions>
        </CommandBandHeader>

        <MetricBand cols={4}>
          <MetricCell>
            <MetricLabel>Total Events</MetricLabel>
            <MetricValue>{client.eventCount}</MetricValue>
          </MetricCell>
          <MetricCell>
            <MetricLabel>Interactions</MetricLabel>
            <MetricValue>{client.interactionCount}</MetricValue>
          </MetricCell>
          <MetricCell>
            <MetricLabel>Total Revenue</MetricLabel>
            <MetricValue>
              {client.totalRevenue
                ? `$${Number(client.totalRevenue.total).toLocaleString()}`
                : "$0"}
            </MetricValue>
          </MetricCell>
          <MetricCell>
            <MetricLabel>Contacts</MetricLabel>
            <MetricValue>{client.contacts.length}</MetricValue>
          </MetricCell>
        </MetricBand>
      </CommandBand>

      <PageBody>
        {/* Tabs */}
        <Tabs onValueChange={setActiveTab} value={activeTab}>
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="contact">
              <UserIcon className="mr-2 h-4 w-4" />
              Contact
            </TabsTrigger>
            <TabsTrigger value="contacts">
              <UsersIcon className="mr-2 h-4 w-4" />
              Contacts
            </TabsTrigger>
            <TabsTrigger value="events">
              <CalendarIcon className="mr-2 h-4 w-4" />
              Events
            </TabsTrigger>
            <TabsTrigger value="communications">
              <MessageSquareIcon className="mr-2 h-4 w-4" />
              Communications
            </TabsTrigger>
            <TabsTrigger value="preferences">
              <TagIcon className="mr-2 h-4 w-4" />
              Preferences
            </TabsTrigger>
            <TabsTrigger value="financial">
              <DollarSignIcon className="mr-2 h-4 w-4" />
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
      </PageBody>
    </PageCanvas>
  );
}
