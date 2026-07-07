"use client";

import { Badge } from "@repo/design-system/components/ui/badge";
import { Sparkles, TriangleAlert, UtensilsCrossed } from "lucide-react";
import type { StaffImpact } from "../impact";

export interface ImpactRailProps {
  /** Display-ready conflict rows, mapped from ids by the parent. */
  conflictRows?: Array<{ key: string; text: string }>;
  dishDraftCount: number;
  impact: StaffImpact | undefined;
  impactLoading: boolean;
  /** Display-ready names of staff with no hourly rate on file. */
  missingRateNames?: string[];
  staffDraftCount: number;
}

/**
 * Right-pane impact rail. Purely presentational — the parent maps staff ids to
 * names and passes display-ready rows.
 */
export function ImpactRail({
  impact,
  impactLoading,
  staffDraftCount,
  dishDraftCount,
  missingRateNames = [],
  conflictRows = [],
}: ImpactRailProps) {
  const draftCount = staffDraftCount + dishDraftCount;
  return (
    <div className="flex flex-col gap-5">
      <section>
        <h3 className="mb-2 font-semibold text-muted-foreground text-xs uppercase tracking-wide">
          Draft impact
        </h3>
        {draftCount === 0 ? (
          <p className="text-muted-foreground text-xs">
            Drag staff or dishes onto the tree to stage drafts.
          </p>
        ) : (
          <div className="space-y-3">
            {staffDraftCount > 0 &&
              (impactLoading || !impact ? (
                <ImpactSkeleton />
              ) : (
                <>
                  <div>
                    <p className="font-semibold text-2xl tabular-nums tracking-tight">
                      +${impact.laborCost}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      draft labor cost
                    </p>
                  </div>
                  <dl className="flex items-center justify-between text-sm">
                    <dt className="text-muted-foreground">Total hours</dt>
                    <dd className="font-medium tabular-nums">
                      {impact.totalHours.toFixed(1)}
                    </dd>
                  </dl>
                  {missingRateNames.length > 0 && (
                    <p className="text-amber-600/80 text-xs dark:text-amber-400/80">
                      No rate on file: {missingRateNames.join(", ")}
                    </p>
                  )}
                </>
              ))}
            {dishDraftCount > 0 && (
              <dl className="flex items-center justify-between text-sm">
                <dt className="flex items-center gap-1.5 text-muted-foreground">
                  <UtensilsCrossed className="h-3.5 w-3.5" />
                  Menu additions
                </dt>
                <dd className="font-medium tabular-nums">{dishDraftCount}</dd>
              </dl>
            )}
            {conflictRows.length > 0 && (
              <ul className="space-y-1.5">
                {conflictRows.map((row) => (
                  <li
                    className="flex items-start gap-1.5 rounded-md bg-destructive/10 px-2 py-1.5 font-medium text-destructive text-xs"
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
        <h3 className="mb-2 flex items-center justify-between font-semibold text-muted-foreground text-xs uppercase tracking-wide">
          AI assistant
          <Badge className="font-normal text-[10px]" variant="outline">
            coming soon
          </Badge>
        </h3>
        <div className="relative overflow-hidden rounded-lg border border-violet-400/30 bg-gradient-to-br from-violet-500/10 via-transparent to-cyan-400/10 p-3">
          <div className="flex items-start gap-2.5">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-violet-500/15">
              <Sparkles className="h-3.5 w-3.5 text-violet-500" />
            </span>
            <div className="min-w-0 space-y-1.5">
              <p className="font-medium text-sm">Staging copilot</p>
              <p className="text-muted-foreground text-xs leading-relaxed">
                Soon you'll be able to ask for a full staffing and menu draft —
                "staff this like the Hendersons' wedding" — and review it on the
                tree before committing.
              </p>
            </div>
          </div>
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
