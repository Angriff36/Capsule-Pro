"use client";

import { cn } from "@repo/design-system/lib/utils";
import { TriangleAlert } from "lucide-react";
import Link from "next/link";
import { initials } from "./palette";

export interface StaffTokenProps {
  avatarUrl: string | null;
  /** Label of the conflicting commitment, when the impact check flagged one. */
  conflictWith?: string;
  expanded: boolean;
  /** Fixed-2 string (e.g. "24.50") when known. */
  hourlyRate?: string | null;
  kind: "draft" | "committed";
  name: string;
  /** Draft-only: remove the underlying draft card. */
  onRemove?: () => void;
  onToggle: () => void;
  removing?: boolean;
  role: string;
  shiftEnd?: string;
  /** ISO strings. */
  shiftStart?: string;
  staffHref?: string;
}

function formatShift(startIso: string, endIso: string): string {
  const start = new Date(startIso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
  const end = new Date(endIso).toLocaleString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
  return `${start} – ${end}`;
}

/**
 * 36px avatar token inside a leaf box. Amber dashed ring = draft, green dot =
 * committed, red ⚠ badge = conflict. Click expands into a mini card; the
 * parent (tree-canvas) enforces single-expansion.
 */
export function StaffToken(props: StaffTokenProps) {
  const { kind, name, avatarUrl, conflictWith, expanded, onToggle } = props;
  return (
    <span className="relative inline-flex">
      <button
        aria-expanded={expanded}
        aria-label={`${kind === "draft" ? "Draft" : "Committed"}: ${name}`}
        className={cn(
          "relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-transform hover:scale-105",
          kind === "draft" &&
            "outline-dashed outline-2 outline-amber-500 outline-offset-1"
        )}
        onClick={onToggle}
        type="button"
      >
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            alt=""
            className="h-9 w-9 rounded-full object-cover"
            src={avatarUrl}
          />
        ) : (
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-500/15 font-semibold text-[11px] text-indigo-600 dark:text-indigo-400">
            {initials(name)}
          </span>
        )}
        {kind === "committed" && (
          <span
            aria-hidden
            className="absolute -right-0.5 -bottom-0.5 h-2.5 w-2.5 rounded-full border-2 border-background bg-emerald-500"
          />
        )}
        {conflictWith && (
          <span
            aria-hidden
            className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive"
          >
            <TriangleAlert className="h-2.5 w-2.5 text-destructive-foreground" />
          </span>
        )}
      </button>
      {expanded && <ExpandedCard {...props} />}
    </span>
  );
}

function ExpandedCard(props: StaffTokenProps) {
  return (
    <div className="absolute top-full left-1/2 z-20 mt-2 w-[220px] -translate-x-1/2 rounded-lg border border-border bg-popover p-3 text-left shadow-lg">
      <p className="truncate font-semibold text-sm">{props.name}</p>
      <p className="truncate text-muted-foreground text-xs">
        {props.role || "—"}
      </p>
      {props.shiftStart && props.shiftEnd && (
        <p className="mt-1.5 text-xs tabular-nums">
          {formatShift(props.shiftStart, props.shiftEnd)}
        </p>
      )}
      {props.hourlyRate && (
        <p className="text-muted-foreground text-xs">${props.hourlyRate}/hr</p>
      )}
      {props.conflictWith && (
        <p className="mt-1.5 flex items-center gap-1 font-medium text-destructive text-xs">
          <TriangleAlert className="h-3 w-3 shrink-0" />
          conflicts with {props.conflictWith}
        </p>
      )}
      <div className="mt-2 flex items-center justify-between gap-2">
        {props.kind === "draft" && props.onRemove ? (
          <button
            className="rounded-md border border-destructive/40 px-2 py-1 font-medium text-destructive text-xs transition-colors hover:bg-destructive/10 disabled:opacity-50"
            disabled={props.removing}
            onClick={props.onRemove}
            type="button"
          >
            Remove draft
          </button>
        ) : (
          <span />
        )}
        {props.staffHref && (
          <Link
            className="font-medium text-primary text-xs hover:underline"
            href={props.staffHref}
          >
            Profile →
          </Link>
        )}
      </div>
    </div>
  );
}
