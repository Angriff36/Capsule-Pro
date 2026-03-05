"use client";

import {
  Check,
  CheckCircle2,
  ChevronDownIcon,
  Circle,
  Copy,
  Loader2,
  Rocket,
  Share2,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useState } from "react";
import { cn } from "../../lib/utils";
import { Button } from "../ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "../ui/collapsible";
import { Progress } from "../ui/progress";
import { Separator } from "../ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../ui/tooltip";

/**
 * GettingStartedChecklist - A collapsible checklist for onboarding users
 *
 * Displays a progress-tracked checklist of setup tasks that users can complete.
 * Each task links directly to the relevant action/page.
 *
 * @example
 * ```tsx
 * <GettingStartedChecklist
 *   items={[
 *     { id: "add-item", label: "Add your first item", href: "/inventory/new", completed: false },
 *     { id: "invite-team", label: "Invite a teammate", href: "/settings/team", completed: true },
 *     { id: "connect-integration", label: "Connect an integration", href: "/settings/integrations", completed: false },
 *   ]}
 * />
 * ```
 */

export interface ChecklistItem {
  /** Unique identifier for the item */
  id: string;
  /** Display label for the checklist item */
  label: string;
  /** Optional description explaining what this task does */
  description?: string;
  /** Link to the relevant action/page */
  href: string;
  /** Whether the item is completed */
  completed: boolean;
  /** Optional icon for the item (defaults to checkmark when complete) */
  icon?: React.ReactNode;
}

interface GettingStartedChecklistProps {
  /** List of checklist items to display */
  items: ChecklistItem[];
  /** Whether the checklist is collapsed by default */
  defaultOpen?: boolean;
  /** Optional custom class name */
  className?: string;
  /** Optional callback when an item is clicked */
  onItemClick?: (item: ChecklistItem) => void;
  /** Optional title override */
  title?: string;
  /** Optional subtitle override */
  subtitle?: string;
  /** Optional callback to share progress with team lead/manager */
  onShareProgress?: (items: ChecklistItem[]) => Promise<string | null>;
  /** Whether to show the share button */
  showShareButton?: boolean;
}

