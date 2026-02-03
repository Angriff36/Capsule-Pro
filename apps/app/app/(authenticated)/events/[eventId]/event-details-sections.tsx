"use client";

import { Badge } from "@repo/design-system/components/ui/badge";
import { Button } from "@repo/design-system/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@repo/design-system/components/ui/card";
import {
  Collapsible,
} from "@repo/design-system/components/ui/collapsible";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@repo/design-system/components/ui/select";
import { Separator } from "@repo/design-system/components/ui/separator";
import { CollapsibleSectionBlock, SectionHeaderBlock } from "@repo/design-system/components/blocks/collapsible-section-block";
import {
  AlertTriangleIcon,
  DollarSignIcon,
  FileTextIcon,
  Lightbulb,
  PlusIcon,
  SparklesIcon,
  TrashIcon,
  UtensilsIcon,
} from "lucide-react";
import { getBudgetStatusLabel, getVarianceColor } from "../../../lib/use-budgets";
import { SuggestionsPanel } from "../../kitchen/components/suggestions-panel";
import { EventSummaryDisplay, EventSummarySkeleton } from "../components/event-summary-display";
import { TaskBreakdownDisplay, TaskBreakdownSkeleton } from "../components/task-breakdown-display";
import type { TaskBreakdown } from "../actions/task-breakdown";
import type { GeneratedEventSummary } from "../actions/event-summary";
import type { PrepTaskSummaryClient } from "./prep-task-contract";

export type EventBudgetForDisplay = {
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
};

export type EventDishRow = {
  link_id: string;
  dish_id: string;
  name: string;
  category: string | null;
  recipe_name: string | null;
  course: string | null;
  quantity_servings: number;
  dietary_tags: string[] | null;
};

export type AvailableDishOption = {
  id: string;
  name: string;
  category: string | null;
  recipe_name: string | null;
};

const MISSING_FIELD_LABELS: Record<string, string> = {
  client: "Event title",
  eventDate: "Event date",
  venueName: "Venue",
  eventType: "Event type",
  headcount: "Guest count",
  menuItems: "Menu items",
};

type MissingFieldsBannerProps = {
  missingFields: string[];
  onUpdateDetails: () => void;
};

export function MissingFieldsBanner({ missingFields, onUpdateDetails }: MissingFieldsBannerProps) {
  if (missingFields.length === 0) {
    return null;
  }
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-900 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-2">
          <AlertTriangleIcon className="mt-0.5 size-4 text-amber-600" />
          <div>
            <div className="font-semibold text-sm">Event needs more details</div>
            <div className="text-xs text-amber-800">
              Missing: {missingFields.map((f) => MISSING_FIELD_LABELS[f] ?? f).join(", ")}
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

type DishVariantDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sourceName: string;
  variantName: string;
  onVariantNameChange: (value: string) => void;
  onCreate: () => void;
};

