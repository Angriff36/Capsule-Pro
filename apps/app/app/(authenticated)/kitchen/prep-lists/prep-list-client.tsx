"use client";

import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@repo/design-system/components/ui/alert";
import { Badge } from "@repo/design-system/components/ui/badge";
import { Button } from "@repo/design-system/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";
import { Input } from "@repo/design-system/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/design-system/components/ui/select";
import { Separator } from "@repo/design-system/components/ui/separator";
import { Skeleton } from "@repo/design-system/components/ui/skeleton";
import { format } from "date-fns";
import {
  AlertTriangle,
  Calendar,
  Check,
  ChefHat,
  Clock,
  Download,
  Flame,
  Leaf,
  RefreshCw,
  Save,
  Snowflake,
  Users,
  UtensilsCrossed,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { apiFetch } from "@/app/lib/api";
import type {
  IngredientItem,
  PrepListGenerationResult,
  StationPrepList,
} from "./actions";
import { PrepListSaveButton } from "./components/prep-list-form-with-constraints";

interface PrepListClientProps {
  eventId: string;
  initialPrepList: PrepListGenerationResult | null;
  availableEvents: Array<{
    id: string;
    title: string;
    eventDate: Date;
    guestCount: number;
  }>;
}

const STATION_ICONS = {
  "hot-line": Flame,
  "cold-prep": Snowflake,
  bakery: ChefHat,
  "prep-station": UtensilsCrossed,
  garnish: Leaf,
};

function StationCard({
  station,
  isExpanded,
  onToggle,
}: {
  station: StationPrepList;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const Icon =
    STATION_ICONS[station.stationId as keyof typeof STATION_ICONS] ||
    UtensilsCrossed;

  return (
    <Card>
      <CardHeader
        className="cursor-pointer transition-colors hover:bg-muted/50"
        onClick={onToggle}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`rounded-lg p-2 ${station.color}`}>
              <Icon className="h-5 w-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-lg">{station.stationName}</CardTitle>
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <span>{station.totalIngredients} ingredients</span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {station.estimatedTime}h est.
                </span>
              </div>
            </div>
          </div>
          <Button aria-label="Toggle details" size="icon" variant="ghost">
            {isExpanded ? (
              <Check className="h-4 w-4" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
          </Button>
        </div>
      </CardHeader>
      {isExpanded && (
        <CardContent className="pt-6">
          {station.ingredients.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
              <UtensilsCrossed className="mb-2 h-8 w-8" />
              <p className="text-sm">No ingredients for this station</p>
            </div>
          ) : (
            <div className="space-y-4">
              {station.ingredients.map(
                (ingredient: IngredientItem, index: number) => (
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
                            <Badge className="text-xs" variant="secondary">
                              Optional
                            </Badge>
                          )}
                          {ingredient.allergens.length > 0 && (
                            <Badge className="text-xs" variant="outline">
                              {ingredient.allergens.join(", ")}
                            </Badge>
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
                      <Button
                        aria-label="Lock ingredient"
                        className="h-8 w-8 shrink-0"
                        size="icon"
                        variant="ghost"
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )
              )}
            </div>
          )}

          {station.tasks.length > 0 && (
            <div className="mt-6 space-y-4">
              <Separator />
              <h4 className="font-medium text-sm text-muted-foreground">
                Production Tasks
              </h4>
              <div className="space-y-2">
                {station.tasks.map(
                  (task: {
                    id: string;
                    name: string;
                    dueDate: Date;
                    status: string;
                    priority: number;
                  }) => (
                    <div
                      className="flex items-center justify-between rounded-lg border p-3"
                      key={task.id}
                    >
                      <div>
                        <div className="font-medium">{task.name}</div>
                        <div className="flex items-center gap-2 text-muted-foreground text-sm">
                          <Calendar className="h-3 w-3" />
                          Due {format(new Date(task.dueDate), "MMM d, yyyy")}
                        </div>
                      </div>
                      <Badge
                        variant={
                          task.priority === 1 ? "destructive" : "secondary"
                        }
                      >
                        {task.priority === 1 ? "High" : "Normal"}
                      </Badge>
                    </div>
                  )
                )}
              </div>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}

function EmptyState({ onGoToEvents }: { onGoToEvents: () => void }) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-16 text-center">
        <div className="mb-4 rounded-full bg-muted p-4">
          <UtensilsCrossed className="h-12 w-12 text-muted-foreground" />
        </div>
        <h3 className="mb-2 font-semibold text-lg">
          No dishes linked to event
        </h3>
        <p className="mb-6 max-w-md text-muted-foreground">
          To generate a prep list, you need to link dishes with recipes to this
          event. Add dishes from your menu to this event first.
        </p>
        <Button onClick={onGoToEvents}>Add Dishes to Event</Button>
      </CardContent>
    </Card>
  );
}

function StationSkeleton() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <Skeleton className="h-12 w-12 rounded-lg" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-48" />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton className="h-20 w-full rounded-lg" key={i} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function PrepListClient({
  eventId,
  initialPrepList,
  availableEvents,
}: PrepListClientProps) {
  const router = useRouter();
  const [prepList, setPrepList] = useState<PrepListGenerationResult | null>(
    initialPrepList
  );
  const [selectedEventId, setSelectedEventId] = useState<string>(eventId);
  const [batchMultiplier, setBatchMultiplier] = useState<number>(1);
  const [dietaryRestrictions, setDietaryRestrictions] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingToDb, setIsSavingToDb] = useState(false);
  const [expandedStations, setExpandedStations] = useState<Set<string>>(
    new Set()
  );

  const handleGenerate = useCallback(async () => {
    if (!selectedEventId) {
      return;
    }

    setIsGenerating(true);
    try {
      const response = await apiFetch("/api/kitchen/prep-lists/generate", {
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
      setExpandedStations(
        new Set(result.stationLists.map((s: StationPrepList) => s.stationId))
      );

      toast.success("Prep list generated", {
        description: `${result.totalIngredients} ingredients across ${result.stationLists.length} stations`,
      });
    } catch (error) {
      console.error("Error generating prep list:", error);
      toast.error("Generation failed", {
        description: "Failed to generate prep list. Please try again.",
      });
    } finally {
      setIsGenerating(false);
    }
  }, [selectedEventId, batchMultiplier, dietaryRestrictions]);

  const handleExport = useCallback(() => {
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

  const handleSave = useCallback(async () => {
    if (!prepList) {
      return;
    }

    setIsSaving(true);
    try {
      const response = await apiFetch("/api/kitchen/prep-lists/save", {
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

      toast.success("Prep list saved", {
        description: "Tasks created in Production Board",
      });
    } catch (error) {
      console.error("Error saving prep list:", error);
      toast.error("Save failed", {
        description: "Failed to save prep list to Production Board",
      });
    } finally {
      setIsSaving(false);
    }
  }, [prepList]);

  const handleSaveToDatabase = useCallback(async () => {
    if (!prepList) {
      return;
    }

    setIsSavingToDb(true);
    try {
      const response = await apiFetch("/api/kitchen/prep-lists/save-db", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId: prepList.eventId,
          prepList,
          name: `${prepList.eventTitle} - ${format(new Date(prepList.eventDate), "MMM d")} Prep List`,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save prep list to database");
      }

      const { prepListId } = await response.json();

      toast.success("Prep list saved to database", {
        description: "You can now access this prep list anytime",
        action: {
          label: "View",
          onClick: () => router.push(`/kitchen/prep-lists/${prepListId}`),
        },
      });
    } catch (error) {
      console.error("Error saving prep list to database:", error);
      toast.error("Save to database failed", {
        description: "Failed to save prep list to database",
      });
    } finally {
      setIsSavingToDb(false);
    }
  }, [prepList, router]);

  const toggleStation = (stationId: string) => {
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
                  <Calendar className="h-4 w-4" />
                  {format(new Date(prepList.eventDate), "MMM d, yyyy")}
                </div>
                <div className="flex items-center gap-1.5">
                  <Users className="h-4 w-4" />
                  {prepList.guestCount} guests
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                aria-label="Export prep list"
                onClick={handleExport}
                size="icon"
                variant="outline"
              >
                <Download className="h-4 w-4" />
              </Button>
              <PrepListSaveButton
                disabled={prepList.totalIngredients === 0}
                prepList={prepList}
              />
              <Button
                disabled={isSaving || prepList.totalIngredients === 0}
                onClick={handleSave}
              >
                {isSaving ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save to Production Board
                  </>
                )}
              </Button>
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
                <Select
                  onValueChange={(value) => setSelectedEventId(value)}
                  value={selectedEventId}
                >
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Select an event" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableEvents.map((event) => (
                      <SelectItem key={event.id} value={event.id}>
                        {event.title} (
                        {format(new Date(event.eventDate), "MMM d")})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2">
                <label
                  className="font-medium text-slate-700 text-sm"
                  htmlFor="batch-size"
                >
                  Batch Size:
                </label>
                <Input
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
                <Select
                  onValueChange={(value) =>
                    setDietaryRestrictions(
                      value ? value.split(",").map((s) => s.trim()) : []
                    )
                  }
                  value={dietaryRestrictions.join(",")}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="None" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">None</SelectItem>
                    <SelectItem value="gluten-free">Gluten Free</SelectItem>
                    <SelectItem value="dairy-free">Dairy Free</SelectItem>
                    <SelectItem value="vegan">Vegan</SelectItem>
                    <SelectItem value="nut-free">Nut Free</SelectItem>
                    <SelectItem value="vegetarian">Vegetarian</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button
              className="gap-2"
              disabled={isGenerating}
              onClick={handleGenerate}
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4" />
                  Regenerate Prep List
                </>
              )}
            </Button>
          </div>
        </div>
      </header>

      <Separator />

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
          <div className="space-y-8">
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Review before saving</AlertTitle>
              <AlertDescription>
                Review the ingredient quantities and substitutions before saving
                to the Production Board. Adjust batch size or dietary
                restrictions as needed.
              </AlertDescription>
            </Alert>

            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-medium text-sm text-muted-foreground">
                  Station Prep Lists
                </h2>
                <Badge variant="secondary">
                  {prepList.stationLists.length} stations
                </Badge>
              </div>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {prepList.stationLists.map((station: StationPrepList) => (
                  <StationCard
                    isExpanded={expandedStations.has(station.stationId)}
                    key={station.stationId}
                    onToggle={() => toggleStation(station.stationId)}
                    station={station}
                  />
                ))}
              </div>
            </section>
          </div>
        )}
      </main>
    </div>
  );
}

function generateCSV(prepList: PrepListGenerationResult): string {
  const rows: string[] = [];
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
  rows.push(`"Date","${format(new Date(prepList.eventDate), "yyyy-MM-dd")}"`);
  rows.push(`"Guest Count","${prepList.guestCount}"`);
  rows.push(`"Batch Size","${prepList.batchMultiplier}"`);
  rows.push(`"Total Ingredients","${prepList.totalIngredients}"`);
  rows.push(`"Total Estimated Time","${prepList.totalEstimatedTime} hours"`);

  return rows.join("\n");
}
