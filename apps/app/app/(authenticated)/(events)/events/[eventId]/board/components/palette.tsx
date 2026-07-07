"use client";

import { useDraggable } from "@dnd-kit/core";
import { Input } from "@repo/design-system/components/ui/input";
import { cn } from "@repo/design-system/lib/utils";
import { GripVertical, Search, UtensilsCrossed } from "lucide-react";
import { useMemo, useState } from "react";
import type { PaletteDish, PaletteStaff } from "../actions";

/** Discriminated drag payload shared by palette rows, DndContext and the ghost. */
export type DragItem =
  | { kind: "staff"; staff: PaletteStaff }
  | { kind: "dish"; dish: PaletteDish };

/** Shared initials fallback for avatar circles (also used by staff tokens). */
export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function StaffAvatar({ staff }: { staff: PaletteStaff }) {
  if (staff.avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        alt=""
        className="h-7 w-7 shrink-0 rounded-full object-cover"
        src={staff.avatarUrl}
      />
    );
  }
  return (
    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-500/15 font-semibold text-[10px] text-indigo-600 dark:text-indigo-400">
      {initials(staff.name)}
    </span>
  );
}

function rowClasses(isDragging: boolean): string {
  return cn(
    "flex cursor-grab items-center gap-2 rounded-lg border border-border/60 bg-background px-2 py-1.5",
    "transition-colors hover:border-border hover:bg-accent/50 active:cursor-grabbing",
    // The original row stays as a dimmed outline while the DragOverlay ghost
    // follows the cursor.
    isDragging && "border-dashed opacity-40"
  );
}

function PaletteStaffRow({ staff }: { staff: PaletteStaff }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `staff-${staff.id}`,
    data: { kind: "staff", staff } satisfies DragItem,
  });

  return (
    <li
      className={rowClasses(isDragging)}
      ref={setNodeRef}
      {...listeners}
      {...attributes}
    >
      <StaffAvatar staff={staff} />
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium text-sm leading-tight">
          {staff.name}
        </span>
        <span className="block truncate text-muted-foreground text-xs leading-tight">
          {staff.role}
        </span>
      </span>
      <GripVertical className="h-3.5 w-3.5 shrink-0 text-muted-foreground/50" />
    </li>
  );
}

function PaletteDishRow({ dish }: { dish: PaletteDish }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `dish-${dish.id}`,
    data: { kind: "dish", dish } satisfies DragItem,
  });

  return (
    <li
      className={rowClasses(isDragging)}
      ref={setNodeRef}
      {...listeners}
      {...attributes}
    >
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-pink-500/15">
        <UtensilsCrossed className="h-3.5 w-3.5 text-pink-600 dark:text-pink-400" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium text-sm leading-tight">
          {dish.name}
        </span>
        <span className="block truncate text-muted-foreground text-xs leading-tight">
          {dish.category || "uncategorized"}
          {dish.pricePerPerson && ` · $${dish.pricePerPerson}/pp`}
        </span>
      </span>
      <GripVertical className="h-3.5 w-3.5 shrink-0 text-muted-foreground/50" />
    </li>
  );
}

/**
 * Cursor-following preview rendered inside DragOverlay. Slight tilt + shadow
 * make the "you are holding this" state unmistakable.
 */
export function DragGhost({ item }: { item: DragItem }) {
  return (
    <div className="pointer-events-none flex w-56 rotate-2 items-center gap-2 rounded-lg border border-primary/50 bg-background px-2 py-1.5 shadow-xl ring-2 ring-primary/20">
      {item.kind === "staff" ? (
        <>
          <StaffAvatar staff={item.staff} />
          <span className="min-w-0 flex-1">
            <span className="block truncate font-medium text-sm leading-tight">
              {item.staff.name}
            </span>
            <span className="block truncate text-muted-foreground text-xs leading-tight">
              {item.staff.role}
            </span>
          </span>
        </>
      ) : (
        <>
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-pink-500/15">
            <UtensilsCrossed className="h-3.5 w-3.5 text-pink-600 dark:text-pink-400" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate font-medium text-sm leading-tight">
              {item.dish.name}
            </span>
            <span className="block truncate text-muted-foreground text-xs leading-tight">
              {item.dish.category || "dish"}
            </span>
          </span>
        </>
      )}
    </div>
  );
}

/** Drag palette (left pane, below the outline): staff + dishes. */
export function Palette({
  palette,
  dishPalette,
}: {
  palette: PaletteStaff[];
  dishPalette: PaletteDish[];
}) {
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<"staff" | "dishes">("staff");

  const filteredStaff = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) {
      return palette;
    }
    return palette.filter(
      (s) =>
        s.name.toLowerCase().includes(q) || s.role.toLowerCase().includes(q)
    );
  }, [palette, search]);

  const filteredDishes = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) {
      return dishPalette;
    }
    return dishPalette.filter(
      (d) =>
        d.name.toLowerCase().includes(q) || d.category.toLowerCase().includes(q)
    );
  }, [dishPalette, search]);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      <div className="flex items-center gap-1 rounded-md bg-muted/60 p-0.5">
        {(
          [
            ["staff", `Staff (${palette.length})`],
            ["dishes", `Dishes (${dishPalette.length})`],
          ] as const
        ).map(([key, label]) => (
          <button
            className={cn(
              "flex-1 rounded px-2 py-1 font-medium text-xs transition-colors",
              tab === key
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
            key={key}
            onClick={() => setTab(key)}
            type="button"
          >
            {label}
          </button>
        ))}
      </div>
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="h-8 pl-8 text-sm"
          onChange={(e) => setSearch(e.target.value)}
          placeholder={tab === "staff" ? "Search staff…" : "Search dishes…"}
          value={search}
        />
      </div>
      <ul className="min-h-0 flex-1 space-y-1.5 overflow-y-auto pr-1">
        {tab === "staff" &&
          filteredStaff.map((staff) => (
            <PaletteStaffRow key={staff.id} staff={staff} />
          ))}
        {tab === "dishes" &&
          filteredDishes.map((dish) => (
            <PaletteDishRow dish={dish} key={dish.id} />
          ))}
        {((tab === "staff" && filteredStaff.length === 0) ||
          (tab === "dishes" && filteredDishes.length === 0)) && (
          <li className="py-4 text-center text-muted-foreground text-xs">
            {search ? `No ${tab} match “${search}”` : `No ${tab} yet`}
          </li>
        )}
      </ul>
    </div>
  );
}
