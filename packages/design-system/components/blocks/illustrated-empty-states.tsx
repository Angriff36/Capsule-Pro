/**
 * Illustrated Empty States
 *
 * Context-specific illustrated empty states for common scenarios throughout the app.
 * Each includes a custom illustration, title, description, and primary CTA button.
 *
 * Role-aware: Admins see setup instructions; viewers see a message explaining
 * that content will appear once an admin adds it.
 */

import {
  Building2,
  Calendar,
  ClipboardList,
  Filter,
  FlaskConical,
  Info,
  Package,
  Plus,
  RefreshCw,
  Truck,
} from "lucide-react";
import type * as React from "react";
import { Button } from "../ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "../ui/empty";
import {
  AmbientAnimation,
  type AmbientAnimationProps,
  withAmbientAnimation,
} from "./ambient-animation";
import {
  type PromptSuggestion,
  PromptSuggestions,
  type UserActivityContext,
  type UserRole,
} from "./prompt-suggestions";

// =============================================================================
// ROLE-AWARE MESSAGING HELPERS
// =============================================================================

/**
 * Determines if a role can create content
 */
function canRoleCreate(role: UserRole | undefined): boolean {
  if (!role) return false;
  const viewerRoles: UserRole[] = ["staff"];
  return !viewerRoles.includes(role);
}

/**
 * Gets role-appropriate messaging for empty states
 */
function getRoleAwareEmptyMessage(
  itemType: string,
  userRole?: UserRole,
  customViewerDescription?: string
): { title: string; description: string; showCta: boolean } {
  const singular = itemType.replace(/s$/, "");
  const canCreate = canRoleCreate(userRole);

  if (!canCreate) {
    return {
      title: `No ${itemType} yet`,
      description:
        customViewerDescription ??
        `${singular.charAt(0).toUpperCase() + singular.slice(1)}s will appear here once an admin adds them. Contact your administrator if you need access to add content.`,
      showCta: false,
    };
  }

  return {
    title: `No ${itemType} yet`,
    description: `Get started by creating your first ${singular === "items" ? "item" : singular}.`,
    showCta: true,
  };
}

// =============================================================================
// ILLUSTRATION COMPONENTS
// =============================================================================

/**
 * EmptyListIllustration - Illustrated empty list state
 */
function EmptyListIllustration() {
  return (
    <svg
      aria-hidden="true"
      className="w-48 h-38 text-muted-foreground/50"
      fill="none"
      viewBox="0 0 200 160"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Background elements */}
      <circle className="fill-muted/20" cx="100" cy="80" r="60" />
      {/* Document stack */}
      <rect
        className="fill-border"
        height="80"
        rx="4"
        width="60"
        x="60"
        y="40"
      />
      <rect
        className="fill-muted-foreground/20"
        height="6"
        rx="2"
        width="40"
        x="65"
        y="45"
      />
      <rect
        className="fill-muted-foreground/20"
        height="6"
        rx="2"
        width="30"
        x="65"
        y="55"
      />
      <rect
        className="fill-muted-foreground/20"
        height="6"
        rx="2"
        width="35"
        x="65"
        y="65"
      />
      <rect
        className="fill-muted-foreground/20"
        height="6"
        rx="2"
        width="25"
        x="65"
        y="75"
      />
      {/* Floating papers */}
      <rect
        className="fill-border"
        height="50"
        rx="4"
        transform="rotate(12 150 55)"
        width="40"
        x="130"
        y="30"
      />
      <rect
        className="fill-muted-foreground/20"
        height="4"
        rx="2"
        transform="rotate(12 147.5 37)"
        width="25"
        x="135"
        y="35"
      />
      <rect
        className="fill-muted-foreground/20"
        height="4"
        rx="2"
        transform="rotate(12 145 45)"
        width="20"
        x="135"
        y="43"
      />
    </svg>
  );
}

/**
 * NoSearchResultsIllustration - Illustrated no search results state
 */
function NoSearchResultsIllustration() {
  return (
    <svg
      aria-hidden="true"
      className="w-48 h-38 text-muted-foreground/50"
      fill="none"
      viewBox="0 0 200 160"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle className="fill-muted/20" cx="100" cy="80" r="60" />
      {/* Magnifying glass */}
      <circle
        className="stroke-border stroke-8 fill-none"
        cx="85"
        cy="75"
        r="28"
      />
      <line
        className="stroke-border stroke-8"
        strokeLinecap="round"
        x1="105"
        x2="130"
        y1="95"
        y2="120"
      />
      {/* X mark */}
      <line
        className="stroke-destructive/50 stroke-4"
        strokeLinecap="round"
        x1="75"
        x2="95"
        y1="65"
        y2="85"
      />
      <line
        className="stroke-destructive/50 stroke-4"
        strokeLinecap="round"
        x1="95"
        x2="75"
        y1="65"
        y2="85"
      />
      {/* Question marks floating */}
      <text
        className="fill-muted-foreground/30 text-lg font-bold"
        x="140"
        y="50"
      >
        ?
      </text>
      <text
        className="fill-muted-foreground/30 text-lg font-bold"
        x="45"
        y="110"
      >
        ?
      </text>
    </svg>
  );
}

