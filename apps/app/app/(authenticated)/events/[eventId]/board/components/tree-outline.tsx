import { TriangleAlert } from "lucide-react";
import { cn } from "@repo/design-system/lib/utils";
import type { BoardStatus, BranchState, BranchStatus } from "../templates";

const BAR_COLOR: Record<BranchState, string> = {
  ready: "bg-emerald-500",
  partial: "bg-amber-500",
  missing: "bg-amber-500",
  optional: "bg-muted-foreground/40",
  excluded: "bg-transparent",
};

function barPercent(branch: BranchStatus): number {
  if (branch.state === "excluded") return 0;
  if (branch.needed <= 0) return branch.have > 0 ? 100 : 0;
  return Math.min(100, Math.round((branch.have / branch.needed) * 100));
}

function countLabel(branch: BranchStatus): string {
  if (branch.state === "excluded") return "n/a";
  if (branch.state === "ready") return branch.needed > 0 ? `${branch.have}/${branch.needed} ✓` : "✓";
  if (branch.needed > 0) return `${branch.have}/${branch.needed}`;
  return branch.have > 0 ? `${branch.have}` : "—";
}

/** Pure presentational branch-completeness outline (left pane, above palette). */
export function TreeOutline({ status }: { status: BoardStatus }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Outline
        </h3>
        <span className="text-xs font-semibold tabular-nums">
          {status.readyPercent}% ready
        </span>
      </div>
      <ul className="space-y-2">
        {status.branches.map((branch) => (
          <li
            className={cn(
              "space-y-1",
              branch.state === "excluded" && "opacity-40"
            )}
            key={branch.key}
          >
            <div className="flex items-center justify-between gap-2 text-sm">
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
            </div>
            <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
              <div
                className={cn("h-full rounded-full", BAR_COLOR[branch.state])}
                style={{ width: `${barPercent(branch)}%` }}
              />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
