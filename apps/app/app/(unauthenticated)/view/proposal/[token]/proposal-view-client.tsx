/**
 * @module ProposalViewClient
 * @intent Client component for public proposal viewing page
 * @responsibility Render proposal details, handle accept/reject actions
 * @domain CRM
 * @tags proposals, client-component, viewing
 * @canonical true
 */

"use client";

import { Badge } from "@repo/design-system/components/ui/badge";
import { Button } from "@repo/design-system/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@repo/design-system/components/ui/dialog";
import { Input } from "@repo/design-system/components/ui/input";
import { Label } from "@repo/design-system/components/ui/label";
import { Separator } from "@repo/design-system/components/ui/separator";
import { Textarea } from "@repo/design-system/components/ui/textarea";
import {
  AlertCircleIcon,
  CalendarIcon,
  CheckCircle2Icon,
  ClockIcon,
  DollarSignIcon,
  FileTextIcon,
  MapPinIcon,
  UsersIcon,
  XCircleIcon,
} from "lucide-react";
import { useCallback, useState } from "react";
import { toast } from "sonner";

interface ProposalViewClientProps {
  proposal: {
    id: string;
    proposalNumber: string;
    title: string;
    status: string;
    eventDate: string | null;
    eventType: string | null;
    guestCount: number | null;
    venueName: string | null;
    venueAddress: string | null;
    subtotal: number;
    taxRate: number;
    taxAmount: number;
    discountAmount: number;
    total: number;
    notes: string | null;
    termsAndConditions: string | null;
    validUntil: string | null;
    sentAt: string | null;
    viewedAt: string | null;
    acceptedAt: string | null;
    rejectedAt: string | null;
  };
  lineItems: Array<{
    id: string;
    itemType: string;
    category: string;
    description: string;
    quantity: number;
    unitOfMeasure: string | null;
    unitPrice: number;
    totalPrice: number;
  }>;
  client: {
    company_name: string | null;
    first_name: string | null;
    last_name: string | null;
    email: string | null;
    phone: string | null;
  } | null;
  lead: {
    first_name: string | null;
    last_name: string | null;
    email: string | null;
    phone: string | null;
  } | null;
  event: {
    title: string;
    eventDate: string | null;
    venueName: string | null;
  } | null;
  organization: string;
  isExpired: boolean;
  publicToken: string;
}

type ProposalStatus =
  | "draft"
  | "sent"
  | "viewed"
  | "accepted"
  | "rejected"
  | "expired"
  | "canceled";

const statusConfig: Record<
  ProposalStatus,
  {
    label: string;
    variant: "default" | "secondary" | "outline" | "destructive";
    icon: React.ReactNode;
  }
> = {
  draft: {
    label: "Draft",
    variant: "secondary",
    icon: <FileTextIcon className="size-3" />,
  },
  sent: {
    label: "Sent",
    variant: "outline",
    icon: <ClockIcon className="size-3" />,
  },
  viewed: {
    label: "Viewed",
    variant: "outline",
    icon: <ClockIcon className="size-3" />,
  },
  accepted: {
    label: "Accepted",
    variant: "default",
    icon: <CheckCircle2Icon className="size-3" />,
  },
  rejected: {
    label: "Rejected",
    variant: "destructive",
    icon: <XCircleIcon className="size-3" />,
  },
  expired: {
    label: "Expired",
    variant: "destructive",
    icon: <AlertCircleIcon className="size-3" />,
  },
  canceled: {
    label: "Canceled",
    variant: "destructive",
    icon: <XCircleIcon className="size-3" />,
  },
};

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

