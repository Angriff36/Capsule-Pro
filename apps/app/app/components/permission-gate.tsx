"use client";

/**
 * Wraps an action the current user's role cannot perform and, instead of hiding
 * it, DIMS it to 50% opacity and explains — on hover — what role is required.
 * Restricted users discover the permission model (and where to get access)
 * rather than hitting silent failures or 403s on a button that simply vanished.
 *
 * Presentation only: this never decides authorization. The wrapped control's
 * real guard stays server-side (route/runtime). When the user DOES meet the
 * requirement, the children render untouched with zero wrapper overhead.
 *
 * For admin-gated actions the dimmed control becomes a link to tenant settings
 * (where roles are managed); manager-gated actions show a contact-admin prompt.
 */

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@repo/design-system/components/ui/tooltip";
import { cn } from "@repo/design-system/lib/utils";
import Link from "next/link";
import type { ReactNode } from "react";
import { meetsRole, type RoleTier, roleTierLabel } from "@/app/lib/roles";

interface PermissionGateProps {
  /** Human phrase completing "Requires {Role} role to {action}." e.g. "approve invoices". */
  action: string;
  /** Minimum role tier required to use the wrapped control. */
  allow: RoleTier;
  children: ReactNode;
  className?: string;
  /** Where an admin can manage roles. Only used for admin-gated actions. */
  settingsHref?: string;
  /** Current user's role (e.g. from `requireCurrentUser().role`). */
  userRole: string | undefined;
}

export function PermissionGate({
  action,
  allow,
  children,
  className,
  settingsHref = "/settings/team",
  userRole,
}: PermissionGateProps) {
  // Permitted: render the real control with no wrapper, no behavior change.
  if (meetsRole(userRole, allow)) {
    return <>{children}</>;
  }

  const roleLabel = roleTierLabel(allow);
  const isAdminGated = allow === "admin";

  // Dimmed, non-interactive children; the wrapper handles hover + (admin) navigation.
  const dimmed = (
    <span className="pointer-events-none opacity-50">{children}</span>
  );

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {isAdminGated ? (
          <Link
            aria-disabled="true"
            className={cn("inline-flex cursor-pointer", className)}
            href={settingsHref}
          >
            {dimmed}
          </Link>
        ) : (
          <span
            aria-disabled="true"
            className={cn("inline-flex cursor-not-allowed", className)}
          >
            {dimmed}
          </span>
        )}
      </TooltipTrigger>
      <TooltipContent className="max-w-xs">
        <p>
          Requires {roleLabel} role to {action}.
        </p>
        <p className="mt-1 text-background/70">
          {isAdminGated
            ? "Open tenant settings to manage roles."
            : "Ask an administrator to grant access."}
        </p>
      </TooltipContent>
    </Tooltip>
  );
}
