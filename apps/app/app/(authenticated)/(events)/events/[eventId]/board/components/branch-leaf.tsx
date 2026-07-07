"use client";

import { useDroppable } from "@dnd-kit/core";
import { cn } from "@repo/design-system/lib/utils";
import { UtensilsCrossed, X } from "lucide-react";
import type { CSSProperties, ReactNode } from "react";
import type { EventBoardData, PaletteStaff } from "../actions";
import type { BranchKey, BranchStatus } from "../templates";
import { StaffToken } from "./staff-token";

export const DRAG_HINT: Partial<Record<BranchKey, string>> = {
  staff: "drag staff here",
  menu: "drag a dish here",
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
 * required branch is still empty. `highlight` pulses the box while a
 * compatible palette item is being dragged. Overflow stays visible so
 * expanded tokens can pop out of the box.
 */
export function LeafBox({
  branch,
  style,
  className,
  highlight = false,
  children,
}: {
  branch: BranchStatus;
  style?: CSSProperties;
  className?: string;
  /** True while a drag that can drop on this branch is in flight. */
  highlight?: boolean;
  children: ReactNode;
}) {
  const missing =
    branch.state === "missing" && branch.requirement === "required";
  const color = missing ? "#f59e0b" : branch.color;
  const c = chip(branch);
  return (
    <div
      className={cn(
        "absolute z-10 rounded-lg bg-background/80 p-2.5 backdrop-blur-[2px] transition-shadow",
        highlight && "animate-pulse",
        className
      )}
      id={`branch-leaf-${branch.key}`}
      style={{
        ...style,
        border: `1.5px ${missing ? "dashed" : "solid"} ${hexToRgba(color, missing ? 0.9 : 0.7)}`,
        boxShadow: highlight
          ? `0 0 20px ${hexToRgba(branch.color, 0.55)}`
          : `0 0 ${missing ? 12 : 8}px ${hexToRgba(color, missing ? 0.4 : 0.2)}`,
      }}
    >
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <span className="truncate font-semibold text-[10px] uppercase tracking-wide">
          {branch.label}
        </span>
        <span
          className={cn(
            "shrink-0 font-semibold text-[10px] tabular-nums",
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
        isOver && "bg-indigo-500/15 ring-2 ring-indigo-500/60"
      )}
      ref={setNodeRef}
    >
      {committedStaff.map((staff) => {
        const key = `committed-${staff.id}`;
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

/** Menu leaf body: the "branch-menu" droppable + committed dish rows + dish drafts. */
export function MenuLeafBody({
  committedDishes,
  dishDrafts,
  onRemoveDraft,
  removing,
}: {
  committedDishes: EventBoardData["committedDishes"];
  dishDrafts: EventBoardData["draftCards"];
  onRemoveDraft: (cardId: string) => void;
  removing: boolean;
}) {
  const { isOver, setNodeRef } = useDroppable({ id: "branch-menu" });
  const empty = committedDishes.length === 0 && dishDrafts.length === 0;
  return (
    <div
      className={cn(
        "flex min-h-[44px] flex-col gap-1 rounded-md p-1 transition-colors",
        isOver && "bg-pink-500/15 ring-2 ring-pink-500/60"
      )}
      ref={setNodeRef}
    >
      {committedDishes.map((dish) => (
        <div
          className="flex items-center gap-1.5 text-xs"
          key={dish.eventDishId}
        >
          <UtensilsCrossed className="h-3 w-3 shrink-0 text-pink-500/80" />
          <span className="min-w-0 flex-1 truncate">{dish.name}</span>
          <span className="shrink-0 text-[10px] text-muted-foreground tabular-nums">
            {dish.course && `${dish.course} · `}×{dish.quantityServings}
          </span>
          <span
            aria-hidden
            className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500"
            title="committed"
          />
        </div>
      ))}
      {dishDrafts.map((card) => {
        const params = card.envelope.draftAction.params;
        return (
          <div
            className="flex items-center gap-1.5 rounded border border-amber-500/60 border-dashed px-1 py-0.5 text-xs"
            key={card.cardId}
          >
            <UtensilsCrossed className="h-3 w-3 shrink-0 text-pink-500/80" />
            <span className="min-w-0 flex-1 truncate">{card.title}</span>
            <span className="shrink-0 text-[10px] text-muted-foreground tabular-nums">
              {params.course && `${params.course} · `}×
              {params.quantityServings ?? "?"}
            </span>
            <button
              aria-label={`Remove draft: ${card.title}`}
              className="shrink-0 rounded p-0.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
              disabled={removing}
              onClick={() => onRemoveDraft(card.cardId)}
              type="button"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        );
      })}
      {empty && (
        <p className="px-1 py-2 text-[11px] text-muted-foreground">
          {DRAG_HINT.menu}
        </p>
      )}
    </div>
  );
}
