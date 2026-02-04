import { ChevronDownIcon, type LucideIcon, PlusIcon } from "lucide-react";
import type * as React from "react";
import { cn } from "../../lib/utils";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "../ui/collapsible";
import { Separator } from "../ui/separator";

/**
 * CollapsibleSectionBlock - A standardized collapsible section component
 *
 * This component provides a consistent pattern for collapsible sections with:
 * - Icon + title + subtitle header
 * - Collapsible content with separator
 * - Optional empty state
 * - Header actions and content actions
 *
 * @example
 * ```tsx
 * <CollapsibleSectionBlock
 *   icon={UtensilsIcon}
 *   title="Menu / Dishes"
 *   subtitle={`${dishCount} dishes linked to this event`}
 *   iconColor="text-emerald-500"
 *   defaultOpen
 *   triggerText="View dishes"
 *   headerActions={<AddDishDialog />}
 * >
 *   <DishList dishes={dishes} />
 * </CollapsibleSectionBlock>
 * ```
 */

export type EmptyStateConfig = {
  icon?: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
};

type CollapsibleSectionBlockProps = {
  /** Icon to display in the header */
  icon: LucideIcon;
  /** Section title */
  title: string;
  /** Subtitle text (often a count or status) */
  subtitle?: string;
  /** Tailwind color class for the icon (e.g., "text-emerald-500") */
  iconColor?: string;
  /** Whether the section is open by default */
  defaultOpen?: boolean;
  /** Text for the collapsible trigger button (string or function returning string) */
  triggerText?: string | (() => string);
  /** Optional custom ID for the collapsible */
  id?: string;
  /** Actions to display in the header (right side) */
  headerActions?: React.ReactNode;
  /** Content to display when there is data */
  children: React.ReactNode;
  /** Optional empty state configuration */
  emptyState?: EmptyStateConfig;
  /** Whether to show the empty state */
  showEmptyState?: boolean;
  /** Optional additional class names for the container */
  className?: string;
};

export function CollapsibleSectionBlock({
  icon: Icon,
  title,
  subtitle,
  iconColor = "text-muted-foreground",
  defaultOpen = false,
  triggerText = "View",
  id,
  headerActions,
  children,
  emptyState,
  showEmptyState = false,
  className,
}: CollapsibleSectionBlockProps) {
  const hasEmptyState = showEmptyState && emptyState;

  return (
    <Collapsible
      className={cn(
        "rounded-xl border bg-card text-card-foreground shadow-sm",
        className
      )}
      defaultOpen={defaultOpen}
      id={id}
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-4 px-6 py-4">
        <div className="flex items-center gap-2">
          <Icon className={cn("size-5", iconColor)} />
          <div>
            <div className="font-semibold text-sm">{title}</div>
            {subtitle && (
              <div className="text-muted-foreground text-sm">{subtitle}</div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {headerActions}
          <CollapsibleTrigger asChild>
            <Button variant="ghost">
              {typeof triggerText === "function" ? triggerText() : triggerText}
              <ChevronDownIcon className="size-4" />
            </Button>
          </CollapsibleTrigger>
        </div>
      </div>

      {/* Separator */}
      <Separator />

      {/* Content */}
      <CollapsibleContent className="px-6 py-4">
        {hasEmptyState ? <EmptyState {...emptyState!} /> : children}
      </CollapsibleContent>
    </Collapsible>
  );
}

/**
 * EmptyState - Internal component for displaying empty states
 */
type EmptyStateProps = EmptyStateConfig;

function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  const DefaultIcon = PlusIcon;

  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      {Icon && (
        <div className="mb-4 rounded-full bg-muted p-3">
          <Icon className="size-6 text-muted-foreground" />
        </div>
      )}
      {!Icon && (
        <div className="mb-4 rounded-full bg-muted p-3">
          <DefaultIcon className="size-6 text-muted-foreground" />
        </div>
      )}
      <p className="mb-2 text-muted-foreground text-sm">{title}</p>
      <p className="mb-4 text-muted-foreground text-xs">{description}</p>
      {actionLabel && onAction && (
        <Button onClick={onAction} size="sm" variant="outline">
          <PlusIcon className="mr-2 size-3" />
          {actionLabel}
        </Button>
      )}
    </div>
  );
}

/**
 * SectionHeaderBlock - A non-collapsible section header component
 *
 * For sections that don't need collapsible functionality but want
 * consistent header styling.
 */

type SectionHeaderBlockProps = {
  icon: LucideIcon;
  title: string;
  /** Tailwind color class for the icon */
  iconColor?: string;
  /** Actions to display on the right side */
  actions?: React.ReactNode;
  /** Optional badge count or other indicator */
  badge?: React.ReactNode;
  /** Optional additional class names */
  className?: string;
};

export function SectionHeaderBlock({
  icon: Icon,
  title,
  iconColor = "text-muted-foreground",
  actions,
  badge,
  className,
}: SectionHeaderBlockProps) {
  return (
    <div className={cn("flex items-center justify-between gap-4", className)}>
      <div className="flex items-center gap-2">
        <Icon className={cn("size-5", iconColor)} />
        <h2 className="font-semibold text-lg">{title}</h2>
        {badge && <Badge variant="secondary">{badge}</Badge>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
