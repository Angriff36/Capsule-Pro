"use client";

import {
  CollapsibleSectionBlock,
  SectionHeaderBlock,
} from "@repo/design-system/components/blocks/collapsible-section-block";
import { Badge } from "@repo/design-system/components/ui/badge";
import { Button } from "@repo/design-system/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@repo/design-system/components/ui/dialog";
import { Input } from "@repo/design-system/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/design-system/components/ui/select";
import {
  AlertTriangleIcon,
  ClipboardListIcon,
  DollarSignIcon,
  FileTextIcon,
  Lightbulb,
  PlusIcon,
  TrashIcon,
  UtensilsIcon,
} from "lucide-react";
import {
  getBudgetStatusLabel,
  getVarianceColor,
} from "../../../lib/use-budgets";
import { SuggestionsPanel } from "../../kitchen/components/suggestions-panel";
import type { GeneratedEventSummary } from "../actions/event-summary";
import type { TaskBreakdown } from "../actions/task-breakdown";
import {
  EventSummaryDisplay,
  EventSummarySkeleton,
} from "../components/event-summary-display";
import {
  TaskBreakdownDisplay,
  TaskBreakdownSkeleton,
} from "../components/task-breakdown-display";
import type { PrepTaskSummaryClient } from "./prep-task-contract";

export interface EventBudgetForDisplay {
  id: string;
  tenantId: string;
  event_id: string | null;
  version: number | null;
  status: "draft" | "approved" | "locked" | null;
  total_budget_amount: number | null;
  total_actual_amount: number | null;
  variance_amount: number | null;
  variance_percentage: number | null;
  notes: string | null;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
}

export interface EventDishRow {
  link_id: string;
  dish_id: string;
  name: string;
  category: string | null;
  recipe_name: string | null;
  course: string | null;
  quantity_servings: number;
  dietary_tags: string[] | null;
}

export interface AvailableDishOption {
  id: string;
  name: string;
  category: string | null;
  recipe_name: string | null;
}

const MISSING_FIELD_LABELS: Record<string, string> = {
  client: "Event title",
  eventDate: "Event date",
  venueName: "Venue",
  eventType: "Event type",
  headcount: "Guest count",
  menuItems: "Menu items",
};

interface MissingFieldsBannerProps {
  missingFields: string[];
  onUpdateDetails: () => void;
}

export function MissingFieldsBanner({
  missingFields,
  onUpdateDetails,
}: MissingFieldsBannerProps) {
  if (missingFields.length === 0) {
    return null;
  }
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-900 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-2">
          <AlertTriangleIcon className="mt-0.5 size-4 text-amber-600" />
          <div>
            <div className="font-semibold text-sm">
              Event needs more details
            </div>
            <div className="text-xs text-amber-800">
              Missing:{" "}
              {missingFields
                .map((f) => MISSING_FIELD_LABELS[f] ?? f)
                .join(", ")}
            </div>
          </div>
        </div>
        <Button onClick={onUpdateDetails} size="sm" variant="outline">
          Update details
        </Button>
      </div>
    </div>
  );
}

interface DishVariantDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sourceName: string;
  variantName: string;
  onVariantNameChange: (value: string) => void;
  onCreate: () => void;
}

export function DishVariantDialog({
  open,
  onOpenChange,
  sourceName,
  variantName,
  onVariantNameChange,
  onCreate,
}: DishVariantDialogProps) {
  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create dish variant</DialogTitle>
          <DialogDescription>
            Create a new dish based on &quot;{sourceName}&quot; and replace it
            for this event.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-4">
          <label
            className="flex flex-col gap-2 text-sm font-medium"
            htmlFor="variant-name"
          >
            Variant name
            <Input
              id="variant-name"
              onChange={(e) => onVariantNameChange(e.target.value)}
              placeholder="Enter a new dish name"
              value={variantName}
            />
          </label>
        </div>
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)} variant="outline">
            Cancel
          </Button>
          <Button disabled={variantName.trim().length === 0} onClick={onCreate}>
            Create variant
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface MenuDishesSectionProps {
  eventDishes: EventDishRow[];
  availableDishes: AvailableDishOption[];
  isLoading: boolean;
  showAddDialog: boolean;
  onShowAddDialogChange: (open: boolean) => void;
  selectedDishId: string;
  onSelectedDishIdChange: (id: string) => void;
  selectedCourse: string;
  onSelectedCourseChange: (course: string) => void;
  onAddDish: () => void;
  onRemoveDish: (linkId: string) => void;
  onOpenVariantDialog: (linkId: string, name: string) => void;
}