export function ProposalViewClient({
  proposal,
  lineItems,
  client,
  lead,
  event,
  organization,
  isExpired,
  publicToken,
}: ProposalViewClientProps) {
  const [proposalStatus, setProposalStatus] = useState(proposal.status);
  const [showRespondDialog, setShowRespondDialog] = useState(false);
  const [respondAction, setRespondAction] = useState<"accept" | "reject">(
    "accept"
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [responderName, setResponderName] = useState("");
  const [responderEmail, setResponderEmail] = useState(
    client?.email || lead?.email || ""
  );
  const [responseNotes, setResponseNotes] = useState("");

  const recipientName =
    client?.company_name ||
    (client?.first_name || client?.last_name
      ? `${client.first_name ?? ""} ${client.last_name ?? ""}`.trim()
      : null) ||
    (lead?.first_name || lead?.last_name
      ? `${lead.first_name ?? ""} ${lead.last_name ?? ""}`.trim()
      : null) ||
    "Client";

  const statusInfo =
    statusConfig[proposalStatus as ProposalStatus] || statusConfig.draft;

  const canRespond =
    !isExpired &&
    proposalStatus !== "accepted" &&
    proposalStatus !== "rejected" &&
    proposalStatus !== "expired" &&
    proposalStatus !== "canceled";

  const handleRespond = useCallback(async () => {
    if (!responderName.trim()) {
      toast.error("Please enter your name");
      return;
    }
    if (!responderEmail.trim()) {
      toast.error("Please enter your email");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(
        `/api/public/proposals/${publicToken}/respond`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: respondAction,
            responderName,
            responderEmail,
            notes: responseNotes || undefined,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Failed to respond to proposal");
      }

      setProposalStatus(respondAction === "accept" ? "accepted" : "rejected");
      toast.success(
        respondAction === "accept"
          ? "Proposal accepted successfully!"
          : "Proposal rejected"
      );
      setShowRespondDialog(false);
    } catch (error) {
      console.error("Error responding to proposal:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to respond to proposal"
      );
    } finally {
      setIsSubmitting(false);
    }
  }, [
    publicToken,
    respondAction,
    responderName,
    responderEmail,
    responseNotes,
  ]);

  const openRespondDialog = useCallback((action: "accept" | "reject") => {
    setRespondAction(action);
    setShowRespondDialog(true);
  }, []);

  const dateFormatter = new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
  });

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <FileTextIcon className="size-6 text-primary" />
            <div>
              <h1 className="font-semibold text-lg">{proposal.title}</h1>
              <p className="text-muted-foreground text-sm">{organization}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge className="gap-1.5" variant={statusInfo.variant}>
              {statusInfo.icon}
              {statusInfo.label}
            </Badge>
            <span className="text-muted-foreground text-sm">
              #{proposal.proposalNumber}
            </span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto max-w-5xl px-4 py-8">
        {/* Expired Warning */}
        {isExpired && proposal.validUntil && (
          <Card className="mb-6 border-destructive">
            <CardContent className="flex items-center gap-3 p-4">
              <AlertCircleIcon className="size-5 text-destructive" />
              <div>
                <p className="font-medium text-destructive">
                  This proposal has expired
                </p>
                <p className="text-muted-foreground text-sm">
                  This proposal was valid until{" "}
                  {dateFormatter.format(new Date(proposal.validUntil))}. Please
                  contact us for a new proposal.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Accepted Message */}
        {proposalStatus === "accepted" && (
          <Card className="mb-6 border-green-500">
            <CardContent className="flex items-center gap-3 p-4">
              <CheckCircle2Icon className="size-5 text-green-500" />
              <div>
                <p className="font-medium text-green-600">Proposal Accepted</p>
                <p className="text-muted-foreground text-sm">
                  Thank you for accepting this proposal. We will be in touch
                  shortly to proceed.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Rejected Message */}
        {proposalStatus === "rejected" && (
          <Card className="mb-6 border-orange-500">
            <CardContent className="flex items-center gap-3 p-4">
              <XCircleIcon className="size-5 text-orange-500" />
              <div>
                <p className="font-medium text-orange-600">Proposal Declined</p>
                <p className="text-muted-foreground text-sm">
                  This proposal has been declined. Please contact us if you have
                  any questions or would like to discuss alternatives.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Proposal Details & Line Items */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left Column - Event & Client Info */}
          <div className="space-y-6">
            {/* Event Details */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CalendarIcon className="size-5 text-primary" />
                  Event Details
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4">
                {proposal.eventDate && (
                  <div className="grid gap-1">
                    <span className="text-muted-foreground text-sm font-medium">
                      Event Date
                    </span>
                    <p className="font-medium">
                      {dateFormatter.format(new Date(proposal.eventDate))}
                    </p>
                  </div>
                )}

                {proposal.eventType && (
                  <div className="grid gap-1">
                    <span className="text-muted-foreground text-sm font-medium">
                      Event Type
                    </span>
                    <p className="font-medium">{proposal.eventType}</p>
                  </div>
                )}

                {proposal.guestCount && (
                  <div className="grid gap-1">
                    <span className="text-muted-foreground text-sm font-medium">
                      Guest Count
                    </span>
                    <p className="flex items-center gap-2 font-medium">
                      <UsersIcon className="size-4" />
                      {proposal.guestCount} guests
                    </p>
                  </div>
                )}

                {(proposal.venueName || proposal.venueAddress) && (
                  <>
                    <Separator />
                    <div className="grid gap-2">
                      <span className="text-muted-foreground text-sm font-medium">
                        Venue
                      </span>
                      {proposal.venueName && (
                        <p className="font-medium">{proposal.venueName}</p>
                      )}
                      {proposal.venueAddress && (
                        <p className="flex items-start gap-2 text-muted-foreground text-sm">
                          <MapPinIcon className="mt-0.5 size-4" />
                          {proposal.venueAddress}
                        </p>
                      )}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Client Info */}
            {(client || lead) && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <UsersIcon className="size-5 text-primary" />
                    Recipient
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid gap-3">
                  <p className="font-medium">{recipientName}</p>
                  {(client?.email || lead?.email) && (
                    <p className="text-muted-foreground text-sm">
                      {client?.email || lead?.email}
                    </p>
                  )}
                  {(client?.phone || lead?.phone) && (
                    <p className="text-muted-foreground text-sm">
                      {client?.phone || lead?.phone}
                    </p>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Valid Until */}
            {proposal.validUntil && (
              <Card>
                <CardContent className="p-4">
                  <div className="grid gap-1">
                    <span className="text-muted-foreground text-sm font-medium">
                      Valid Until
                    </span>
                    <p
                      className={
                        isExpired
                          ? "font-medium text-destructive"
                          : "font-medium"
                      }
                    >
                      {dateFormatter.format(new Date(proposal.validUntil))}
                      {isExpired && " (Expired)"}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Column - Line Items & Summary */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSignIcon className="size-5 text-primary" />
                  Proposal Summary
                </CardTitle>
                <CardDescription>
                  {lineItems.length} item{lineItems.length !== 1 ? "s" : ""}{" "}
                  included in this proposal
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* Line Items Table */}
                <div className="mb-6 overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b text-left">
                        <th className="pb-3 font-medium text-sm">
                          Description
                        </th>
                        <th className="pb-3 text-right font-medium text-sm">
                          Qty
                        </th>
                        <th className="pb-3 text-right font-medium text-sm">
                          Unit Price
                        </th>
                        <th className="pb-3 text-right font-medium text-sm">
                          Total
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {lineItems.map((item) => (
                        <tr className="border-b" key={item.id}>
                          <td className="py-3">
                            <div>
                              <p className="font-medium text-sm">
                                {item.description}
                              </p>
                              <p className="text-muted-foreground text-xs">
                                {item.category}
                              </p>
                            </div>
                          </td>
                          <td className="py-3 text-right text-sm">
                            {item.quantity}
                            {item.unitOfMeasure && ` ${item.unitOfMeasure}`}
                          </td>
                          <td className="py-3 text-right text-sm">
                            {currencyFormatter.format(item.unitPrice)}
                          </td>
                          <td className="py-3 text-right font-medium text-sm">
                            {currencyFormatter.format(item.totalPrice)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Totals */}
                <div className="space-y-2 border-t pt-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>{currencyFormatter.format(proposal.subtotal)}</span>
                  </div>
                  {proposal.discountAmount > 0 && (
                    <div className="flex justify-between text-sm text-green-600">
                      <span>Discount</span>
                      <span>
                        -{currencyFormatter.format(proposal.discountAmount)}
                      </span>
                    </div>
                  )}
                  {proposal.taxAmount > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        Tax ({(proposal.taxRate * 100).toFixed(2)}%)
                      </span>
                      <span>
                        {currencyFormatter.format(proposal.taxAmount)}
                      </span>
                    </div>
                  )}
                  <Separator />
                  <div className="flex justify-between font-semibold text-lg">
                    <span>Total</span>
                    <span>{currencyFormatter.format(proposal.total)}</span>
                  </div>
                </div>

                {/* Notes */}
                {proposal.notes && (
                  <>
                    <Separator className="my-4" />
                    <div className="grid gap-2">
                      <span className="font-medium text-sm">Notes</span>
                      <p className="text-muted-foreground text-sm whitespace-pre-wrap">
                        {proposal.notes}
                      </p>
                    </div>
                  </>
                )}

                {/* Terms & Conditions */}
                {proposal.termsAndConditions && (
                  <>
                    <Separator className="my-4" />
                    <div className="grid gap-2">
                      <span className="font-medium text-sm">
                        Terms & Conditions
                      </span>
                      <p className="text-muted-foreground text-sm whitespace-pre-wrap">
                        {proposal.termsAndConditions}
                      </p>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Action Buttons */}
            {canRespond && (
              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
                <Button
                  className="w-full sm:w-auto"
                  onClick={() => openRespondDialog("reject")}
                  size="lg"
                  variant="outline"
                >
                  <XCircleIcon className="mr-2 size-4" />
                  Decline Proposal
                </Button>
                <Button
                  className="w-full sm:w-auto"
                  onClick={() => openRespondDialog("accept")}
                  size="lg"
                >
                  <CheckCircle2Icon className="mr-2 size-4" />
                  Accept Proposal
                </Button>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t bg-muted/30 py-6">
        <div className="container mx-auto px-4 text-center">
          <p className="text-muted-foreground text-sm">
            Powered by {organization}
          </p>
        </div>
      </footer>

      {/* Response Dialog */}
      <Dialog onOpenChange={setShowRespondDialog} open={showRespondDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {respondAction === "accept"
                ? "Accept Proposal"
                : "Decline Proposal"}
            </DialogTitle>
            <DialogDescription>
              {respondAction === "accept"
                ? "Please confirm your details to accept this proposal."
                : "Please let us know why you're declining (optional)."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Your Name *</Label>
              <Input
                id="name"
                onChange={(e) => setResponderName(e.target.value)}
                placeholder="John Doe"
                value={responderName}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email">Email Address *</Label>
              <Input
                id="email"
                onChange={(e) => setResponderEmail(e.target.value)}
                placeholder="john@example.com"
                type="email"
                value={responderEmail}
              />
            </div>
            {respondAction === "reject" && (
              <div className="grid gap-2">
                <Label htmlFor="notes">Reason (optional)</Label>
                <Textarea
                  id="notes"
                  onChange={(e) => setResponseNotes(e.target.value)}
                  placeholder="Please let us know why you're declining..."
                  value={responseNotes}
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              onClick={() => setShowRespondDialog(false)}
              variant="outline"
            >
              Cancel
            </Button>
            <Button
              disabled={isSubmitting}
              onClick={handleRespond}
              variant={respondAction === "accept" ? "default" : "destructive"}
            >
              {isSubmitting
                ? "Processing..."
                : respondAction === "accept"
                  ? "Accept Proposal"
                  : "Decline Proposal"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
