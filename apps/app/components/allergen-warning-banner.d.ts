/**
 * @module AllergenWarningBanner
 * @intent Display allergen warnings with severity-based styling and acknowledgment actions
 * @responsibility Render allergen conflict warnings with guest details, dish information, and acknowledgment workflow
 * @domain Kitchen
 * @tags allergen, warning, banner, dietary, safety
 * @canonical true
 */
import type { AllergenWarning } from "@repo/database";
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
export declare function AllergenWarningBanner({
  warning,
  onAcknowledge,
  onDismiss,
  onViewDetails,
  className,
  compact,
}: AllergenWarningBannerProps): import("react").JSX.Element;
/**
 * Compact inline variant for use in cards and tables
 */
export declare function AllergenWarningInline({
  warning,
  onViewDetails,
  className,
}: Pick<
  AllergenWarningBannerProps,
  "warning" | "onViewDetails" | "className"
>): import("react").JSX.Element;
/**
 * Severity badge component for use in tables and lists
 */
export declare function AllergenSeverityBadge({
  severity,
}: {
  severity: string;
}): import("react").JSX.Element;
//# sourceMappingURL=allergen-warning-banner.d.ts.map
