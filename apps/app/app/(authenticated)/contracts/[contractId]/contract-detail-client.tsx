/**
 * @module ContractDetailClient
 * @intent Client component rendering detail sections for EventContract or VendorContract
 * @responsibility Display contract details, signatures table, compliance metrics, contract terms,
 *   notes, and status-action buttons that POST to the appropriate API command route
 * @domain Contracts
 * @tags contracts, detail, client-component
 * @canonical true
 */

"use client";

import { MonoLabel } from "@repo/design-system/components/blocks/page-shell";
import { ResearchTable } from "@repo/design-system/components/blocks/research-table";
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
  AlertTriangle,
  ArrowRight,
  Calendar,
  CheckCircle2,
  Clock,
  Download,
  ExternalLink,
  FileText,
  Gavel,
  PackageCheck,
  Pen,
  RefreshCw,
  Send,
  Shield,
  Signature,
  Star,
  Truck,
  User,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { eventContractSend } from "@/app/lib/manifest-client.generated";
import {
  vendorContractSubmit,
  vendorContractApprove,
  vendorContractReject,
  vendorContractActivate,
  vendorContractRenew,
  vendorContractTerminate,
  vendorContractRecordSlaBreach,
} from "@/app/lib/manifest-client.generated";

// ---------------------------------------------------------------------------
// Types (must match the serialized shapes from the server page)
// ---------------------------------------------------------------------------

interface SerializedEventContract {
  contractType: "event";
  id: string;
  tenantId: string;
  eventId: string;
  clientId: string;
  contractNumber: string | null;
  title: string;
  status: string;
  documentUrl: string | null;
  documentType: string | null;
  notes: string | null;
  signingToken: string | null;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
  event: {
    id: string;
    title: string;
    eventDate: string | null;
  } | null;
  client: {
    id: string;
    company_name: string | null;
    first_name: string | null;
    last_name: string | null;
  } | null;
  signatures: Array<{
    id: string;
    signedAt: string | null;
    signerName: string | null;
    signerEmail: string | null;
    ipAddress: string | null;
  }>;
}

interface SerializedVendorContract {
  contractType: "vendor";
  id: string;
  tenantId: string;
  contractNumber: string | null;
  vendorId: string | null;
  vendorName: string | null;
  contractTypeLabel: string | null;
  status: string;
  startDate: string | null;
  endDate: string | null;
  autoRenew: boolean;
  renewalTermDays: number | null;
  noticeDaysBeforeRenewal: number | null;
  paymentTerms: string | null;
  contractUrl: string | null;
  notes: string | null;
  complianceScore: number | null;
  slaBreachCount: number | null;
  onTimeDeliveryRate: number | null;
  qualityRating: number | null;
  lastComplianceReview: string | null;
  approvedBy: string | null;
  approvedAt: string | null;
  terminatedBy: string | null;
  terminatedAt: string | null;
  terminationReason: string | null;
  createdAt: string;
  updatedAt: string;
}

type SerializedContract = SerializedEventContract | SerializedVendorContract;