export function GettingStartedChecklist({
  items,
  defaultOpen = true,
  className,
  onItemClick,
  title = "Getting Started",
  subtitle,
  onShareProgress,
  showShareButton = false,
}: GettingStartedChecklistProps) {
  const completedCount = items.filter((item) => item.completed).length;
  const totalCount = items.length;
  const progressPercent =
    totalCount > 0 ? (completedCount / totalCount) * 100 : 0;
  const allCompleted = completedCount === totalCount && totalCount > 0;

  const [shareState, setShareState] = useState<{
    isLoading: boolean;
    shareUrl: string | null;
    copied: boolean;
    error: string | null;
  }>({
    isLoading: false,
    shareUrl: null,
    copied: false,
    error: null,
  });

  const handleShare = useCallback(async () => {
    if (!onShareProgress || shareState.isLoading) return;

    setShareState((prev) => ({ ...prev, isLoading: true, error: null }));
    try {
      const url = await onShareProgress(items);
      if (url) {
        setShareState((prev) => ({ ...prev, shareUrl: url, isLoading: false }));
      } else {
        setShareState((prev) => ({
          ...prev,
          isLoading: false,
          error: "Failed to create share link",
        }));
      }
    } catch {
      setShareState((prev) => ({
        ...prev,
        isLoading: false,
        error: "Failed to create share link",
      }));
    }
  }, [onShareProgress, items, shareState.isLoading]);

  const handleCopyUrl = useCallback(async () => {
    if (!shareState.shareUrl) return;

    try {
      await navigator.clipboard.writeText(shareState.shareUrl);
      setShareState((prev) => ({ ...prev, copied: true }));
      setTimeout(() => {
        setShareState((prev) => ({ ...prev, copied: false }));
      }, 2000);
    } catch {
      setShareState((prev) => ({ ...prev, error: "Failed to copy" }));
    }
  }, [shareState.shareUrl]);

  const dynamicSubtitle =
    subtitle ??
    (allCompleted
      ? "All tasks completed!"
      : `${completedCount} of ${totalCount} tasks completed`);

  return (
    <Collapsible
      className={cn(
        "rounded-xl border bg-card text-card-foreground shadow-sm",
        className
      )}
      defaultOpen={defaultOpen}
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-4 px-6 py-4">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "flex size-9 items-center justify-center rounded-lg",
              allCompleted
                ? "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400"
                : "bg-primary/10 text-primary"
            )}
          >
            {allCompleted ? (
              <CheckCircle2 className="size-5" />
            ) : (
              <Rocket className="size-5" />
            )}
          </div>
          <div>
            <div className="font-semibold text-sm">{title}</div>
            <div className="text-muted-foreground text-sm">
              {dynamicSubtitle}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Share Button */}
          {showShareButton && onShareProgress && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    disabled={shareState.isLoading}
                    onClick={handleShare}
                    size="sm"
                    variant="ghost"
                  >
                    {shareState.isLoading ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Share2 className="size-4" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Share progress with manager</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          <CollapsibleTrigger asChild>
            <Button size="sm" variant="ghost">
              {allCompleted ? "Hide" : "Show tasks"}
              <ChevronDownIcon className="ml-1 size-4" />
            </Button>
          </CollapsibleTrigger>
        </div>
      </div>

      {/* Progress Bar */}
      {!allCompleted && (
        <div className="px-6 pb-3">
          <Progress className="h-1.5" value={progressPercent} />
        </div>
      )}

      {/* Share URL Display */}
      {shareState.shareUrl && (
        <div className="px-6 pb-3">
          <div className="flex items-center gap-2 rounded-md bg-muted/50 p-2">
            <input
              className="flex-1 bg-transparent text-xs text-muted-foreground outline-none truncate"
              readOnly
              type="text"
              value={shareState.shareUrl}
            />
            <Button
              className="h-6 px-2"
              onClick={handleCopyUrl}
              size="sm"
              variant="ghost"
            >
              {shareState.copied ? (
                <Check className="size-3 text-green-500" />
              ) : (
                <Copy className="size-3" />
              )}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Share this link with your manager to show your onboarding progress
          </p>
        </div>
      )}

      {/* Error Display */}
      {shareState.error && (
        <div className="px-6 pb-3">
          <p className="text-xs text-destructive">{shareState.error}</p>
        </div>
      )}

      <Separator />

      {/* Content */}
      <CollapsibleContent>
        <div className="px-6 py-4">
          <ul className="space-y-3">
            {items.map((item) => (
              <li key={item.id}>
                <Link
                  className={cn(
                    "group flex items-start gap-3 rounded-lg p-2 transition-colors hover:bg-muted/50",
                    item.completed && "opacity-60"
                  )}
                  href={item.href}
                  onClick={() => onItemClick?.(item)}
                >
                  <div className="mt-0.5 flex-shrink-0">
                    {item.completed ? (
                      <CheckCircle2 className="size-5 text-green-500" />
                    ) : (
                      <Circle className="size-5 text-muted-foreground/50 group-hover:text-primary transition-colors" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div
                      className={cn(
                        "text-sm font-medium",
                        item.completed && "line-through text-muted-foreground"
                      )}
                    >
                      {item.label}
                    </div>
                    {item.description && (
                      <div className="text-muted-foreground text-xs mt-0.5">
                        {item.description}
                      </div>
                    )}
                  </div>
                  {!item.completed && item.icon && (
                    <div className="flex-shrink-0 text-muted-foreground/50 group-hover:text-foreground transition-colors">
                      {item.icon}
                    </div>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

/**
 * GettingStartedChecklistCompact - A more compact version for sidebars
 */
interface GettingStartedChecklistCompactProps {
  items: ChecklistItem[];
  className?: string;
  onItemClick?: (item: ChecklistItem) => void;
}

export function GettingStartedChecklistCompact({
  items,
  className,
  onItemClick,
}: GettingStartedChecklistCompactProps) {
  const completedCount = items.filter((item) => item.completed).length;
  const totalCount = items.length;
  const progressPercent =
    totalCount > 0 ? (completedCount / totalCount) * 100 : 0;
  const allCompleted = completedCount === totalCount && totalCount > 0;

  if (allCompleted) {
    return null; // Hide when all completed
  }

  return (
    <div className={cn("rounded-lg border bg-card p-4", className)}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Rocket className="size-4 text-primary" />
          <span className="font-medium text-sm">Getting Started</span>
        </div>
        <span className="text-muted-foreground text-xs">
          {completedCount}/{totalCount}
        </span>
      </div>
      <Progress className="h-1.5 mb-3" value={progressPercent} />
      <ul className="space-y-2">
        {items
          .filter((item) => !item.completed)
          .slice(0, 3)
          .map((item) => (
            <li key={item.id}>
              <Link
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                href={item.href}
                onClick={() => onItemClick?.(item)}
              >
                <Circle className="size-3" />
                <span className="truncate">{item.label}</span>
              </Link>
            </li>
          ))}
      </ul>
    </div>
  );
}
