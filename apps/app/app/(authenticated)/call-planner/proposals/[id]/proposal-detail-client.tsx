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
  DialogTrigger,
} from "@repo/design-system/components/ui/dialog";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@repo/design-system/components/ui/alert";
import {
  ArrowLeft,
  Copy,
  Check,
  Send,
  RefreshCw,
  FileText,
  Calendar,
  MapPin,
  Users,
  CheckCircle,
  AlertCircle,
  ExternalLink,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useCallback, useEffect } from "react";
import { toast } from "sonner";
import { usePostHog } from "posthog-js/react";
import { apiFetch } from "@/app/lib/api";
import * as routes from "@/app/lib/routes";

interface ProposalAction {
  id: string;
  actionType: string;
  clientMessage: string | null;
  createdAt: string;
}

interface Draft {
  id: string;
  sessionId: string;
  status: string;
  clientName: string | null;
  eventType: string | null;
}

interface Proposal {
  id: string;
  tenantId: string;
  draftId: string;
  userId: string;
  status: string;
  version: number;
  title: string;
  clientName: string;
  clientEmail: string | null;
  clientPhone: string | null;
  eventSummary: Record<string, unknown>;
  menuSections: Record<string, unknown>;
  servicePlan: Record<string, unknown>;
  pricingBreakdown: Record<string, unknown>;
  timeline: Record<string, unknown> | null;
  upgradeOptions: Record<string, unknown> | null;
  visionSummary: string | null;
  notes: string | null;
  nextSteps: string | null;
  templateId: string | null;
  magicToken: string;
  magicTokenExpiresAt: string | null;
  sentAt: string | null;
  sentVia: string[];
  viewedAt: string | null;
  respondedAt: string | null;
  depositAmount: number;
  depositPaid: boolean;
  htmlContent: string | null;
  createdAt: string;
  updatedAt: string;
  draft: Draft | null;
  actions: ProposalAction[];
}

interface ProposalDetailClientProps {
  proposal: Proposal;
}

const statusColors: Record<string, "default" | "secondary" | "destructive"> = {
  draft: "secondary",
  sent: "default",
  viewed: "default",
  change_requested: "destructive",
  approved: "default",
  expired: "destructive",
  converted: "default",
};

const statusLabels: Record<string, string> = {
  draft: "Draft",
  sent: "Sent",
  viewed: "Viewed",
  change_requested: "Change Requested",
  approved: "Approved",
  expired: "Expired",
  converted: "Converted",
};

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
};

const formatDate = (date: string) =>
  new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

const isTokenExpired = (expiresAt: string | null) => {
  // No expiry recorded = link never expires.
  return expiresAt ? new Date(expiresAt) < new Date() : false;
};

