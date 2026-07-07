"use client";

import { Badge } from "@repo/design-system/components/ui/badge";
import { Button } from "@repo/design-system/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@repo/design-system/components/ui/collapsible";
import {
  ChevronDownIcon,
  GitBranchIcon,
  Loader2Icon,
  SparklesIcon,
} from "lucide-react";
import { useMemo, useState } from "react";
import {
  IMPACT_CATEGORY_META,
  IMPACT_CATEGORY_ORDER,
  type EventEditImpact,
  type ImpactCategory,
} from "./event-edit-impact";

interface WhatWillChangePanelProps {
  /** When true, an impact computation is in flight. */
  isLoading: boolean;
  /** The latest computed impact, or undefined before the first preview. */
  impact: EventEditImpact | undefined;
  /** Click handler for the "Preview changes" trigger button. */
  onPreview: () => void;
  /** When true, no preview has been run yet (idle state). */
  isIdle: boolean;
}

/**
 * Collapsible "What will change?" panel for the Event Editor.
 *
 * Shows a summary header (total affected entities) plus an expandable list of
 * every downstream entity grouped by category (kitchen prep, staffing,
 * inventory, invoices, battle boards), alongside the field-level diffs that
 * triggered the impact.
 *
 * Presentational — all data mapping happens in the server action. Mirrors the
 * `ImpactRail` pattern from the board layer.
 */
export function WhatWillChangePanel({
  isLoading,
  impact,
  onPreview,
  isIdle,
}: WhatWillChangePanelProps) {
  const [isOpen, setIsOpen] = useState(false);

  const totalAffected = impact?.summary.totalAffected ?? 0;
  const hasImpact = Boolean(impact && totalAffected > 0);
  const fieldChangeCount = impact?.fieldChanges.length ?? 0;

  return (
    <Collapsible
      className="rounded-lg border border-amber-500/30 bg-amber-50/40 dark:bg-amber-950/10"
      open={isOpen}
      onOpenChange={setIsOpen}
    >
      <div className="flex items-center justify-between gap-3 p-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-amber-500/15">
            <GitBranchIcon className="size-3.5 text-amber-600 dark:text-amber-400" />
          </span>
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-sm font-medium">
              What will change?
              {hasImpact && (
                <Badge
                  className="h-5 px-1.5 text-[11px]"
                  variant="secondary"
                >
                  {totalAffected} affected
                </Badge>
              )}
            </p>
            <p className="truncate text-muted-foreground text-xs">
              {getSubtitle({
                isLoading,
                isIdle,
                hasImpact,
                fieldChangeCount,
                totalAffected,
              })}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button
            disabled={isLoading}
            onClick={onPreview}
            size="sm"
            type="button"
            variant="outline"
          >
            {isLoading ? (
              <Loader2Icon className="size-3.5 animate-spin" />
            ) : (
              <SparklesIcon className="size-3.5" />
            )}
            Preview changes
          </Button>
          {hasImpact && (
            <CollapsibleTrigger asChild>
              <Button size="sm" type="button" variant="ghost">
                <ChevronDownIcon
                  className={`size-4 transition-transform ${
                    isOpen ? "rotate-180" : ""
                  }`}
                />
              </Button>
            </CollapsibleTrigger>
          )}
        </div>
      </div>

      {hasImpact && impact && (
        <CollapsibleContent>
          <div className="space-y-4 border-t border-amber-500/20 p-3">
            <FieldChangesSection impact={impact} />
            <AffectedEntitiesSection impact={impact} />
          </div>
        </CollapsibleContent>
      )}
    </Collapsible>
  );
}

function getSubtitle({
  isLoading,
  isIdle,
  hasImpact,
  fieldChangeCount,
  totalAffected,
}: {
  isLoading: boolean;
  isIdle: boolean;
  hasImpact: boolean;
  fieldChangeCount: number;
  totalAffected: number;
}): string {
  if (isLoading) {
    return "Checking downstream entities…";
  }
  if (isIdle || !hasImpact) {
    return "Preview how this edit cascades before saving.";
  }
  if (fieldChangeCount === 0) {
    return "No field changes detected.";
  }
  return `${fieldChangeCount} field change${
    fieldChangeCount === 1 ? "" : "s"
  } · ${totalAffected} downstream entit${
    totalAffected === 1 ? "y" : "ies"
  }`;
}

