/**
 * @module AllergenWarningBanner
 * @intent Display allergen warnings with severity-based styling and acknowledgment actions
 * @responsibility Render allergen conflict warnings with guest details, dish information, and acknowledgment workflow
 * @domain Kitchen
 * @tags allergen, warning, banner, dietary, safety
 * @canonical true
 */
"use client";

Object.defineProperty(exports, "__esModule", { value: true });
exports.AllergenWarningBanner = AllergenWarningBanner;
exports.AllergenWarningInline = AllergenWarningInline;
exports.AllergenSeverityBadge = AllergenSeverityBadge;
const alert_1 = require("@repo/design-system/components/ui/alert");
const badge_1 = require("@repo/design-system/components/ui/badge");
const button_1 = require("@repo/design-system/components/ui/button");
const dialog_1 = require("@repo/design-system/components/ui/dialog");
const label_1 = require("@repo/design-system/components/ui/label");
const textarea_1 = require("@repo/design-system/components/ui/textarea");
const utils_1 = require("@repo/design-system/lib/utils");
const lucide_react_1 = require("lucide-react");
const react_1 = require("react");
/**
 * Warning severity levels with corresponding visual configurations
 */
const severityConfig = {
  critical: {
    icon: lucide_react_1.OctagonX,
    bgColor: "bg-rose-50 dark:bg-rose-950/20",
    borderColor: "border-rose-200 dark:border-rose-800",
    textColor: "text-rose-900 dark:text-rose-100",
    iconColor: "text-rose-600 dark:text-rose-400",
    badgeColor: "bg-rose-100 text-rose-800 dark:bg-rose-900 dark:text-rose-100",
    buttonVariant: "destructive",
    label: "Critical",
  },
  warning: {
    icon: lucide_react_1.AlertTriangle,
    bgColor: "bg-amber-50 dark:bg-amber-950/20",
    borderColor: "border-amber-200 dark:border-amber-800",
    textColor: "text-amber-900 dark:text-amber-100",
    iconColor: "text-amber-600 dark:text-amber-400",
    badgeColor:
      "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-100",
    buttonVariant: "default",
    label: "Warning",
  },
  info: {
    icon: lucide_react_1.Info,
    bgColor: "bg-blue-50 dark:bg-blue-950/20",
    borderColor: "border-blue-200 dark:border-blue-800",
    textColor: "text-blue-900 dark:text-blue-100",
    iconColor: "text-blue-600 dark:text-blue-400",
    badgeColor: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100",
    buttonVariant: "outline",
    label: "Info",
  },
};
/**
 * Warning type configurations for display labels
 */
const warningTypeLabels = {
  allergen_conflict: "Allergen Conflict",
  dietary_restriction: "Dietary Restriction",
  cross_contamination: "Cross-Contamination Risk",
};
/**
 * Common allergen display names with emoji indicators
 */
