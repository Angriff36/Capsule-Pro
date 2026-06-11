"use client";

import { TriangleAlert } from "lucide-react";
import type { StaffImpact } from "../impact";

export interface ImpactRailProps {
  impact: StaffImpact | undefined;
  impactLoading: boolean;
  draftCount: number;
  /** Display-ready names of staff with no hourly rate on file. */
  missingRateNames?: string[];
  /** Display-ready conflict rows, mapped from ids by the parent. */
  conflictRows?: Array<{ key: string; text: string }>;
}

/**
 * Right-pane impact rail. Purely presentational — the parent maps staff ids to
 * names and passes display-ready rows.
 */
export function ImpactRail({
  impact,
  impactLoading,
  draftCount,
  missingRateNames = [],
  conflictRows = [],
}: ImpactRailProps) {
  return (
    <div className="flex flex-col gap-5">
      <section>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Draft impact
        </h3>
        {draftCount === 0 ? (
          <p className="text-xs text-muted-foreground">
            Drag staff onto the tree to stage drafts.
          </p>
        ) : impactLoading || !impact ? (
          <ImpactSkeleton />
        ) : (
          <div className="space-y-3">
            <div>
              <p className="text-2xl font-semibold tabular-nums tracking-tight">
                +${impact.laborCost}
              </p>
              <p className="text-xs text-muted-foreground">draft labor cost</p>
            </div>
            <dl className="flex items-center justify-between text-sm">
              <dt className="text-muted-foreground">Total hours</dt>
              <dd className="font-medium tabular-nums">
                {impact.totalHours.toFixed(1)}
              </dd>
            </dl>
            {missingRateNames.length > 0 && (
              <p className="text-xs text-amber-600/80 dark:text-amber-400/80">
                No rate on file: {missingRateNames.join(", ")}
              </p>
            )}
            {conflictRows.length > 0 && (
              <ul className="space-y-1.5">
                {conflictRows.map((row) => (
                  <li
                    className="flex items-start gap-1.5 rounded-md bg-destructive/10 px-2 py-1.5 text-xs font-medium text-destructive"
                    key={row.key}
                  >
                    <TriangleAlert className="mt-0.5 h-3 w-3 shrink-0" />
                    <span>{row.text}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </section>

      <section>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          AI assistant
        </h3>
        <div className="rounded-lg border border-dashed border-border p-3 opacity-50">
          <p className="text-xs text-muted-foreground">
            AI staging arrives in a later release.
          </p>
        </div>
      </section>
    </div>
  );
}

function ImpactSkeleton() {
  return (
    <div aria-hidden className="space-y-2">
      <div className="h-7 w-24 animate-pulse rounded-md bg-muted" />
      <div className="h-4 w-full animate-pulse rounded-md bg-muted" />
      <div className="h-4 w-2/3 animate-pulse rounded-md bg-muted" />
    </div>
  );
}
