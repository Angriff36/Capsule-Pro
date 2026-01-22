/**
 * @module AllergenWarningBanner
 * @intent Display allergen warnings with severity-based styling and acknowledgment actions
 * @responsibility Render allergen conflict warnings with guest details, dish information, and acknowledgment workflow
 * @domain Kitchen
 * @tags allergen, warning, banner, dietary, safety
 * @canonical true
 */

"use client";

import type { AllergenWarning } from "@repo/database";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@repo/design-system/components/ui/alert";
import { Badge } from "@repo/design-system/components/ui/badge";
import { Button } from "@repo/design-system/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@repo/design-system/components/ui/dialog";
import { Label } from "@repo/design-system/components/ui/label";
import { Textarea } from "@repo/design-system/components/ui/textarea";
import { cn } from "@repo/design-system/lib/utils";
import {
  AlertTriangle,
  Ban,
  CheckCircle2,
  ChevronRight,
  Info,
  OctagonX,
  User,
  Utensils,
  X,
} from "lucide-react";
import { useState } from "react";

/**
 * Warning severity levels with corresponding visual configurations
 */
const severityConfig = {
  critical: {
    icon: OctagonX,
    bgColor: "bg-rose-50 dark:bg-rose-950/20",
    borderColor: "border-rose-200 dark:border-rose-800",
    textColor: "text-rose-900 dark:text-rose-100",
    iconColor: "text-rose-600 dark:text-rose-400",
    badgeColor: "bg-rose-100 text-rose-800 dark:bg-rose-900 dark:text-rose-100",
    buttonVariant: "destructive" as const,
    label: "Critical",
  },
  warning: {
    icon: AlertTriangle,
    bgColor: "bg-amber-50 dark:bg-amber-950/20",
    borderColor: "border-amber-200 dark:border-amber-800",
    textColor: "text-amber-900 dark:text-amber-100",
    iconColor: "text-amber-600 dark:text-amber-400",
    badgeColor: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-100",
    buttonVariant: "default" as const,
    label: "Warning",
  },
  info: {
    icon: Info,
    bgColor: "bg-blue-50 dark:bg-blue-950/20",
    borderColor: "border-blue-200 dark:border-blue-800",
    textColor: "text-blue-900 dark:text-blue-100",
    iconColor: "text-blue-600 dark:text-blue-400",
    badgeColor: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100",
    buttonVariant: "outline" as const,
    label: "Info",
  },
};

/**
 * Warning type configurations for display labels
 */
const warningTypeLabels: Record<string, string> = {
  allergen_conflict: "Allergen Conflict",
  dietary_restriction: "Dietary Restriction",
  cross_contamination: "Cross-Contamination Risk",
};

/**
 * Common allergen display names with emoji indicators
 */
const allergenDisplayNames: Record<string, { name: string; emoji: string }> = {
  dairy: { name: "Dairy", emoji: "🥛" },
  eggs: { name: "Eggs", emoji: "🥚" },
  fish: { name: "Fish", emoji: "🐟" },
  shellfish: { name: "Shellfish", emoji: "🦐" },
  tree_nuts: { name: "Tree Nuts", emoji: "🌰" },
  peanuts: { name: "Peanuts", emoji: "🥜" },
  wheat: { name: "Wheat/Gluten", emoji: "🌾" },
  soy: { name: "Soy", emoji: "🫘" },
  sesame: { name: "Sesame", emoji: "🫘" },
  gluten: { name: "Gluten", emoji: "🌾" },
  vegan: { name: "Vegan", emoji: "🌱" },
  vegetarian: { name: "Vegetarian", emoji: "🥗" },
  kosher: { name: "Kosher", emoji: "✡️" },
  halal: { name: "Halal", emoji: "☪️" },
};

/**
 * Props for the AllergenWarningBanner component
 */
