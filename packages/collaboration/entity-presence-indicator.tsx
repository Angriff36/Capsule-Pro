"use client";

import { cn } from "@repo/design-system/lib/utils";
import { memo } from "react";

export interface EntityViewer {
  connectionId: number;
  name: string;
  color: string;
}

interface EntityPresenceIndicatorProps {
  /** Users currently viewing this entity */
  viewers: EntityViewer[];
  /** Maximum number of avatars to show before collapsing to +N */
  maxVisible?: number;
  /** Size of the avatar circles in pixels */
  size?: "sm" | "md" | "lg";
  /** Position of the indicator */
  position?: "top-left" | "top-right" | "bottom-left" | "bottom-right";
  /** CSS className for customization */
  className?: string;
}

const sizeClasses = {
  sm: "h-4 w-4 text-[10px]",
  md: "h-5 w-5 text-xs",
  lg: "h-6 w-6 text-sm",
};

const positionClasses = {
  "top-left": "top-1.5 left-1.5",
  "top-right": "top-1.5 right-1.5",
  "bottom-left": "bottom-1.5 left-1.5",
  "bottom-right": "bottom-1.5 right-1.5",
};

/**
 * Shows live presence indicators on an entity card.
 * Displays avatars of users currently viewing the entity,
 * collapsing to "+N" when there are more than maxVisible.
 */
function EntityPresenceIndicatorComponent({
  viewers,
  maxVisible = 3,
  size = "md",
  position = "top-right",
  className,
}: EntityPresenceIndicatorProps) {
  if (viewers.length === 0) {
    return null;
  }

  const visibleViewers = viewers.slice(0, maxVisible);
  const remainingCount = viewers.length - maxVisible;

  return (
    <div
      aria-label={`${viewers.length} user${viewers.length > 1 ? "s are" : " is"} viewing this entity`}
      className={cn(
        "absolute z-10 flex -space-x-1.5 rounded-full bg-background/90 p-0.5 shadow-sm backdrop-blur-sm transition-all",
        positionClasses[position],
        className
      )}
    >
      {visibleViewers.map((viewer) => (
        <div
          className={cn(
            "flex items-center justify-center rounded-full font-medium text-white transition-transform hover:scale-110",
            sizeClasses[size]
          )}
          key={viewer.connectionId}
          style={{
            backgroundColor: viewer.color,
            boxShadow: "0 0 0 2px hsl(var(--background))",
          }}
          title={viewer.name}
        >
          {getInitials(viewer.name)}
        </div>
      ))}
      {remainingCount > 0 && (
        <div
          className={cn(
            "flex items-center justify-center rounded-full bg-muted font-medium text-foreground",
            sizeClasses[size]
          )}
          style={{
            boxShadow: "0 0 0 2px hsl(var(--background))",
          }}
          title={`+${remainingCount} more viewer${remainingCount > 1 ? "s" : ""}`}
        >
          +{remainingCount}
        </div>
      )}
    </div>
  );
}

/**
 * Extract initials from a name for avatar display.
 * Handles single word, two words, and multi-word names.
 */
function getInitials(name: string): string {
  if (!name) {
    return "?";
  }

  const words = name.trim().split(/\s+/);
  if (words.length === 1) {
    // Single word: use first two letters if available
    return words[0]!.slice(0, 2).toUpperCase();
  }
  // Multiple words: use first letter of first two words
  return (words[0]![0] + words[1]![0]).toUpperCase();
}

export const EntityPresenceIndicator = memo(EntityPresenceIndicatorComponent);
