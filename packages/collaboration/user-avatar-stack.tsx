"use client";

import { cn } from "@repo/design-system/lib/utils";
import { memo } from "react";

export interface UserInfo {
  connectionId: number;
  name: string;
  color: string;
  avatarUrl?: string | null;
}

interface UserAvatarStackProps {
  /** Users to display */
  users: UserInfo[];
  /** Maximum number of avatars to show before +N overflow */
  maxVisible?: number;
  /** Size of each avatar */
  size?: "sm" | "md" | "lg";
  /** Whether to show names as tooltips */
  showNames?: boolean;
  /** CSS className for customization */
  className?: string;
  /** Position of the overflow count badge */
  overflowPosition?: "right" | "bottom";
}

const sizeStyles = {
  sm: {
    container: "h-6 w-6 text-xs",
    ring: "ring-1",
  },
  md: {
    container: "h-8 w-8 text-sm",
    ring: "ring-2",
  },
  lg: {
    container: "h-10 w-10 text-base",
    ring: "ring-2",
  },
};

/**
 * Displays a stack of user avatars with overflow indicator.
 * Commonly used in headers, panels, and presence indicators.
 */
function UserAvatarStackComponent({
  users,
  maxVisible = 3,
  size = "md",
  showNames = true,
  className,
  overflowPosition = "right",
}: UserAvatarStackProps) {
  if (users.length === 0) {
    return null;
  }

  const visibleUsers = users.slice(0, maxVisible);
  const remainingCount = users.length - maxVisible;
  const sizeStyle = sizeStyles[size];

  return (
    <div
      className={cn(
        "flex items-center",
        overflowPosition === "right" ? "-space-x-2" : "flex-col -space-y-2",
        className
      )}
    >
      {visibleUsers.map((user) => (
        <div
          className={cn(
            "relative flex shrink-0 items-center justify-center overflow-hidden rounded-full",
            sizeStyle.container,
            sizeStyle.ring,
            "ring-background transition-transform hover:scale-110 hover:z-10"
          )}
          key={user.connectionId}
          style={{
            backgroundColor: user.color,
          }}
          title={showNames ? user.name : undefined}
        >
          {user.avatarUrl ? (
            // biome-ignore lint/a11y/useAltText: User avatars with title text
            <img
              alt={user.name}
              className="h-full w-full object-cover"
              src={user.avatarUrl}
            />
          ) : (
            <span className="font-medium text-white">
              {getInitials(user.name)}
            </span>
          )}
        </div>
      ))}
      {remainingCount > 0 && (
        <div
          className={cn(
            "flex shrink-0 items-center justify-center rounded-full bg-muted text-foreground",
            sizeStyle.container,
            sizeStyle.ring,
            "ring-background"
          )}
          title={`+${remainingCount} more user${remainingCount > 1 ? "s" : ""}`}
        >
          +{remainingCount}
        </div>
      )}
    </div>
  );
}

/**
 * Extract initials from a name for avatar display.
 */
function getInitials(name: string): string {
  if (!name) {
    return "?";
  }

  const words = name.trim().split(/\s+/);
  if (words.length === 1) {
    return words[0]!.slice(0, 2).toUpperCase();
  }
  return (words[0]![0] + words[1]![0]).toUpperCase();
}

export const UserAvatarStack = memo(UserAvatarStackComponent);
