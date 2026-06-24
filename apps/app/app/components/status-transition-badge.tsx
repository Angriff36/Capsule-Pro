"use client";

/**
 * Interactive status badge with an inline FSM transition menu.
 *
 * Renders the entity's current status as a Badge that, on click, opens a dropdown
 * of the governed status transitions reachable from that state — letting a user
 * change status without opening the full detail view.
 *
 * The transition graph is NOT hard-coded here (constitution §4: the UI must not
 * encode the state machine). It is fetched from the IR-derived read projection at
 * `GET /api/manifest/{entity}/transitions?status=...`. The actual change is a
 * governed command dispatched through the canonical Manifest dispatcher via
 * `executeCommand` (constitution §5/§6).
 *
 * No guard dry-run exists, so a transition is offered inline only when its command
 * needs no required user input; transitions whose command requires input are shown
 * disabled with an explanatory native tooltip ("open detail to complete"). Guard
 * failures that only surface at dispatch time are reported via the runtime's
 * friendly-error toast.
 */

import { Badge } from "@repo/design-system/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@repo/design-system/components/ui/dropdown-menu";
import { ChevronDown } from "lucide-react";
import { useState } from "react";
import { apiUrl } from "@/app/lib/api";
import { useOptimisticCommand } from "@/app/lib/use-optimistic-command";

type BadgeVariant =
  | "default"
  | "secondary"
  | "outline"
  | "solid"
  | "destructive"
  | "success"
  | "warning"
  | "info"
  | "coral";

interface Transition {
  command: string | null;
  requiredParams: { name: string; type: string }[];
  requires: string[];
  to: string;
}

interface StatusTransitionBadgeProps {
  className?: string;
  /** Manifest entity name, e.g. "Invoice". */
  entity: string;
  /** Instance id to dispatch the command against. */
  id: string;
  /** Display text (defaults to the raw status). */
  label?: string;
  /** Called after a successful transition with the new status. */
  onChanged?: (toStatus: string) => void;
  /** Current status value. */
  status: string;
  /** Badge color variant. */
  variant?: BadgeVariant;
}

export function StatusTransitionBadge({
  entity,
  id,
  status,
  variant = "default",
  label,
  onChanged,
  className,
}: StatusTransitionBadgeProps) {
  const [transitions, setTransitions] = useState<Transition[] | null>(null);
  const [loading, setLoading] = useState(false);
  // Optimistic status: the badge shows the target status immediately on click
  // and reverts (with the runtime's friendly error) if the governed command
  // fails. `pending` gates the dropdown while a transition is in flight.
  const {
    value: displayedStatus,
    pending,
    run,
  } = useOptimisticCommand<string>(status);

  async function loadOnOpen(open: boolean) {
    if (!open || transitions !== null || loading) {
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(
        apiUrl(
          `/api/manifest/${encodeURIComponent(entity)}/transitions?status=${encodeURIComponent(status)}`
        ),
        { credentials: "include" }
      );
      const json = (await res.json()) as {
        result?: { available?: Transition[] };
        data?: { available?: Transition[] };
        available?: Transition[];
      };
      const available =
        json.result?.available ?? json.data?.available ?? json.available ?? [];
      setTransitions(available);
    } catch {
      setTransitions([]);
    } finally {
      setLoading(false);
    }
  }

  async function applyTransition(t: Transition) {
    if (!t.command || pending) {
      return;
    }
    const res = await run(
      entity,
      t.command,
      { id },
      {
        optimistic: t.to,
        successMessage: `Status changed to ${t.to}`,
        errorMessage: "Transition failed",
      }
    );
    if (res) {
      onChanged?.(t.to);
    }
  }

  return (
    <DropdownMenu onOpenChange={loadOnOpen}>
      <DropdownMenuTrigger asChild disabled={pending}>
        <button
          aria-label={`Change ${entity} status`}
          className="inline-flex cursor-pointer items-center disabled:cursor-not-allowed"
          type="button"
        >
          <Badge className={className} variant={variant}>
            {label ?? displayedStatus}
            <ChevronDown className="ml-1 h-3 w-3 opacity-60" />
          </Badge>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-52">
        <DropdownMenuLabel>Change status</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {loading && <DropdownMenuItem disabled>Loading…</DropdownMenuItem>}
        {!loading && transitions?.length === 0 && (
          <DropdownMenuItem disabled>No transitions available</DropdownMenuItem>
        )}
        {!loading &&
          transitions?.map((t) => {
            const needsInput = t.requiredParams.length > 0;
            const blocked = !t.command || needsInput;
            const reason = t.command
              ? needsInput
                ? `Open detail to complete — needs ${t.requiredParams
                    .map((p) => p.name)
                    .join(", ")}`
                : t.requires.join(" · ")
              : "No command defined for this transition";
            return (
              <DropdownMenuItem
                className="flex flex-col items-start gap-0.5"
                disabled={blocked || pending}
                key={t.to}
                onSelect={(e) => {
                  if (blocked) {
                    e.preventDefault();
                    return;
                  }
                  applyTransition(t);
                }}
                title={reason || undefined}
              >
                <span>→ {t.to}</span>
                {reason && (
                  <span className="text-muted-foreground text-xs">
                    {reason}
                  </span>
                )}
              </DropdownMenuItem>
            );
          })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
