"use client";

import type { Event, EventBudget } from "@repo/database";
import { Badge } from "@repo/design-system/components/ui/badge";
import { Button } from "@repo/design-system/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/design-system/components/ui/select";
import { Separator } from "@repo/design-system/components/ui/separator";
import {
  ChevronDownIcon,
  DollarSignIcon,
  PlusIcon,
  SparklesIcon,
  TrashIcon,
  UtensilsIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  addDishToEvent,
  getAvailableDishes,
  getEventDishes,
  removeDishFromEvent,
} from "../actions/event-dishes";
import {
  deleteEventSummary,
  type GeneratedEventSummary,
  generateEventSummary,
  getEventSummary,
} from "../actions/event-summary";
import {
  generateTaskBreakdown,
  saveTaskBreakdown,
  type TaskBreakdown,
} from "../actions/task-breakdown";
import {
  EventSummaryDisplay,
  EventSummarySkeleton,
  GenerateEventSummaryModal,
} from "../components/event-summary-display";
import {
  GenerateTaskBreakdownModal,
  TaskBreakdownDisplay,
  TaskBreakdownSkeleton,
} from "../components/task-breakdown-display";
import type { PrepTaskSummary } from "./prep-task-contract";
import { getVarianceColor, getBudgetStatusLabel } from "../../../../lib/use-budgets";

type EventDetailsClientProps = {
  budget: EventBudget | null;
  event: Event;
  prepTasks: PrepTaskSummary[];
};

type EventDish = {
  link_id: string;
  dish_id: string;
  name: string;
  category: string | null;
  recipe_name: string | null;
  course: string | null;
  quantity_servings: number;
  dietary_tags: string[] | null;
};

type AvailableDish = {
  id: string;
  name: string;
  category: string | null;
  recipe_name: string | null;
};

