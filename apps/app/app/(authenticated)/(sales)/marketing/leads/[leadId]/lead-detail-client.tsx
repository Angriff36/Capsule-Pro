/**
 * @module marketing/leads/[leadId]/lead-detail-client
 * @intent Interactive client component for lead detail — contact info, event
 *   details, interaction timeline, and action buttons
 * @responsibility Display lead details with convert/disqualify/archive actions
 * @domain Marketing / CRM
 * @tags leads, marketing, client-component
 * @canonical true
 */

"use client";

import { SectionHeader } from "@repo/design-system/components/blocks/page-shell";
import { Badge } from "@repo/design-system/components/ui/badge";
import { Button } from "@repo/design-system/components/ui/button";
import {
  Archive,
  Calendar,
  Clock,
  DollarSign,
  ExternalLink,
  FileText,
  Mail,
  MessageSquare,
  Phone,
  UserCheck,
  Users,
  XCircle,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import {
  archiveLead,
  convertLeadToClient,
  disqualifyLead,
  formatDate,
  getStatusColor,
  getStatusLabel,
  type Lead,
  type LeadStatus,
} from "@/app/lib/leads";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface Interaction {
  createdAt: Date | string;
  description: string | null;
  followUpCompleted: boolean | null;
  followUpDate: Date | string | null;
  id: string;
  interactionDate: Date | string | null;
  interactionType: string | null;
  subject: string | null;
}

interface LeadDetailClientProps {
  interactions: Interaction[];
  lead: Lead;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function LeadDetailClient({
  lead,
  interactions,
}: LeadDetailClientProps) {
  const router = useRouter();
  const [actionInProgress, setActionInProgress] = useState(false);

  const handleConvertToClient = async () => {
    setActionInProgress(true);
    try {
      await convertLeadToClient(lead.id);
      toast.success(`"${lead.contactName}" converted to client`);
      router.refresh();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to convert lead"
      );
    } finally {
      setActionInProgress(false);
    }
  };

  const handleDisqualify = async () => {
    setActionInProgress(true);
    try {
      await disqualifyLead(lead.id);
      toast.success(`"${lead.contactName}" disqualified`);
      router.refresh();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to disqualify lead"
      );
    } finally {
      setActionInProgress(false);
    }
  };

  const handleArchive = async () => {
    setActionInProgress(true);
    try {
      await archiveLead(lead.id);
      toast.success(`"${lead.contactName}" archived`);
      router.push("/marketing/leads");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to archive lead"
      );
    } finally {
      setActionInProgress(false);
    }
  };

  const isConverted = lead.status === "converted";
  const isDisqualified = lead.status === "disqualified";
  const isActive = !(isConverted || isDisqualified);

  return (
    <div className="space-y-6">
      {/* Actions bar */}
      {isActive && (
        <div className="flex items-center gap-2">
          {(lead.status === "qualified" || lead.status === "contacted") && (
            <Button
              disabled={actionInProgress}
              onClick={handleConvertToClient}
              size="sm"
            >
              <UserCheck className="mr-1.5 size-4" />
              Convert to client
            </Button>
          )}
          <Button
            disabled={actionInProgress}
            onClick={handleDisqualify}
            size="sm"
            variant="outline"
          >
            <XCircle className="mr-1.5 size-4" />
            Disqualify
          </Button>
          <Button
            disabled={actionInProgress}
            onClick={handleArchive}
            size="sm"
            variant="ghost"
          >
            <Archive className="mr-1.5 size-4" />
            Archive
          </Button>
        </div>
      )}

      {isConverted && lead.convertedToClientId && (
        <div className="flex items-center gap-2 rounded-[22px] border border-hairline bg-soft-stone px-4 py-3">
          <UserCheck className="size-4 text-muted-foreground" />
          <span className="text-muted-foreground text-sm">
            Converted to client on{" "}
            {lead.convertedAt ? formatDate(lead.convertedAt) : "unknown date"}
          </span>
          <Button asChild size="sm" variant="link">
            <a href={`/crm/clients/${lead.convertedToClientId}`}>
              View client <ExternalLink className="ml-1 size-3" />
            </a>
          </Button>
        </div>
      )}

      {/* Contact information */}
      <section className="space-y-3">
        <SectionHeader title="Contact information" />
        <div className="overflow-hidden rounded-[22px] border border-hairline bg-canvas">
          <div className="grid gap-px bg-hairline sm:grid-cols-2">
            <InfoRow
              icon={<FileText className="size-4" />}
              label="Contact name"
              value={lead.contactName}
            />
            <InfoRow
              icon={<FileText className="size-4" />}
              label="Company"
              value={lead.companyName}
            />
            <InfoRow
              href={
                lead.contactEmail ? `mailto:${lead.contactEmail}` : undefined
              }
              icon={<Mail className="size-4" />}
              label="Email"
              value={lead.contactEmail}
            />
            <InfoRow
              href={lead.contactPhone ? `tel:${lead.contactPhone}` : undefined}
              icon={<Phone className="size-4" />}
              label="Phone"
              value={lead.contactPhone}
            />
            <InfoRow label="Source" value={lead.source} />
            <InfoRow
              label="Status"
              value={
                <Badge variant={getStatusColor(lead.status as LeadStatus)}>
                  {getStatusLabel(lead.status)}
                </Badge>
              }
            />
          </div>
        </div>
      </section>

      {/* Event details */}
      <section className="space-y-3">
        <SectionHeader title="Event details" />
        <div className="overflow-hidden rounded-[22px] border border-hairline bg-canvas">
          <div className="grid gap-px bg-hairline sm:grid-cols-2">
            <InfoRow
              icon={<Calendar className="size-4" />}
              label="Event type"
              value={lead.eventType}
            />
            <InfoRow
              icon={<Calendar className="size-4" />}
              label="Event date"
              value={lead.eventDate ? formatDate(lead.eventDate) : undefined}
            />
            <InfoRow
              icon={<Users className="size-4" />}
              label="Estimated guests"
              value={
                lead.estimatedGuests == null
                  ? undefined
                  : String(lead.estimatedGuests)
              }
            />
            <InfoRow
              icon={<DollarSign className="size-4" />}
              label="Estimated value"
              value={
                lead.estimatedValue == null
                  ? undefined
                  : new Intl.NumberFormat("en-US", {
                      style: "currency",
                      currency: "USD",
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 0,
                    }).format(lead.estimatedValue)
              }
            />
          </div>
        </div>
      </section>

      {/* Notes */}
      {lead.notes && (
        <section className="space-y-3">
          <SectionHeader title="Notes" />
          <div className="overflow-hidden rounded-[22px] border border-hairline bg-canvas p-4">
            <p className="whitespace-pre-wrap text-muted-foreground text-sm">
              {lead.notes}
            </p>
          </div>
        </section>
      )}

      {/* Interaction timeline */}
      <section className="space-y-3">
        <SectionHeader title={`Interactions (${interactions.length})`} />
        {interactions.length === 0 ? (
          <div className="flex flex-col items-center rounded-[22px] border border-hairline border-dashed bg-soft-stone px-6 py-12 text-center">
            <MessageSquare className="mb-3 size-8 text-muted-foreground" />
            <p className="text-muted-foreground text-sm">
              No interactions logged yet.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {interactions.map((interaction) => (
              <div
                className="flex gap-3 rounded-[22px] border border-hairline bg-canvas p-4"
                key={interaction.id}
              >
                <div className="flex size-8 shrink-0 items-center justify-center rounded-full border border-hairline bg-soft-stone">
                  <Clock className="size-4 text-muted-foreground" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">
                      {interaction.subject ||
                        interaction.interactionType ||
                        "Interaction"}
                    </span>
                    {interaction.interactionType && (
                      <Badge className="text-xs" variant="outline">
                        {interaction.interactionType}
                      </Badge>
                    )}
                  </div>
                  {interaction.description && (
                    <p className="mt-1 text-muted-foreground text-sm">
                      {interaction.description}
                    </p>
                  )}
                  <p className="mt-1 text-muted-foreground text-xs">
                    {formatDate(interaction.createdAt)}
                    {interaction.followUpDate &&
                      !interaction.followUpCompleted && (
                        <span className="ml-2">
                          Follow-up: {formatDate(interaction.followUpDate)}
                        </span>
                      )}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helper component
// ---------------------------------------------------------------------------

function InfoRow({
  icon,
  label,
  value,
  href,
}: {
  icon?: React.ReactNode;
  label: string;
  value?: React.ReactNode;
  href?: string;
}) {
  const displayValue = value === undefined || value === null ? "\u2014" : value;

  return (
    <div className="flex items-center gap-3 bg-canvas px-4 py-3">
      {icon && <span className="shrink-0 text-muted-foreground">{icon}</span>}
      <div className="min-w-0 flex-1">
        <p className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
          {label}
        </p>
        {href ? (
          <a className="text-foreground text-sm hover:underline" href={href}>
            {displayValue}
          </a>
        ) : (
          <div className="text-sm">{displayValue}</div>
        )}
      </div>
    </div>
  );
}