/**
 * NoNotificationsIllustration - Illustrated no notifications state
 */
function NoNotificationsIllustration() {
  return (
    <svg
      aria-hidden="true"
      className="w-48 h-38 text-muted-foreground/50"
      fill="none"
      viewBox="0 0 200 160"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle className="fill-muted/20" cx="100" cy="80" r="60" />
      {/* Bell */}
      <path
        className="fill-border"
        d="M100 110 C90 110 85 105 85 95 L85 65 C85 50 95 40 100 40 C105 40 115 50 115 65 L115 95 C115 105 110 110 100 110"
      />
      <circle className="fill-border" cx="100" cy="118" r="6" />
      <rect
        className="fill-border"
        height="4"
        rx="2"
        width="16"
        x="92"
        y="35"
      />
      {/* Checkmark indicating "all caught up" */}
      <circle className="fill-green-500/20" cx="140" cy="50" r="12" />
      <path
        className="stroke-green-500 stroke-2 fill-none"
        d="M134 50 L138 54 L146 46"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * NoClientsIllustration - Illustrated no clients state
 */
function NoClientsIllustration() {
  return (
    <svg
      aria-hidden="true"
      className="w-48 h-38 text-muted-foreground/50"
      fill="none"
      viewBox="0 0 200 160"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle className="fill-muted/20" cx="100" cy="80" r="60" />
      {/* Building */}
      <rect
        className="fill-border"
        height="70"
        rx="2"
        width="60"
        x="70"
        y="50"
      />
      <rect
        className="fill-muted-foreground/30"
        height="10"
        rx="1"
        width="10"
        x="75"
        y="55"
      />
      <rect
        className="fill-muted-foreground/30"
        height="10"
        rx="1"
        width="10"
        x="90"
        y="55"
      />
      <rect
        className="fill-muted-foreground/30"
        height="10"
        rx="1"
        width="10"
        x="105"
        y="55"
      />
      <rect
        className="fill-muted-foreground/30"
        height="10"
        rx="1"
        width="10"
        x="120"
        y="55"
      />
      <rect
        className="fill-muted-foreground/30"
        height="10"
        rx="1"
        width="10"
        x="75"
        y="70"
      />
      <rect
        className="fill-muted-foreground/30"
        height="10"
        rx="1"
        width="10"
        x="90"
        y="70"
      />
      <rect
        className="fill-muted-foreground/30"
        height="10"
        rx="1"
        width="10"
        x="105"
        y="70"
      />
      <rect
        className="fill-muted-foreground/30"
        height="10"
        rx="1"
        width="10"
        x="120"
        y="70"
      />
      <rect
        className="fill-muted-foreground/40"
        height="25"
        rx="2"
        width="30"
        x="85"
        y="90"
      />
      {/* Plus sign */}
      <circle className="fill-primary/20" cx="150" cy="45" r="10" />
      <path
        className="stroke-primary stroke-2"
        d="M150 40 L150 50 M145 45 L155 45"
        strokeLinecap="round"
      />
    </svg>
  );
}

/**
 * NoTasksIllustration - Illustrated no tasks state
 */
function NoTasksIllustration() {
  return (
    <svg
      aria-hidden="true"
      className="w-48 h-38 text-muted-foreground/50"
      fill="none"
      viewBox="0 0 200 160"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle className="fill-muted/20" cx="100" cy="80" r="60" />
      {/* Clipboard */}
      <rect
        className="fill-border"
        height="70"
        rx="4"
        width="50"
        x="75"
        y="35"
      />
      <rect
        className="fill-border"
        height="10"
        rx="2"
        width="30"
        x="85"
        y="30"
      />
      {/* Checkboxes (empty) */}
      <rect
        className="fill-muted-foreground/20 stroke-muted-foreground/30 stroke-2"
        height="12"
        rx="2"
        width="12"
        x="82"
        y="50"
      />
      <rect
        className="fill-muted-foreground/20"
        height="3"
        rx="1"
        width="20"
        x="100"
        y="52"
      />
      <rect
        className="fill-muted-foreground/20"
        height="3"
        rx="1"
        width="15"
        x="100"
        y="58"
      />
      <rect
        className="fill-muted-foreground/20 stroke-muted-foreground/30 stroke-2"
        height="12"
        rx="2"
        width="12"
        x="82"
        y="70"
      />
      <rect
        className="fill-muted-foreground/20"
        height="3"
        rx="1"
        width="20"
        x="100"
        y="72"
      />
      <rect
        className="fill-muted-foreground/20"
        height="3"
        rx="1"
        width="18"
        x="100"
        y="78"
      />
      <rect
        className="fill-muted-foreground/20 stroke-muted-foreground/30 stroke-2"
        height="12"
        rx="2"
        width="12"
        x="82"
        y="90"
      />
      <rect
        className="fill-muted-foreground/20"
        height="3"
        rx="1"
        width="20"
        x="100"
        y="92"
      />
      <rect
        className="fill-muted-foreground/20"
        height="3"
        rx="1"
        width="12"
        x="100"
        y="98"
      />
    </svg>
  );
}

/**
 * NoInventoryIllustration - Illustrated no inventory state
 */
function NoInventoryIllustration() {
  return (
    <svg
      aria-hidden="true"
      className="w-48 h-38 text-muted-foreground/50"
      fill="none"
      viewBox="0 0 200 160"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle className="fill-muted/20" cx="100" cy="80" r="60" />
      {/* Empty box */}
      <path
        className="fill-border"
        d="M60 70 L100 50 L140 70 L140 110 L100 130 L60 110 Z"
      />
      <path
        className="stroke-muted-foreground/30 stroke-2 fill-none"
        d="M60 70 L100 90 L140 70"
      />
      <path
        className="stroke-muted-foreground/30 stroke-2 fill-none"
        d="M100 90 L100 130"
      />
      {/* Lid open slightly */}
      <path
        className="stroke-border stroke-3 fill-none"
        d="M60 70 L60 50 L100 30 L140 50 L140 70"
      />
    </svg>
  );
}

/**
 * NoShipmentsIllustration - Illustrated no shipments state
 */
function NoShipmentsIllustration() {
  return (
    <svg
      aria-hidden="true"
      className="w-48 h-38 text-muted-foreground/50"
      fill="none"
      viewBox="0 0 200 160"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle className="fill-muted/20" cx="100" cy="80" r="60" />
      {/* Truck body */}
      <rect
        className="fill-border"
        height="45"
        rx="4"
        width="70"
        x="50"
        y="70"
      />
      {/* Truck cab */}
      <path
        className="fill-border"
        d="M120 85 L140 85 L145 95 L145 115 L120 115 Z"
      />
      {/* Wheels */}
      <circle className="fill-muted-foreground/30" cx="75" cy="120" r="10" />
      <circle className="fill-border" cx="75" cy="120" r="5" />
      <circle className="fill-muted-foreground/30" cx="130" cy="120" r="10" />
      <circle className="fill-border" cx="130" cy="120" r="5" />
      {/* Window */}
      <rect
        className="fill-muted-foreground/20"
        height="12"
        rx="2"
        width="15"
        x="125"
        y="90"
      />
    </svg>
  );
}

/**
 * NoEventsIllustration - Illustrated no events state
 */
function NoEventsIllustration() {
  return (
    <svg
      aria-hidden="true"
      className="w-48 h-38 text-muted-foreground/50"
      fill="none"
      viewBox="0 0 200 160"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle className="fill-muted/20" cx="100" cy="80" r="60" />
      {/* Calendar */}
      <rect
        className="fill-border"
        height="70"
        rx="4"
        width="80"
        x="60"
        y="45"
      />
      <rect
        className="fill-muted-foreground/20"
        height="18"
        rx="4"
        width="80"
        x="60"
        y="45"
      />
      {/* Header holes */}
      <circle className="fill-background" cx="80" cy="54" r="3" />
      <circle className="fill-background" cx="120" cy="54" r="3" />
      {/* Empty date grid */}
      <rect
        className="fill-muted-foreground/15"
        height="10"
        rx="2"
        width="12"
        x="68"
        y="75"
      />
      <rect
        className="fill-muted-foreground/15"
        height="10"
        rx="2"
        width="12"
        x="85"
        y="75"
      />
      <rect
        className="fill-muted-foreground/15"
        height="10"
        rx="2"
        width="12"
        x="102"
        y="75"
      />
      <rect
        className="fill-muted-foreground/15"
        height="10"
        rx="2"
        width="12"
        x="119"
        y="75"
      />
      <rect
        className="fill-muted-foreground/15"
        height="10"
        rx="2"
        width="12"
        x="68"
        y="90"
      />
      <rect
        className="fill-muted-foreground/15"
        height="10"
        rx="2"
        width="12"
        x="85"
        y="90"
      />
      <rect
        className="fill-muted-foreground/15"
        height="10"
        rx="2"
        width="12"
        x="102"
        y="90"
      />
      <rect
        className="fill-muted-foreground/15"
        height="10"
        rx="2"
        width="12"
        x="119"
        y="90"
      />
    </svg>
  );
}

/**
 * NoRecipesIllustration - Illustrated no recipes state
 */
function NoRecipesIllustration() {
  return (
    <svg
      aria-hidden="true"
      className="w-48 h-38 text-muted-foreground/50"
      fill="none"
      viewBox="0 0 200 160"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle className="fill-muted/20" cx="100" cy="80" r="60" />
      {/* Book */}
      <path className="fill-border" d="M60 50 L90 50 L90 120 L60 120 Z" />
      <path className="fill-border" d="M90 50 L110 50 L110 120 L90 120 Z" />
      <path className="fill-border" d="M110 50 L140 50 L140 120 L110 120 Z" />
      {/* Lines for text */}
      <rect
        className="fill-muted-foreground/20"
        height="3"
        rx="1"
        width="20"
        x="65"
        y="60"
      />
      <rect
        className="fill-muted-foreground/20"
        height="3"
        rx="1"
        width="18"
        x="65"
        y="70"
      />
      <rect
        className="fill-muted-foreground/20"
        height="3"
        rx="1"
        width="20"
        x="65"
        y="80"
      />
      <rect
        className="fill-muted-foreground/20"
        height="3"
        rx="1"
        width="15"
        x="65"
        y="90"
      />
      {/* Chef hat hint */}
      <ellipse
        className="fill-muted-foreground/20"
        cx="155"
        cy="45"
        rx="15"
        ry="12"
      />
      <rect
        className="fill-muted-foreground/20"
        height="15"
        width="14"
        x="148"
        y="45"
      />
    </svg>
  );
}

/**
 * NoDataIllustration - Generic no data state
 */
function NoDataIllustration() {
  return (
    <svg
      aria-hidden="true"
      className="w-48 h-38 text-muted-foreground/50"
      fill="none"
      viewBox="0 0 200 160"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle className="fill-muted/20" cx="100" cy="80" r="60" />
      {/* Bar chart with empty bars */}
      <rect
        className="fill-border"
        height="40"
        rx="2"
        width="15"
        x="55"
        y="80"
      />
      <rect
        className="fill-border"
        height="55"
        rx="2"
        width="15"
        x="78"
        y="65"
      />
      <rect
        className="fill-muted-foreground/30"
        height="70"
        rx="2"
        width="15"
        x="101"
        y="50"
      />
      <rect
        className="fill-border"
        height="50"
        rx="2"
        width="15"
        x="124"
        y="70"
      />
      {/* Baseline */}
      <line
        className="stroke-border stroke-2"
        x1="50"
        x2="150"
        y1="125"
        y2="125"
      />
    </svg>
  );
}

/**
 * NoAuditLogsIllustration - Illustrated no audit logs state
 */
function NoAuditLogsIllustration() {
  return (
    <svg
      aria-hidden="true"
      className="w-48 h-38 text-muted-foreground/50"
      fill="none"
      viewBox="0 0 200 160"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle className="fill-muted/20" cx="100" cy="80" r="60" />
      {/* Document/Audit file */}
      <rect
        className="fill-border"
        height="80"
        rx="4"
        width="60"
        x="60"
        y="40"
      />
      {/* Shield icon overlay */}
      <path
        className="fill-muted-foreground/20"
        d="M120 60 L140 50 L140 90 C140 105 130 115 120 120 C110 115 100 105 100 90 L100 50 Z"
      />
      <path
        className="stroke-border stroke-2 fill-none"
        d="M120 60 L135 52 L135 88 C135 100 127 108 120 112 C113 108 105 100 105 88 L105 52 Z"
      />
    </svg>
  );
}

// =============================================================================
// EMPTY STATE COMPONENTS WITH CTAs
// =============================================================================

/**
 * Shared props for ambient animation in empty states
 */
interface AmbientAnimationOptions {
  /** Enable ambient animation for the empty state */
  enableAmbientAnimation?: boolean;
  /** Ambient animation variant */
  ambientVariant?: AmbientAnimationProps["variant"];
  /** Ambient animation intensity (0-1) */
  ambientIntensity?: number;
}

/**
 * EmptyListState - Generic empty list with CTA to create item
 * Role-aware: Viewers see messaging explaining content will appear when admin adds it
 */
interface EmptyListStateProps {
  itemName?: string;
  onCreate?: () => void;
  createButtonText?: string;
  description?: string;
  /** User role for role-aware messaging */
  userRole?: UserRole;
  /** Custom description for viewers (non-admin/non-creator roles) */
  viewerDescription?: string;
  /** Ambient animation options */
  enableAmbientAnimation?: boolean;
  ambientVariant?: AmbientAnimationProps["variant"];
  ambientIntensity?: number;
}

export function EmptyListState({
  itemName = "items",
  onCreate,
  createButtonText = `Add ${itemName === "items" ? "first item" : itemName.slice(0, -1)}`,
  description,
  userRole,
  viewerDescription,
  enableAmbientAnimation = false,
  ambientVariant = "particles",
  ambientIntensity = 0.6,
}: EmptyListStateProps) {
  const canCreate = canRoleCreate(userRole);
  const messaging = getRoleAwareEmptyMessage(
    itemName,
    userRole,
    viewerDescription
  );

  const content = (
    <Empty>
      <EmptyHeader>
        <EmptyMedia>
          <EmptyListIllustration />
        </EmptyMedia>
        <EmptyTitle>{messaging.title}</EmptyTitle>
        <EmptyDescription>
          {description ?? messaging.description}
        </EmptyDescription>
      </EmptyHeader>
      {messaging.showCta && onCreate && (
        <EmptyContent>
          <Button onClick={onCreate} size="sm">
            <Plus className="size-4" />
            {createButtonText}
          </Button>
        </EmptyContent>
      )}
      {!messaging.showCta && (
        <EmptyContent>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Info className="size-4" />
            <span>Contact an admin to add content</span>
          </div>
        </EmptyContent>
      )}
    </Empty>
  );

  if (enableAmbientAnimation) {
    return (
      <AmbientAnimation
        intensity={ambientIntensity}
        isVisible={true}
        variant={ambientVariant}
      >
        {content}
      </AmbientAnimation>
    );
  }

  return content;
}

/**
 * NoSearchResultsState - No search results with filter clear option
 */
interface NoSearchResultsStateProps {
  searchQuery?: string;
  onClearFilters?: () => void;
  searchableItemName?: string;
}

export function NoSearchResultsState({
  searchQuery,
  onClearFilters,
  searchableItemName = "results",
}: NoSearchResultsStateProps) {
  return (
    <Empty>
      <EmptyHeader>
        <EmptyMedia>
          <NoSearchResultsIllustration />
        </EmptyMedia>
        <EmptyTitle>No {searchableItemName} found</EmptyTitle>
        <EmptyDescription>
          {searchQuery
            ? `We couldn't find any ${searchableItemName} matching "${searchQuery}"`
            : `No ${searchableItemName} match your current filters.`}
        </EmptyDescription>
      </EmptyHeader>
      {onClearFilters && (
        <EmptyContent>
          <Button onClick={onClearFilters} size="sm" variant="outline">
            <Filter className="size-4" />
            Clear filters
          </Button>
        </EmptyContent>
      )}
    </Empty>
  );
}

/**
 * NoNotificationsState - No notifications with encouraging message
 */
export function NoNotificationsState() {
  return (
    <Empty>
      <EmptyHeader>
        <EmptyMedia>
          <NoNotificationsIllustration />
        </EmptyMedia>
        <EmptyTitle>All caught up!</EmptyTitle>
        <EmptyDescription>
          You have no new notifications. We'll let you know when something needs
          your attention.
        </EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}

/**
 * NoClientsState - No clients with CTA to add client and optional prompt suggestions
 * Role-aware: Viewers see messaging explaining content will appear when admin adds it
 */
interface NoClientsStateProps {
  onCreateClient?: () => void;
  description?: string;
  /** Enable dynamic prompt suggestions */
  showSuggestions?: boolean;
  userRole?: UserRole;
  activityContext?: UserActivityContext;
  customSuggestions?: PromptSuggestion[];
  onSuggestionClick?: (suggestion: PromptSuggestion) => void;
  /** Custom description for viewers (non-admin/non-creator roles) */
  viewerDescription?: string;
}

const VIEWER_CLIENT_MESSAGE =
  "Clients will appear here once an admin adds them. Contact your administrator if you need to add client information.";

const ADMIN_CLIENT_MESSAGE =
  "Start building your client base. Add your first client to begin managing events and relationships.";

export function NoClientsState({
  onCreateClient,
  description,
  showSuggestions = false,
  userRole,
  activityContext,
  customSuggestions,
  onSuggestionClick,
  viewerDescription,
}: NoClientsStateProps) {
  const canCreate = canRoleCreate(userRole);
  const messaging = getRoleAwareEmptyMessage(
    "clients",
    userRole,
    viewerDescription ?? VIEWER_CLIENT_MESSAGE
  );

  return (
    <Empty>
      <EmptyHeader>
        <EmptyMedia>
          <NoClientsIllustration />
        </EmptyMedia>
        <EmptyTitle>{messaging.title}</EmptyTitle>
        <EmptyDescription>
          {description ??
            (canCreate ? ADMIN_CLIENT_MESSAGE : messaging.description)}
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        {canCreate && showSuggestions ? (
          <PromptSuggestions
            activityContext={activityContext}
            maxSuggestions={3}
            onSuggestionClick={onSuggestionClick}
            section="clients"
            suggestions={customSuggestions}
            userRole={userRole}
          />
        ) : canCreate && onCreateClient ? (
          <Button onClick={onCreateClient} size="sm">
            <Building2 className="size-4" />
            Add client
          </Button>
        ) : (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Info className="size-4" />
            <span>Contact an admin to add clients</span>
          </div>
        )}
      </EmptyContent>
    </Empty>
  );
}

/**
 * NoTasksState - No tasks with helpful context and optional prompt suggestions
 * Role-aware: Viewers see messaging explaining content will appear when admin adds it
 */
interface NoTasksStateProps {
  taskType?: string;
  onClaimTask?: () => void;
  onCreateTask?: () => void;
  description?: string;
  /** Enable dynamic prompt suggestions */
  showSuggestions?: boolean;
  userRole?: UserRole;
  activityContext?: UserActivityContext;
  customSuggestions?: PromptSuggestion[];
  onSuggestionClick?: (suggestion: PromptSuggestion) => void;
  /** Custom description for viewers (non-admin/non-creator roles) */
  viewerDescription?: string;
}

const VIEWER_TASK_MESSAGE =
  "Tasks will appear here once they're created. Contact your administrator if you need tasks assigned.";

const ADMIN_TASK_MESSAGE =
  "There are no tasks matching your current view. Check back later or adjust your filters.";

export function NoTasksState({
  taskType = "tasks",
  onClaimTask,
  onCreateTask,
  description,
  showSuggestions = false,
  userRole,
  activityContext,
  customSuggestions,
  onSuggestionClick,
  viewerDescription,
}: NoTasksStateProps) {
  const canCreate = canRoleCreate(userRole);

  return (
    <Empty>
      <EmptyHeader>
        <EmptyMedia>
          <NoTasksIllustration />
        </EmptyMedia>
        <EmptyTitle>No {taskType} available</EmptyTitle>
        <EmptyDescription>
          {description ??
            (canCreate
              ? ADMIN_TASK_MESSAGE
              : (viewerDescription ?? VIEWER_TASK_MESSAGE))}
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        {canCreate && showSuggestions ? (
          <PromptSuggestions
            activityContext={activityContext}
            maxSuggestions={3}
            onSuggestionClick={onSuggestionClick}
            section="tasks"
            suggestions={customSuggestions}
            userRole={userRole}
          />
        ) : canCreate && (onClaimTask || onCreateTask) ? (
          <>
            {onClaimTask && (
              <Button onClick={onClaimTask} size="sm">
                <ClipboardList className="size-4" />
                View all tasks
              </Button>
            )}
            {onCreateTask && (
              <Button onClick={onCreateTask} size="sm" variant="outline">
                <Plus className="size-4" />
                Create task
              </Button>
            )}
          </>
        ) : (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Info className="size-4" />
            <span>Contact an admin to create tasks</span>
          </div>
        )}
      </EmptyContent>
    </Empty>
  );
}

/**
 * NoInventoryState - No inventory items with CTA and optional prompt suggestions
 * Role-aware: Viewers see messaging explaining content will appear when admin adds it
 */
interface NoInventoryStateProps {
  onAddItem?: () => void;
  description?: string;
  /** Enable dynamic prompt suggestions */
  showSuggestions?: boolean;
  userRole?: UserRole;
  activityContext?: UserActivityContext;
  customSuggestions?: PromptSuggestion[];
  onSuggestionClick?: (suggestion: PromptSuggestion) => void;
  /** Custom description for viewers (non-admin/non-creator roles) */
  viewerDescription?: string;
}

const VIEWER_INVENTORY_MESSAGE =
  "Inventory items will appear here once an admin adds them. Contact your administrator to add inventory.";

const ADMIN_INVENTORY_MESSAGE =
  "Your inventory is empty. Add items to start tracking stock levels and costs.";

export function NoInventoryState({
  onAddItem,
  description,
  showSuggestions = false,
  userRole,
  activityContext,
  customSuggestions,
  onSuggestionClick,
  viewerDescription,
}: NoInventoryStateProps) {
  const canCreate = canRoleCreate(userRole);

  return (
    <Empty>
      <EmptyHeader>
        <EmptyMedia>
          <NoInventoryIllustration />
        </EmptyMedia>
        <EmptyTitle>No inventory items</EmptyTitle>
        <EmptyDescription>
          {description ??
            (canCreate
              ? ADMIN_INVENTORY_MESSAGE
              : (viewerDescription ?? VIEWER_INVENTORY_MESSAGE))}
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        {canCreate && showSuggestions ? (
          <PromptSuggestions
            activityContext={activityContext}
            maxSuggestions={3}
            onSuggestionClick={onSuggestionClick}
            section="inventory"
            suggestions={customSuggestions}
            userRole={userRole}
          />
        ) : canCreate && onAddItem ? (
          <Button onClick={onAddItem} size="sm">
            <Package className="size-4" />
            Add item
          </Button>
        ) : (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Info className="size-4" />
            <span>Contact an admin to add inventory</span>
          </div>
        )}
      </EmptyContent>
    </Empty>
  );
}

/**
 * NoShipmentsState - No shipments with CTA and optional prompt suggestions
 * Role-aware: Viewers see messaging explaining content will appear when admin adds it
 */
interface NoShipmentsStateProps {
  onCreateShipment?: () => void;
  description?: string;
  /** Enable dynamic prompt suggestions */
  showSuggestions?: boolean;
  userRole?: UserRole;
  activityContext?: UserActivityContext;
  customSuggestions?: PromptSuggestion[];
  onSuggestionClick?: (suggestion: PromptSuggestion) => void;
  /** Custom description for viewers (non-admin/non-creator roles) */
  viewerDescription?: string;
}

const VIEWER_SHIPMENT_MESSAGE =
  "Shipments will appear here once an admin creates them. Contact your administrator to arrange deliveries.";

const ADMIN_SHIPMENT_MESSAGE =
  "No shipments have been created. Create your first shipment to begin tracking deliveries.";

export function NoShipmentsState({
  onCreateShipment,
  description,
  showSuggestions = false,
  userRole,
  activityContext,
  customSuggestions,
  onSuggestionClick,
  viewerDescription,
}: NoShipmentsStateProps) {
  const canCreate = canRoleCreate(userRole);

  return (
    <Empty>
      <EmptyHeader>
        <EmptyMedia>
          <NoShipmentsIllustration />
        </EmptyMedia>
        <EmptyTitle>No shipments yet</EmptyTitle>
        <EmptyDescription>
          {description ??
            (canCreate
              ? ADMIN_SHIPMENT_MESSAGE
              : (viewerDescription ?? VIEWER_SHIPMENT_MESSAGE))}
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        {canCreate && showSuggestions ? (
          <PromptSuggestions
            activityContext={activityContext}
            maxSuggestions={3}
            onSuggestionClick={onSuggestionClick}
            section="shipments"
            suggestions={customSuggestions}
            userRole={userRole}
          />
        ) : canCreate && onCreateShipment ? (
          <Button onClick={onCreateShipment} size="sm">
            <Truck className="size-4" />
            Create shipment
          </Button>
        ) : (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Info className="size-4" />
            <span>Contact an admin to create shipments</span>
          </div>
        )}
      </EmptyContent>
    </Empty>
  );
}

/**
 * NoEventsState - No events with CTA and optional prompt suggestions
 * Role-aware: Viewers see messaging explaining content will appear when admin adds it
 */
interface NoEventsStateProps {
  onCreateEvent?: () => void;
  dateRange?: string;
  description?: string;
  /** Enable dynamic prompt suggestions */
  showSuggestions?: boolean;
  userRole?: UserRole;
  activityContext?: UserActivityContext;
  customSuggestions?: PromptSuggestion[];
  onSuggestionClick?: (suggestion: PromptSuggestion) => void;
  /** Custom description for viewers (non-admin/non-creator roles) */
  viewerDescription?: string;
  /** Enable ambient animation for the empty state */
  enableAmbientAnimation?: boolean;
  ambientVariant?: AmbientAnimationProps["variant"];
  ambientIntensity?: number;
}

const VIEWER_EVENT_MESSAGE =
  "Events will appear here once an admin schedules them. Contact your administrator to book an event.";

const ADMIN_EVENT_MESSAGE =
  "You don't have any events on the calendar. Create an event to get started.";

export function NoEventsState({
  onCreateEvent,
  dateRange,
  description,
  showSuggestions = false,
  userRole,
  activityContext,
  customSuggestions,
  onSuggestionClick,
  viewerDescription,
  enableAmbientAnimation = false,
  ambientVariant = "particles",
  ambientIntensity = 0.6,
}: NoEventsStateProps) {
  const canCreate = canRoleCreate(userRole);

  const content = (
    <Empty>
      <EmptyHeader>
        <EmptyMedia>
          <NoEventsIllustration />
        </EmptyMedia>
        <EmptyTitle>No events {dateRange || "scheduled"}</EmptyTitle>
        <EmptyDescription>
          {description ??
            (canCreate
              ? ADMIN_EVENT_MESSAGE
              : (viewerDescription ?? VIEWER_EVENT_MESSAGE))}
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        {canCreate && showSuggestions ? (
          <PromptSuggestions
            activityContext={activityContext}
            maxSuggestions={4}
            onSuggestionClick={onSuggestionClick}
            section="events"
            suggestions={customSuggestions}
            userRole={userRole}
          />
        ) : canCreate && onCreateEvent ? (
          <Button onClick={onCreateEvent} size="sm">
            <Calendar className="size-4" />
            Create event
          </Button>
        ) : (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Info className="size-4" />
            <span>Contact an admin to create events</span>
          </div>
        )}
      </EmptyContent>
    </Empty>
  );

  if (enableAmbientAnimation) {
    return (
      <AmbientAnimation
        intensity={ambientIntensity}
        isVisible={true}
        variant={ambientVariant}
      >
        {content}
      </AmbientAnimation>
    );
  }

  return content;
}

/**
 * NoRecipesState - No recipes with CTA
 * Role-aware: Viewers see messaging explaining content will appear when admin adds it
 */
interface NoRecipesStateProps {
  onCreateRecipe?: () => void;
  description?: string;
  /** User role for role-aware messaging */
  userRole?: UserRole;
  /** Custom description for viewers (non-admin/non-creator roles) */
  viewerDescription?: string;
}

const VIEWER_RECIPE_MESSAGE =
  "Recipes will appear here once an admin adds them. Contact your administrator to add recipes.";

const ADMIN_RECIPE_MESSAGE =
  "Build your recipe library to standardize dishes and calculate accurate food costs.";

export function NoRecipesState({
  onCreateRecipe,
  description,
  userRole,
  viewerDescription,
}: NoRecipesStateProps) {
  const canCreate = canRoleCreate(userRole);

  return (
    <Empty>
      <EmptyHeader>
        <EmptyMedia>
          <NoRecipesIllustration />
        </EmptyMedia>
        <EmptyTitle>No recipes yet</EmptyTitle>
        <EmptyDescription>
          {description ??
            (canCreate
              ? ADMIN_RECIPE_MESSAGE
              : (viewerDescription ?? VIEWER_RECIPE_MESSAGE))}
        </EmptyDescription>
      </EmptyHeader>
      {canCreate && onCreateRecipe && (
        <EmptyContent>
          <Button onClick={onCreateRecipe} size="sm">
            <FlaskConical className="size-4" />
            Add recipe
          </Button>
        </EmptyContent>
      )}
      {!canCreate && (
        <EmptyContent>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Info className="size-4" />
            <span>Contact an admin to add recipes</span>
          </div>
        </EmptyContent>
      )}
    </Empty>
  );
}

/**
 * NoDataState - Generic no data state for analytics/reports
 */
interface NoDataStateProps {
  dataDescription?: string;
  actionButton?: React.ReactNode;
  description?: string;
  /** Enable ambient animation for the empty state */
  enableAmbientAnimation?: boolean;
  ambientVariant?: AmbientAnimationProps["variant"];
  ambientIntensity?: number;
}

export function NoDataState({
  dataDescription = "data",
  actionButton,
  description,
  enableAmbientAnimation = false,
  ambientVariant = "particles",
  ambientIntensity = 0.6,
}: NoDataStateProps) {
  const content = (
    <Empty>
      <EmptyHeader>
        <EmptyMedia>
          <NoDataIllustration />
        </EmptyMedia>
        <EmptyTitle>No data available</EmptyTitle>
        <EmptyDescription>
          {description ||
            `There is no ${dataDescription} to display yet. Data will appear once available.`}
        </EmptyDescription>
      </EmptyHeader>
      {actionButton && <EmptyContent>{actionButton}</EmptyContent>}
    </Empty>
  );

  if (enableAmbientAnimation) {
    return (
      <AmbientAnimation
        intensity={ambientIntensity}
        isVisible={true}
        variant={ambientVariant}
      >
        {content}
      </AmbientAnimation>
    );
  }

  return content;
}

/**
 * NoAuditLogsState - No audit logs with filter clear option
 */
interface NoAuditLogsStateProps {
  onClearFilters?: () => void;
  description?: string;
}

export function NoAuditLogsState({
  onClearFilters,
  description,
}: NoAuditLogsStateProps) {
  return (
    <Empty>
      <EmptyHeader>
        <EmptyMedia>
          <NoAuditLogsIllustration />
        </EmptyMedia>
        <EmptyTitle>No audit logs found</EmptyTitle>
        <EmptyDescription>
          {description ||
            "No audit logs match your current filters. Try adjusting your filter criteria."}
        </EmptyDescription>
      </EmptyHeader>
      {onClearFilters && (
        <EmptyContent>
          <Button onClick={onClearFilters} size="sm" variant="outline">
            <Filter className="size-4" />
            Clear filters
          </Button>
        </EmptyContent>
      )}
    </Empty>
  );
}

/**
 * NoPrepListsState - No prep lists with CTA
 * Role-aware: Viewers see messaging explaining content will appear when admin adds it
 */
interface NoPrepListsStateProps {
  onCreateList?: () => void;
  description?: string;
  /** User role for role-aware messaging */
  userRole?: UserRole;
  /** Custom description for viewers (non-admin/non-creator roles) */
  viewerDescription?: string;
}

const VIEWER_PREP_LIST_MESSAGE =
  "Prep lists will appear here once an admin creates them. Contact your administrator to create prep lists.";

const ADMIN_PREP_LIST_MESSAGE =
  "Create prep lists to organize kitchen tasks and ensure everything is ready for service.";

export function NoPrepListsState({
  onCreateList,
  description,
  userRole,
  viewerDescription,
}: NoPrepListsStateProps) {
  const canCreate = canRoleCreate(userRole);

  return (
    <Empty>
      <EmptyHeader>
        <EmptyMedia>
          <EmptyListIllustration />
        </EmptyMedia>
        <EmptyTitle>No prep lists</EmptyTitle>
        <EmptyDescription>
          {description ??
            (canCreate
              ? ADMIN_PREP_LIST_MESSAGE
              : (viewerDescription ?? VIEWER_PREP_LIST_MESSAGE))}
        </EmptyDescription>
      </EmptyHeader>
      {canCreate && onCreateList && (
        <EmptyContent>
          <Button onClick={onCreateList} size="sm">
            <Plus className="size-4" />
            Create prep list
          </Button>
        </EmptyContent>
      )}
      {!canCreate && (
        <EmptyContent>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Info className="size-4" />
            <span>Contact an admin to create prep lists</span>
          </div>
        </EmptyContent>
      )}
    </Empty>
  );
}

/**
 * FilteredEmptyState - Empty state with applied filters
 */
interface FilteredEmptyStateProps {
  onClearFilters: () => void;
  itemName?: string;
}

export function FilteredEmptyState({
  onClearFilters,
  itemName = "items",
}: FilteredEmptyStateProps) {
  return (
    <Empty>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <Filter />
        </EmptyMedia>
        <EmptyTitle>No {itemName} match your filters</EmptyTitle>
        <EmptyDescription>
          Try adjusting your filter criteria to see more results.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button onClick={onClearFilters} size="sm" variant="outline">
          <RefreshCw className="size-4" />
          Clear all filters
        </Button>
      </EmptyContent>
    </Empty>
  );
}

// Re-export role utilities from use-user-role hook
export {
  getRoleAwareMessaging,
  normalizeRole,
  type SystemRole,
  type UIRoleCategory,
  type UserRoleContext,
  UserRoleProvider,
  useUserRole,
} from "../../hooks/use-user-role";
// Re-export types from prompt-suggestions for convenience
export type {
  PromptSuggestion,
  PromptSuggestionsProps,
  SectionContext,
  UserActivityContext,
  UserRole,
} from "./prompt-suggestions";

// Export all components
export {
  // Illustrations
  EmptyListIllustration,
  NoSearchResultsIllustration,
  NoNotificationsIllustration,
  NoClientsIllustration,
  NoTasksIllustration,
  NoInventoryIllustration,
  NoShipmentsIllustration,
  NoEventsIllustration,
  NoRecipesIllustration,
  NoDataIllustration,
  NoAuditLogsIllustration,
  // Ambient Animation
  AmbientAnimation,
  withAmbientAnimation,
};