export interface AllergenWarningBannerProps {
  /** The allergen warning data from the database */
  warning: AllergenWarning & {
    dishName?: string;
    affectedGuestDetails?: Array<{
      id: string;
      name: string;
      email?: string | null;
    }>;
  };
  /** Callback when warning is acknowledged with optional reason */
  onAcknowledge?: (warningId: string, reason?: string) => void | Promise<void>;
  /** Callback when warning is dismissed (info-level only) */
  onDismiss?: (warningId: string) => void | Promise<void>;
  /** Callback when viewing full details */
  onViewDetails?: (warningId: string) => void;
  /** Optional custom class names */
  className?: string;
  /** Compact mode for smaller display */
  compact?: boolean;
}

/**
 * Format allergen names with emoji indicators
 */
function formatAllergenName(allergen: string): string {
  const config = allergenDisplayNames[allergen.toLowerCase()];
  if (config) {
    return `${config.emoji} ${config.name}`;
  }
  // Capitalize first letter for unknown allergens
  return allergen.charAt(0).toUpperCase() + allergen.slice(1);
}

/**
 * Get warning type label
 */
function getWarningTypeLabel(type: string): string {
  return warningTypeLabels[type] || type.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
}

/**
 * Acknowledge dialog component for override reason input
 */
function AcknowledgeDialog({
  warningId,
  warningType,
  severity,
  onConfirm,
  trigger,
}: {
  warningId: string;
  warningType: string;
  severity: string;
  onConfirm: (reason?: string) => void | Promise<void>;
  trigger: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const requiresReason = severity === "critical" || severity === "warning";

  const handleConfirm = async () => {
    if (requiresReason && !reason.trim()) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onConfirm(reason.trim() || undefined);
      setOpen(false);
      setReason("");
    } catch (error) {
      console.error("Failed to acknowledge warning:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
            Acknowledge Warning
          </DialogTitle>
          <DialogDescription>
            {severity === "critical" &&
              "This is a critical allergen conflict. You must provide a reason before acknowledging."}
            {severity === "warning" &&
              "Please acknowledge this dietary restriction warning. You may add an optional override reason."}
            {severity === "info" &&
              "Acknowledge this informational alert. This will be logged for tracking purposes."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="rounded-md bg-slate-50 dark:bg-slate-900 p-3">
            <p className="text-sm font-medium">Warning Type</p>
            <p className="text-muted-foreground text-sm">
              {getWarningTypeLabel(warningType)}
            </p>
          </div>

          {requiresReason && (
            <div className="space-y-2">
              <Label htmlFor="override-reason">
                Override Reason <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="override-reason"
                placeholder="Explain why this warning is being acknowledged (e.g., guest confirmed safe, alternative provided, etc.)"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="min-h-[100px]"
                disabled={isSubmitting}
              />
              <p className="text-muted-foreground text-xs">
                This reason will be logged for audit and safety tracking purposes.
              </p>
            </div>
          )}

          {!requiresReason && (
            <div className="space-y-2">
              <Label htmlFor="optional-notes">Optional Notes</Label>
              <Textarea
                id="optional-notes"
                placeholder="Add any additional notes (optional)"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="min-h-[80px]"
                disabled={isSubmitting}
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant={severity === "critical" ? "destructive" : "default"}
            onClick={handleConfirm}
            disabled={isSubmitting || (requiresReason && !reason.trim())}
          >
            {isSubmitting ? "Acknowledging..." : "Acknowledge Warning"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * AllergenWarningBanner Component
 *
 * Displays allergen warnings with severity-based styling, guest information,
 * and acknowledgment actions. Supports three severity levels (critical, warning, info)
 * and three warning types (allergen_conflict, dietary_restriction, cross_contamination).
 *
 * @example
 * ```tsx
 * <AllergenWarningBanner
 *   warning={warningData}
 *   onAcknowledge={(id, reason) => acknowledgeWarning(id, reason)}
 *   onDismiss={(id) => dismissWarning(id)}
 * />
 * ```
 */
export function AllergenWarningBanner({
  warning,
  onAcknowledge,
  onDismiss,
  onViewDetails,
  className,
  compact = false,
}: AllergenWarningBannerProps) {
  const severity =
    severityConfig[warning.severity as keyof typeof severityConfig] ||
    severityConfig.warning;
  const SeverityIcon = severity.icon;
  const isAcknowledged = warning.isAcknowledged;
  const isResolved = warning.resolved;

  /**
   * Handle acknowledge action
   */
  const handleAcknowledge = async (reason?: string) => {
    if (onAcknowledge) {
      await onAcknowledge(warning.id, reason);
    }
  };

  /**
   * Handle dismiss action (info-level only)
   */
  const handleDismiss = async () => {
    if (onDismiss && warning.severity === "info") {
      await onDismiss(warning.id);
    }
  };

  /**
   * Handle view details action
   */
  const handleViewDetails = () => {
    if (onViewDetails) {
      onViewDetails(warning.id);
    }
  };

  // Compact variant for inline display
  if (compact) {
    return (
      <Alert
        className={cn(
          severity.bgColor,
          severity.borderColor,
          "border",
          isResolved && "opacity-50",
          className
        )}
      >
        <SeverityIcon className={cn("h-4 w-4", severity.iconColor)} />
        <AlertTitle className={cn("flex items-center justify-between", severity.textColor)}>
          <span className="flex items-center gap-2">
            {getWarningTypeLabel(warning.warningType)}
            {isResolved && <CheckCircle2 className="h-4 w-4 text-emerald-600" />}
            {isAcknowledged && !isResolved && (
              <CheckCircle2 className="h-4 w-4 text-blue-600" />
            )}
          </span>
          {warning.overrideReason && (
            <span className="text-muted-foreground text-xs font-normal">
              Override: {warning.overrideReason}
            </span>
          )}
        </AlertTitle>
        <AlertDescription className={severity.textColor}>
          <div className="flex flex-wrap items-center gap-2">
            {warning.allergens.slice(0, 2).map((allergen) => (
              <Badge key={allergen} className={severity.badgeColor} variant="secondary">
                {formatAllergenName(allergen)}
              </Badge>
            ))}
            {warning.allergens.length > 2 && (
              <span className="text-xs">
                +{warning.allergens.length - 2} more
              </span>
            )}
            <span className="text-xs">
              {warning.affectedGuests.length} guest
              {warning.affectedGuests.length !== 1 ? "s" : ""} affected
            </span>
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  // Full banner variant
  return (
    <Alert
      className={cn(
        severity.bgColor,
        severity.borderColor,
        "border relative",
        isResolved && "opacity-60",
        className
      )}
    >
      <SeverityIcon className={cn("h-5 w-5", severity.iconColor)} />

      <div className="flex-1 space-y-3">
        {/* Title and Status */}
        <AlertTitle className={cn("flex items-center justify-between", severity.textColor)}>
          <div className="flex items-center gap-2">
            {getWarningTypeLabel(warning.warningType)}
            <Badge className={severity.badgeColor} variant="secondary">
              {severity.label}
            </Badge>
          </div>

          <div className="flex items-center gap-2">
            {isResolved && (
              <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-100" variant="secondary">
                <CheckCircle2 className="mr-1 h-3 w-3" />
                Resolved
              </Badge>
            )}
            {isAcknowledged && !isResolved && (
              <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100" variant="secondary">
                <CheckCircle2 className="mr-1 h-3 w-3" />
                Acknowledged
              </Badge>
            )}
          </div>
        </AlertTitle>

        {/* Main Content */}
        <AlertDescription className={cn("space-y-3", severity.textColor)}>
          {/* Affected Guests */}
          {warning.affectedGuests.length > 0 && (
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs font-semibold uppercase">
                <User className="h-3.5 w-3.5" />
                Affected Guests
              </div>
              <div className="flex flex-wrap gap-1.5">
                {warning.affectedGuestDetails ? (
                  warning.affectedGuestDetails.map((guest) => (
                    <Badge
                      key={guest.id}
                      className="bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600"
                      variant="outline"
                    >
                      {guest.name}
                    </Badge>
                  ))
                ) : (
                  warning.affectedGuests.map((guestId, index) => (
                    <Badge
                      key={guestId}
                      className="bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600"
                      variant="outline"
                    >
                      Guest {index + 1}
                    </Badge>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Allergens/Restrictions */}
          {warning.allergens.length > 0 && (
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs font-semibold uppercase">
                <Ban className="h-3.5 w-3.5" />
                {warning.warningType === "dietary_restriction" ? "Restrictions" : "Allergens"}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {warning.allergens.map((allergen) => (
                  <Badge key={allergen} className={severity.badgeColor} variant="secondary">
                    {formatAllergenName(allergen)}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Dish Information */}
          {warning.dishName && (
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs font-semibold uppercase">
                <Utensils className="h-3.5 w-3.5" />
                Related Dish
              </div>
              <div className="text-sm">
                <span className="font-medium">{warning.dishName}</span>
              </div>
            </div>
          )}

          {/* Override Reason (if acknowledged) */}
          {warning.overrideReason && (
            <div className="rounded-md bg-white/50 dark:bg-slate-900/50 p-2">
              <p className="text-xs font-semibold uppercase">Override Reason</p>
              <p className="text-xs mt-1">{warning.overrideReason}</p>
            </div>
          )}

          {/* Notes (if present) */}
          {warning.notes && (
            <div className="rounded-md bg-white/50 dark:bg-slate-900/50 p-2">
              <p className="text-xs font-semibold uppercase">Additional Notes</p>
              <p className="text-xs mt-1">{warning.notes}</p>
            </div>
          )}
        </AlertDescription>

        {/* Action Buttons */}
        {!isResolved && (
          <div className="flex flex-wrap items-center gap-2">
            {!isAcknowledged ? (
              <>
                <AcknowledgeDialog
                  warningId={warning.id}
                  warningType={warning.warningType}
                  severity={warning.severity}
                  onConfirm={handleAcknowledge}
                  trigger={
                    <Button
                      size="sm"
                      variant={severity.buttonVariant}
                      className="gap-1.5"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      Acknowledge
                    </Button>
                  }
                />

                {onViewDetails && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleViewDetails}
                    className="gap-1.5"
                  >
                    <ChevronRight className="h-4 w-4" />
                    View Details
                  </Button>
                )}
              </>
            ) : (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <CheckCircle2 className="h-4 w-4 text-blue-600" />
                <span>
                  Acknowledged by {warning.acknowledgedBy} on{" "}
                  {warning.acknowledgedAt
                    ? new Date(warning.acknowledgedAt).toLocaleDateString()
                    : ""}
                </span>
              </div>
            )}

            {warning.severity === "info" && onDismiss && !isAcknowledged && (
              <Button
                size="sm"
                variant="ghost"
                onClick={handleDismiss}
                className="gap-1.5 ml-auto"
              >
                <X className="h-4 w-4" />
                Dismiss
              </Button>
            )}
          </div>
        )}
      </div>
    </Alert>
  );
}

/**
 * Compact inline variant for use in cards and tables
 */
export function AllergenWarningInline({
  warning,
  onViewDetails,
  className,
}: Pick<AllergenWarningBannerProps, "warning" | "onViewDetails" | "className">) {
  const severity =
    severityConfig[warning.severity as keyof typeof severityConfig] ||
    severityConfig.warning;
  const SeverityIcon = severity.icon;

  return (
    <button
      onClick={() => onViewDetails?.(warning.id)}
      className={cn(
        "flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium transition-colors hover:opacity-80",
        severity.bgColor,
        severity.textColor,
        severity.borderColor,
        "border",
        className
      )}
    >
      <SeverityIcon className={cn("h-3.5 w-3.5", severity.iconColor)} />
      <span className="line-clamp-1">
        {warning.allergens.length} {warning.warningType === "dietary_restriction" ? "restriction" : "allergen"}
        {warning.allergens.length !== 1 ? "s" : ""}
      </span>
    </button>
  );
}

/**
 * Severity badge component for use in tables and lists
 */
export function AllergenSeverityBadge({
  severity,
}: {
  severity: string;
}) {
  const config =
    severityConfig[severity as keyof typeof severityConfig] || severityConfig.warning;

  return (
    <Badge className={config.badgeColor} variant="secondary">
      {config.label}
    </Badge>
  );
}