export function MenuDishesSection({
  eventDishes,
  availableDishes,
  isLoading,
  showAddDialog,
  onShowAddDialogChange,
  selectedDishId,
  onSelectedDishIdChange,
  selectedCourse,
  onSelectedCourseChange,
  onAddDish,
  onRemoveDish,
  onOpenVariantDialog,
}: MenuDishesSectionProps) {
  const COURSES = [
    "appetizer",
    "soup",
    "salad",
    "entree",
    "dessert",
    "beverage",
    "other",
  ] as const;

  const addDishDialog = (
    <Dialog onOpenChange={onShowAddDialogChange} open={showAddDialog}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <PlusIcon className="mr-2 size-3" />
          Add Dish
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Dish to Event</DialogTitle>
          <DialogDescription>
            Select a dish from your menu to add to this event.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="add-dish-select">
              Dish
            </label>
            <Select
              onValueChange={onSelectedDishIdChange}
              value={selectedDishId}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a dish" />
              </SelectTrigger>
              <SelectContent>
                {availableDishes.length === 0 ? (
                  <div className="p-2 text-sm text-muted-foreground">
                    No dishes available. Create dishes in Kitchen Recipes first.
                  </div>
                ) : (
                  availableDishes.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name}
                      {d.category ? ` (${d.category})` : ""}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="add-course-select">
              Course (optional)
            </label>
            <Select
              onValueChange={onSelectedCourseChange}
              value={selectedCourse}
            >
              <SelectTrigger aria-label="Select course" id="add-course-select">
                <SelectValue placeholder="Select course" />
              </SelectTrigger>
              <SelectContent>
                {COURSES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c.charAt(0).toUpperCase() + c.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button
            onClick={() => onShowAddDialogChange(false)}
            variant="outline"
          >
            Cancel
          </Button>
          <Button disabled={!selectedDishId} onClick={onAddDish}>
            Add Dish
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  return (
    <CollapsibleSectionBlock
      defaultOpen
      emptyState={{
        icon: UtensilsIcon,
        title: "No dishes linked to this event",
        description:
          "Add dishes so they can be used for prep lists and task generation",
        actionLabel: "Add First Dish",
        onAction: () => onShowAddDialogChange(true),
      }}
      headerActions={addDishDialog}
      icon={UtensilsIcon}
      iconColor="text-emerald-500"
      id="dishes"
      showEmptyState={!isLoading && eventDishes.length === 0}
      subtitle={`${eventDishes.length} dishes linked to this event`}
      title="Menu / Dishes"
      triggerText="View dishes"
    >
      {isLoading && (
        <div className="flex items-center justify-center py-8">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      )}
      {!isLoading && eventDishes.length > 0 && (
        <div className="grid gap-3">
          {eventDishes.map((dish) => (
            <div
              className="flex flex-wrap items-center justify-between gap-4 rounded-lg border px-4 py-3"
              key={dish.link_id}
            >
              <div className="flex flex-1 flex-col">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{dish.name}</span>
                  {dish.course && (
                    <Badge className="text-xs" variant="secondary">
                      {dish.course}
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2 text-muted-foreground text-xs">
                  {dish.recipe_name ? (
                    <span>Recipe: {dish.recipe_name}</span>
                  ) : (
                    <span className="text-amber-600">No recipe linked</span>
                  )}
                  {(dish.dietary_tags ?? []).length > 0 && (
                    <Badge className="text-xs" variant="outline">
                      {(dish.dietary_tags ?? []).join(", ")}
                    </Badge>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground text-xs">
                  {dish.quantity_servings} servings
                </span>
                <Button
                  onClick={() => onOpenVariantDialog(dish.link_id, dish.name)}
                  size="sm"
                  variant="outline"
                >
                  Create variant
                </Button>
                <Button
                  className="size-8 text-muted-foreground hover:text-destructive"
                  onClick={() => onRemoveDish(dish.link_id)}
                  size="icon"
                  variant="ghost"
                >
                  <TrashIcon className="size-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </CollapsibleSectionBlock>
  );
}

interface BudgetSectionProps {
  budget: EventBudgetForDisplay | null;
  onViewBudget: (id: string) => void;
  onCreateBudget: () => void;
}

export function BudgetSection({
  budget,
  onViewBudget,
  onCreateBudget,
}: BudgetSectionProps) {
  const currencyFormatter = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  });

  return (
    <Card className="border-border/70 shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <DollarSignIcon className="size-4 text-emerald-600" />
              Budget
            </CardTitle>
            <p className="mt-1 text-foreground/75 text-xs">
              {budget?.status
                ? `${getBudgetStatusLabel(budget.status)} - v${budget.version ?? 1}`
                : "No budget configured"}
            </p>
          </div>
          {budget ? (
            <Button
              onClick={() => onViewBudget(budget.id)}
              size="sm"
              variant="outline"
            >
              View
            </Button>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {budget ? (
          <div className="grid gap-2">
            <div className="grid gap-2 sm:grid-cols-3">
              <div className="rounded-lg border p-3">
                <div className="text-foreground/70 text-xs">Total budgeted</div>
                <div className="font-semibold text-base">
                  {currencyFormatter.format(budget.total_budget_amount ?? 0)}
                </div>
              </div>
              <div className="rounded-lg border p-3">
                <div className="text-foreground/70 text-xs">Total actual</div>
                <div className="font-semibold text-base">
                  {currencyFormatter.format(budget.total_actual_amount ?? 0)}
                </div>
              </div>
              <div className="rounded-lg border p-3">
                <div className="text-foreground/70 text-xs">Variance</div>
                <div
                  className={`font-semibold text-base ${getVarianceColor(budget.variance_amount ?? 0)}`}
                >
                  {currencyFormatter.format(budget.variance_amount ?? 0)}
                </div>
              </div>
            </div>
            <Button
              onClick={() => onViewBudget(budget.id)}
              size="sm"
              variant="outline"
            >
              Open budget workspace
            </Button>
          </div>
        ) : (
          <div className="rounded-lg border border-dashed bg-muted/20 p-4">
            <p className="font-medium text-sm">No budget configured yet</p>
            <p className="mt-1 text-foreground/70 text-sm">
              Create a budget to track planned vs actual event spend.
            </p>
            <Button className="mt-3" onClick={onCreateBudget} size="sm">
              Create budget
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface TaskBreakdownSectionProps {
  breakdown: TaskBreakdown | null;
  isGenerating: boolean;
  generationProgress: string;
  onOpenGenerateModal: () => void;
  onExport: () => void;
  onRegenerate: () => void;
  onSave: () => void;
}

export function TaskBreakdownSection({
  breakdown,
  isGenerating,
  generationProgress,
  onOpenGenerateModal,
  onExport,
  onRegenerate,
  onSave,
}: TaskBreakdownSectionProps) {
  const showEmptyState = breakdown === null && !isGenerating;

  return (
    <>
      <SectionHeaderBlock
        icon={ClipboardListIcon}
        iconColor="text-sky-700"
        title="Task Breakdown"
      />

      {breakdown && (
        <TaskBreakdownDisplay
          breakdown={breakdown}
          generationProgress={generationProgress}
          isGenerating={isGenerating}
          onExport={onExport}
          onRegenerate={onRegenerate}
          onSave={onSave}
        />
      )}

      {showEmptyState && (
        <div className="rounded-xl border border-dashed bg-muted/15 p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="font-medium text-base">No task plan yet</h3>
              <p className="text-foreground/70 text-sm">
                Build a prep, setup, and cleanup plan from this event&apos;s
                details and historical patterns.
              </p>
            </div>
            <Button onClick={onOpenGenerateModal}>
              Generate task breakdown
            </Button>
          </div>
        </div>
      )}

      {isGenerating && !breakdown && <TaskBreakdownSkeleton />}
    </>
  );
}

interface ExecutiveSummarySectionProps {
  eventId: string;
  eventTitle: string;
  summary: GeneratedEventSummary | null | undefined;
  isLoading: boolean;
  onGenerate: () => Promise<GeneratedEventSummary>;
  onDelete: () => Promise<void>;
}

export function ExecutiveSummarySection({
  eventId,
  eventTitle,
  summary,
  isLoading,
  onGenerate,
  onDelete,
}: ExecutiveSummarySectionProps) {
  return (
    <>
      <SectionHeaderBlock
        icon={FileTextIcon}
        iconColor="text-amber-700"
        title="Executive Summary"
      />

      {isLoading ? (
        <EventSummarySkeleton />
      ) : (
        <EventSummaryDisplay
          eventId={eventId}
          eventTitle={eventTitle}
          initialSummary={summary}
          onDelete={onDelete}
          onGenerate={onGenerate}
        />
      )}
    </>
  );
}

import type { SuggestedAction } from "../../kitchen/lib/suggestions-types";

interface SuggestionsSectionProps {
  showSuggestions: boolean;
  onShowSuggestionsChange: (show: boolean) => void;
  suggestions: SuggestedAction[];
  isLoading: boolean;
  onRefresh: () => void;
  onDismiss: (id: string) => void;
  onAction: (suggestion: SuggestedAction) => void;
}

export function SuggestionsSection({
  showSuggestions,
  onShowSuggestionsChange,
  suggestions,
  isLoading,
  onRefresh,
  onDismiss,
  onAction,
}: SuggestionsSectionProps) {
  const suggestionCount = suggestions.length;
  const hasSuggestions = suggestionCount > 0;
  const suggestionLabel = hasSuggestions
    ? `${suggestionCount} recommendation${suggestionCount === 1 ? "" : "s"} ready`
    : "No recommendations generated";

  return (
    <Card className="border-border/70 shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Lightbulb className="size-4 text-amber-600" />
              AI Recommendations
            </CardTitle>
            <p className="mt-1 text-foreground/75 text-xs">{suggestionLabel}</p>
          </div>
          <Button
            onClick={() => onShowSuggestionsChange(!showSuggestions)}
            size="sm"
            variant={showSuggestions ? "default" : "outline"}
          >
            {showSuggestions ? "Hide" : "View"}
            {hasSuggestions ? (
              <Badge className="ml-2" variant="secondary">
                {suggestionCount}
              </Badge>
            ) : null}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {showSuggestions ? (
          <SuggestionsPanel
            isLoading={isLoading}
            onAction={onAction}
            onClose={() => onShowSuggestionsChange(false)}
            onDismiss={onDismiss}
            onRefresh={onRefresh}
            suggestions={suggestions}
          />
        ) : (
          <div className="rounded-lg border border-dashed bg-muted/20 p-4">
            <p className="font-medium text-sm">
              {hasSuggestions
                ? "Recommendations are ready to review"
                : "No recommendations available yet"}
            </p>
            <p className="mt-1 text-foreground/70 text-sm">
              {hasSuggestions
                ? "Open this panel to triage suggestions and apply actions."
                : "Generate insights from event activity to populate recommendations."}
            </p>
            <div className="mt-3 flex gap-2">
              <Button
                onClick={() => onShowSuggestionsChange(true)}
                size="sm"
                variant={hasSuggestions ? "default" : "outline"}
              >
                {hasSuggestions ? "Review recommendations" : "Open panel"}
              </Button>
              {hasSuggestions ? null : (
                <Button onClick={onRefresh} size="sm" variant="ghost">
                  Refresh
                </Button>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface SourceDocumentsSectionProps {
  eventId: string;
  fileCount?: number;
}

export function SourceDocumentsSection({
  eventId,
  fileCount = 0,
}: SourceDocumentsSectionProps) {
  return (
    <CollapsibleSectionBlock
      icon={FileTextIcon}
      subtitle={`${fileCount} files attached`}
      title="Source documents"
      triggerText="View files"
    >
      <form
        action={(formData: FormData) => {
          formData.append("eventId", eventId);
          // attachEventImport action
        }}
        className="flex flex-col gap-3"
      >
        <div className="flex flex-wrap items-center gap-3">
          <input
            accept=".csv,.pdf,image/*"
            className="text-sm"
            name="file"
            type="file"
          />
          <Button type="submit" variant="secondary">
            Attach file
          </Button>
        </div>
      </form>
    </CollapsibleSectionBlock>
  );
}

interface PrepTasksSectionProps {
  prepTasks: PrepTaskSummaryClient[];
  onOpenGenerateModal: () => void;
}

export function PrepTasksSection({
  prepTasks,
  onOpenGenerateModal,
}: PrepTasksSectionProps) {
  return (
    <Card className="border-border/70 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <ClipboardListIcon className="size-4 text-sky-600" />
          Prep Tasks
        </CardTitle>
        <p className="text-foreground/75 text-xs">
          {prepTasks.length} tasks linked to this event
        </p>
      </CardHeader>
      <CardContent className="pt-0">
        {prepTasks.length === 0 ? (
          <div className="rounded-lg border border-dashed bg-muted/20 p-4">
            <p className="font-medium text-sm">No prep tasks yet</p>
            <p className="mt-1 text-foreground/70 text-sm">
              Generate a task breakdown or add tasks manually.
            </p>
            <Button className="mt-3" onClick={onOpenGenerateModal} size="sm">
              Generate task breakdown
            </Button>
          </div>
        ) : (
          <div className="grid gap-2">
            {prepTasks.map((task) => (
              <div
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border px-3 py-2.5"
                key={task.id}
              >
                <div className="flex flex-col">
                  <span className="font-medium text-sm">{task.name}</span>
                  <span className="text-foreground/70 text-xs">
                    Due{" "}
                    {new Date(task.dueByDate).toLocaleDateString("en-US", {
                      dateStyle: "medium",
                    })}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {task.isEventFinish ? (
                    <span className="rounded bg-muted px-2 py-1 text-xs">
                      Finish
                    </span>
                  ) : null}
                  <span className="rounded bg-muted px-2 py-1 text-xs capitalize">
                    {task.status}
                  </span>
                  <span className="text-foreground/70 text-xs">
                    {task.servingsTotal ??
                      Math.round(Number(task.quantityTotal))}
                    {task.servingsTotal ? " servings" : ""}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Re-export types for convenience
export type { GeneratedEventSummary } from "../actions/event-summary";
export type { TaskBreakdown } from "../actions/task-breakdown";
