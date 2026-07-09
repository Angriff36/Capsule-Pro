"use client";

import { Badge } from "@repo/design-system/components/ui/badge";
import { CheckCircle2, Flag, MessageSquare } from "lucide-react";
import type { PrepListItem } from "../types";

export interface SwipeState {
  isSwiping: boolean;
  itemId: string;
  translateX: number;
}

interface PrepItemCardProps {
  item: PrepListItem;
  onToggleComplete: (item: PrepListItem) => void;
  onTouchEnd: (item: PrepListItem) => void;
  onTouchMove: (e: React.TouchEvent, itemId: string) => void;
  onTouchStart: (e: React.TouchEvent, itemId: string) => void;
  swipeState: SwipeState | null;
}

export function PrepItemCard({
  item,
  swipeState,
  onToggleComplete,
  onTouchStart,
  onTouchMove,
  onTouchEnd,
}: PrepItemCardProps) {
  const isThisSwiping = swipeState?.itemId === item.id && swipeState.isSwiping;
  const translateX = swipeState?.itemId === item.id ? swipeState.translateX : 0;

  return (
    <div
      className="relative"
      style={{ touchAction: isThisSwiping ? "pan-y" : "auto" }}
    >
      <div
        className="absolute inset-y-0 right-0 flex items-center justify-center rounded-xl bg-amber-500 px-6"
        style={{ opacity: Math.min(1, Math.abs(translateX) / 80) }}
      >
        <MessageSquare className="h-6 w-6 text-white" />
      </div>

      <button
        className={`flex w-full items-center gap-3 rounded-xl border-2 p-4 text-left transition-transform ${
          item.completed
            ? "border-emerald-300 bg-emerald-50"
            : "border-slate-200 bg-white"
        }`}
        onClick={() => {
          if (!swipeState?.isSwiping) {
            onToggleComplete(item);
          }
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onToggleComplete(item);
          }
        }}
        onTouchEnd={() => onTouchEnd(item)}
        onTouchMove={(e) => onTouchMove(e, item.id)}
        onTouchStart={(e) => onTouchStart(e, item.id)}
        style={{
          transform: `translateX(${translateX}px)`,
        }}
        type="button"
      >
        <div
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border-2 ${
            item.completed
              ? "border-emerald-500 bg-emerald-500"
              : "border-slate-300"
          }`}
        >
          {item.completed && <CheckCircle2 className="h-5 w-5 text-white" />}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3
              className={`truncate font-medium text-lg ${
                item.completed
                  ? "text-slate-400 line-through"
                  : "text-slate-900"
              }`}
            >
              {item.name}
            </h3>
            {item.notes && <Flag className="h-4 w-4 shrink-0 text-amber-500" />}
          </div>
          <div className="mt-1 flex items-center gap-2">
            <span className="text-slate-500 text-sm">
              {item.quantity} {item.unit || "pcs"}
            </span>
            {item.station && (
              <Badge className="text-xs" variant="outline">
                {item.station.name}
              </Badge>
            )}
          </div>
          {item.notes && (
            <p className="mt-1 line-clamp-2 text-amber-600 text-sm">
              📝 {item.notes}
            </p>
          )}
        </div>
      </button>
    </div>
  );
}
