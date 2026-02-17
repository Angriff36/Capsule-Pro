"use client";

import { Button } from "@repo/design-system/components/ui/button";
import { Separator } from "@repo/design-system/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@repo/design-system/components/ui/sheet";
import { Skeleton } from "@repo/design-system/components/ui/skeleton";
import { cn } from "@repo/design-system/lib/utils";
import {
  AlertTriangle,
  Box,
  Calendar,
  CheckSquare,
  ClipboardList,
  ExternalLink,
  Package,
  StickyNote,
  User,
  Users,
  UtensilsCrossed,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { resolveEntities } from "../actions/resolve-entities";
import type { EntityType, ResolvedEntity } from "../types/entities";
import {
  ENTITY_TYPE_COLORS,
  ENTITY_TYPE_LABELS,
  getEntityTitle,
} from "../types/entities";
import { ClientDetail } from "./detail-views/client-detail";
import { EmployeeDetail } from "./detail-views/employee-detail";
import { EventDetail } from "./detail-views/event-detail";
import { GenericDetail } from "./detail-views/generic-detail";
import { TaskDetail } from "./detail-views/task-detail";

// ============================================================================
// Entity Detail Panel — Slide-over sheet for viewing entity details
// ============================================================================

interface EntityDetailPanelProps {
  entityType: EntityType;
  entityId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// ============================================================================
// Icon Mapping
// ============================================================================

/** Map entity types to their Lucide icons */
const ENTITY_TYPE_ICONS: Record<EntityType, typeof Calendar> = {
  event: Calendar,
  client: Users,
  prep_task: ClipboardList,
  kitchen_task: CheckSquare,
  employee: User,
  inventory_item: Package,
  recipe: UtensilsCrossed,
  dish: UtensilsCrossed,
  proposal: ClipboardList,
  shipment: Box,
  note: StickyNote,
};

/** Map entity types to their full-page link paths */
function getEntityLink(
  entityType: EntityType,
  entityId: string
): string | null {
  switch (entityType) {
    case "event":
      return `/events/${entityId}`;
    case "client":
      return `/crm/clients/${entityId}`;
    case "prep_task":
    case "kitchen_task":
      return "/kitchen/tasks";
    case "employee":
      return "/staff/team";
    case "inventory_item":
      return "/inventory";
    case "recipe":
      return "/kitchen/recipes";
    case "dish":
      return "/kitchen/dishes";
    case "proposal":
      return "/proposals";
    case "shipment":
      return "/shipments";
    case "note":
      return "/notes";
    default:
      return null;
  }
}

// ============================================================================
// Loading Skeleton
// ============================================================================

function DetailSkeleton() {
  return (
    <div className="space-y-4 px-4">
      {/* Badge skeleton */}
      <Skeleton className="h-5 w-20" />
      <Separator />
      {/* Section header */}
      <div className="space-y-3">
        <Skeleton className="h-4 w-32" />
        <div className="space-y-2 pl-6">
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-24" />
          </div>
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-28" />
          </div>
        </div>
      </div>
      <Separator />
      {/* Another section */}
      <div className="space-y-3">
        <Skeleton className="h-4 w-28" />
        <div className="space-y-2 pl-6">
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-20" />
          </div>
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
      </div>
      <Separator />
      {/* Button skeleton */}
      <Skeleton className="h-9 w-full" />
    </div>
  );
}

// ============================================================================
// Error State
// ============================================================================

interface ErrorStateProps {
  message: string;
  onRetry: () => void;
}

function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center gap-4 px-4 py-8 text-center">
      <AlertTriangle className="size-8 text-destructive" />
      <div className="space-y-1">
        <p className="text-sm font-medium">Failed to load details</p>
        <p className="text-xs text-muted-foreground">{message}</p>
      </div>
      <Button onClick={onRetry} size="sm" variant="outline">
        Try Again
      </Button>
    </div>
  );
}

// ============================================================================
// Detail View Router
// ============================================================================

