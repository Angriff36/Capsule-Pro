"use client";

Object.defineProperty(exports, "__esModule", { value: true });
exports.EventDetailsClient = EventDetailsClient;
const badge_1 = require("@repo/design-system/components/ui/badge");
const button_1 = require("@repo/design-system/components/ui/button");
const card_1 = require("@repo/design-system/components/ui/card");
const collapsible_1 = require("@repo/design-system/components/ui/collapsible");
const dialog_1 = require("@repo/design-system/components/ui/dialog");
const select_1 = require("@repo/design-system/components/ui/select");
const separator_1 = require("@repo/design-system/components/ui/separator");
const lucide_react_1 = require("lucide-react");
const navigation_1 = require("next/navigation");
const react_1 = require("react");
const sonner_1 = require("sonner");
// Import suggestions from kitchen module (shared across modules)
const suggestions_panel_1 = require("../../kitchen/components/suggestions-panel");
const use_suggestions_1 = require("../../kitchen/lib/use-suggestions");
const use_budgets_1 = require("../../../lib/use-budgets");
const event_dishes_1 = require("../actions/event-dishes");
const event_summary_1 = require("../actions/event-summary");
const task_breakdown_1 = require("../actions/task-breakdown");
const event_summary_display_1 = require("../components/event-summary-display");
const task_breakdown_display_1 = require("../components/task-breakdown-display");
function EventDetailsClient({
  budget,
  event,
  prepTasks: initialPrepTasks,
  tenantId,
}) {
  const router = (0, navigation_1.useRouter)();
  const [breakdown, setBreakdown] = (0, react_1.useState)(null);
  const [isGenerating, setIsGenerating] = (0, react_1.useState)(false);
  const [generationProgress, setGenerationProgress] = (0, react_1.useState)("");
  const [showModal, setShowModal] = (0, react_1.useState)(false);
  const [showBreakdown, setShowBreakdown] = (0, react_1.useState)(false);
  // Summary state
  const [summary, setSummary] = (0, react_1.useState)(undefined);
  const [isLoadingSummary, setIsLoadingSummary] = (0, react_1.useState)(true);
  const [showSummaryModal, setShowSummaryModal] = (0, react_1.useState)(false);
  // Dishes state
  const [eventDishes, setEventDishes] = (0, react_1.useState)([]);
  const [availableDishes, setAvailableDishes] = (0, react_1.useState)([]);
  const [isLoadingDishes, setIsLoadingDishes] = (0, react_1.useState)(false);
  const [showAddDishDialog, setShowAddDishDialog] = (0, react_1.useState)(
    false
  );
  const [selectedDishId, setSelectedDishId] = (0, react_1.useState)("");
  const [selectedCourse, setSelectedCourse] = (0, react_1.useState)("");
  // Suggestions state
  const [showSuggestions, setShowSuggestions] = (0, react_1.useState)(false);
  const {
    suggestions,
    isLoading: suggestionsLoading,
    fetchSuggestions,
    dismissSuggestion,
    handleAction,
  } = (0, use_suggestions_1.useSuggestions)(tenantId);
  // Load summary
  (0, react_1.useEffect)(() => {
    const loadSummary = async () => {
      setIsLoadingSummary(true);
      try {
        const result = await (0, event_summary_1.getEventSummary)(event.id);
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
  const loadDishes = (0, react_1.useCallback)(async () => {
    setIsLoadingDishes(true);
    try {
      const [linked, available] = await Promise.all([
        (0, event_dishes_1.getEventDishes)(event.id),
        (0, event_dishes_1.getAvailableDishes)(event.id),
      ]);
      setEventDishes(linked);
      setAvailableDishes(available);
    } catch (error) {
      console.error("Failed to load dishes:", error);
    } finally {
      setIsLoadingDishes(false);
    }
  }, [event.id]);
  (0, react_1.useEffect)(() => {
    loadDishes();
  }, [loadDishes]);
  // Fetch suggestions on mount or when suggestions panel is opened
  (0, react_1.useEffect)(() => {
    if (tenantId && showSuggestions) {
      fetchSuggestions();
    }
  }, [tenantId, showSuggestions, fetchSuggestions]);
  const handleAddDish = (0, react_1.useCallback)(async () => {
    if (!selectedDishId) {
      sonner_1.toast.error("Please select a dish");
      return;
    }
    const result = await (0, event_dishes_1.addDishToEvent)(
      event.id,
      selectedDishId,
      selectedCourse || undefined
    );
    if (result.success) {
      sonner_1.toast.success("Dish added to event");
      setShowAddDishDialog(false);
      setSelectedDishId("");
      setSelectedCourse("");
      loadDishes();
    } else {
      sonner_1.toast.error(result.error || "Failed to add dish");
    }
  }, [event.id, selectedDishId, selectedCourse, loadDishes]);
  const handleRemoveDish = (0, react_1.useCallback)(
    async (linkId) => {
      const result = await (0, event_dishes_1.removeDishFromEvent)(
        event.id,
        linkId
      );
      if (result.success) {
        sonner_1.toast.success("Dish removed from event");
        loadDishes();
      } else {
        sonner_1.toast.error(result.error || "Failed to remove dish");
      }
    },
    [event.id, loadDishes]
  );
  const handleGenerate = (0, react_1.useCallback)(
    async (customInstructions) => {
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
        const result = await (0, task_breakdown_1.generateTaskBreakdown)({
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
  const handleSave = (0, react_1.useCallback)(async () => {
    if (!breakdown) {
      return;
    }
    try {
      await (0, task_breakdown_1.saveTaskBreakdown)(event.id, breakdown);
      router.refresh();
    } catch (error) {
      console.error("Failed to save task breakdown:", error);
    }
  }, [breakdown, event.id, router]);
  const handleGenerateSummary = (0, react_1.useCallback)(async () => {
    const result = await (0, event_summary_1.generateEventSummary)(event.id);
    setSummary(result);
    router.refresh();
    return result;
  }, [event.id, router]);
  const handleDeleteSummary = (0, react_1.useCallback)(async () => {
    if (!(summary && summary.id)) {
      return;
    }
    await (0, event_summary_1.deleteEventSummary)(summary.id);
    setSummary(null);
  }, [summary]);
  const handleExport = (0, react_1.useCallback)(() => {
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
        <collapsible_1.Collapsible
          className="rounded-xl border bg-card text-card-foreground shadow-sm"
          defaultOpen={true}
          id="dishes"
        >
          <div className="flex items-center justify-between gap-4 px-6 py-4">
            <div className="flex items-center gap-2">
              <lucide_react_1.UtensilsIcon className="size-5 text-emerald-500" />
              <div>
                <div className="font-semibold text-sm">Menu / Dishes</div>
                <div className="text-muted-foreground text-sm">
                  {eventDishes.length} dishes linked to this event
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <dialog_1.Dialog
                onOpenChange={setShowAddDishDialog}
                open={showAddDishDialog}
              >
                <dialog_1.DialogTrigger asChild>
                  <button_1.Button size="sm" variant="outline">
                    <lucide_react_1.PlusIcon className="mr-2 size-3" />
                    Add Dish
                  </button_1.Button>
                </dialog_1.DialogTrigger>
                <dialog_1.DialogContent>
                  <dialog_1.DialogHeader>
                    <dialog_1.DialogTitle>
                      Add Dish to Event
                    </dialog_1.DialogTitle>
                    <dialog_1.DialogDescription>
                      Select a dish from your menu to add to this event.
                    </dialog_1.DialogDescription>
                  </dialog_1.DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Dish</label>
                      <select_1.Select
                        onValueChange={setSelectedDishId}
                        value={selectedDishId}
                      >
                        <select_1.SelectTrigger>
                          <select_1.SelectValue placeholder="Select a dish" />
                        </select_1.SelectTrigger>
                        <select_1.SelectContent>
                          {availableDishes.length === 0 ? (
                            <div className="p-2 text-sm text-muted-foreground">
                              No dishes available. Create dishes in Kitchen
                              Recipes first.
                            </div>
                          ) : (
                            availableDishes.map((dish) => (
                              <select_1.SelectItem
                                key={dish.id}
                                value={dish.id}
                              >
                                {dish.name}
                                {dish.category && " (" + dish.category + ")"}
                              </select_1.SelectItem>
                            ))
                          )}
                        </select_1.SelectContent>
                      </select_1.Select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">
                        Course (optional)
                      </label>
                      <select_1.Select
                        onValueChange={setSelectedCourse}
                        value={selectedCourse}
                      >
                        <select_1.SelectTrigger>
                          <select_1.SelectValue placeholder="Select course" />
                        </select_1.SelectTrigger>
                        <select_1.SelectContent>
                          <select_1.SelectItem value="appetizer">
                            Appetizer
                          </select_1.SelectItem>
                          <select_1.SelectItem value="soup">
                            Soup
                          </select_1.SelectItem>
                          <select_1.SelectItem value="salad">
                            Salad
                          </select_1.SelectItem>
                          <select_1.SelectItem value="entree">
                            Entree
                          </select_1.SelectItem>
                          <select_1.SelectItem value="dessert">
                            Dessert
                          </select_1.SelectItem>
                          <select_1.SelectItem value="beverage">
                            Beverage
                          </select_1.SelectItem>
                          <select_1.SelectItem value="other">
                            Other
                          </select_1.SelectItem>
                        </select_1.SelectContent>
                      </select_1.Select>
                    </div>
                  </div>
                  <dialog_1.DialogFooter>
                    <button_1.Button
                      onClick={() => setShowAddDishDialog(false)}
                      variant="outline"
                    >
                      Cancel
                    </button_1.Button>
                    <button_1.Button
                      disabled={!selectedDishId}
                      onClick={handleAddDish}
                    >
                      Add Dish
                    </button_1.Button>
                  </dialog_1.DialogFooter>
                </dialog_1.DialogContent>
              </dialog_1.Dialog>
              <collapsible_1.CollapsibleTrigger asChild>
                <button_1.Button variant="ghost">
                  View dishes
                  <lucide_react_1.ChevronDownIcon />
                </button_1.Button>
              </collapsible_1.CollapsibleTrigger>
            </div>
          </div>
          <separator_1.Separator />
          <collapsible_1.CollapsibleContent className="px-6 py-4">
            {isLoadingDishes ? (
              <div className="flex items-center justify-center py-8">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            ) : eventDishes.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="mb-4 rounded-full bg-muted p-3">
                  <lucide_react_1.UtensilsIcon className="size-6 text-muted-foreground" />
                </div>
                <p className="mb-2 text-muted-foreground text-sm">
                  No dishes linked to this event
                </p>
                <p className="mb-4 text-muted-foreground text-xs">
                  Add dishes so they can be used for prep lists and task
                  generation.
                </p>
                <button_1.Button
                  onClick={() => setShowAddDishDialog(true)}
                  size="sm"
                  variant="outline"
                >
                  <lucide_react_1.PlusIcon className="mr-2 size-3" />
                  Add First Dish
                </button_1.Button>
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
                          <badge_1.Badge
                            className="text-xs"
                            variant="secondary"
                          >
                            {dish.course}
                          </badge_1.Badge>
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
                          <badge_1.Badge className="text-xs" variant="outline">
                            {dish.dietary_tags?.join(", ")}
                          </badge_1.Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground text-xs">
                        {dish.quantity_servings} servings
                      </span>
                      <button_1.Button
                        className="size-8 text-muted-foreground hover:text-destructive"
                        onClick={() => handleRemoveDish(dish.link_id)}
                        size="icon"
                        variant="ghost"
                      >
                        <lucide_react_1.TrashIcon className="size-4" />
                      </button_1.Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </collapsible_1.CollapsibleContent>
        </collapsible_1.Collapsible>

        {/* Budget Summary Section */}
        <collapsible_1.Collapsible
          className="rounded-xl border bg-card text-card-foreground shadow-sm"
          defaultOpen={true}
        >
          <div className="flex items-center justify-between gap-4 px-6 py-4">
            <div className="flex items-center gap-2">
              <lucide_react_1.DollarSignIcon className="size-5 text-green-500" />
              <div>
                <div className="font-semibold text-sm">Event Budget</div>
                <div className="text-muted-foreground text-sm">
                  {budget && budget.status
                    ? `${(0, use_budgets_1.getBudgetStatusLabel)(budget.status)} - v${budget.version ?? 1}`
                    : "No budget created yet"}
                </div>
              </div>
            </div>
            <collapsible_1.CollapsibleTrigger asChild>
              <button_1.Button variant="ghost">
                {budget ? "View budget" : "Create budget"}
                <lucide_react_1.ChevronDownIcon />
              </button_1.Button>
            </collapsible_1.CollapsibleTrigger>
          </div>
          <separator_1.Separator />
          <collapsible_1.CollapsibleContent className="px-6 py-4">
            {budget ? (
              <div className="grid gap-4 md:grid-cols-4">
                <div className="rounded-lg border p-4">
                  <div className="text-muted-foreground text-xs">
                    Total Budgeted
                  </div>
                  <div className="text-lg font-semibold">
                    {new Intl.NumberFormat("en-US", {
                      style: "currency",
                      currency: "USD",
                    }).format(budget.total_budget_amount ?? 0)}
                  </div>
                </div>
                <div className="rounded-lg border p-4">
                  <div className="text-muted-foreground text-xs">
                    Total Actual
                  </div>
                  <div className="text-lg font-semibold">
                    {new Intl.NumberFormat("en-US", {
                      style: "currency",
                      currency: "USD",
                    }).format(budget.total_actual_amount ?? 0)}
                  </div>
                </div>
                <div className="rounded-lg border p-4">
                  <div className="text-muted-foreground text-xs">Variance</div>
                  <div
                    className={`text-lg font-semibold ${(0, use_budgets_1.getVarianceColor)(budget.variance_amount ?? 0)}`}
                  >
                    {new Intl.NumberFormat("en-US", {
                      style: "currency",
                      currency: "USD",
                    }).format(budget.variance_amount ?? 0)}
                  </div>
                </div>
                <div className="flex items-center">
                  <button_1.Button
                    className="w-full"
                    onClick={() => router.push(`/events/budgets/${budget.id}`)}
                  >
                    View Full Budget
                  </button_1.Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="mb-4 rounded-full bg-muted p-3">
                  <lucide_react_1.DollarSignIcon className="size-6 text-muted-foreground" />
                </div>
                <p className="mb-2 text-muted-foreground text-sm">
                  No budget created for this event
                </p>
                <p className="mb-4 text-muted-foreground text-xs">
                  Create a budget to track costs and manage event finances
                </p>
                <button_1.Button
                  onClick={() => router.push("/events/budgets")}
                  size="sm"
                  variant="outline"
                >
                  <lucide_react_1.PlusIcon className="mr-2 size-3" />
                  Create Budget
                </button_1.Button>
              </div>
            )}
          </collapsible_1.CollapsibleContent>
        </collapsible_1.Collapsible>

        <separator_1.Separator />

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <lucide_react_1.SparklesIcon className="size-5 text-purple-500" />
            <h2 className="font-semibold text-lg">AI Task Assistant</h2>
          </div>
          <button_1.Button onClick={() => setShowModal(true)}>
            <lucide_react_1.SparklesIcon className="mr-2 size-4" />
            Generate Task Breakdown
          </button_1.Button>
        </div>

        {showBreakdown && breakdown && (
          <task_breakdown_display_1.TaskBreakdownDisplay
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
            <lucide_react_1.SparklesIcon className="mx-auto mb-4 size-12 text-muted-foreground/50" />
            <h3 className="mb-2 font-medium">
              No task breakdown generated yet
            </h3>
            <p className="mb-4 text-muted-foreground text-sm">
              Generate an AI-powered task breakdown with prep, setup, and
              cleanup tasks based on your event details and historical data.
            </p>
            <button_1.Button onClick={() => setShowModal(true)}>
              <lucide_react_1.SparklesIcon className="mr-2 size-4" />
              Generate Task Breakdown
            </button_1.Button>
          </div>
        )}

        {isGenerating && !breakdown && (
          <task_breakdown_display_1.TaskBreakdownSkeleton />
        )}

        <separator_1.Separator />

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <lucide_react_1.SparklesIcon className="size-5 text-primary" />
            <h2 className="font-semibold text-lg">Executive Summary</h2>
          </div>
          <button_1.Button onClick={() => setShowSummaryModal(true)}>
            <lucide_react_1.SparklesIcon className="mr-2 size-4" />
            Generate Summary
          </button_1.Button>
        </div>

        {isLoadingSummary ? (
          <event_summary_display_1.EventSummarySkeleton />
        ) : (
          <event_summary_display_1.EventSummaryDisplay
            eventId={event.id}
            eventTitle={event.title}
            initialSummary={summary}
            onDelete={handleDeleteSummary}
            onGenerate={handleGenerateSummary}
          />
        )}

        <separator_1.Separator />

        {/* AI Suggestions Section */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <lucide_react_1.Lightbulb className="size-5 text-amber-500" />
            <h2 className="font-semibold text-lg">AI Suggestions</h2>
          </div>
          <button_1.Button
            onClick={() => setShowSuggestions((prev) => !prev)}
            variant={showSuggestions ? "default" : "outline"}
          >
            <lucide_react_1.SparklesIcon className="mr-2 size-4" />
            {showSuggestions ? "Hide Suggestions" : "Show Suggestions"}
            {suggestions.length > 0 && (
              <badge_1.Badge className="ml-2" variant="secondary">
                {suggestions.length}
              </badge_1.Badge>
            )}
          </button_1.Button>
        </div>

        {showSuggestions ? (
          <card_1.Card className="border-slate-200 shadow-sm">
            <suggestions_panel_1.SuggestionsPanel
              isLoading={suggestionsLoading}
              onAction={handleAction}
              onClose={() => setShowSuggestions(false)}
              onDismiss={dismissSuggestion}
              onRefresh={fetchSuggestions}
              suggestions={suggestions}
            />
          </card_1.Card>
        ) : suggestions.length > 0 ? (
          <card_1.Card className="border-purple-200 bg-purple-50/50 shadow-sm">
            <card_1.CardHeader className="pb-3">
              <card_1.CardTitle className="flex items-center gap-2 font-semibold text-sm text-purple-900">
                <lucide_react_1.Lightbulb className="size-4 text-purple-600" />
                AI Suggestions Available
              </card_1.CardTitle>
            </card_1.CardHeader>
            <card_1.CardContent className="space-y-3">
              <p className="text-purple-700 text-xs">
                You have {suggestions.length} suggestion
                {suggestions.length !== 1 ? "s" : ""} that could help optimize
                this event.
              </p>
              <button_1.Button
                className="w-full bg-purple-600 text-white hover:bg-purple-700"
                onClick={() => setShowSuggestions(true)}
                size="sm"
              >
                <lucide_react_1.SparklesIcon className="mr-2 size-3" />
                View Suggestions
              </button_1.Button>
            </card_1.CardContent>
          </card_1.Card>
        ) : null}

        <separator_1.Separator />

        <collapsible_1.Collapsible className="rounded-xl border bg-card text-card-foreground shadow-sm">
          <div className="flex items-center justify-between gap-4 px-6 py-4">
            <div>
              <div className="font-semibold text-sm">Source documents</div>
              <div className="text-muted-foreground text-sm">
                {/* imports.length files attached */}0 files attached
              </div>
            </div>
            <collapsible_1.CollapsibleTrigger asChild>
              <button_1.Button variant="ghost">
                View files
                <lucide_react_1.ChevronDownIcon />
              </button_1.Button>
            </collapsible_1.CollapsibleTrigger>
          </div>
          <separator_1.Separator />
          <collapsible_1.CollapsibleContent className="px-6 py-4">
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
                <button_1.Button type="submit" variant="secondary">
                  Attach file
                </button_1.Button>
              </div>
            </form>
          </collapsible_1.CollapsibleContent>
        </collapsible_1.Collapsible>

        <collapsible_1.Collapsible
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
            <collapsible_1.CollapsibleTrigger asChild>
              <button_1.Button variant="ghost">
                View tasks
                <lucide_react_1.ChevronDownIcon />
              </button_1.Button>
            </collapsible_1.CollapsibleTrigger>
          </div>
          <separator_1.Separator />
          <collapsible_1.CollapsibleContent className="px-6 py-4">
            {initialPrepTasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="mb-4 rounded-full bg-muted p-3">
                  <lucide_react_1.PlusIcon className="size-6 text-muted-foreground" />
                </div>
                <p className="mb-2 text-muted-foreground text-sm">
                  No prep tasks yet
                </p>
                <p className="mb-4 text-muted-foreground text-xs">
                  Generate a task breakdown or add tasks manually
                </p>
                <button_1.Button
                  onClick={() => setShowModal(true)}
                  size="sm"
                  variant="outline"
                >
                  <lucide_react_1.SparklesIcon className="mr-2 size-3" />
                  Generate with AI
                </button_1.Button>
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
          </collapsible_1.CollapsibleContent>
        </collapsible_1.Collapsible>
      </div>

      <task_breakdown_display_1.GenerateTaskBreakdownModal
        eventDate={event.eventDate.toISOString()}
        eventId={event.id}
        eventTitle={event.title}
        guestCount={event.guestCount}
        isOpen={showModal}
        onGenerate={handleGenerate}
        onOpenChange={setShowModal}
        venueName={event.venueName ?? undefined}
      />

      <event_summary_display_1.GenerateEventSummaryModal
        eventId={event.id}
        eventTitle={event.title}
        isOpen={showSummaryModal}
        onGenerate={handleGenerateSummary}
        onOpenChange={setShowSummaryModal}
      />
    </>
  );
}
function generateCSV(breakdown) {
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
