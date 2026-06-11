"use client";

import { cn } from "@repo/design-system/lib/utils";
import { TriangleAlert } from "lucide-react";
import type { BoardStatus, BranchState, BranchStatus } from "../templates";

const BAR_COLOR: Record<BranchState, string> = {
  ready: "bg-emerald-500",
  partial: "bg-amber-500",
  missing: "bg-amber-500",
  optional: "bg-muted-foreground/40",
  excluded: "bg-transparent",
};

function barPercent(branch: BranchStatus): number {
  if (branch.state === "excluded") {
    return 0;
  }
  if (branch.needed <= 0) {
    return branch.have > 0 ? 100 : 0;
  }
  return Math.min(100, Math.round((branch.have / branch.needed) * 100));
}

function countLabel(branch: BranchStatus): string {
  if (branch.state === "excluded") {
    return "n/a";
  }
  if (branch.state === "ready") {
    return branch.needed > 0 ? `${branch.have}/${branch.needed} ✓` : "✓";
  }
  if (branch.needed > 0) {
    return `${branch.have}/${branch.needed}`;
  }
  return branch.have > 0 ? `${branch.have}` : "—";
}

/** Pure presentational branch-completeness outline (left pane, above palette). */
export function TreeOutline({ status }: { status: BoardStatus }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-muted-foreground text-xs uppercase tracking-wide">
          Outline
        </h3>
        <span className="font-semibold text-xs tabular-nums">
          {status.readyPercent}% ready
        </span>
      </div>
      <ul className="space-y-2">
        {status.branches.map((branch) => (
          <li
            className={cn(branch.state === "excluded" && "opacity-40")}
            key={branch.key}
          >
            <button
              className="w-full space-y-1 rounded-md px-1 py-0.5 text-left transition-colors hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              onClick={() =>
                document
                  .getElementById(`branch-leaf-${branch.key}`)
                  ?.scrollIntoView({ behavior: "smooth", block: "center" })
              }
              title={`Show ${branch.label} on the canvas`}
              type="button"
            >
              <span className="flex items-center justify-between gap-2 text-sm">
                <span className="flex items-center gap-1.5 truncate">
                  <span
                    aria-hidden
                    className="inline-block h-2 w-2 shrink-0 rounded-full"
                    style={{ backgroundColor: branch.color }}
                  />
                  {branch.label}
                  {branch.state === "missing" && (
                    <TriangleAlert className="h-3.5 w-3.5 text-amber-500" />
                  )}
                </span>
                <span
                  className={cn(
                    "shrink-0 text-xs tabular-nums",
                    branch.state === "ready"
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-muted-foreground"
                  )}
                >
                  {countLabel(branch)}
                </span>
              </span>
              <span className="block h-1 w-full overflow-hidden rounded-full bg-muted">
                <span
                  className={cn(
                    "block h-full rounded-full",
                    BAR_COLOR[branch.state]
                  )}
                  style={{ width: `${barPercent(branch)}%` }}
                />
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
