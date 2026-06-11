"use client";

import { useDroppable } from "@dnd-kit/core";
import { cn } from "@repo/design-system/lib/utils";
import type { CSSProperties, ReactNode } from "react";
import type { EventBoardData, PaletteStaff } from "../actions";
import type { BranchKey, BranchStatus } from "../templates";
import { StaffToken } from "./staff-token";

export const DRAG_HINT: Partial<Record<BranchKey, string>> = {
  staff: "drag staff here",
  menu: "drag a dish here",
  vehicles: "drag a vehicle here",
  equipment: "drag equipment here",
};

function hexToRgba(hex: string, alpha: number): string {
  const n = Number.parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

function chip(branch: BranchStatus): { text: string; className: string } {
  if (branch.state === "excluded") {
    return { text: "n/a", className: "text-muted-foreground/60" };
  }
  if (branch.state === "ready") {
    return {
      text: branch.needed > 0 ? `${branch.have}/${branch.needed} ✓` : "✓ ready",
      className: "text-emerald-600 dark:text-emerald-400",
    };
  }
  if (branch.state === "partial") {
    return {
      text: `${branch.have}/${branch.needed}`,
      className: "text-amber-600 dark:text-amber-400",
    };
  }
  if (branch.state === "missing") {
    return {
      text: `needs ${branch.needed}`,
      className: "text-amber-600 dark:text-amber-400",
    };
  }
  return { text: "—", className: "text-muted-foreground/60" };
}

/**
 * Leaf box shell: branch-colored outline + soft glow, amber dashed when a
 * required branch is still empty. Overflow stays visible so expanded tokens
 * can pop out of the box.
 */
export function LeafBox({
  branch,
  style,
  className,
  children,
}: {
  branch: BranchStatus;
  style?: CSSProperties;
  className?: string;
  children: ReactNode;
}) {
  const missing =
    branch.state === "missing" && branch.requirement === "required";
  const color = missing ? "#f59e0b" : branch.color;
  const c = chip(branch);
  return (
    <div
      className={cn(
        "absolute z-10 rounded-lg bg-background/70 p-2 backdrop-blur-[1px]",
        className
      )}
      id={`branch-leaf-${branch.key}`}
      style={{
        ...style,
        border: `1.5px ${missing ? "dashed" : "solid"} ${hexToRgba(color, missing ? 0.9 : 0.7)}`,
        boxShadow: `0 0 ${missing ? 12 : 8}px ${hexToRgba(color, missing ? 0.4 : 0.2)}`,
      }}
    >
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <span className="truncate text-[10px] font-semibold uppercase tracking-wide">
          {branch.label}
        </span>
        <span
          className={cn(
            "shrink-0 text-[10px] font-semibold tabular-nums",
            c.className
          )}
        >
          {c.text}
        </span>
      </div>
      {children}
    </div>
  );
}

/** Staff leaf body: the live "branch-staff" droppable + avatar tokens. */
export function StaffLeafBody({
  committedStaff,
  staffDrafts,
  conflictByCard,
  paletteById,
  expandedKey,
  toggle,
  onRemoveDraft,
  removing,
}: {
  committedStaff: EventBoardData["committedStaff"];
  staffDrafts: EventBoardData["draftCards"];
  conflictByCard: Map<string, string>;
  paletteById: Map<string, PaletteStaff>;
  expandedKey: string | null;
  toggle: (key: string) => void;
  onRemoveDraft: (cardId: string) => void;
  removing: boolean;
}) {
  const { isOver, setNodeRef } = useDroppable({ id: "branch-staff" });
  const empty = committedStaff.length === 0 && staffDrafts.length === 0;
  return (
    <div
      className={cn(
        "flex min-h-[44px] flex-wrap items-start gap-1.5 rounded-md p-1 transition-colors",
        isOver && "bg-indigo-500/10 ring-1 ring-indigo-500/50"
      )}
      ref={setNodeRef}
    >
      {committedStaff.map((staff) => {
        const key = `committed-${staff.staffMemberId}`;
        return (
          <StaffToken
            avatarUrl={staff.avatarUrl}
            expanded={expandedKey === key}
            hourlyRate={
              paletteById.get(staff.staffMemberId)?.hourlyRate ?? null
            }
            key={key}
            kind="committed"
            name={staff.name}
            onToggle={() => toggle(key)}
            role={staff.role}
            staffHref="/staff/team"
          />
        );
      })}
      {staffDrafts.map((card) => {
        const key = `draft-${card.cardId}`;
        const pal = paletteById.get(card.envelope.draftAction.entityId);
        const params = card.envelope.draftAction.params;
        return (
          <StaffToken
            avatarUrl={pal?.avatarUrl ?? null}
            conflictWith={conflictByCard.get(card.cardId)}
            expanded={expandedKey === key}
            hourlyRate={pal?.hourlyRate ?? null}
            key={key}
            kind="draft"
            name={card.title}
            onRemove={() => onRemoveDraft(card.cardId)}
            onToggle={() => toggle(key)}
            removing={removing}
            role={params.role ?? pal?.role ?? ""}
            shiftEnd={params.shiftEnd}
            shiftStart={params.shiftStart}
          />
        );
      })}
      {empty && (
        <p className="px-1 py-2 text-[11px] text-muted-foreground">
          {DRAG_HINT.staff}
        </p>
      )}
    </div>
  );
}
