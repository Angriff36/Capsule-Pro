"use client";

import { Badge } from "@repo/design-system/components/ui/badge";
import { cn } from "@repo/design-system/lib/utils";
import { StickyNote, Tag } from "lucide-react";
import { memo } from "react";
import type { ResolvedNote } from "../../types/entities";
import { ENTITY_TYPE_COLORS } from "../../types/entities";

interface NoteNodeCardProps {
  data: ResolvedNote;
  stale: boolean;
}

/** Color indicator mapping for note colors */
const noteColorIndicator: Record<string, string> = {
  yellow: "bg-amber-400",
  blue: "bg-blue-400",
  green: "bg-emerald-400",
  pink: "bg-pink-400",
  purple: "bg-purple-400",
  red: "bg-red-400",
  orange: "bg-orange-400",
};

export const NoteNodeCard = memo(function NoteNodeCard({
  data,
  stale,
}: NoteNodeCardProps) {
  const colors = ENTITY_TYPE_COLORS.note;
  const colorDot = data.color
    ? (noteColorIndicator[data.color] ?? "bg-stone-400")
    : null;

  return (
    <div className={cn("flex h-full flex-col", stale && "opacity-50")}>
      {/* Header */}
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <StickyNote className={cn("size-3.5 shrink-0", colors.icon)} />
          <span className={cn("font-medium text-xs", colors.text)}>Note</span>
          {colorDot && (
            <span
              className={cn("inline-block size-2 rounded-full", colorDot)}
            />
          )}
        </div>
      </div>

      {/* Title */}
      <h3 className="mb-1.5 line-clamp-2 font-semibold text-sm leading-tight">
        {data.title}
      </h3>

      {/* Content preview */}
      {data.content && (
        <p className="mb-1.5 line-clamp-3 text-muted-foreground text-xs leading-relaxed whitespace-pre-wrap">
          {data.content}
        </p>
      )}

      {/* Tags */}
      {data.tags.length > 0 && (
        <div className="mt-auto flex flex-wrap items-center gap-1">
          <Tag className="size-3 text-muted-foreground" />
          {data.tags.slice(0, 3).map((tag: string) => (
            <Badge
              className="text-[10px] px-1.5 py-0"
              key={tag}
              variant="secondary"
            >
              {tag}
            </Badge>
          ))}
          {data.tags.length > 3 && (
            <span className="text-muted-foreground text-[10px]">
              +{data.tags.length - 3}
            </span>
          )}
        </div>
      )}
    </div>
  );
});
