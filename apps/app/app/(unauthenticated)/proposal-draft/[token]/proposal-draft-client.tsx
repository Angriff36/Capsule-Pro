/**
 * Proposal Draft Client Component
 *
 * Client component for viewing and responding to AI-generated proposals
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
  SparklesIcon,
} from "lucide-react";
import { useCallback, useState } from "react";
import { toast } from "sonner";

interface ProposalDraftClientProps {
  initialProposal: {
    id: string;
    title: string;
    status: string;
    version: number;
    clientName: string;
    eventSummary: {
      title: string;
      eventType: string;
      eventDate: string | null;
      eventTime: string | null;
      guestCount: number | null;
      venuePreference: string | null;
      venueId: string | null;
      serviceStyle: string | null;
      dietaryRestrictions: string | null;
      hostNotes: string | null;
    };
    menuSections: Array<{
      id: string;
      title: string;
      description: string;
      items: Array<{
        id: string;
        name: string;
        description: string;
        quantity: number;
        unitPrice: number;
        totalPrice: number;
        category: string;
      }>;
    }>;
    servicePlan: {
      serviceStyle: string;
      staffRequired: number;
      setupTime: string;
      breakdownTime: string;
      includes: string[];
    };
    pricingBreakdown: {
      subtotal: number;
      taxRate: number;
      taxAmount: number;
      total: number;
      currency: string;
      lineItems: Array<{
        id: string;
        category: string;
        description: string;
        quantity: number;
        unitPrice: number;
        totalPrice: number;
      }>;
    };
    timeline?: {
      id: string;
      time: string;
      activity: string;
      duration: string;
      responsible: string;
    };
    upgradeOptions?: {
      title: string;
      description: string;
      options: Array<{
        id: string;
        name: string;
        description: string;
        price: number;
        category: string;
      }>;
    };
    visionSummary?: string;
    notes?: string;
    nextSteps?: string;
    createdAt: string;
    expiresAt: string;
  };
  isExpired: boolean;
  magicToken: string;
}

type ProposalDraftStatus =
  | "draft"
  | "sent"
  | "viewed"
  | "change_requested"
  | "approved"
  | "expired"
  | "converted";

const statusConfig: Record<
  ProposalDraftStatus,
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
  approved: {
    label: "Approved",
    variant: "default",
    icon: <CheckCircle2Icon className="size-3" />,
  },
  change_requested: {
    label: "Change Requested",
    variant: "outline",
    icon: <ClockIcon className="size-3" />,
  },
  expired: {
    label: "Expired",
    variant: "destructive",
    icon: <AlertCircleIcon className="size-3" />,
  },
  converted: {
    label: "Converted",
    variant: "default",
    icon: <CheckCircle2Icon className="size-3" />,
  },
};

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

export function ProposalDraftClient({
  initialProposal,
  isExpired,
  magicToken,
}: ProposalDraftClientProps) {
  const [proposal, setProposal] = useState(initialProposal);
  const [showRespondDialog, setShowRespondDialog] = useState(false);
  const [respondAction, setRespondAction] = useState<"approve" | "request_changes">("approve");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [responderName, setResponderName] = useState("");
  const [responderEmail, setResponderEmail] = useState("");
  const [responseNotes, setResponseNotes] = useState("");

  const statusInfo =
    statusConfig[proposal.status as ProposalDraftStatus] || statusConfig.draft;

  const canRespond =
    !isExpired &&
    proposal.status !== "approved" &&
    proposal.status !== "expired" &&
    proposal.status !== "converted";

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
      const response = await fetch(`/api/public/proposals-draft/${magicToken}/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: respondAction,
          responderName,
          responderEmail,
          notes: responseNotes || undefined,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Failed to respond to proposal");
      }

      setProposal({ ...proposal, status: result.proposalStatus });
      toast.success(
        respondAction === "approve"
          ? "Proposal approved successfully!"
          : "Thank you for your feedback"
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
  }, [magicToken, respondAction, responderName, responderEmail, responseNotes]);

  const openRespondDialog = useCallback((action: "approve" | "request_changes") => {
    setRespondAction(action);
    setShowRespondDialog(true);
  }, []);

  const dateFormatter = new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <header className="border-b bg-white shadow-sm">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <SparklesIcon className="size-6 text-primary" />
            <div>
              <h1 className="font-semibold text-lg">{proposal.title}</h1>
              <p className="text-muted-foreground text-sm">
                AI-Generated Proposal
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge className="gap-1.5" variant={statusInfo.variant}>
              {statusInfo.icon}
              {statusInfo.label}
            </Badge>
            <span className="text-muted-foreground text-sm">v{proposal.version}</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto max-w-5xl px-4 py-8">
        {/* Expired Warning */}
        {isExpired && proposal.expiresAt && (
          <Card className="mb-6 border-destructive">
            <CardContent className="flex items-center gap-3 p-4">
              <AlertCircleIcon className="size-5 text-destructive" />
              <div>
                <p className="font-medium text-destructive">
                  This proposal has expired
                </p>
                <p className="text-muted-foreground text-sm">
                  This proposal was valid until{" "}
                  {dateFormatter.format(new Date(proposal.expiresAt))}. Please
                  contact us for a new proposal.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* AI Summary */}
        {proposal.visionSummary && (
          <Card className="mb-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
            <CardContent className="p-6">
              <div className="flex items-start gap-3">
                <SparklesIcon className="size-5 text-primary mt-1" />
                <div>
                  <h3 className="font-semibold text-lg mb-2">About This Event</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    {proposal.visionSummary}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Approved Message */}
        {proposal.status === "approved" && (
          <Card className="mb-6 border-green-500">
            <CardContent className="flex items-center gap-3 p-4">
              <CheckCircle2Icon className="size-5 text-green-500" />
              <div>
                <p className="font-medium text-green-600">Proposal Approved!</p>
                <p className="text-muted-foreground text-sm">
                  Thank you for approving this proposal. We will be in touch shortly to
                  proceed.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Change Requested Message */}
        {proposal.status === "change_requested" && (
          <Card className="mb-6 border-orange-500">
            <CardContent className="flex items-center gap-3 p-4">
              <ClockIcon className="size-5 text-orange-500" />
              <div>
                <p className="font-medium text-orange-600">Change Requested</p>
                <p className="text-muted-foreground text-sm">
                  Thank you for your feedback. We'll review your request and be in touch
                  soon.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Event Details & Pricing */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left Column - Event Info */}
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
                {proposal.eventSummary.eventDate && (
                  <div className="grid gap-1">
                    <span className="text-muted-foreground text-sm font-medium">
                      Event Date
                    </span>
                    <p className="font-medium">
                      {dateFormatter.format(new Date(proposal.eventSummary.eventDate))}
                    </p>
                  </div>
                )}

                {proposal.eventSummary.eventTime && (
                  <div className="grid gap-1">
                    <span className="text-muted-foreground text-sm font-medium">
                      Event Time
                    </span>
                    <p className="font-medium">{proposal.eventSummary.eventTime}</p>
                  </div>
                )}

                {proposal.eventSummary.eventType && (
                  <div className="grid gap-1">
                    <span className="text-muted-foreground text-sm font-medium">
                      Event Type
                    </span>
                    <p className="font-medium capitalize">
                      {proposal.eventSummary.eventType.replace(/_/g, " ")}
                    </p>
                  </div>
                )}

                {proposal.eventSummary.guestCount && (
                  <div className="grid gap-1">
                    <span className="text-muted-foreground text-sm font-medium">
                      Guest Count
                    </span>
                    <p className="flex items-center gap-2 font-medium">
                      <UsersIcon className="size-4" />
                      {proposal.eventSummary.guestCount} guests
                    </p>
                  </div>
                )}

                {proposal.eventSummary.venuePreference && (
                  <>
                    <Separator />
                    <div className="grid gap-2">
                      <span className="text-muted-foreground text-sm font-medium">
                        Venue
                      </span>
                      <p className="font-medium">{proposal.eventSummary.venuePreference}</p>
                    </div>
                  </>
                )}

                {proposal.eventSummary.serviceStyle && (
                  <div className="grid gap-1">
                    <span className="text-muted-foreground text-sm font-medium">
                      Service Style
                    </span>
                    <p className="font-medium capitalize">
                      {proposal.eventSummary.serviceStyle.replace(/_/g, " ")}
                    </p>
                  </div>
                )}

                {proposal.eventSummary.dietaryRestrictions && (
                  <div className="grid gap-1">
                    <span className="text-muted-foreground text-sm font-medium">
                      Dietary Notes
                    </span>
                    <p className="text-sm">{proposal.eventSummary.dietaryRestrictions}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Service Plan */}
            <Card>
              <CardHeader>
                <CardTitle>Service Details</CardTitle>
                <CardDescription>
                  {proposal.servicePlan.staffRequired} staff members
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Setup Time</span>
                  <span className="font-medium">{proposal.servicePlan.setupTime}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Breakdown</span>
                  <span className="font-medium">{proposal.servicePlan.breakdownTime}</span>
                </div>
                <Separator />
                <div>
                  <span className="text-muted-foreground text-sm font-medium mb-2 block">
                    Includes
                  </span>
                  <ul className="space-y-1">
                    {proposal.servicePlan.includes.map((item, index) => (
                      <li key={index} className="text-sm">
                        • {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </CardContent>
            </Card>

            {/* Valid Until */}
            {proposal.expiresAt && (
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
                      {dateFormatter.format(new Date(proposal.expiresAt))}
                      {isExpired && " (Expired)"}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Column - Menu & Pricing */}
          <div className="lg:col-span-2 space-y-6">
            {/* Menu Sections */}
            {proposal.menuSections.map((section) => (
              <Card key={section.id}>
                <CardHeader>
                  <CardTitle>{section.title}</CardTitle>
                  <CardDescription>{section.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {section.items.map((item) => (
                      <div
                        key={item.id}
                        className="flex justify-between items-start text-sm py-2 border-b last:border-0"
                      >
                        <div className="flex-1">
                          <p className="font-medium">{item.name}</p>
                          <p className="text-muted-foreground text-xs">
                            {item.description}
                          </p>
                        </div>
                        <div className="text-right ml-4">
                          <p className="font-medium">
                            {currencyFormatter.format(item.totalPrice)}
                          </p>
                          <p className="text-muted-foreground text-xs">
                            {item.quantity} × {currencyFormatter.format(item.unitPrice)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}

            {/* Pricing Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSignIcon className="size-5 text-primary" />
                  Investment Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 border-t pt-4">
                  {proposal.pricingBreakdown.lineItems.map((item) => (
                    <div key={item.id} className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{item.description}</span>
                      <span>{currencyFormatter.format(item.totalPrice)}</span>
                    </div>
                  ))}
                  <Separator />
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>
                      {currencyFormatter.format(proposal.pricingBreakdown.subtotal)}
                    </span>
                  </div>
                  {proposal.pricingBreakdown.taxAmount > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        Tax ({(proposal.pricingBreakdown.taxRate * 100).toFixed(1)}%)
                      </span>
                      <span>
                        {currencyFormatter.format(proposal.pricingBreakdown.taxAmount)}
                      </span>
                    </div>
                  )}
                  <Separator />
                  <div className="flex justify-between font-semibold text-lg">
                    <span>Total Investment</span>
                    <span className="text-primary">
                      {currencyFormatter.format(proposal.pricingBreakdown.total)}
                    </span>
                  </div>
                  <p className="text-muted-foreground text-xs mt-2">
                    * Pricing is estimated and subject to final confirmation based on actual
                    selections.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Upgrade Options */}
            {proposal.upgradeOptions && (
              <Card>
                <CardHeader>
                  <CardTitle>Optional Enhancements</CardTitle>
                  <CardDescription>{proposal.upgradeOptions.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {proposal.upgradeOptions.options.map((option) => (
                      <div
                        key={option.id}
                        className="border rounded-lg p-3 hover:bg-muted/50 transition-colors"
                      >
                        <h4 className="font-medium text-sm">{option.name}</h4>
                        <p className="text-muted-foreground text-xs mt-1">
                          {option.description}
                        </p>
                        <p className="font-medium text-sm mt-2">
                          +{currencyFormatter.format(option.price)}
                        </p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Notes */}
            {proposal.notes && (
              <Card>
                <CardHeader>
                  <CardTitle>Additional Notes</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground text-sm whitespace-pre-wrap">
                    {proposal.notes}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Next Steps */}
            {proposal.nextSteps && (
              <Card>
                <CardHeader>
                  <CardTitle>Next Steps</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground text-sm whitespace-pre-wrap">
                    {proposal.nextSteps}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Action Buttons */}
            {canRespond && (
              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
                <Button
                  className="w-full sm:w-auto"
                  onClick={() => openRespondDialog("request_changes")}
                  size="lg"
                  variant="outline"
                >
                  <XCircleIcon className="mr-2 size-4" />
                  Request Changes
                </Button>
                <Button
                  className="w-full sm:w-auto"
                  onClick={() => openRespondDialog("approve")}
                  size="lg"
                >
                  <CheckCircle2Icon className="mr-2 size-4" />
                  Approve Proposal
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
            Generated with AI by Capsule-Pro
          </p>
        </div>
      </footer>

      {/* Response Dialog */}
      <Dialog onOpenChange={setShowRespondDialog} open={showRespondDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {respondAction === "approve"
                ? "Approve Proposal"
                : "Request Changes"}
            </DialogTitle>
            <DialogDescription>
              {respondAction === "approve"
                ? "Please confirm your details to approve this proposal."
                : "Please let us know what changes you'd like."}
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
            {respondAction === "request_changes" && (
              <div className="grid gap-2">
                <Label htmlFor="notes">Changes Requested (optional)</Label>
                <Textarea
                  id="notes"
                  onChange={(e) => setResponseNotes(e.target.value)}
                  placeholder="Please describe what changes you'd like..."
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
              variant={respondAction === "approve" ? "default" : "secondary"}
            >
              {isSubmitting
                ? "Processing..."
                : respondAction === "approve"
                  ? "Approve Proposal"
                  : "Request Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