// ---------------------------------------------------------------------------
// Status badge map
// ---------------------------------------------------------------------------

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-slate-200 text-slate-700",
  sent: "bg-blue-100 text-blue-700",
  pending: "bg-blue-100 text-blue-700",
  submitted: "bg-blue-100 text-blue-700",
  signed: "bg-green-100 text-green-700",
  active: "bg-green-100 text-green-700",
  approved: "bg-blue-50 text-blue-600",
  expired: "bg-red-100 text-red-700",
  cancelled: "bg-slate-100 text-slate-500 line-through",
  terminated: "bg-slate-100 text-slate-500 line-through",
  rejected: "bg-red-100 text-red-700",
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(iso: string | null): string {
  if (!iso) return "\u2014";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatDateTime(iso: string | null): string {
  if (!iso) return "\u2014";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function statusBadge(status: string) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${STATUS_COLORS[status] || "bg-slate-100 text-slate-600"}`}
    >
      {status}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ContractDetailClientProps {
  contract: SerializedContract;
}

// ---------------------------------------------------------------------------
// Event Contract Detail
// ---------------------------------------------------------------------------

function EventContractDetail({
  contract,
}: {
  contract: SerializedEventContract;
}) {
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const executeCommand = useCallback(
    async (command: string, label: string) => {
      setActionLoading(label);
      try {
        if (command === "send") {
          await eventContractSend({ instanceId: contract.id });
        }
        toast.success(`${label} completed`);
        window.location.reload();
      } catch (err) {
        toast.error(
          err instanceof Error
            ? err.message
            : `Failed to ${label.toLowerCase()}`
        );
      } finally {
        setActionLoading(null);
      }
    },
    [contract.id]
  );

  // Action buttons by status
  const statusActions: Array<{
    label: string;
    command: string;
    icon: React.ReactNode;
  }> = [];
  if (contract.status === "draft") {
    statusActions.push({
      label: "Send",
      command: "send",
      icon: <Send className="mr-2 h-4 w-4" />,
    });
  }
  if (contract.status === "sent" || contract.status === "pending") {
    statusActions.push({
      label: "View signing link",
      command: "",
      icon: <ExternalLink className="mr-2 h-4 w-4" />,
    });
  }
  if (contract.status === "signed") {
    statusActions.push({
      label: "View document",
      command: "",
      icon: <FileText className="mr-2 h-4 w-4" />,
    });
  }

  const clientName =
    contract.client?.company_name ||
    [contract.client?.first_name, contract.client?.last_name]
      .filter(Boolean)
      .join(" ")
      .trim() ||
    "Unknown Client";

  // Build signature rows for ResearchTable
  const signatureRows = contract.signatures.map((sig) => ({
    id: sig.id,
    title: (
      <div className="flex flex-col gap-1">
        <span className="ds-body-large">
          {sig.signerName || "Unknown signer"}
        </span>
        <span className="ds-caption text-ink/50">
          {sig.signerEmail || "\u2014"}
        </span>
      </div>
    ),
    pills: sig.signedAt ? (
      <Badge className="gap-1" variant="secondary">
        <CheckCircle2 className="h-3 w-3" />
        Signed
      </Badge>
    ) : (
      <Badge className="gap-1" variant="outline">
        <Clock className="h-3 w-3" />
        Pending
      </Badge>
    ),
    meta: (
      <div className="flex flex-col items-end gap-1">
        <span className="ds-caption text-ink/60">
          {sig.signedAt ? formatDateTime(sig.signedAt) : "\u2014"}
        </span>
        {sig.ipAddress && (
          <span className="ds-mono text-xs text-ink/40">
            IP: {sig.ipAddress}
          </span>
        )}
      </div>
    ),
  }));

  return (
    <div className="space-y-6">
      {/* Action bar */}
      <div className="flex flex-wrap items-center gap-3">
        {statusBadge(contract.status)}
        {contract.contractNumber && (
          <Badge className="gap-1" variant="outline">
            <FileText className="h-3 w-3" />
            {contract.contractNumber}
          </Badge>
        )}
        <div className="ml-auto flex items-center gap-2">
          {statusActions.map((action) =>
            action.command ? (
              <Button
                disabled={actionLoading !== null}
                key={action.label}
                onClick={() => executeCommand(action.command, action.label)}
                size="sm"
              >
                {action.icon}
                {actionLoading === action.label
                  ? "Processing..."
                  : action.label}
              </Button>
            ) : action.label === "View signing link" &&
              contract.signingToken ? (
              <Button asChild key={action.label} size="sm" variant="outline">
                <Link
                  href={`/sign/contract/${contract.signingToken}`}
                  target="_blank"
                >
                  {action.icon}
                  Signing Link
                </Link>
              </Button>
            ) : action.label === "View document" && contract.documentUrl ? (
              <Button asChild key={action.label} size="sm" variant="outline">
                <a href={contract.documentUrl} rel="noopener" target="_blank">
                  {action.icon}
                  Open Document
                </a>
              </Button>
            ) : null
          )}
        </div>
      </div>

      {/* Two-column layout */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Event & Client Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Contract Information
            </CardTitle>
            <CardDescription>
              Event contract details and parties
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-1">
              <label className="text-sm font-medium text-muted-foreground">
                Title
              </label>
              <p className="font-medium">{contract.title}</p>
            </div>

            <Separator />

            {contract.event && (
              <div className="grid gap-1">
                <label className="text-sm font-medium text-muted-foreground">
                  Event
                </label>
                <Link
                  className="font-medium text-primary hover:underline"
                  href={`/events/${contract.event.id}`}
                >
                  {contract.event.title}
                </Link>
                {contract.event.eventDate && (
                  <p className="text-sm text-muted-foreground">
                    <Calendar className="mr-1 inline h-3 w-3" />
                    {formatDate(contract.event.eventDate)}
                  </p>
                )}
              </div>
            )}

            {contract.client && (
              <>
                <Separator />
                <div className="grid gap-1">
                  <label className="text-sm font-medium text-muted-foreground">
                    Client
                  </label>
                  <p className="font-medium">{clientName}</p>
                </div>
              </>
            )}

            <Separator />

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-1">
                <label className="text-sm font-medium text-muted-foreground">
                  Created
                </label>
                <p className="text-sm">{formatDateTime(contract.createdAt)}</p>
              </div>
              <div className="grid gap-1">
                <label className="text-sm font-medium text-muted-foreground">
                  Updated
                </label>
                <p className="text-sm">{formatDateTime(contract.updatedAt)}</p>
              </div>
            </div>

            {contract.expiresAt && (
              <>
                <Separator />
                <div className="grid gap-1">
                  <label className="text-sm font-medium text-muted-foreground">
                    Expires
                  </label>
                  <p className="text-sm">{formatDate(contract.expiresAt)}</p>
                </div>
              </>
            )}

            {contract.documentUrl && (
              <>
                <Separator />
                <div className="grid gap-1">
                  <label className="text-sm font-medium text-muted-foreground">
                    Document
                  </label>
                  <div className="flex items-center gap-2">
                    <a
                      className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                      href={contract.documentUrl}
                      rel="noopener"
                      target="_blank"
                    >
                      <Download className="h-3 w-3" />
                      {contract.documentType || "Download"}
                    </a>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Notes */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Pen className="h-5 w-5 text-primary" />
              Notes
            </CardTitle>
            <CardDescription>
              Contract notes and internal comments
            </CardDescription>
          </CardHeader>
          <CardContent>
            {contract.notes ? (
              <p className="whitespace-pre-wrap text-sm">{contract.notes}</p>
            ) : (
              <p className="text-sm text-muted-foreground">
                No notes recorded.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Signatures */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Signature className="h-5 w-5 text-primary" />
            Signatures
          </CardTitle>
          <CardDescription>
            {contract.signatures.length} signature
            {contract.signatures.length !== 1 ? "s" : ""} collected
          </CardDescription>
        </CardHeader>
        <CardContent>
          {contract.signatures.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-12 text-center">
              <Signature className="mb-2 h-8 w-8 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">
                No signatures captured yet.
              </p>
            </div>
          ) : (
            <>
              <MonoLabel className="mb-3 text-ink/50">
                {contract.signatures.length} signature
                {contract.signatures.length !== 1 ? "s" : ""}
              </MonoLabel>
              <ResearchTable
                linkComponent={({ href, className, children }) => (
                  <Link className={className} href={href}>
                    {children}
                  </Link>
                )}
                rows={signatureRows}
              />
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Vendor Contract Detail
// ---------------------------------------------------------------------------

function VendorContractDetail({
  contract,
}: {
  contract: SerializedVendorContract;
}) {
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const executeCommand = useCallback(
    async (
      command: string,
      label: string,
      body?: Record<string, unknown>
    ) => {
      setActionLoading(label);
      try {
        const payload = { instanceId: contract.id, ...body };
        const commandFn: Record<string, (input: Record<string, unknown>) => Promise<unknown>> = {
          submit: vendorContractSubmit,
          approve: vendorContractApprove,
          reject: vendorContractReject,
          activate: vendorContractActivate,
          renew: vendorContractRenew,
          terminate: vendorContractTerminate,
          recordSlaBreach: vendorContractRecordSlaBreach,
        };
        const fn = commandFn[command];
        if (!fn) throw new Error(`Unknown command: ${command}`);
        await fn(payload);
        toast.success(`${label} completed`);
        window.location.reload();
      } catch (err) {
        toast.error(
          err instanceof Error
            ? err.message
            : `Failed to ${label.toLowerCase()}`
        );
      } finally {
        setActionLoading(null);
      }
    },
    [contract.id]
  );

  // Action buttons by status
  const statusActions: Array<{
    label: string;
    command: string;
    icon: React.ReactNode;
    variant?: "default" | "destructive" | "outline";
    body?: Record<string, unknown>;
  }> = [];

  if (contract.status === "draft") {
    statusActions.push({
      label: "Submit",
      command: "submit",
      icon: <Send className="mr-2 h-4 w-4" />,
    });
  }
  if (contract.status === "submitted") {
    statusActions.push(
      {
        label: "Approve",
        command: "approve",
        icon: <CheckCircle2 className="mr-2 h-4 w-4" />,
      },
      {
        label: "Reject",
        command: "reject",
        icon: <XCircle className="mr-2 h-4 w-4" />,
        variant: "destructive",
      }
    );
  }
  if (contract.status === "approved") {
    statusActions.push({
      label: "Activate",
      command: "activate",
      icon: <ArrowRight className="mr-2 h-4 w-4" />,
    });
  }
  if (contract.status === "active") {
    statusActions.push(
      {
        label: "Renew",
        command: "renew",
        icon: <RefreshCw className="mr-2 h-4 w-4" />,
        variant: "outline",
      },
      {
        label: "Terminate",
        command: "terminate",
        icon: <Gavel className="mr-2 h-4 w-4" />,
        variant: "destructive",
      }
    );
  }

  // Compliance display helpers
  const complianceColor =
    contract.complianceScore === null
      ? "text-muted-foreground"
      : contract.complianceScore >= 90
        ? "text-green-600"
        : contract.complianceScore >= 70
          ? "text-amber-600"
          : "text-red-600";

  const breachColor =
    (contract.slaBreachCount ?? 0) === 0
      ? "text-green-600"
      : (contract.slaBreachCount ?? 0) <= 3
        ? "text-amber-600"
        : "text-red-600";

  return (
    <div className="space-y-6">
      {/* Action bar */}
      <div className="flex flex-wrap items-center gap-3">
        {statusBadge(contract.status)}
        {contract.contractNumber && (
          <Badge className="gap-1" variant="outline">
            <FileText className="h-3 w-3" />
            {contract.contractNumber}
          </Badge>
        )}
        <Badge variant="outline">
          {contract.contractTypeLabel || "General"}
        </Badge>
        <div className="ml-auto flex items-center gap-2">
          {statusActions.map((action) => (
            <Button
              disabled={actionLoading !== null}
              key={action.label}
              onClick={() =>
                executeCommand(action.command, action.label, action.body)
              }
              size="sm"
              variant={action.variant || "default"}
            >
              {action.icon}
              {actionLoading === action.label ? "Processing..." : action.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Two-column layout */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Contract Terms */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Contract Terms
            </CardTitle>
            <CardDescription>
              Vendor agreement with {contract.vendorName || "vendor"}
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            {contract.vendorName && (
              <div className="grid gap-1">
                <label className="text-sm font-medium text-muted-foreground">
                  Vendor
                </label>
                <p className="font-medium">{contract.vendorName}</p>
              </div>
            )}

            <Separator />

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-1">
                <label className="text-sm font-medium text-muted-foreground">
                  Start date
                </label>
                <p className="text-sm">
                  <Calendar className="mr-1 inline h-3 w-3" />
                  {formatDate(contract.startDate)}
                </p>
              </div>
              <div className="grid gap-1">
                <label className="text-sm font-medium text-muted-foreground">
                  End date
                </label>
                <p className="text-sm">
                  <Calendar className="mr-1 inline h-3 w-3" />
                  {formatDate(contract.endDate)}
                </p>
              </div>
            </div>

            <Separator />

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-1">
                <label className="text-sm font-medium text-muted-foreground">
                  Auto-renew
                </label>
                <p className="text-sm">
                  {contract.autoRenew ? "Yes" : "No"}
                  {contract.autoRenew && contract.renewalTermDays
                    ? ` (every ${contract.renewalTermDays}d)`
                    : ""}
                </p>
              </div>
              <div className="grid gap-1">
                <label className="text-sm font-medium text-muted-foreground">
                  Notice period
                </label>
                <p className="text-sm">
                  {contract.noticeDaysBeforeRenewal
                    ? `${contract.noticeDaysBeforeRenewal} days before renewal`
                    : "\u2014"}
                </p>
              </div>
            </div>

            {contract.paymentTerms && (
              <>
                <Separator />
                <div className="grid gap-1">
                  <label className="text-sm font-medium text-muted-foreground">
                    Payment terms
                  </label>
                  <p className="text-sm">{contract.paymentTerms}</p>
                </div>
              </>
            )}

            <Separator />

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-1">
                <label className="text-sm font-medium text-muted-foreground">
                  Created
                </label>
                <p className="text-sm">{formatDateTime(contract.createdAt)}</p>
              </div>
              <div className="grid gap-1">
                <label className="text-sm font-medium text-muted-foreground">
                  Updated
                </label>
                <p className="text-sm">{formatDateTime(contract.updatedAt)}</p>
              </div>
            </div>

            {contract.contractUrl && (
              <>
                <Separator />
                <div className="grid gap-1">
                  <label className="text-sm font-medium text-muted-foreground">
                    Contract document
                  </label>
                  <a
                    className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                    href={contract.contractUrl}
                    rel="noopener"
                    target="_blank"
                  >
                    <Download className="h-3 w-3" />
                    Download agreement
                  </a>
                </div>
              </>
            )}

            {/* Termination info */}
            {contract.status === "terminated" && (
              <>
                <Separator />
                <div className="grid gap-1">
                  <label className="text-sm font-medium text-destructive">
                    Termination
                  </label>
                  <p className="text-sm">
                    Terminated {formatDateTime(contract.terminatedAt)}
                    {contract.terminatedBy && ` by ${contract.terminatedBy}`}
                  </p>
                  {contract.terminationReason && (
                    <p className="text-sm text-muted-foreground">
                      Reason: {contract.terminationReason}
                    </p>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Compliance & Performance */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              Compliance & Performance
            </CardTitle>
            <CardDescription>
              Vendor quality metrics and SLA tracking
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            {/* Compliance rows */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm">
                  <Shield className="h-4 w-4 text-muted-foreground" />
                  Compliance score
                </div>
                <span
                  className={`ds-mono text-sm font-medium ${complianceColor}`}
                >
                  {contract.complianceScore !== null
                    ? `${contract.complianceScore}%`
                    : "\u2014"}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm">
                  <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                  SLA breaches
                </div>
                <span className={`ds-mono text-sm font-medium ${breachColor}`}>
                  {contract.slaBreachCount ?? 0}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm">
                  <Truck className="h-4 w-4 text-muted-foreground" />
                  On-time delivery
                </div>
                <span className="ds-mono text-sm font-medium">
                  {contract.onTimeDeliveryRate !== null
                    ? `${contract.onTimeDeliveryRate}%`
                    : "\u2014"}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm">
                  <Star className="h-4 w-4 text-muted-foreground" />
                  Quality rating
                </div>
                <span className="ds-mono text-sm font-medium">
                  {contract.qualityRating !== null
                    ? `${contract.qualityRating}/5`
                    : "\u2014"}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm">
                  <PackageCheck className="h-4 w-4 text-muted-foreground" />
                  Last compliance review
                </div>
                <span className="ds-mono text-sm">
                  {formatDate(contract.lastComplianceReview)}
                </span>
              </div>
            </div>

            <Separator />

            {/* Approval info */}
            {contract.approvedBy && (
              <div className="grid gap-1">
                <label className="text-sm font-medium text-muted-foreground">
                  Approved by
                </label>
                <p className="text-sm">
                  <User className="mr-1 inline h-3 w-3" />
                  {contract.approvedBy}
                  {contract.approvedAt &&
                    ` on ${formatDate(contract.approvedAt)}`}
                </p>
              </div>
            )}

            {/* SLA breach record action */}
            <Button
              disabled={actionLoading !== null}
              onClick={() =>
                executeCommand(
                  "recordSlaBreach",
                  "Record SLA breach"
                )
              }
              size="sm"
              variant="outline"
            >
              <AlertTriangle className="mr-2 h-4 w-4" />
              Record SLA Breach
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Notes */}
      {(contract.notes || contract.status === "active") && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Pen className="h-5 w-5 text-primary" />
              Notes
            </CardTitle>
            <CardDescription>Internal notes and comments</CardDescription>
          </CardHeader>
          <CardContent>
            {contract.notes ? (
              <p className="whitespace-pre-wrap text-sm">{contract.notes}</p>
            ) : (
              <p className="text-sm text-muted-foreground">
                No notes recorded.
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function ContractDetailClient({ contract }: ContractDetailClientProps) {
  if (contract.contractType === "event") {
    return <EventContractDetail contract={contract} />;
  }
  return <VendorContractDetail contract={contract} />;
}
