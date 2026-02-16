"use client";

import { Badge } from "@repo/design-system/components/ui/badge";
import { cn } from "@repo/design-system/lib/utils";
import { HelpCircle } from "lucide-react";
import { memo } from "react";
import type { EntityType } from "../../types/entities";
import { ENTITY_TYPE_COLORS, ENTITY_TYPE_LABELS } from "../../types/entities";

interface GenericNodeCardProps {
  entityType: EntityType;
  stale: boolean;
}

export const GenericNodeCard = memo(function GenericNodeCard({
  entityType,
  stale,
}: GenericNodeCardProps) {
  const colors = ENTITY_TYPE_COLORS[entityType] ?? ENTITY_TYPE_COLORS.note;
  const label = ENTITY_TYPE_LABELS[entityType] ?? "Unknown";

  return (
    <div className={cn("flex h-full flex-col items-center justify-center gap-2", stale && "opacity-50")}>
      <HelpCircle className={cn("size-6", colors.icon)} />
      <Badge className="text-xs" variant="outline">
        {label}
      </Badge>
      <p className="text-center text-muted-foreground text-xs">
        {stale ? "Entity was deleted" : "Entity data unavailable"}
      </p>
    </div>
  );
});
