"use client";

import { Badge } from "@repo/design-system/components/ui/badge";
import { Button } from "@repo/design-system/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@repo/design-system/components/ui/dropdown-menu";
import { MoreVertical, StickyNote, Trash2 } from "lucide-react";
import { memo } from "react";
import type { CommandBoardCard } from "../../types";

interface NoteCardProps {
  card: CommandBoardCard;
}

const noteColorConfig = {
  yellow: {
    bg: "bg-amber-50",
    border: "border-amber-200",
    badge: "bg-amber-100 text-amber-700",
  },
  blue: {
    bg: "bg-blue-50",
    border: "border-blue-200",
    badge: "bg-blue-100 text-blue-700",
  },
  green: {
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    badge: "bg-emerald-100 text-emerald-700",
  },
  pink: {
    bg: "bg-pink-50",
    border: "border-pink-200",
    badge: "bg-pink-100 text-pink-700",
  },
  purple: {
    bg: "bg-purple-50",
    border: "border-purple-200",
    badge: "bg-purple-100 text-purple-700",
  },
};

const defaultColor = noteColorConfig.yellow;

export const NoteCard = memo(function NoteCard({ card }: NoteCardProps) {
  const metadata = card.metadata as {
    noteColor?: keyof typeof noteColorConfig;
  };
  const noteColor = metadata.noteColor ?? "yellow";
  const colorConfig = noteColorConfig[noteColor] ?? defaultColor;

  return (
    <div
      className={`flex h-full flex-col rounded-lg border-2 ${colorConfig.bg} ${colorConfig.border} shadow-sm`}
    >
      {/* Note header with title */}
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <StickyNote className="h-4 w-4 text-amber-600" />
          <Badge
            className={`border-0 ${colorConfig.badge} font-medium text-xs`}
          >
            Note
          </Badge>
        </div>
      </div>

      {/* Note title */}
      <h3 className="mb-2 line-clamp-2 font-semibold text-sm text-gray-900">
        {card.title}
      </h3>

      {/* Note content - main body of the sticky note */}
      <div className="mb-3 flex-1">
        {card.content ? (
          <p className="line-clamp-5 text-gray-700 text-xs leading-relaxed whitespace-pre-wrap">
            {card.content}
          </p>
        ) : (
          <p className="text-gray-400/60 text-xs italic">
            Empty note - click to add content
          </p>
        )}
      </div>

      {/* Note footer with timestamp and actions */}
      <div className="mt-auto flex items-center justify-between">
        {card.createdAt && (
          <span className="text-gray-500 text-[10px]">
            {new Date(card.createdAt).toLocaleDateString()}
          </span>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button className="h-7 w-7 p-0" size="sm" variant="ghost">
              <MoreVertical className="h-3.5 w-3.5 text-gray-600" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuItem>
              <StickyNote className="mr-2 h-4 w-4" />
              View Full Note
            </DropdownMenuItem>
            <DropdownMenuItem>Edit Content</DropdownMenuItem>
            <DropdownMenuItem>Change Color</DropdownMenuItem>
            <DropdownMenuItem className="text-destructive">
              <Trash2 className="mr-2 h-4 w-4" />
              Delete Note
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
});