export function EventDetailsClient({
  budget,
  event,
  prepTasks: initialPrepTasks,
}: EventDetailsClientProps) {
  const router = useRouter();
  const [breakdown, setBreakdown] = useState<TaskBreakdown | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [showBreakdown, setShowBreakdown] = useState(false);

  // Summary state
  const [summary, setSummary] = useState<
    GeneratedEventSummary | null | undefined
  >(undefined);
  const [isLoadingSummary, setIsLoadingSummary] = useState(true);
  const [showSummaryModal, setShowSummaryModal] = useState(false);

  // Dishes state
  const [eventDishes, setEventDishes] = useState<EventDish[]>([]);
  const [availableDishes, setAvailableDishes] = useState<AvailableDish[]>([]);
  const [isLoadingDishes, setIsLoadingDishes] = useState(false);
  const [showAddDishDialog, setShowAddDishDialog] = useState(false);
  const [selectedDishId, setSelectedDishId] = useState<string>("");
  const [selectedCourse, setSelectedCourse] = useState<string>("");

  // Load summary
  useEffect(() => {
    const loadSummary = async () => {
      setIsLoadingSummary(true);
      try {
        const result = await getEventSummary(event.id);
        if (result.success && result.summary) {
          setSummary(result.summary);
        } else {
          setSummary(null);
        }
      } catch (error) {
        console.error("Failed to load summary:", error);
        setSummary(null);
      } finally {
        setIsLoadingSummary(false);
      }
    };
    loadSummary();
  }, [event.id]);

  // Load dishes
  const loadDishes = useCallback(async () => {
    setIsLoadingDishes(true);
    try {
      const [linked, available] = await Promise.all([
        getEventDishes(event.id),
        getAvailableDishes(event.id),
      ]);
      setEventDishes(linked as EventDish[]);
      setAvailableDishes(available as AvailableDish[]);
    } catch (error) {
      console.error("Failed to load dishes:", error);
    } finally {
      setIsLoadingDishes(false);
    }
  }, [event.id]);

  useEffect(() => {
    loadDishes();
  }, [loadDishes]);

  const handleAddDish = useCallback(async () => {
    if (!selectedDishId) {
      toast.error("Please select a dish");
      return;
    }

    const result = await addDishToEvent(
      event.id,
      selectedDishId,
      selectedCourse || undefined
    );

    if (result.success) {
      toast.success("Dish added to event");
      setShowAddDishDialog(false);
      setSelectedDishId("");
      setSelectedCourse("");
      loadDishes();
    } else {
      toast.error(result.error || "Failed to add dish");
    }
  }, [event.id, selectedDishId, selectedCourse, loadDishes]);

  const handleRemoveDish = useCallback(
    async (linkId: string) => {
      const result = await removeDishFromEvent(event.id, linkId);

      if (result.success) {
        toast.success("Dish removed from event");
        loadDishes();
      } else {
        toast.error(result.error || "Failed to remove dish");
      }
    },
    [event.id, loadDishes]
  );

  const handleGenerate = useCallback(
    async (customInstructions?: string) => {
      setIsGenerating(true);
      setGenerationProgress("Analyzing event details...");

      try {
        const progressMessages = [
          "Analyzing event details...",
          "Reviewing menu items...",
          "Creating prep tasks...",
          "Creating setup tasks...",
          "Creating cleanup tasks...",
          "Finalizing breakdown...",
        ];

        let messageIndex = 0;
        const progressInterval = setInterval(() => {
          if (messageIndex < progressMessages.length) {
            setGenerationProgress(progressMessages[messageIndex]);
            messageIndex++;
          }
        }, 1500);

        const result = await generateTaskBreakdown({
          eventId: event.id,
          customInstructions,
        });

        clearInterval(progressInterval);
        setGenerationProgress("");
        setBreakdown(result);
        setShowBreakdown(true);
        router.refresh();
      } catch (error) {
        console.error("Failed to generate task breakdown:", error);
        setGenerationProgress(
          "Failed to generate breakdown. Please try again."
        );
      } finally {
        setIsGenerating(false);
      }
    },
    [event.id, router]
  );

  const handleSave = useCallback(async () => {
    if (!breakdown) {
      return;
    }

    try {
      await saveTaskBreakdown(event.id, breakdown);
      router.refresh();
    } catch (error) {
      console.error("Failed to save task breakdown:", error);
    }
  }, [breakdown, event.id, router]);

  const handleGenerateSummary =
    useCallback(async (): Promise<GeneratedEventSummary> => {
      const result = await generateEventSummary(event.id);
      setSummary(result);
      router.refresh();
      return result;
    }, [event.id, router]);

  const handleDeleteSummary = useCallback(async () => {
    if (!(summary && summary.id)) {
      return;
    }

    await deleteEventSummary(summary.id);
    setSummary(null);
  }, [summary]);

  const handleExport = useCallback(() => {
    if (!breakdown) {
      return;
    }

    const csvContent = generateCSV(breakdown);
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      event.title.replace(/[^a-z0-9]/gi, "_") + "_task_breakdown.csv"
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [breakdown, event.title]);

  return (
    <>
      <div className="flex flex-1 flex-col gap-6 p-4 pt-0">
        {/* Menu/Dishes Section */}
        <Collapsible
          className="rounded-xl border bg-card text-card-foreground shadow-sm"
          defaultOpen={true}
          id="dishes"
        >
          <div className="flex items-center justify-between gap-4 px-6 py-4">
            <div className="flex items-center gap-2">
              <UtensilsIcon className="size-5 text-emerald-500" />
              <div>
                <div className="font-semibold text-sm">Menu / Dishes</div>
                <div className="text-muted-foreground text-sm">
                  {eventDishes.length} dishes linked to this event
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Dialog
                onOpenChange={setShowAddDishDialog}
                open={showAddDishDialog}
              >
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
                      <label className="text-sm font-medium">Dish</label>
                      <Select
                        onValueChange={setSelectedDishId}
                        value={selectedDishId}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a dish" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableDishes.length === 0 ? (
                            <div className="p-2 text-sm text-muted-foreground">
                              No dishes available. Create dishes in Kitchen
                              Recipes first.
                            </div>
                          ) : (
                            availableDishes.map((dish) => (
                              <SelectItem key={dish.id} value={dish.id}>
                                {dish.name}
                                {dish.category && " (" + dish.category + ")"}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">
                        Course (optional)
                      </label>
                      <Select
                        onValueChange={setSelectedCourse}
                        value={selectedCourse}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select course" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="appetizer">Appetizer</SelectItem>
                          <SelectItem value="soup">Soup</SelectItem>
                          <SelectItem value="salad">Salad</SelectItem>
                          <SelectItem value="entree">Entree</SelectItem>
                          <SelectItem value="dessert">Dessert</SelectItem>
                          <SelectItem value="beverage">Beverage</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      onClick={() => setShowAddDishDialog(false)}
                      variant="outline"
                    >
                      Cancel
                    </Button>
                    <Button disabled={!selectedDishId} onClick={handleAddDish}>
                      Add Dish
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
              <CollapsibleTrigger asChild>
                <Button variant="ghost">
                  View dishes
                  <ChevronDownIcon />
                </Button>
              </CollapsibleTrigger>
            </div>
          </div>
          <Separator />
          <CollapsibleContent className="px-6 py-4">
            {isLoadingDishes ? (
              <div className="flex items-center justify-center py-8">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            ) : eventDishes.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="mb-4 rounded-full bg-muted p-3">
                  <UtensilsIcon className="size-6 text-muted-foreground" />
                </div>
                <p className="mb-2 text-muted-foreground text-sm">
                  No dishes linked to this event
                </p>
                <p className="mb-4 text-muted-foreground text-xs">
                  Add dishes so they can be used for prep lists and task
                  generation.
                </p>
                <Button
                  onClick={() => setShowAddDishDialog(true)}
                  size="sm"
                  variant="outline"
                >
                  <PlusIcon className="mr-2 size-3" />
                  Add First Dish
                </Button>
              </div>
            ) : (
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
                          <span className="text-amber-600">
                            No recipe linked
                          </span>
                        )}
                        {(dish.dietary_tags ?? []).length > 0 && (
                          <Badge className="text-xs" variant="outline">
                            {dish.dietary_tags?.join(", ")}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground text-xs">
                        {dish.quantity_servings} servings
                      </span>
                      <Button
                        className="size-8 text-muted-foreground hover:text-destructive"
                        onClick={() => handleRemoveDish(dish.link_id)}
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
          </CollapsibleContent>
        </Collapsible>

        {/* Budget Summary Section */}
        <Collapsible
          className="rounded-xl border bg-card text-card-foreground shadow-sm"
          defaultOpen={true}
        >
          <div className="flex items-center justify-between gap-4 px-6 py-4">
            <div className="flex items-center gap-2">
              <DollarSignIcon className="size-5 text-green-500" />
              <div>
                <div className="font-semibold text-sm">Event Budget</div>
                <div className="text-muted-foreground text-sm">
                  {budget
                    ? `${getBudgetStatusLabel(budget.status)} - v${budget.version}`
                    : "No budget created yet"}
                </div>
              </div>
            </div>
            <CollapsibleTrigger asChild>
              <Button variant="ghost">
                {budget ? "View budget" : "Create budget"}
                <ChevronDownIcon />
              </Button>
            </CollapsibleTrigger>
          </div>
          <Separator />
          <CollapsibleContent className="px-6 py-4">
            {budget ? (
              <div className="grid gap-4 md:grid-cols-4">
                <div className="rounded-lg border p-4">
                  <div className="text-muted-foreground text-xs">Total Budgeted</div>
                  <div className="text-lg font-semibold">
                    {new Intl.NumberFormat("en-US", {
                      style: "currency",
                      currency: "USD",
                    }).format(budget.total_budget_amount)}
                  </div>
                </div>
                <div className="rounded-lg border p-4">
                  <div className="text-muted-foreground text-xs">Total Actual</div>
                  <div className="text-lg font-semibold">
                    {new Intl.NumberFormat("en-US", {
                      style: "currency",
                      currency: "USD",
                    }).format(budget.total_actual_amount)}
                  </div>
                </div>
                <div className="rounded-lg border p-4">
                  <div className="text-muted-foreground text-xs">Variance</div>
                  <div className={`text-lg font-semibold ${getVarianceColor(budget.variance_amount)}`}>
                    {new Intl.NumberFormat("en-US", {
                      style: "currency",
                      currency: "USD",
                    }).format(budget.variance_amount)}
                  </div>
                </div>
                <div className="flex items-center">
                  <Button
                    className="w-full"
                    onClick={() => router.push(`/events/budgets/${budget.id}`)}
                  >
                    View Full Budget
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="mb-4 rounded-full bg-muted p-3">
                  <DollarSignIcon className="size-6 text-muted-foreground" />
                </div>
                <p className="mb-2 text-muted-foreground text-sm">
                  No budget created for this event
                </p>
                <p className="mb-4 text-muted-foreground text-xs">
                  Create a budget to track costs and manage event finances
                </p>
                <Button
                  onClick={() => router.push("/events/budgets")}
                  size="sm"
                  variant="outline"
                >
                  <PlusIcon className="mr-2 size-3" />
                  Create Budget
                </Button>
              </div>
            )}
          </CollapsibleContent>
        </Collapsible>

        <Separator />

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <SparklesIcon className="size-5 text-purple-500" />
            <h2 className="font-semibold text-lg">AI Task Assistant</h2>
          </div>
          <Button onClick={() => setShowModal(true)}>
            <SparklesIcon className="mr-2 size-4" />
            Generate Task Breakdown
          </Button>
        </div>

        {showBreakdown && breakdown && (
          <TaskBreakdownDisplay
            breakdown={breakdown}
            generationProgress={generationProgress}
            isGenerating={isGenerating}
            onExport={handleExport}
            onRegenerate={() => setShowModal(true)}
            onSave={handleSave}
          />
        )}

        {!(showBreakdown || isGenerating) && (
          <div className="rounded-xl border border-dashed p-8 text-center">
            <SparklesIcon className="mx-auto mb-4 size-12 text-muted-foreground/50" />
            <h3 className="mb-2 font-medium">
              No task breakdown generated yet
            </h3>
            <p className="mb-4 text-muted-foreground text-sm">
              Generate an AI-powered task breakdown with prep, setup, and
              cleanup tasks based on your event details and historical data.
            </p>
            <Button onClick={() => setShowModal(true)}>
              <SparklesIcon className="mr-2 size-4" />
              Generate Task Breakdown
            </Button>
          </div>
        )}

        {isGenerating && !breakdown && <TaskBreakdownSkeleton />}

        <Separator />

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <SparklesIcon className="size-5 text-primary" />
            <h2 className="font-semibold text-lg">Executive Summary</h2>
          </div>
          <Button onClick={() => setShowSummaryModal(true)}>
            <SparklesIcon className="mr-2 size-4" />
            Generate Summary
          </Button>
        </div>

        {isLoadingSummary ? (
          <EventSummarySkeleton />
        ) : (
          <EventSummaryDisplay
            eventId={event.id}
            eventTitle={event.title}
            initialSummary={summary}
            onDelete={handleDeleteSummary}
            onGenerate={handleGenerateSummary}
          />
        )}

        <Separator />

        <Collapsible className="rounded-xl border bg-card text-card-foreground shadow-sm">
          <div className="flex items-center justify-between gap-4 px-6 py-4">
            <div>
              <div className="font-semibold text-sm">Source documents</div>
              <div className="text-muted-foreground text-sm">
                {/* imports.length files attached */}0 files attached
              </div>
            </div>
            <CollapsibleTrigger asChild>
              <Button variant="ghost">
                View files
                <ChevronDownIcon />
              </Button>
            </CollapsibleTrigger>
          </div>
          <Separator />
          <CollapsibleContent className="px-6 py-4">
            <form
              action={async (formData) => {
                formData.append("eventId", event.id);
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
          </CollapsibleContent>
        </Collapsible>

        <Collapsible
          className="rounded-xl border bg-card text-card-foreground shadow-sm"
          defaultOpen={!showBreakdown}
        >
          <div className="flex items-center justify-between gap-4 px-6 py-4">
            <div>
              <div className="font-semibold text-sm">Prep tasks</div>
              <div className="text-muted-foreground text-sm">
                {initialPrepTasks.length} tasks linked to this event
              </div>
            </div>
            <CollapsibleTrigger asChild>
              <Button variant="ghost">
                View tasks
                <ChevronDownIcon />
              </Button>
            </CollapsibleTrigger>
          </div>
          <Separator />
          <CollapsibleContent className="px-6 py-4">
            {initialPrepTasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="mb-4 rounded-full bg-muted p-3">
                  <PlusIcon className="size-6 text-muted-foreground" />
                </div>
                <p className="mb-2 text-muted-foreground text-sm">
                  No prep tasks yet
                </p>
                <p className="mb-4 text-muted-foreground text-xs">
                  Generate a task breakdown or add tasks manually
                </p>
                <Button
                  onClick={() => setShowModal(true)}
                  size="sm"
                  variant="outline"
                >
                  <SparklesIcon className="mr-2 size-3" />
                  Generate with AI
                </Button>
              </div>
            ) : (
              <div className="grid gap-3">
                {initialPrepTasks.map((task) => (
                  <div
                    className="flex flex-wrap items-center justify-between gap-4 rounded-lg border px-4 py-3"
                    key={task.id}
                  >
                    <div className="flex flex-col">
                      <span className="font-medium">{task.name}</span>
                      <span className="text-muted-foreground text-xs">
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
                      <span className="text-muted-foreground text-xs">
                        {task.servingsTotal ??
                          Math.round(Number(task.quantityTotal))}
                        {task.servingsTotal ? " servings" : ""}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CollapsibleContent>
        </Collapsible>
      </div>

      <GenerateTaskBreakdownModal
        eventDate={event.eventDate.toISOString()}
        eventId={event.id}
        eventTitle={event.title}
        guestCount={event.guestCount}
        isOpen={showModal}
        onGenerate={handleGenerate}
        onOpenChange={setShowModal}
        venueName={event.venueName ?? undefined}
      />

      <GenerateEventSummaryModal
        eventId={event.id}
        eventTitle={event.title}
        isOpen={showSummaryModal}
        onGenerate={handleGenerateSummary}
        onOpenChange={setShowSummaryModal}
      />
    </>
  );
}

function generateCSV(breakdown: TaskBreakdown): string {
  const rows = [];
  rows.push(
    '"Task Name","Description","Section","Duration (min)","Relative Time","Critical","Confidence"'
  );

  const allTasks = [
    ...breakdown.prep.map((t) => ({ ...t, section: "Prep" })),
    ...breakdown.setup.map((t) => ({ ...t, section: "Setup" })),
    ...breakdown.cleanup.map((t) => ({ ...t, section: "Cleanup" })),
  ];

  for (const task of allTasks) {
    const row = [
      '"' + task.name.replace(/"/g, '""') + '"',
      '"' + (task.description || "").replace(/"/g, '""') + '"',
      task.section,
      task.durationMinutes.toString(),
      task.relativeTime || "",
      task.isCritical ? "Yes" : "No",
      task.confidence ? Math.round(task.confidence * 100).toString() : "",
    ];
    rows.push(row.join(","));
  }

  rows.push("");
  rows.push('"Total Prep Time",' + breakdown.totalPrepTime + " min");
  rows.push('"Total Setup Time",' + breakdown.totalSetupTime + " min");
  rows.push('"Total Cleanup Time",' + breakdown.totalCleanupTime + " min");
  rows.push(
    '"Grand Total",' +
      (breakdown.totalPrepTime +
        breakdown.totalSetupTime +
        breakdown.totalCleanupTime) +
      " min"
  );
  rows.push("");
  rows.push('"Generated At",' + breakdown.generatedAt.toISOString());
  rows.push('"Event Date",' + breakdown.eventDate.toISOString());
  rows.push('"Guest Count",' + breakdown.guestCount);

  return rows.join("\n");
}
