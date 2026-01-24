"use client";

Object.defineProperty(exports, "__esModule", { value: true });
exports.PrepListClient = PrepListClient;
const alert_1 = require("@repo/design-system/components/ui/alert");
const badge_1 = require("@repo/design-system/components/ui/badge");
const button_1 = require("@repo/design-system/components/ui/button");
const card_1 = require("@repo/design-system/components/ui/card");
const input_1 = require("@repo/design-system/components/ui/input");
const skeleton_1 = require("@repo/design-system/components/ui/skeleton");
const date_fns_1 = require("date-fns");
const lucide_react_1 = require("lucide-react");
const navigation_1 = require("next/navigation");
const react_1 = require("react");
const sonner_1 = require("sonner");
const STATION_ICONS = {
  "hot-line": lucide_react_1.Flame,
  "cold-prep": lucide_react_1.Snowflake,
  bakery: lucide_react_1.ChefHat,
  "prep-station": lucide_react_1.UtensilsCrossed,
  garnish: lucide_react_1.Leaf,
};
function StationCard({ station, isExpanded, onToggle }) {
  const Icon =
    STATION_ICONS[station.stationId] || lucide_react_1.UtensilsCrossed;
  return (
    <card_1.Card>
      <card_1.CardHeader
        className="cursor-pointer transition-colors hover:bg-muted/50"
        onClick={onToggle}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`rounded-lg p-2 ${station.color}`}>
              <Icon className="h-5 w-5 text-white" />
            </div>
            <div>
              <card_1.CardTitle className="text-lg">
                {station.stationName}
              </card_1.CardTitle>
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <span>{station.totalIngredients} ingredients</span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <lucide_react_1.Clock className="h-3 w-3" />
                  {station.estimatedTime}h est.
                </span>
              </div>
            </div>
          </div>
          <button_1.Button
            aria-label="Toggle details"
            size="icon"
            variant="ghost"
          >
            {isExpanded ? (
              <lucide_react_1.Check className="h-4 w-4" />
            ) : (
              <lucide_react_1.RefreshCw className="h-4 w-4" />
            )}
          </button_1.Button>
        </div>
      </card_1.CardHeader>
      {isExpanded && (
        <card_1.CardContent className="pt-6">
          {station.ingredients.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
              <lucide_react_1.UtensilsCrossed className="mb-2 h-8 w-8" />
              <p className="text-sm">No ingredients for this station</p>
            </div>
          ) : (
            <div className="space-y-4">
              {station.ingredients.map((ingredient, index) => (
                <div
                  className="flex flex-col gap-1 rounded-lg border p-3"
                  key={`${ingredient.ingredientId}-${index}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">
                          {ingredient.ingredientName}
                        </span>
                        {ingredient.isOptional && (
                          <badge_1.Badge
                            className="text-xs"
                            variant="secondary"
                          >
                            Optional
                          </badge_1.Badge>
                        )}
                        {ingredient.allergens.length > 0 && (
                          <badge_1.Badge className="text-xs" variant="outline">
                            {ingredient.allergens.join(", ")}
                          </badge_1.Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-muted-foreground text-sm">
                        <span>
                          {ingredient.scaledQuantity} {ingredient.scaledUnit}
                        </span>
                        {ingredient.preparationNotes && (
                          <span className="italic">
                            {ingredient.preparationNotes}
                          </span>
                        )}
                      </div>
                      {ingredient.dietarySubstitutions.length > 0 && (
                        <div className="mt-2 rounded-md bg-amber-50 p-2 text-amber-800 text-xs">
                          <strong>Substitution:</strong>{" "}
                          {ingredient.dietarySubstitutions.join("; ")}
                        </div>
                      )}
                    </div>
                    <button_1.Button
                      aria-label="Lock ingredient"
                      className="h-8 w-8 shrink-0"
                      size="icon"
                      variant="ghost"
                    >
                      <lucide_react_1.Check className="h-4 w-4" />
                    </button_1.Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {station.tasks.length > 0 && (
            <div className="mt-6 border-t pt-4">
              <h4 className="mb-3 font-semibold text-sm">Production Tasks</h4>
              <div className="space-y-2">
                {station.tasks.map((task) => (
                  <div
                    className="flex items-center justify-between rounded-lg border p-3"
                    key={task.id}
                  >
                    <div>
                      <div className="font-medium">{task.name}</div>
                      <div className="flex items-center gap-2 text-muted-foreground text-sm">
                        <lucide_react_1.Calendar className="h-3 w-3" />
                        Due{" "}
                        {(0, date_fns_1.format)(
                          new Date(task.dueDate),
                          "MMM d, yyyy"
                        )}
                      </div>
                    </div>
                    <badge_1.Badge
                      variant={
                        task.priority === 1 ? "destructive" : "secondary"
                      }
                    >
                      {task.priority === 1 ? "High" : "Normal"}
                    </badge_1.Badge>
                  </div>
                ))}
              </div>
            </div>
          )}
        </card_1.CardContent>
      )}
    </card_1.Card>
  );
}
function EmptyState({ onGoToEvents }) {
  return (
    <card_1.Card>
      <card_1.CardContent className="flex flex-col items-center justify-center py-16 text-center">
        <div className="mb-4 rounded-full bg-muted p-4">
          <lucide_react_1.UtensilsCrossed className="h-12 w-12 text-muted-foreground" />
        </div>
        <h3 className="mb-2 font-semibold text-lg">
          No dishes linked to event
        </h3>
        <p className="mb-6 max-w-md text-muted-foreground">
          To generate a prep list, you need to link dishes with recipes to this
          event. Add dishes from your menu to this event first.
        </p>
        <button_1.Button onClick={onGoToEvents}>
          Add Dishes to Event
        </button_1.Button>
      </card_1.CardContent>
    </card_1.Card>
  );
}
function StationSkeleton() {
  return (
    <card_1.Card>
      <card_1.CardHeader>
        <div className="flex items-center gap-3">
          <skeleton_1.Skeleton className="h-12 w-12 rounded-lg" />
          <div className="flex-1 space-y-2">
            <skeleton_1.Skeleton className="h-5 w-32" />
            <skeleton_1.Skeleton className="h-4 w-48" />
          </div>
        </div>
      </card_1.CardHeader>
      <card_1.CardContent>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <skeleton_1.Skeleton className="h-20 w-full rounded-lg" key={i} />
          ))}
        </div>
      </card_1.CardContent>
    </card_1.Card>
  );
}
function PrepListClient({ eventId, initialPrepList, availableEvents }) {
  const router = (0, navigation_1.useRouter)();
  const [prepList, setPrepList] = (0, react_1.useState)(initialPrepList);
  const [selectedEventId, setSelectedEventId] = (0, react_1.useState)(eventId);
  const [batchMultiplier, setBatchMultiplier] = (0, react_1.useState)(1);
  const [dietaryRestrictions, setDietaryRestrictions] = (0, react_1.useState)(
    []
  );
  const [isGenerating, setIsGenerating] = (0, react_1.useState)(false);
  const [isSaving, setIsSaving] = (0, react_1.useState)(false);
  const [isSavingToDb, setIsSavingToDb] = (0, react_1.useState)(false);
  const [expandedStations, setExpandedStations] = (0, react_1.useState)(
    new Set()
  );
  const handleGenerate = (0, react_1.useCallback)(async () => {
    if (!selectedEventId) {
      return;
    }
    setIsGenerating(true);
    try {
      const response = await fetch("/api/kitchen/prep-lists/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId: selectedEventId,
          batchMultiplier,
          dietaryRestrictions,
        }),
      });
      if (!response.ok) {
        throw new Error("Failed to generate prep list");
      }
      const result = await response.json();
      setPrepList(result);
      setExpandedStations(new Set(result.stationLists.map((s) => s.stationId)));
      sonner_1.toast.success("Prep list generated", {
        description: `${result.totalIngredients} ingredients across ${result.stationLists.length} stations`,
      });
    } catch (error) {
      console.error("Error generating prep list:", error);
      sonner_1.toast.error("Generation failed", {
        description: "Failed to generate prep list. Please try again.",
      });
    } finally {
      setIsGenerating(false);
    }
  }, [selectedEventId, batchMultiplier, dietaryRestrictions]);
  const handleExport = (0, react_1.useCallback)(() => {
    if (!prepList) {
      return;
    }
    const csvContent = generateCSV(prepList);
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `${prepList.eventTitle.replace(/[^a-z0-9]/gi, "_")}_prep_list.csv`
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [prepList]);
  const handleSave = (0, react_1.useCallback)(async () => {
    if (!prepList) {
      return;
    }
    setIsSaving(true);
    try {
      const response = await fetch("/api/kitchen/prep-lists/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId: prepList.eventId,
          prepList,
        }),
      });
      if (!response.ok) {
        throw new Error("Failed to save prep list");
      }
      sonner_1.toast.success("Prep list saved", {
        description: "Tasks created in Production Board",
      });
    } catch (error) {
      console.error("Error saving prep list:", error);
      sonner_1.toast.error("Save failed", {
        description: "Failed to save prep list to Production Board",
      });
    } finally {
      setIsSaving(false);
    }
  }, [prepList]);
  const handleSaveToDatabase = (0, react_1.useCallback)(async () => {
    if (!prepList) {
      return;
    }
    setIsSavingToDb(true);
    try {
      const response = await fetch("/api/kitchen/prep-lists/save-db", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId: prepList.eventId,
          prepList,
          name: `${prepList.eventTitle} - ${(0, date_fns_1.format)(new Date(prepList.eventDate), "MMM d")} Prep List`,
        }),
      });
      if (!response.ok) {
        throw new Error("Failed to save prep list to database");
      }
      const { prepListId } = await response.json();
      sonner_1.toast.success("Prep list saved to database", {
        description: "You can now access this prep list anytime",
        action: {
          label: "View",
          onClick: () => router.push(`/kitchen/prep-lists/${prepListId}`),
        },
      });
    } catch (error) {
      console.error("Error saving prep list to database:", error);
      sonner_1.toast.error("Save to database failed", {
        description: "Failed to save prep list to database",
      });
    } finally {
      setIsSavingToDb(false);
    }
  }, [prepList, router]);
  const toggleStation = (stationId) => {
    setExpandedStations((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(stationId)) {
        newSet.delete(stationId);
      } else {
        newSet.add(stationId);
      }
      return newSet;
    });
  };
  if (!prepList) {
    return (
      <div className="space-y-6">
        <EmptyState
          onGoToEvents={() => router.push(`/events/${eventId}#dishes`)}
        />
      </div>
    );
  }
  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <header className="sticky top-0 z-10 border-slate-200 border-b bg-white/80 backdrop-blur-md">
        <div className="flex flex-col gap-4 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-bold text-2xl text-slate-900">
                {prepList.eventTitle}
              </h1>
              <div className="flex items-center gap-4 text-slate-600 text-sm">
                <div className="flex items-center gap-1.5">
                  <lucide_react_1.Calendar className="h-4 w-4" />
                  {(0, date_fns_1.format)(
                    new Date(prepList.eventDate),
                    "MMM d, yyyy"
                  )}
                </div>
                <div className="flex items-center gap-1.5">
                  <lucide_react_1.Users className="h-4 w-4" />
                  {prepList.guestCount} guests
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button_1.Button
                aria-label="Export prep list"
                onClick={handleExport}
                size="icon"
                variant="outline"
              >
                <lucide_react_1.Download className="h-4 w-4" />
              </button_1.Button>
              <button_1.Button
                disabled={isSavingToDb || prepList.totalIngredients === 0}
                onClick={handleSaveToDatabase}
                size="sm"
                variant="secondary"
              >
                {isSavingToDb ? (
                  <>
                    <lucide_react_1.RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <lucide_react_1.Database className="mr-2 h-4 w-4" />
                    Save to Database
                  </>
                )}
              </button_1.Button>
              <button_1.Button
                disabled={isSaving || prepList.totalIngredients === 0}
                onClick={handleSave}
              >
                {isSaving ? (
                  <>
                    <lucide_react_1.RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <lucide_react_1.Save className="mr-2 h-4 w-4" />
                    Save to Production Board
                  </>
                )}
              </button_1.Button>
            </div>
          </div>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <label
                  className="font-medium text-slate-700 text-sm"
                  htmlFor="event-select"
                >
                  Event:
                </label>
                <select
                  className="rounded-md border-input bg-background px-3 py-2 text-sm shadow-xs outline-none ring-ring/50 focus-visible:border-ring focus-visible:ring-[3px]"
                  id="event-select"
                  onChange={(e) => setSelectedEventId(e.target.value)}
                  value={selectedEventId}
                >
                  {availableEvents.map((event) => (
                    <option key={event.id} value={event.id}>
                      {event.title} (
                      {(0, date_fns_1.format)(
                        new Date(event.eventDate),
                        "MMM d"
                      )}
                      )
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <label
                  className="font-medium text-slate-700 text-sm"
                  htmlFor="batch-size"
                >
                  Batch Size:
                </label>
                <input_1.Input
                  className="w-24"
                  id="batch-size"
                  min="0.1"
                  onChange={(e) => setBatchMultiplier(Number(e.target.value))}
                  step="0.1"
                  type="number"
                  value={batchMultiplier}
                />
                <span className="text-slate-500 text-sm">×</span>
              </div>

              <div className="flex items-center gap-2">
                <label
                  className="font-medium text-slate-700 text-sm"
                  htmlFor="dietary-restrictions"
                >
                  Dietary:
                </label>
                <select
                  className="rounded-md border-input bg-background px-3 py-2 text-sm shadow-xs outline-none ring-ring/50 focus-visible:border-ring focus-visible:ring-[3px]"
                  id="dietary-restrictions"
                  onChange={(e) =>
                    setDietaryRestrictions(
                      e.target.value
                        ? e.target.value.split(",").map((s) => s.trim())
                        : []
                    )
                  }
                  value={dietaryRestrictions.join(",")}
                >
                  <option value="">None</option>
                  <option value="gluten-free">Gluten Free</option>
                  <option value="dairy-free">Dairy Free</option>
                  <option value="vegan">Vegan</option>
                  <option value="nut-free">Nut Free</option>
                  <option value="vegetarian">Vegetarian</option>
                </select>
              </div>
            </div>

            <button_1.Button
              className="gap-2"
              disabled={isGenerating}
              onClick={handleGenerate}
            >
              {isGenerating ? (
                <>
                  <lucide_react_1.RefreshCw className="h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <lucide_react_1.RefreshCw className="h-4 w-4" />
                  Regenerate Prep List
                </>
              )}
            </button_1.Button>
          </div>
        </div>
      </header>

      <main className="flex-1 p-6">
        {isGenerating ? (
          <div className="grid gap-6 md:grid-cols-2">
            {[1, 2, 3, 4].map((i) => (
              <StationSkeleton key={i} />
            ))}
          </div>
        ) : prepList.totalIngredients === 0 ? (
          <EmptyState
            onGoToEvents={() => router.push(`/events/${eventId}#dishes`)}
          />
        ) : (
          <div className="space-y-6">
            <alert_1.Alert>
              <lucide_react_1.AlertTriangle className="h-4 w-4" />
              <alert_1.AlertTitle>Review before saving</alert_1.AlertTitle>
              <alert_1.AlertDescription>
                Review the ingredient quantities and substitutions before saving
                to the Production Board. Adjust batch size or dietary
                restrictions as needed.
              </alert_1.AlertDescription>
            </alert_1.Alert>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {prepList.stationLists.map((station) => (
                <StationCard
                  isExpanded={expandedStations.has(station.stationId)}
                  key={station.stationId}
                  onToggle={() => toggleStation(station.stationId)}
                  station={station}
                />
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
function generateCSV(prepList) {
  const rows = [];
  rows.push(
    "Station,Ingredient,Quantity,Unit,Category,Optional,Notes,Dietary Substitutions"
  );
  for (const station of prepList.stationLists) {
    for (const ingredient of station.ingredients) {
      const row = [
        `"${station.stationName}"`,
        `"${ingredient.ingredientName}"`,
        ingredient.scaledQuantity.toString(),
        `"${ingredient.scaledUnit}"`,
        `"${ingredient.category ?? ""}"`,
        ingredient.isOptional ? "Yes" : "No",
        `"${ingredient.preparationNotes ?? ""}"`,
        `"${ingredient.dietarySubstitutions.join("; ")}"`,
      ];
      rows.push(row.join(","));
    }
  }
  rows.push("");
  rows.push(`"Event","${prepList.eventTitle}"`);
  rows.push(
    `"Date","${(0, date_fns_1.format)(new Date(prepList.eventDate), "yyyy-MM-dd")}"`
  );
  rows.push(`"Guest Count","${prepList.guestCount}"`);
  rows.push(`"Batch Size","${prepList.batchMultiplier}"`);
  rows.push(`"Total Ingredients","${prepList.totalIngredients}"`);
  rows.push(`"Total Estimated Time","${prepList.totalEstimatedTime} hours"`);
  return rows.join("\n");
}