export function ProposalDetailClient({ proposal }: ProposalDetailClientProps) {
  const posthog = usePostHog();
  const router = useRouter();
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [sendDialogOpen, setSendDialogOpen] = useState(false);
  const [deliveryMethod, setDeliveryMethod] = useState<"email" | "sms" | "link">(
    "link"
  );

  useEffect(() => {
    posthog?.capture("call_planner:proposal_viewed", {
      proposal_id: proposal.id,
      status: proposal.status,
      has_client_email: !!proposal.clientEmail,
    });
  }, [posthog, proposal.id, proposal.status, proposal.clientEmail]);

  const tokenExpired = isTokenExpired(proposal.magicTokenExpiresAt);
  const publicUrl = `${window.location.origin}/proposal-draft/${proposal.magicToken}`;

  const handleCopyToken = useCallback(() => {
    navigator.clipboard.writeText(publicUrl);
    setCopiedToken(proposal.magicToken);
    setTimeout(() => setCopiedToken(null), 2000);
    toast.success("Magic link copied to clipboard");
  }, [publicUrl, proposal.magicToken]);

  const handleSendProposal = useCallback(async () => {
    setIsSending(true);
    try {
      const response = await apiFetch(routes.callPlannerProposalSend(proposal.id), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deliveryMethod,
          expiresInDays: 30,
        }),
      });

      if (!response.ok) throw new Error("Failed to send proposal");

      toast.success("Proposal sent successfully");
      setSendDialogOpen(false);
      router.refresh();
    } catch {
      toast.error("Failed to send proposal");
    } finally {
      setIsSending(false);
    }
  }, [proposal.id, deliveryMethod, router]);

  const handleRefreshToken = useCallback(async () => {
    try {
      const response = await apiFetch(
        routes.callPlannerProposalRefreshToken(proposal.id),
        {
          method: "POST",
        }
      );

      if (!response.ok) throw new Error("Failed to refresh token");

      toast.success("Magic link refreshed");
      router.refresh();
    } catch {
      toast.error("Failed to refresh magic link");
    }
  }, [proposal.id, router]);

  const eventSummary = proposal.eventSummary as Record<string, unknown>;
  const pricingBreakdown = proposal.pricingBreakdown as Record<string, unknown>;
  const menuSections = proposal.menuSections as Record<string, unknown>;

  const timelineItemsRaw = proposal.timeline?.items;
  const timelineItems = Array.isArray(timelineItemsRaw)
    ? (timelineItemsRaw as unknown[])
    : null;
  const pricingItemsRaw = pricingBreakdown.items;
  const pricingItems = Array.isArray(pricingItemsRaw)
    ? (pricingItemsRaw as unknown[])
    : null;

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push(`/call-planner/drafts/${proposal.draftId}`)}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">
              {proposal.title}
            </h1>
            <Badge variant={statusColors[proposal.status] || "default"}>
              {statusLabels[proposal.status] || proposal.status}
            </Badge>
          </div>
          <p className="text-muted-foreground">
            Proposal for {proposal.clientName}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleCopyToken}>
            {copiedToken === proposal.magicToken ? (
              <>
                <Check className="mr-2 h-4 w-4" />
                Copied
              </>
            ) : (
              <>
                <Copy className="mr-2 h-4 w-4" />
                Copy Magic Link
              </>
            )}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open(publicUrl, "_blank")}
          >
            <ExternalLink className="mr-2 h-4 w-4" />
            Preview
          </Button>
          <Dialog open={sendDialogOpen} onOpenChange={setSendDialogOpen}>
            <DialogTrigger asChild>
              <Button disabled={tokenExpired}>
                <Send className="mr-2 h-4 w-4" />
                Send to Client
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Send Proposal to Client</DialogTitle>
                <DialogDescription>
                  Choose how you want to deliver the proposal to the client.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <label className="text-sm font-medium">Delivery Method</label>
                      <div className="grid grid-cols-3 gap-2">
                        <Button
                          type="button"
                          variant={deliveryMethod === "email" ? "default" : "outline"}
                          onClick={() => setDeliveryMethod("email")}
                          disabled={!proposal.clientEmail}
                        >
                          Email
                        </Button>
                        <Button
                          type="button"
                          variant={deliveryMethod === "sms" ? "default" : "outline"}
                          onClick={() => setDeliveryMethod("sms")}
                          disabled={!proposal.clientPhone}
                        >
                          SMS
                        </Button>
                        <Button
                          type="button"
                          variant={deliveryMethod === "link" ? "default" : "outline"}
                          onClick={() => setDeliveryMethod("link")}
                        >
                          Copy Link
                        </Button>
                      </div>
                    </div>
                    {!proposal.clientEmail && deliveryMethod === "email" && (
                      <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                          No client email on file. Add email to draft first.
                        </AlertDescription>
                      </Alert>
                    )}
                    {!proposal.clientPhone && deliveryMethod === "sms" && (
                      <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                          No client phone on file. Add phone to draft first.
                        </AlertDescription>
                      </Alert>
                    )}
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setSendDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button onClick={handleSendProposal} disabled={isSending}>
                  {isSending ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    "Send Proposal"
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Token Status */}
      {tokenExpired && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Magic Link Expired</AlertTitle>
          <AlertDescription className="flex items-center justify-between">
            <span>
              The magic link has expired. Refresh it to allow client access.
            </span>
            <Button size="sm" variant="outline" onClick={handleRefreshToken}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh Link
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Event Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Event Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">
                    {eventSummary.date
                      ? formatDate(eventSummary.date as string)
                      : "Date TBD"}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">
                    {eventSummary.guestCount
                      ? String(eventSummary.guestCount)
                      : "-"}{" "}
                    guests
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">
                    {eventSummary.venue ? String(eventSummary.venue) : "Venue TBD"}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">
                    {eventSummary.eventType
                      ? String(eventSummary.eventType).replace(/_/g, " ").toUpperCase()
                      : "Event Type TBD"}
                  </span>
                </div>
              </div>
              {typeof eventSummary.description === "string" && (
                <p className="text-sm text-muted-foreground">
                  {eventSummary.description}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Menu Sections */}
          <Card>
            <CardHeader>
              <CardTitle>Menu</CardTitle>
            </CardHeader>
            <CardContent>
              {menuSections && typeof menuSections === "object" ? (
                <div className="space-y-4">
                  {Object.entries(menuSections).map(([sectionKey, section]: [string, unknown]) => {
                    if (typeof section !== "object" || section === null) return null;
                    const sectionData = section as Record<string, unknown>;
                    return (
                      <div key={sectionKey} className="border-b pb-4 last:border-0">
                        <h4 className="font-medium mb-2">
                          {sectionData.title
                            ? String(sectionData.title)
                            : sectionKey}
                        </h4>
                        <ul className="space-y-1 text-sm text-muted-foreground">
                          {(sectionData.items as unknown[][])?.map((item: unknown[], idx: number) => (
                            <li key={idx}>
                              {String(
                                Array.isArray(item) && item.length > 0
                                  ? item[0]
                                  : item
                              )}
                            </li>
                          ))}
                        </ul>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No menu details available</p>
              )}
            </CardContent>
          </Card>

          {/* Timeline */}
          {proposal.timeline && (
            <Card>
              <CardHeader>
                <CardTitle>Timeline</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {timelineItems ? (
                    timelineItems.map((item: unknown, idx: number) => {
                      if (typeof item !== "object" || item === null) return null;
                      const timelineItem = item as Record<string, unknown>;
                      return (
                        <div key={idx} className="flex items-start gap-3 text-sm">
                          <div className="w-2 h-2 rounded-full bg-primary mt-1.5" />
                          <div>
                            <p className="font-medium">
                              {timelineItem.title
                                ? String(timelineItem.title)
                                : "Item"}
                            </p>
                            {typeof timelineItem.description === "string" && (
                              <p className="text-muted-foreground">
                                {timelineItem.description}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-sm text-muted-foreground">No timeline details available</p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Pricing */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Pricing Breakdown</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {pricingBreakdown && typeof pricingBreakdown === "object" ? (
                <>
                  {pricingItems
                    ? pricingItems.map((item: unknown, idx: number) => {
                        if (typeof item !== "object" || item === null)
                          return null;
                        const lineItem = item as Record<string, unknown>;
                        return (
                          <div key={idx} className="flex justify-between text-sm">
                            <span>
                              {lineItem.description
                                ? String(lineItem.description)
                                : "Item"}
                            </span>
                            <span className="font-medium">
                              {lineItem.amount
                                ? formatCurrency(lineItem.amount as number)
                                : "-"}
                            </span>
                          </div>
                        );
                      })
                    : null}
                  <div className="border-t pt-3">
                    <div className="flex justify-between font-semibold">
                      <span>Estimated Total</span>
                      <span>
                        {pricingBreakdown.total
                          ? formatCurrency(pricingBreakdown.total as number)
                          : "-"}
                      </span>
                    </div>
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">No pricing details available</p>
              )}
            </CardContent>
          </Card>

          {/* Client Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Client Response</CardTitle>
              <CardDescription>
                {proposal.respondedAt
                  ? `Responded ${formatDate(proposal.respondedAt)}`
                  : "Awaiting response"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {proposal.actions.length > 0 ? (
                <div className="space-y-3">
                  {proposal.actions.map((action) => (
                    <div
                      key={action.id}
                      className={`border rounded-lg p-3 ${
                        action.actionType === "approved"
                          ? "border-green-200 bg-green-50"
                          : "border-yellow-200 bg-yellow-50"
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        {action.actionType === "approved" ? (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        ) : (
                          <AlertCircle className="h-4 w-4 text-yellow-600" />
                        )}
                        <span className="font-medium capitalize">
                          {action.actionType.replace(/_/g, " ")}
                        </span>
                      </div>
                      {action.clientMessage && (
                        <p className="text-sm text-muted-foreground">
                          "{action.clientMessage}"
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No client responses yet
                </p>
              )}
            </CardContent>
          </Card>

          {/* Magic Link Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Magic Link</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Status</span>
                  <Badge variant={tokenExpired ? "destructive" : "default"}>
                    {tokenExpired ? "Expired" : "Active"}
                  </Badge>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Expires</span>
                  <span>
                    {proposal.magicTokenExpiresAt
                      ? formatDate(proposal.magicTokenExpiresAt)
                      : "Never"}
                  </span>
                </div>
                {proposal.viewedAt && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">First Viewed</span>
                    <span>{formatDate(proposal.viewedAt)}</span>
                  </div>
                )}
                {proposal.sentAt && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Sent</span>
                    <span>{formatDate(proposal.sentAt)}</span>
                  </div>
                )}
              </div>
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={handleRefreshToken}
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh Link
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