function FieldChangesSection({ impact }: { impact: EventEditImpact }) {
  if (impact.fieldChanges.length === 0) {
    return null;
  }
  return (
    <section>
      <h4 className="mb-2 font-semibold text-muted-foreground text-xs uppercase tracking-wide">
        Field changes
      </h4>
      <ul className="space-y-1.5">
        {impact.fieldChanges.map((change) => (
          <li
            key={change.field}
            className="flex flex-wrap items-center gap-x-2 gap-y-0.5 rounded-md bg-background/60 px-2 py-1.5 text-xs"
          >
            <span className="font-medium">{change.label}</span>
            <span className="text-muted-foreground line-through decoration-muted-foreground/50">
              {change.fromDisplay}
            </span>
            <span aria-hidden className="text-muted-foreground">
              →
            </span>
            <span className="font-semibold text-amber-700 dark:text-amber-300">
              {change.toDisplay}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function AffectedEntitiesSection({ impact }: { impact: EventEditImpact }) {
  const grouped = useMemo(() => groupByCategory(impact), [impact]);
  const nonEmpty = IMPACT_CATEGORY_ORDER.filter(
    (cat) => grouped[cat].length > 0
  );

  if (nonEmpty.length === 0) {
    return (
      <section>
        <h4 className="mb-2 font-semibold text-muted-foreground text-xs uppercase tracking-wide">
          Downstream impact
        </h4>
        <p className="text-muted-foreground text-xs">
          No linked downstream entities found for this event.
        </p>
      </section>
    );
  }

  return (
    <section>
      <h4 className="mb-2 font-semibold text-muted-foreground text-xs uppercase tracking-wide">
        Downstream entities
      </h4>
      <div className="space-y-3">
        {nonEmpty.map((category) => (
          <CategoryGroup
            category={category}
            entities={grouped[category]}
            key={category}
          />
        ))}
      </div>
    </section>
  );
}

function CategoryGroup({
  category,
  entities,
}: {
  category: ImpactCategory;
  entities: EventEditImpact["affectedEntities"];
}) {
  const meta = IMPACT_CATEGORY_META[category];
  return (
    <div className="rounded-md border border-border/60 bg-background/40">
      <div className="flex items-center justify-between gap-2 px-2.5 py-1.5">
        <div className="min-w-0">
          <p className="text-sm font-medium">{meta.label}</p>
          <p className="truncate text-muted-foreground text-[11px]">
            {meta.description}
          </p>
        </div>
        <Badge className="shrink-0 text-[11px]" variant="outline">
          {entities.length}
        </Badge>
      </div>
      <ul className="divide-y divide-border/40 border-t border-border/40">
        {entities.slice(0, 10).map((entity) => (
          <li
            className="flex items-start justify-between gap-3 px-2.5 py-1.5"
            key={entity.entityId}
          >
            <div className="min-w-0">
              <p className="truncate text-xs font-medium">{entity.label}</p>
              <p className="truncate text-muted-foreground text-[11px]">
                {entity.subType}
              </p>
            </div>
            <p className="shrink-0 text-right text-muted-foreground text-[11px]">
              {entity.reason}
            </p>
          </li>
        ))}
        {entities.length > 10 && (
          <li className="px-2.5 py-1 text-center text-muted-foreground text-[11px]">
            + {entities.length - 10} more
          </li>
        )}
      </ul>
    </div>
  );
}

function groupByCategory(
  impact: EventEditImpact
): Record<ImpactCategory, EventEditImpact["affectedEntities"]> {
  const init: Record<ImpactCategory, EventEditImpact["affectedEntities"]> = {
    kitchen_prep: [],
    staffing: [],
    inventory: [],
    invoices: [],
    battle_boards: [],
  };
  for (const entity of impact.affectedEntities) {
    init[entity.category].push(entity);
  }
  return init;
}