export function DishVariantDialog({
  open,
  onOpenChange,
  sourceName,
  variantName,
  onVariantNameChange,
  onCreate,
}: DishVariantDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create dish variant</DialogTitle>
          <DialogDescription>
            Create a new dish based on &quot;{sourceName}&quot; and replace it for this event.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-4">
          <label className="flex flex-col gap-2 text-sm font-medium" htmlFor="variant-name">
            Variant name
            <Input
              id="variant-name"
              value={variantName}
              onChange={(e) => onVariantNameChange(e.target.value)}
              placeholder="Enter a new dish name"
            />
          </label>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
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

type MenuDishesSectionProps = {
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
};

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
    <Dialog open={showAddDialog} onOpenChange={onShowAddDialogChange}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <PlusIcon className="mr-2 size-3" />
          Add Dish
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Dish to Event</DialogTitle>
          <DialogDescription>Select a dish from your menu to add to this event.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="add-dish-select">
              Dish
            </label>
            <Select value={selectedDishId} onValueChange={onSelectedDishIdChange}>
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
            <Select value={selectedCourse} onValueChange={onSelectedCourseChange}>
              <SelectTrigger id="add-course-select" aria-label="Select course">
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
          <Button variant="outline" onClick={() => onShowAddDialogChange(false)}>
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
      icon={UtensilsIcon}
      title="Menu / Dishes"
      subtitle={`${eventDishes.length} dishes linked to this event`}
      iconColor="text-emerald-500"
      defaultOpen
      id="dishes"
      triggerText="View dishes"
      headerActions={addDishDialog}
      showEmptyState={!isLoading && eventDishes.length === 0}
      emptyState={{
        icon: UtensilsIcon,
        title: "No dishes linked to this event",
        description: "Add dishes so they can be used for prep lists and task generation",
        actionLabel: "Add First Dish",
        onAction: () => onShowAddDialogChange(true),
      }}
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
              key={dish.link_id}
              className="flex flex-wrap items-center justify-between gap-4 rounded-lg border px-4 py-3"
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
                <span className="text-muted-foreground text-xs">{dish.quantity_servings} servings</span>
                <Button size="sm" variant="outline" onClick={() => onOpenVariantDialog(dish.link_id, dish.name)}>
                  Create variant
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="size-8 text-muted-foreground hover:text-destructive"
                  onClick={() => onRemoveDish(dish.link_id)}
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

type BudgetSectionProps = {
  budget: EventBudgetForDisplay | null;
  onViewBudget: (id: string) => void;
  onCreateBudget: () => void;
};

export function BudgetSection({ budget, onViewBudget, onCreateBudget }: BudgetSectionProps) {
  return (
    <CollapsibleSectionBlock
      icon={DollarSignIcon}
      title="Event Budget"
      subtitle={
        budget?.status
          ? `${getBudgetStatusLabel(budget.status)} - v${budget.version ?? 1}`
          : "No budget created yet"
      }
      iconColor="text-green-500"
      defaultOpen
      triggerText={() => (budget ? "View budget" : "Create budget")}
      showEmptyState={!budget}
      emptyState={{
        icon: DollarSignIcon,
        title: "No budget created for this event",
        description: "Create a budget to track costs and manage event finances",
        actionLabel: "Create Budget",
        onAction: onCreateBudget,
      }}
    >
      {budget && (
        <div className="grid gap-4 md:grid-cols-4">
          <div className="rounded-lg border p-4">
            <div className="text-muted-foreground text-xs">Total Budgeted</div>
            <div className="text-lg font-semibold">
              {new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
                budget.total_budget_amount ?? 0
              )}
            </div>
          </div>
          <div className="rounded-lg border p-4">
            <div className="text-muted-foreground text-xs">Total Actual</div>
            <div className="text-lg font-semibold">
              {new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
                budget.total_actual_amount ?? 0
              )}
            </div>
          </div>
          <div className="rounded-lg border p-4">
            <div className="text-muted-foreground text-xs">Variance</div>
            <div
              className={`text-lg font-semibold ${getVarianceColor(budget.variance_amount ?? 0)}`}
            >
              {new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
                budget.variance_amount ?? 0
              )}
            </div>
          </div>
          <div className="flex items-center">
            <Button className="w-full" onClick={() => onViewBudget(budget.id)}>
              View Full Budget
            </Button>
          </div>
        </div>
      )}
    </CollapsibleSectionBlock>
  );
}

type TaskBreakdownSectionProps = {
  breakdown: TaskBreakdown | null;
  isGenerating: boolean;
  generationProgress: string;
  onOpenGenerateModal: () => void;
  onExport: () => void;
  onRegenerate: () => void;
  onSave: () => void;
};

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
  const generateButton = (
    <Button onClick={onOpenGenerateModal}>
      <SparklesIcon className="mr-2 size-4" />
      Generate Task Breakdown
    </Button>
  );

  return (
    <>
      <SectionHeaderBlock
        icon={SparklesIcon}
        title="AI Task Assistant"
        iconColor="text-purple-500"
        actions={generateButton}
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
        <div className="rounded-xl border border-dashed p-8 text-center">
          <SparklesIcon className="mx-auto mb-4 size-12 text-muted-foreground/50" />
          <h3 className="mb-2 font-medium">No task breakdown generated yet</h3>
          <p className="mb-4 text-muted-foreground text-sm">
            Generate an AI-powered task breakdown with prep, setup, and cleanup tasks based on your
            event details and historical data.
          </p>
          <Button onClick={onOpenGenerateModal}>
            <SparklesIcon className="mr-2 size-4" />
            Generate Task Breakdown
          </Button>
        </div>
      )}

      {isGenerating && !breakdown && <TaskBreakdownSkeleton />}
    </>
  );
}

type ExecutiveSummarySectionProps = {
  eventId: string;
  eventTitle: string;
  summary: GeneratedEventSummary | null | undefined;
  isLoading: boolean;
  onGenerate: () => Promise<GeneratedEventSummary>;
  onDelete: () => Promise<void>;
  onOpenGenerateModal: () => void;
};

