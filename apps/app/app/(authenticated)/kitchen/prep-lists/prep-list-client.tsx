"use client";

import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@repo/design-system/components/ui/alert";
import { Badge } from "@repo/design-system/components/ui/badge";
import { Button } from "@repo/design-system/components/ui/button";
import { Input } from "@repo/design-system/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/design-system/components/ui/select";
import { Separator } from "@repo/design-system/components/ui/separator";
import { captureException } from "@sentry/nextjs";
import { format } from "date-fns";
import {
  AlertTriangle,
  Calendar,
  Download,
  FileText,
  RefreshCw,
  Users,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { PrintFooter, PrintViewButton } from "@/app/components/print-view";
// NOTE: Keeping apiFetch for the custom prep-lists generate endpoint
// — generated client has prepListCreate/prepListItemMarkCompleted but these target different
//   API routes and semantics (Manifest command dispatch vs. custom action endpoints)
import { apiFetch } from "@/app/lib/api";
import type { PrepListGenerationResult, StationPrepList } from "./actions";
import {
  AllDishesUnresolvedState,
  GenerationErrorState,
  NoLinkedDishesState,
  NotGeneratedState,
  PartiallyUnresolvedAlert,
} from "./components/generation-states";
import { PrepListSaveButton } from "./components/prep-list-form-with-constraints";
import { StationCard, StationSkeleton } from "./components/station-card";
import { getEventMenuDishesHref } from "./navigation";

interface PrepListClientProps {
  availableEvents: Array<{
    id: string;
    title: string;
    eventDate: Date;
    guestCount: number;
  }>;
  eventId: string;
  initialError: string | null;
  initialPrepList: PrepListGenerationResult | null;
}

export function PrepListClient({
  eventId,
  initialPrepList,
  initialError,
  availableEvents,
}: PrepListClientProps) {
  const router = useRouter();
  const [prepList, setPrepList] = useState<PrepListGenerationResult | null>(
    initialPrepList
  );
  const [generationError, setGenerationError] = useState<string | null>(
    initialError
  );
  const [savedPrepListId, setSavedPrepListId] = useState<string | null>(null);
  const [selectedEventId, setSelectedEventId] = useState<string>(eventId);
  const [batchMultiplier, setBatchMultiplier] = useState<number>(1);
  const [dietaryRestrictions, setDietaryRestrictions] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [expandedStations, setExpandedStations] = useState<Set<string>>(
    new Set(initialPrepList?.stationLists.map((s) => s.stationId) ?? [])
  );
  const [reviewedIngredients, setReviewedIngredients] = useState<Set<string>>(
    new Set()
  );

  const goToEventMenu = useCallback(() => {
    router.push(getEventMenuDishesHref(selectedEventId || eventId));
  }, [router, selectedEventId, eventId]);

  // Local review marks for the generated preview only. Real completion
  // tracking lives on the saved detail page (/kitchen/prep-lists/[id]),
  // where PrepListItem rows (and their ids) exist — saving navigates there.
  const handleReviewIngredient = useCallback((ingredientId: string) => {
    setReviewedIngredients((prev) => {
      const next = new Set(prev);
      if (next.has(ingredientId)) {
        next.delete(ingredientId);
      } else {
        next.add(ingredientId);
      }
      return next;
    });
  }, []);

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
        const body = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(
          body?.error ?? `Generation failed (HTTP ${response.status})`
        );
      }

      const result = (await response.json()) as PrepListGenerationResult;
      setPrepList(result);
      setGenerationError(null);
      setSavedPrepListId(null);
      setReviewedIngredients(new Set());
      setExpandedStations(
        new Set(result.stationLists.map((s: StationPrepList) => s.stationId))
      );

      if (result.totalIngredients === 0) {
        toast.warning("No ingredients generated", {
          description:
            result.linkedDishCount === 0
              ? "This event has no dishes linked to it."
              : `${result.unresolvedDishes.length} linked dish(es) could not be expanded — see details below.`,
        });
      } else {
        toast.success("Prep list generated", {
          description: `${result.totalIngredients} ingredients across ${result.stationLists.length} stations`,
        });
      }
    } catch (error) {
      captureException(error);
      const message =
        error instanceof Error ? error.message : "Failed to generate prep list";
      setGenerationError(message);
      toast.error("Generation failed", { description: message });
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

  const handleDownloadPdf = useCallback(async () => {
    if (!savedPrepListId) {
      toast.error("Please save the prep list first before exporting PDF");
      return;
    }

    setIsDownloadingPdf(true);
    try {
      // NOTE: Using raw fetch (not apiFetch) for binary PDF download.
      // download=true makes the API return the raw PDF blob instead of the
      // base64 JSON envelope (which would save as a corrupt .pdf).
      const response = await fetch(
        `/api/kitchen/prep-lists/${savedPrepListId}/pdf?download=true`,
        {
          method: "GET",
          credentials: "include",
        }
      );

      if (!response.ok) {
        throw new Error(`PDF generation failed: ${response.status}`);
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${(prepList?.eventTitle ?? "prep_list").replace(/[^a-z0-9]/gi, "_")}_prep_list.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success("PDF downloaded successfully");
    } catch (error) {
      captureException(error);
      toast.error("Failed to generate PDF. Please try again.");
    } finally {
      setIsDownloadingPdf(false);
    }
  }, [savedPrepListId, prepList]);

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

  const renderBody = () => {
    if (isGenerating) {
      return (
        <div className="grid gap-6 md:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <StationSkeleton key={i} />
          ))}
        </div>
      );
    }

    if (!prepList) {
      return generationError ? (
        <GenerationErrorState
          message={generationError}
          onRetry={handleGenerate}
        />
      ) : (
        <NotGeneratedState />
      );
    }

    if (prepList.linkedDishCount === 0) {
      return <NoLinkedDishesState onGoToEventMenu={goToEventMenu} />;
    }

    if (prepList.totalIngredients === 0) {
      return (
        <AllDishesUnresolvedState
          linkedDishCount={prepList.linkedDishCount}
          onGoToEventMenu={goToEventMenu}
          unresolvedDishes={prepList.unresolvedDishes}
        />
      );
    }

    return (
      <div className="space-y-8">
        {prepList.unresolvedDishes.length > 0 && (
          <PartiallyUnresolvedAlert
            unresolvedDishes={prepList.unresolvedDishes}
          />
        )}

        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Review before saving</AlertTitle>
          <AlertDescription>
            Review the ingredient quantities and substitutions before saving to
            the Production Board. Adjust batch size or dietary restrictions as
            needed.
          </AlertDescription>
        </Alert>

        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-medium text-muted-foreground text-sm">
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
                onReviewIngredient={handleReviewIngredient}
                onToggle={() => toggleStation(station.stationId)}
                reviewedIngredients={reviewedIngredients}
                savedPrepListId={savedPrepListId}
                station={station}
              />
            ))}
          </div>
        </section>

        <PrintFooter
          caption={`${prepList.eventTitle} — Prep List`}
          path={`/kitchen/prep-lists?eventId=${selectedEventId || eventId}`}
        />
      </div>
    );
  };

  const hasResult = prepList !== null;

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-canvas">
      <header className="sticky top-0 z-10 border-hairline border-b bg-background/80 backdrop-blur-md">
        <div className="flex flex-col gap-4 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-bold text-2xl text-foreground">
                {hasResult ? prepList.eventTitle : "Prep Lists"}
              </h1>
              {hasResult ? (
                <div className="flex items-center gap-4 text-muted-foreground text-sm">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="h-4 w-4" />
                    {format(new Date(prepList.eventDate), "MMM d, yyyy")}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Users className="h-4 w-4" />
                    {prepList.guestCount} guests
                  </div>
                  <div>
                    {prepList.resolvedDishCount}/{prepList.linkedDishCount}{" "}
                    dishes resolved
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">
                  Choose an event and generate a prep list from its linked menu
                  dishes.
                </p>
              )}
            </div>
            {hasResult && (
              <div className="flex items-center gap-2">
                <Button
                  aria-label="Export prep list as CSV"
                  disabled={prepList.totalIngredients === 0}
                  onClick={handleExport}
                  size="icon"
                  title="Export CSV"
                  variant="outline"
                >
                  <Download className="h-4 w-4" />
                </Button>
                <Button
                  aria-label="Export prep list as PDF"
                  disabled={isDownloadingPdf || !savedPrepListId}
                  onClick={handleDownloadPdf}
                  size="icon"
                  title="Export PDF (requires save first)"
                  variant="outline"
                >
                  {isDownloadingPdf ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <FileText className="h-4 w-4" />
                  )}
                </Button>
                <PrintViewButton />
                <PrepListSaveButton
                  disabled={prepList.totalIngredients === 0}
                  onSaved={setSavedPrepListId}
                  prepList={prepList}
                />
              </div>
            )}
          </div>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <label
                  className="font-medium text-foreground text-sm"
                  htmlFor="event-select"
                >
                  Event:
                </label>
                <Select
                  onValueChange={(value) => setSelectedEventId(value)}
                  value={selectedEventId}
                >
                  <SelectTrigger className="w-[220px]" id="event-select">
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
                  className="font-medium text-foreground text-sm"
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
                <span className="text-muted-foreground text-sm">×</span>
              </div>

              <div className="flex items-center gap-2">
                <label
                  className="font-medium text-foreground text-sm"
                  htmlFor="dietary-restrictions"
                >
                  Dietary:
                </label>
                <Select
                  onValueChange={(value) =>
                    setDietaryRestrictions(
                      value && value !== "__none__"
                        ? value.split(",").map((s) => s.trim())
                        : []
                    )
                  }
                  value={dietaryRestrictions.join(",") || "__none__"}
                >
                  <SelectTrigger
                    className="w-[180px]"
                    id="dietary-restrictions"
                  >
                    <SelectValue placeholder="None" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">None</SelectItem>
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
              disabled={isGenerating || !selectedEventId}
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
                  {hasResult ? "Regenerate Prep List" : "Generate Prep List"}
                </>
              )}
            </Button>
          </div>
        </div>
      </header>

      <Separator />

      <main className="flex-1 p-6">{renderBody()}</main>
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