/** Routes to the correct detail view based on entity type */
function DetailViewRouter({ entity }: { entity: ResolvedEntity }) {
  switch (entity.type) {
    case "event":
      return <EventDetail data={entity.data} />;
    case "client":
      return <ClientDetail data={entity.data} />;
    case "prep_task":
      return <TaskDetail data={entity.data} taskType="prep_task" />;
    case "kitchen_task":
      return <TaskDetail data={entity.data} taskType="kitchen_task" />;
    case "employee":
      return <EmployeeDetail data={entity.data} />;
    default:
      // Generic fallback for inventory_item, recipe, dish, proposal, shipment, note
      return <GenericDetail entity={entity} />;
  }
}

// ============================================================================
// Main Component
// ============================================================================

export function EntityDetailPanel({
  entityType,
  entityId,
  open,
  onOpenChange,
}: EntityDetailPanelProps) {
  const [entity, setEntity] = useState<ResolvedEntity | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const Icon = ENTITY_TYPE_ICONS[entityType] ?? StickyNote;
  const colors = ENTITY_TYPE_COLORS[entityType] ?? ENTITY_TYPE_COLORS.note;
  const typeLabel = ENTITY_TYPE_LABELS[entityType] ?? "Unknown";
  const fullPageLink = getEntityLink(entityType, entityId);

  /** Fetch entity data via the resolveEntities server action */
  const fetchEntity = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // The entities.ts EntityType is broader than the types.ts EntityType used by resolveEntities.
      // Both define the same union at runtime; the cast bridges the two type definitions.
      const result = await resolveEntities([
        {
          entityType: entityType as Parameters<
            typeof resolveEntities
          >[0][0]["entityType"],
          entityId,
        },
      ]);

      if (!result.success) {
        const errorMsg = result.error ?? "Entity not found";
        console.error(
          `[entity-detail-panel] Failed to resolve ${entityType}:${entityId}:`,
          errorMsg
        );
        setError(errorMsg);
        setEntity(null);
        return;
      }

      // The map key is "entityType:entityId"
      const key = `${entityType}:${entityId}`;
      const data = result.data;
      const resolved = data ? (data.get(key) ?? null) : null;

      if (!resolved) {
        console.error(
          `[entity-detail-panel] Entity not found in result map: ${key}`
        );
        setError("Entity not found. It may have been deleted.");
        setEntity(null);
        return;
      }

      setEntity(resolved);
    } catch (err) {
      const errorMsg =
        err instanceof Error ? err.message : "An unexpected error occurred";
      console.error(
        `[entity-detail-panel] Error fetching ${entityType}:${entityId}:`,
        err
      );
      setError(errorMsg);
      setEntity(null);
    } finally {
      setIsLoading(false);
    }
  }, [entityType, entityId]);

  // Fetch entity data when the panel opens or entity changes
  useEffect(() => {
    if (open && entityType && entityId) {
      fetchEntity();
    }

    // Reset state when panel closes
    if (!open) {
      setEntity(null);
      setError(null);
    }
  }, [open, entityType, entityId, fetchEntity]);

  const title = entity ? getEntityTitle(entity) : typeLabel;

  return (
    <Sheet onOpenChange={onOpenChange} open={open}>
      <SheetContent
        className="w-[400px] overflow-y-auto sm:w-[540px]"
        side="right"
      >
        {/* Header */}
        <SheetHeader>
          <div className="flex items-center gap-2">
            <Icon className={cn("size-5", colors.icon)} />
            <SheetTitle className="truncate">{title}</SheetTitle>
          </div>
          <SheetDescription>{typeLabel} Details</SheetDescription>
        </SheetHeader>

        {/* Content */}
        <div className="flex-1 px-4 pb-4">
          {isLoading ? (
            <DetailSkeleton />
          ) : error ? (
            <ErrorState message={error} onRetry={fetchEntity} />
          ) : entity ? (
            <DetailViewRouter entity={entity} />
          ) : null}
        </div>

        {/* Footer — Open Full Page link (only when loaded successfully) */}
        {fullPageLink != null && entity != null && (
          <SheetFooter>
            <Button asChild className="w-full" variant="outline">
              <Link href={fullPageLink}>
                <ExternalLink className="mr-2 size-4" />
                Open Full Page
              </Link>
            </Button>
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  );
}