export function ExecutiveSummarySection({
  eventId,
  eventTitle,
  summary,
  isLoading,
  onGenerate,
  onDelete,
  onOpenGenerateModal,
}: ExecutiveSummarySectionProps) {
  const generateButton = (
    <Button onClick={onOpenGenerateModal}>
      <SparklesIcon className="mr-2 size-4" />
      Generate Summary
    </Button>
  );

  return (
    <>
      <SectionHeaderBlock
        icon={SparklesIcon}
        title="Executive Summary"
        iconColor="text-primary"
        actions={generateButton}
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

type SuggestionsSectionProps = {
  showSuggestions: boolean;
  onShowSuggestionsChange: (show: boolean) => void;
  suggestions: SuggestedAction[];
  isLoading: boolean;
  onRefresh: () => void;
  onDismiss: (id: string) => void;
  onAction: (suggestion: SuggestedAction) => void;
};

export function SuggestionsSection({
  showSuggestions,
  onShowSuggestionsChange,
  suggestions,
  isLoading,
  onRefresh,
  onDismiss,
  onAction,
}: SuggestionsSectionProps) {
  const toggleButton = (
    <Button
      variant={showSuggestions ? "default" : "outline"}
      onClick={() => onShowSuggestionsChange(!showSuggestions)}
    >
      <SparklesIcon className="mr-2 size-4" />
      {showSuggestions ? "Hide Suggestions" : "Show Suggestions"}
      {suggestions.length > 0 && (
        <Badge className="ml-2" variant="secondary">
          {suggestions.length}
        </Badge>
      )}
    </Button>
  );

  return (
    <>
      <SectionHeaderBlock
        icon={Lightbulb}
        title="AI Suggestions"
        iconColor="text-amber-500"
        actions={toggleButton}
      />

      {showSuggestions && (
        <Card className="border-slate-200 shadow-sm">
          <SuggestionsPanel
            suggestions={suggestions}
            isLoading={isLoading}
            onRefresh={onRefresh}
            onDismiss={onDismiss}
            onAction={onAction}
            onClose={() => onShowSuggestionsChange(false)}
          />
        </Card>
      )}
      {!showSuggestions && suggestions.length > 0 && (() => {
        const plural = suggestions.length === 1 ? "" : "s";
        return (
        <Card className="border-purple-200 bg-purple-50/50 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 font-semibold text-sm text-purple-900">
              <Lightbulb className="size-4 text-purple-600" />
              AI Suggestions Available
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-purple-700 text-xs">
              You have {suggestions.length} suggestion{plural} that could help optimize this event.
            </p>
            <Button
              className="w-full bg-purple-600 text-white hover:bg-purple-700"
              size="sm"
              onClick={() => onShowSuggestionsChange(true)}
            >
              <SparklesIcon className="mr-2 size-3" />
              View Suggestions
            </Button>
          </CardContent>
        </Card>
        );
      })()}
    </>
  );
}

type SourceDocumentsSectionProps = {
  eventId: string;
  fileCount?: number;
};

export function SourceDocumentsSection({ eventId, fileCount = 0 }: SourceDocumentsSectionProps) {
  return (
    <CollapsibleSectionBlock
      icon={FileTextIcon}
      title="Source documents"
      subtitle={`${fileCount} files attached`}
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
          <input accept=".csv,.pdf,image/*" className="text-sm" name="file" type="file" />
          <Button type="submit" variant="secondary">
            Attach file
          </Button>
        </div>
      </form>
    </CollapsibleSectionBlock>
  );
}

type PrepTasksSectionProps = {
  prepTasks: PrepTaskSummaryClient[];
  onOpenGenerateModal: () => void;
};

export function PrepTasksSection({ prepTasks, onOpenGenerateModal }: PrepTasksSectionProps) {
  return (
    <CollapsibleSectionBlock
      icon={PlusIcon}
      title="Prep tasks"
      subtitle={`${prepTasks.length} tasks linked to this event`}
      iconColor="text-purple-500"
      defaultOpen
      triggerText="View tasks"
      showEmptyState={prepTasks.length === 0}
      emptyState={{
        title: "No prep tasks yet",
        description: "Generate a task breakdown or add tasks manually",
        actionLabel: "Generate with AI",
        onAction: onOpenGenerateModal,
      }}
    >
      <div className="grid gap-3">
        {prepTasks.map((task) => (
          <div
            key={task.id}
            className="flex flex-wrap items-center justify-between gap-4 rounded-lg border px-4 py-3"
          >
            <div className="flex flex-col">
              <span className="font-medium">{task.name}</span>
              <span className="text-muted-foreground text-xs">
                Due{" "}
                {new Date(task.dueByDate).toLocaleDateString("en-US", { dateStyle: "medium" })}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {task.isEventFinish ? (
                <span className="rounded bg-muted px-2 py-1 text-xs">Finish</span>
              ) : null}
              <span className="rounded bg-muted px-2 py-1 text-xs capitalize">{task.status}</span>
              <span className="text-muted-foreground text-xs">
                {task.servingsTotal ?? Math.round(Number(task.quantityTotal))}
                {task.servingsTotal ? " servings" : ""}
              </span>
            </div>
          </div>
        ))}
      </div>
    </CollapsibleSectionBlock>
  );
}
