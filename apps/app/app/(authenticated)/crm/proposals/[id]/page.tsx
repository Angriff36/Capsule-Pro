/**
 * Proposal Detail Page
 *
 * Displays a single proposal with all details and line items
 */

import { Badge } from "@repo/design-system/components/ui/badge";
import { Button } from "@repo/design-system/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";
import { Separator } from "@repo/design-system/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/design-system/components/ui/table";
import { format } from "date-fns";
import {
  ArrowLeft,
  Building,
  Calendar,
  Download,
  Edit,
  FileText,
  Mail,
  MapPin,
  Send,
  User,
  Users,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { apiUrl } from "@/app/lib/api";
import { getProposalById } from "../actions";

interface ProposalPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({
  params,
}: ProposalPageProps): Promise<Metadata> {
  const { id } = await params;
  try {
    const proposal = await getProposalById(id);
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

export default async function ProposalDetailPage({
  params,
}: ProposalPageProps) {
  const { id } = await params;

  // Type with relations as returned by getProposalById
  interface ProposalWithRelations {
    id: string;
    tenantId: string;
    proposalNumber: string;
    title: string;
    clientId: string | null;
    leadId: string | null;
    eventId: string | null;
    eventDate: string | null;
    eventType: string | null;
    guestCount: number | null;
    venueName: string | null;
    venueAddress: string | null;
    subtotal: number | null;
    taxRate: number | null;
    taxAmount: number | null;
    discountAmount: number | null;
    total: number | null;
    status: string | null;
    sentAt: Date | null;
    viewedAt: Date | null;
    acceptedAt: Date | null;
    rejectedAt: Date | null;
    validUntil: string | null;
    notes: string | null;
    termsAndConditions: string | null;
    createdAt: Date;
    updatedAt: Date;
    deletedAt: Date | null;
    client?: {
      id: string;
      company_name: string | null;
      first_name: string | null;
      last_name: string | null;
      email: string | null;
      phone: string | null;
      addressLine1: string | null;
      city: string | null;
      stateProvince: string | null;
      postalCode: string | null;
    } | null;
    lead?: {
      id: string;
      company_name: string | null;
      first_name: string | null;
      last_name: string | null;
      email: string | null;
      phone: string | null;
    } | null;
    event?: {
      id: string;
      name: string;
    } | null;
    lineItems: Array<{
      id: string;
      sortOrder: number | null;
      itemType: string;
      description: string;
      quantity: number;
      unitPrice: number;
      total: number | null;
      notes: string | null;
    }>;
  }

  let proposal: ProposalWithRelations;
  try {
    proposal = (await getProposalById(id)) as unknown as ProposalWithRelations;
  } catch {
    notFound();
  }

  const statusVariants: Record<
    string,
    "default" | "secondary" | "outline" | "destructive"
  > = {
    draft: "default",
    sent: "secondary",
    viewed: "outline",
    accepted: "default" as const,
    rejected: "destructive",
    expired: "secondary",
  };

  const statusLabels: Record<string, string> = {
    draft: "Draft",
    sent: "Sent",
    viewed: "Viewed",
    accepted: "Accepted",
    rejected: "Rejected",
    expired: "Expired",
  };

  function getClientName(): string {
    if (proposal.client?.company_name) {
      return proposal.client.company_name;
    }
    if (proposal.client) {
      return (
        `${proposal.client.first_name || ""} ${proposal.client.last_name || ""}`.trim() ||
        "No name"
      );
    }
    if (proposal.lead?.company_name) {
      return proposal.lead.company_name;
    }
    if (proposal.lead) {
      return (
        `${proposal.lead.first_name || ""} ${proposal.lead.last_name || ""}`.trim() ||
        "No name"
      );
    }
    return "No client";
  }

  function getClientEmail(): string | null {
    return proposal.client?.email || proposal.lead?.email || null;
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button asChild size="icon" variant="ghost">
            <Link href="/crm/proposals">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight">
                {proposal.title}
              </h1>
              <Badge
                variant={
                  (proposal.status && statusVariants[proposal.status]) ||
                  "default"
                }
              >
                {(proposal.status && statusLabels[proposal.status]) ||
                  proposal.status ||
                  "Unknown"}
              </Badge>
            </div>
            <p className="text-muted-foreground">
              {proposal.proposalNumber} • Created{" "}
              {format(new Date(proposal.createdAt), "MMM d, yyyy")}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {proposal.status === "draft" && (
            <form
              action={apiUrl(`/api/crm/proposals/${proposal.id}/send`)}
              method="POST"
            >
              <Button type="submit">
                <Send className="mr-2 h-4 w-4" />
                Send Proposal
              </Button>
            </form>
          )}
          <Button asChild variant="outline">
            <Link href={`/crm/proposals/${proposal.id}/edit`}>
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </Link>
          </Button>
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export PDF
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Event Details */}
          <Card>
            <CardHeader>
              <CardTitle>Event Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="flex items-center gap-3">
                  <Calendar className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Event Date</p>
                    <p className="font-medium">
                      {proposal.eventDate
                        ? format(
                            new Date(proposal.eventDate),
                            "EEEE, MMMM d, yyyy"
                          )
                        : "Not set"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Users className="h-5 w-5 text-muted-foreground" />
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
                  <FileText className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Event Type</p>
                    <p className="font-medium">
                      {proposal.eventType || "Not specified"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <MapPin className="h-5 w-5 text-muted-foreground" />
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
            </CardContent>
          </Card>

          {/* Line Items */}
          <Card>
            <CardHeader>
              <CardTitle>Proposal Items</CardTitle>
              <CardDescription>
                Detailed breakdown of services and pricing
              </CardDescription>
            </CardHeader>
            <CardContent>
              {proposal.lineItems.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="text-right">Quantity</TableHead>
                      <TableHead className="text-right">Unit Price</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {proposal.lineItems.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{item.description}</p>
                            {item.notes && (
                              <p className="text-sm text-muted-foreground">
                                {item.notes}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className="text-xs" variant="outline">
                            {item.itemType}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {item.quantity}
                        </TableCell>
                        <TableCell className="text-right">
                          ${item.unitPrice.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          ${item.total?.toFixed(2) ?? "0.00"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  No line items added yet
                </p>
              )}
            </CardContent>
          </Card>

          {/* Terms */}
          {proposal.termsAndConditions && (
            <Card>
              <CardHeader>
                <CardTitle>Terms & Conditions</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-line">
                  {proposal.termsAndConditions}
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Client Info */}
          <Card>
            <CardHeader>
              <CardTitle>Client Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <Building className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Client</p>
                  <p className="font-medium">{getClientName()}</p>
                </div>
              </div>
              {getClientEmail() && (
                <div className="flex items-center gap-3">
                  <Mail className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Email</p>
                    <p className="font-medium">{getClientEmail()}</p>
                  </div>
                </div>
              )}
              {proposal.client?.phone && (
                <div className="flex items-center gap-3">
                  <User className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Phone</p>
                    <p className="font-medium">{proposal.client.phone}</p>
                  </div>
                </div>
              )}
              {proposal.event && (
                <div>
                  <p className="text-sm text-muted-foreground">Linked Event</p>
                  <Button asChild className="p-0 h-auto" variant="link">
                    <Link href={`/events/${proposal.event.id}`}>
                      {proposal.event.name}
                    </Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Pricing Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Pricing Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
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
              <Separator />
              <div className="flex justify-between text-lg font-bold">
                <span>Total</span>
                <span>${proposal.total?.toFixed(2) ?? "0.00"}</span>
              </div>
            </CardContent>
          </Card>

          {/* Status Timeline */}
          <Card>
            <CardHeader>
              <CardTitle>Status Timeline</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Created</span>
                <span className="text-sm">
                  {format(new Date(proposal.createdAt), "MMM d, yyyy")}
                </span>
              </div>
              {proposal.validUntil && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    Valid Until
                  </span>
                  <span className="text-sm">
                    {format(new Date(proposal.validUntil), "MMM d, yyyy")}
                  </span>
                </div>
              )}
              {proposal.sentAt && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Sent</span>
                  <span className="text-sm">
                    {format(new Date(proposal.sentAt), "MMM d, yyyy")}
                  </span>
                </div>
              )}
              {proposal.viewedAt && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Viewed</span>
                  <span className="text-sm">
                    {format(new Date(proposal.viewedAt), "MMM d, yyyy")}
                  </span>
                </div>
              )}
              {proposal.acceptedAt && (
                <div className="flex items-center justify-between text-green-600">
                  <span className="text-sm font-medium">Accepted</span>
                  <span className="text-sm font-medium">
                    {format(new Date(proposal.acceptedAt), "MMM d, yyyy")}
                  </span>
                </div>
              )}
              {proposal.rejectedAt && (
                <div className="flex items-center justify-between text-red-600">
                  <span className="text-sm font-medium">Rejected</span>
                  <span className="text-sm font-medium">
                    {format(new Date(proposal.rejectedAt), "MMM d, yyyy")}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