const allergenDisplayNames = {
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
 * Format allergen names with emoji indicators
 */
function formatAllergenName(allergen) {
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
function getWarningTypeLabel(type) {
  return (
    warningTypeLabels[type] ||
    type.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())
  );
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
}) {
  const [open, setOpen] = (0, react_1.useState)(false);
  const [reason, setReason] = (0, react_1.useState)("");
  const [isSubmitting, setIsSubmitting] = (0, react_1.useState)(false);
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
    <dialog_1.Dialog onOpenChange={setOpen} open={open}>
      <dialog_1.DialogTrigger asChild>{trigger}</dialog_1.DialogTrigger>
      <dialog_1.DialogContent className="sm:max-w-md">
        <dialog_1.DialogHeader>
          <dialog_1.DialogTitle className="flex items-center gap-2">
            <lucide_react_1.AlertTriangle className="h-5 w-5 text-amber-600" />
            Acknowledge Warning
          </dialog_1.DialogTitle>
          <dialog_1.DialogDescription>
            {severity === "critical" &&
              "This is a critical allergen conflict. You must provide a reason before acknowledging."}
            {severity === "warning" &&
              "Please acknowledge this dietary restriction warning. You may add an optional override reason."}
            {severity === "info" &&
              "Acknowledge this informational alert. This will be logged for tracking purposes."}
          </dialog_1.DialogDescription>
        </dialog_1.DialogHeader>

        <div className="space-y-4 py-4">
          <div className="rounded-md bg-slate-50 dark:bg-slate-900 p-3">
            <p className="text-sm font-medium">Warning Type</p>
            <p className="text-muted-foreground text-sm">
              {getWarningTypeLabel(warningType)}
            </p>
          </div>

          {requiresReason && (
            <div className="space-y-2">
              <label_1.Label htmlFor="override-reason">
                Override Reason <span className="text-destructive">*</span>
              </label_1.Label>
              <textarea_1.Textarea
                className="min-h-[100px]"
                disabled={isSubmitting}
                id="override-reason"
                onChange={(e) => setReason(e.target.value)}
                placeholder="Explain why this warning is being acknowledged (e.g., guest confirmed safe, alternative provided, etc.)"
                value={reason}
              />
              <p className="text-muted-foreground text-xs">
                This reason will be logged for audit and safety tracking
                purposes.
              </p>
            </div>
          )}

          {!requiresReason && (
            <div className="space-y-2">
              <label_1.Label htmlFor="optional-notes">
                Optional Notes
              </label_1.Label>
              <textarea_1.Textarea
                className="min-h-[80px]"
                disabled={isSubmitting}
                id="optional-notes"
                onChange={(e) => setReason(e.target.value)}
                placeholder="Add any additional notes (optional)"
                value={reason}
              />
            </div>
          )}
        </div>

        <dialog_1.DialogFooter>
          <button_1.Button
            disabled={isSubmitting}
            onClick={() => setOpen(false)}
            type="button"
            variant="outline"
          >
            Cancel
          </button_1.Button>
          <button_1.Button
            disabled={isSubmitting || (requiresReason && !reason.trim())}
            onClick={handleConfirm}
            type="button"
            variant={severity === "critical" ? "destructive" : "default"}
          >
            {isSubmitting ? "Acknowledging..." : "Acknowledge Warning"}
          </button_1.Button>
        </dialog_1.DialogFooter>
      </dialog_1.DialogContent>
    </dialog_1.Dialog>
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
function AllergenWarningBanner({
  warning,
  onAcknowledge,
  onDismiss,
  onViewDetails,
  className,
  compact = false,
}) {
  const severity = severityConfig[warning.severity] || severityConfig.warning;
  const SeverityIcon = severity.icon;
  const isAcknowledged = warning.isAcknowledged;
  const isResolved = warning.resolved;
  /**
   * Handle acknowledge action
   */
  const handleAcknowledge = async (reason) => {
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
      <alert_1.Alert
        className={(0, utils_1.cn)(
          severity.bgColor,
          severity.borderColor,
          "border",
          isResolved && "opacity-50",
          className
        )}
      >
        <SeverityIcon
          className={(0, utils_1.cn)("h-4 w-4", severity.iconColor)}
        />
        <alert_1.AlertTitle
          className={(0, utils_1.cn)(
            "flex items-center justify-between",
            severity.textColor
          )}
        >
          <span className="flex items-center gap-2">
            {getWarningTypeLabel(warning.warningType)}
            {isResolved && (
              <lucide_react_1.CheckCircle2 className="h-4 w-4 text-emerald-600" />
            )}
            {isAcknowledged && !isResolved && (
              <lucide_react_1.CheckCircle2 className="h-4 w-4 text-blue-600" />
            )}
          </span>
          {warning.overrideReason && (
            <span className="text-muted-foreground text-xs font-normal">
              Override: {warning.overrideReason}
            </span>
          )}
        </alert_1.AlertTitle>
        <alert_1.AlertDescription className={severity.textColor}>
          <div className="flex flex-wrap items-center gap-2">
            {warning.allergens.slice(0, 2).map((allergen) => (
              <badge_1.Badge
                className={severity.badgeColor}
                key={allergen}
                variant="secondary"
              >
                {formatAllergenName(allergen)}
              </badge_1.Badge>
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
        </alert_1.AlertDescription>
      </alert_1.Alert>
    );
  }
  // Full banner variant
  return (
    <alert_1.Alert
      className={(0, utils_1.cn)(
        severity.bgColor,
        severity.borderColor,
        "border relative",
        isResolved && "opacity-60",
        className
      )}
    >
      <SeverityIcon
        className={(0, utils_1.cn)("h-5 w-5", severity.iconColor)}
      />

      <div className="flex-1 space-y-3">
        {/* Title and Status */}
        <alert_1.AlertTitle
          className={(0, utils_1.cn)(
            "flex items-center justify-between",
            severity.textColor
          )}
        >
          <div className="flex items-center gap-2">
            {getWarningTypeLabel(warning.warningType)}
            <badge_1.Badge className={severity.badgeColor} variant="secondary">
              {severity.label}
            </badge_1.Badge>
          </div>

          <div className="flex items-center gap-2">
            {isResolved && (
              <badge_1.Badge
                className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-100"
                variant="secondary"
              >
                <lucide_react_1.CheckCircle2 className="mr-1 h-3 w-3" />
                Resolved
              </badge_1.Badge>
            )}
            {isAcknowledged && !isResolved && (
              <badge_1.Badge
                className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100"
                variant="secondary"
              >
                <lucide_react_1.CheckCircle2 className="mr-1 h-3 w-3" />
                Acknowledged
              </badge_1.Badge>
            )}
          </div>
        </alert_1.AlertTitle>

        {/* Main Content */}
        <alert_1.AlertDescription
          className={(0, utils_1.cn)("space-y-3", severity.textColor)}
        >
          {/* Affected Guests */}
          {warning.affectedGuests.length > 0 && (
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs font-semibold uppercase">
                <lucide_react_1.User className="h-3.5 w-3.5" />
                Affected Guests
              </div>
              <div className="flex flex-wrap gap-1.5">
                {warning.affectedGuestDetails
                  ? warning.affectedGuestDetails.map((guest) => (
                      <badge_1.Badge
                        className="bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600"
                        key={guest.id}
                        variant="outline"
                      >
                        {guest.name}
                      </badge_1.Badge>
                    ))
                  : warning.affectedGuests.map((guestId, index) => (
                      <badge_1.Badge
                        className="bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600"
                        key={guestId}
                        variant="outline"
                      >
                        Guest {index + 1}
                      </badge_1.Badge>
                    ))}
              </div>
            </div>
          )}

          {/* Allergens/Restrictions */}
          {warning.allergens.length > 0 && (
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs font-semibold uppercase">
                <lucide_react_1.Ban className="h-3.5 w-3.5" />
                {warning.warningType === "dietary_restriction"
                  ? "Restrictions"
                  : "Allergens"}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {warning.allergens.map((allergen) => (
                  <badge_1.Badge
                    className={severity.badgeColor}
                    key={allergen}
                    variant="secondary"
                  >
                    {formatAllergenName(allergen)}
                  </badge_1.Badge>
                ))}
              </div>
            </div>
          )}

          {/* Dish Information */}
          {warning.dishName && (
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs font-semibold uppercase">
                <lucide_react_1.Utensils className="h-3.5 w-3.5" />
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
              <p className="text-xs font-semibold uppercase">
                Additional Notes
              </p>
              <p className="text-xs mt-1">{warning.notes}</p>
            </div>
          )}
        </alert_1.AlertDescription>

        {/* Action Buttons */}
        {!isResolved && (
          <div className="flex flex-wrap items-center gap-2">
            {isAcknowledged ? (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <lucide_react_1.CheckCircle2 className="h-4 w-4 text-blue-600" />
                <span>
                  Acknowledged by {warning.acknowledgedBy} on{" "}
                  {warning.acknowledgedAt
                    ? new Date(warning.acknowledgedAt).toLocaleDateString()
                    : ""}
                </span>
              </div>
            ) : (
              <>
                <AcknowledgeDialog
                  onConfirm={handleAcknowledge}
                  severity={warning.severity}
                  trigger={
                    <button_1.Button
                      className="gap-1.5"
                      size="sm"
                      variant={severity.buttonVariant}
                    >
                      <lucide_react_1.CheckCircle2 className="h-4 w-4" />
                      Acknowledge
                    </button_1.Button>
                  }
                  warningId={warning.id}
                  warningType={warning.warningType}
                />

                {onViewDetails && (
                  <button_1.Button
                    className="gap-1.5"
                    onClick={handleViewDetails}
                    size="sm"
                    variant="outline"
                  >
                    <lucide_react_1.ChevronRight className="h-4 w-4" />
                    View Details
                  </button_1.Button>
                )}
              </>
            )}

            {warning.severity === "info" && onDismiss && !isAcknowledged && (
              <button_1.Button
                className="gap-1.5 ml-auto"
                onClick={handleDismiss}
                size="sm"
                variant="ghost"
              >
                <lucide_react_1.X className="h-4 w-4" />
                Dismiss
              </button_1.Button>
            )}
          </div>
        )}
      </div>
    </alert_1.Alert>
  );
}
/**
 * Compact inline variant for use in cards and tables
 */
function AllergenWarningInline({ warning, onViewDetails, className }) {
  const severity = severityConfig[warning.severity] || severityConfig.warning;
  const SeverityIcon = severity.icon;
  return (
    <button
      className={(0, utils_1.cn)(
        "flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium transition-colors hover:opacity-80",
        severity.bgColor,
        severity.textColor,
        severity.borderColor,
        "border",
        className
      )}
      onClick={() => onViewDetails?.(warning.id)}
    >
      <SeverityIcon
        className={(0, utils_1.cn)("h-3.5 w-3.5", severity.iconColor)}
      />
      <span className="line-clamp-1">
        {warning.allergens.length}{" "}
        {warning.warningType === "dietary_restriction"
          ? "restriction"
          : "allergen"}
        {warning.allergens.length !== 1 ? "s" : ""}
      </span>
    </button>
  );
}
/**
 * Severity badge component for use in tables and lists
 */
function AllergenSeverityBadge({ severity }) {
  const config = severityConfig[severity] || severityConfig.warning;
  return (
    <badge_1.Badge className={config.badgeColor} variant="secondary">
      {config.label}
    </badge_1.Badge>
  );
}
