"use client";

import { useDraggable } from "@dnd-kit/core";
import { Input } from "@repo/design-system/components/ui/input";
import { cn } from "@repo/design-system/lib/utils";
import { GripVertical, Search } from "lucide-react";
import { useMemo, useState } from "react";
import type { PaletteStaff } from "../actions";

/** Shared initials fallback for avatar circles (also used by staff tokens). */
export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function PaletteRow({ staff }: { staff: PaletteStaff }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `staff-${staff.id}`,
    data: { staff },
  });

  return (
    <li
      className={cn(
        "flex cursor-grab items-center gap-2 rounded-lg border border-border/60 bg-background px-2 py-1.5",
        "transition-colors hover:border-border hover:bg-accent/50 active:cursor-grabbing",
        isDragging && "opacity-50"
      )}
      ref={setNodeRef}
      {...listeners}
      {...attributes}
    >
      {staff.avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          alt=""
          className="h-7 w-7 shrink-0 rounded-full object-cover"
          src={staff.avatarUrl}
        />
      ) : (
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-500/15 text-[10px] font-semibold text-indigo-600 dark:text-indigo-400">
          {initials(staff.name)}
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium leading-tight">
          {staff.name}
        </span>
        <span className="block truncate text-xs text-muted-foreground leading-tight">
          {staff.role}
        </span>
      </span>
      <GripVertical className="h-3.5 w-3.5 shrink-0 text-muted-foreground/50" />
    </li>
  );
}

/** Drag palette (left pane, below the outline). Staff only for now. */
export function Palette({ palette }: { palette: PaletteStaff[] }) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return palette;
    return palette.filter(
      (s) =>
        s.name.toLowerCase().includes(q) || s.role.toLowerCase().includes(q)
    );
  }, [palette, search]);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Staff
      </h3>
      <div className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="h-8 pl-8 text-sm"
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search staff…"
          value={search}
        />
      </div>
      <ul className="min-h-0 flex-1 space-y-1.5 overflow-y-auto pr-1">
        {filtered.map((staff) => (
          <PaletteRow key={staff.id} staff={staff} />
        ))}
        {filtered.length === 0 && (
          <li className="py-4 text-center text-xs text-muted-foreground">
            No staff match “{search}”
          </li>
        )}
      </ul>
      <div className="space-y-1 border-t border-border/60 pt-2">
        {["Menus", "Vehicles", "Equipment"].map((section) => (
          <p
            className="rounded-md px-2 py-1 text-xs text-muted-foreground/60"
            key={section}
          >
            {section} — next up
          </p>
        ))}
      </div>
    </div>
  );
}
