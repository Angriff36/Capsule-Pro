"use client";

import type { Event } from "@repo/database";
import { GridBackground } from "@repo/design-system/components/ui/grid-background";
import { Separator } from "@repo/design-system/components/ui/separator";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useSuggestions } from "../../../kitchen/lib/use-suggestions";
import { updateEvent } from "../../actions";
import {
  addDishToEvent,
  createDishVariantForEvent,
  getAvailableDishes,
  removeDishFromEvent,
} from "../../actions/event-dishes";
import {
  deleteEventSummary,
  type GeneratedEventSummary,
  generateEventSummary,
  getEventSummary,
} from "../../actions/event-summary";
import {
  generateTaskBreakdown,
  saveTaskBreakdown,
  type TaskBreakdown,
} from "../../actions/task-breakdown";
import { GenerateEventSummaryModal } from "../../components/event-summary-display";
import { GenerateTaskBreakdownModal } from "../../components/task-breakdown-display";
import { EventEditorModal } from "../../event-editor-modal";
import {
  type AvailableDishOption,
  DishVariantDialog,
  type EventBudgetForDisplay,
} from "../event-details-sections";
import type {
  EventDishSummary,
  InventoryCoverageItem,
  RecipeDetailSummary,
  RelatedEventSummary,
} from "../event-details-types";
import type { PrepTaskSummaryClient } from "../prep-task-contract";
// Above-fold critical components loaded eagerly
import { EventOverviewCard } from "./event-overview-card";
import { GuestManagementSection } from "./guest-management-section";
// Lazy-loaded below-the-fold components for bundle optimization
import { AIInsightsPanel } from "./lazy-ai-insights-panel";
import { EventExplorer } from "./lazy-event-explorer";
import { MenuIntelligenceSection } from "./menu-intelligence-section";
import { RecipeDrawer } from "./recipe-drawer";
import {
  endOfDay,
  formatCurrency,
  formatDuration,
  scaleIngredients,
  startOfDay,
} from "./utils";

type ExplorerView = "grid" | "calendar";
type SortOption = "relevance" | "soonest" | "popularity" | "price";
type QuickFilter =
  | "live-now"
  | "starting-soon"
  | "high-capacity"
  | "sold-out"
  | "free"
  | "paid";
type DrawerMode = "instructions" | "ingredients";

interface EventDetailsClientProps {
  budget: EventBudgetForDisplay | null;
  event: Omit<Event, "budget" | "ticketPrice"> & {
    budget: number | null;
    ticketPrice: number | null;
  };
  prepTasks: PrepTaskSummaryClient[];
  tenantId?: string;
  eventDishes: EventDishSummary[];
  recipeDetails: RecipeDetailSummary[];
  inventoryCoverage: InventoryCoverageItem[];
  relatedEvents: RelatedEventSummary[];
  relatedGuestCounts: Record<string, number>;
  rsvpCount: number;
}

export function EventDetailsClient({
  budget,
  event,
  prepTasks: initialPrepTasks,
  tenantId,
  eventDishes,
  recipeDetails,
  inventoryCoverage,
  relatedEvents,
  relatedGuestCounts,
  rsvpCount: initialRsvpCount,
}: EventDetailsClientProps) {
  const router = useRouter();

  // Time state
  const [now, setNow] = useState(() => new Date());

  // Edit/RSVP state
  const [showEditEvent, setShowEditEvent] = useState(false);
  const [rsvpCount, setRsvpCount] = useState(initialRsvpCount);
  const [isSaved, setIsSaved] = useState(false);
  const [saveReady, setSaveReady] = useState(false);
  const [quickRsvpOpen, setQuickRsvpOpen] = useState(false);
  const [quickRsvpName, setQuickRsvpName] = useState("");
  const [quickRsvpEmail, setQuickRsvpEmail] = useState("");
  const [quickRsvpLoading, setQuickRsvpLoading] = useState(false);

  // Drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState<DrawerMode>("instructions");
  const [selectedRecipeId, setSelectedRecipeId] = useState<string | null>(null);
  const [selectedDishId, setSelectedDishId] = useState<string | null>(null);

  // Task breakdown state
  const [showBreakdownModal, setShowBreakdownModal] = useState(false);
  const [breakdown, setBreakdown] = useState<TaskBreakdown | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState("");

  // Summary state
  const [summary, setSummary] = useState<
    GeneratedEventSummary | null | undefined
  >(undefined);
  const [isLoadingSummary, setIsLoadingSummary] = useState(true);
  const [showSummaryModal, setShowSummaryModal] = useState(false);

  // Dish management state
  const [availableDishes, setAvailableDishes] = useState<AvailableDishOption[]>(
    []
  );
  const [isLoadingDishes, setIsLoadingDishes] = useState(false);
  const [showAddDishDialog, setShowAddDishDialog] = useState(false);
  const [selectedDishIdForAdd, setSelectedDishIdForAdd] = useState("");
  const [selectedCourse, setSelectedCourse] = useState("");

  // Variant dialog state
  const [showVariantDialog, setShowVariantDialog] = useState(false);
  const [variantLinkId, setVariantLinkId] = useState<string | null>(null);
  const [variantSourceName, setVariantSourceName] = useState("");
  const [variantName, setVariantName] = useState("");

  // Suggestions state
  const [showSuggestions, setShowSuggestions] = useState(false);
  const {
    suggestions,
    isLoading: suggestionsLoading,
    fetchSuggestions,
    dismissSuggestion,
    handleAction,
  } = useSuggestions(tenantId);

  // Explorer state
  const [explorerView, setExplorerView] = useState<ExplorerView>("grid");
  const [sortBy, setSortBy] = useState<SortOption>("relevance");
  const [quickFilters, setQuickFilters] = useState<QuickFilter[]>([]);
  const [selectedDateStart, setSelectedDateStart] = useState("");
  const [selectedDateEnd, setSelectedDateEnd] = useState("");
  const [selectedLocation, setSelectedLocation] = useState("all");
  const [selectedOrganizer, setSelectedOrganizer] = useState("all");
  const [selectedFormat, setSelectedFormat] = useState("all");
  const [selectedPrice, setSelectedPrice] = useState("all");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedAccessibility, setSelectedAccessibility] = useState<string[]>(
    []
  );

  // Missing fields computation
  const missingFields = (event.tags ?? [])
    .filter((tag) => typeof tag === "string" && tag.startsWith("needs:"))
    .map((tag) => (tag as string).replace("needs:", ""))
    .filter(Boolean);

  // Effects
  useEffect(() => {
    const interval = globalThis.setInterval(() => {
      setNow(new Date());
    }, 30_000);
    return () => globalThis.clearInterval(interval);
  }, []);

  useEffect(() => {
    setRsvpCount(initialRsvpCount);
  }, [initialRsvpCount]);

  useEffect(() => {
    if (typeof globalThis === "undefined") {
      return;
    }
    const stored = globalThis.localStorage.getItem("saved-events");
    if (!stored) {
      setSaveReady(true);
      return;
    }
    try {
      const parsed = JSON.parse(stored) as string[];
      setIsSaved(parsed.includes(event.id));
    } catch {
      setIsSaved(false);
    }
    setSaveReady(true);
  }, [event.id]);

  useEffect(() => {
    let cancelled = false;
    setIsLoadingSummary(true);
    getEventSummary(event.id)
      .then((result) => {
        if (cancelled) {
          return;
        }
        setSummary(result.success && result.summary ? result.summary : null);
      })
      .catch(() => {
        if (!cancelled) {
          setSummary(null);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoadingSummary(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [event.id]);

  useEffect(() => {
    if (tenantId && showSuggestions) {
      fetchSuggestions();
    }
  }, [tenantId, showSuggestions, fetchSuggestions]);

  useEffect(() => {
    if (!showAddDishDialog) {
      return;
    }
    let cancelled = false;
    setIsLoadingDishes(true);
    getAvailableDishes(event.id)
      .then((available) => {
        if (!cancelled) {
          setAvailableDishes((available ?? []) as AvailableDishOption[]);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoadingDishes(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [event.id, showAddDishDialog]);

  // Memoized computations
  const recipeById = useMemo(() => {
    const map = new Map<string, RecipeDetailSummary>();
    for (const recipe of recipeDetails) {
      map.set(recipe.recipeId, recipe);
    }
    return map;
  }, [recipeDetails]);

  const inventoryByIngredient = useMemo(() => {
    const map = new Map<string, InventoryCoverageItem>();
    for (const item of inventoryCoverage) {
      map.set(item.ingredientId, item);
    }
    return map;
  }, [inventoryCoverage]);

  const eventDate = useMemo(() => new Date(event.eventDate), [event.eventDate]);
  const eventStart = useMemo(() => startOfDay(eventDate), [eventDate]);
  const eventEnd = useMemo(() => endOfDay(eventDate), [eventDate]);
  const isLive = now >= eventStart && now <= eventEnd;
  const isPast = now > eventEnd;
  const isUpcoming = !isPast && now < eventStart;

  const timeZoneLabel = useMemo(() => {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZoneName: "short",
    }).formatToParts(new Date());
    const timeZone = parts.find((part) => part.type === "timeZoneName");
    return timeZone?.value ?? "Local time";
  }, []);

  const capacity = event.guestCount ?? 0;
  const availability = capacity > 0 ? capacity - rsvpCount : 0;
  const soldOut = capacity > 0 && rsvpCount >= capacity;
  const limited = capacity > 0 && !soldOut && rsvpCount / capacity >= 0.85;

  const eventStatusLabel = isLive ? "Live" : isPast ? "Past" : "Upcoming";

  const ticketPriceLabel =
    event.ticketPrice === null
      ? "Ticketing not set"
      : event.ticketPrice <= 0
        ? "Free"
        : formatCurrency(event.ticketPrice);

  const featuredMediaUrl =
    event.featuredMediaUrl ||
    eventDishes.find((dish) => Boolean(dish.presentationImageUrl))
      ?.presentationImageUrl ||
    null;

  const displayedTags = (event.tags ?? []).filter(
    (tag) => !tag.startsWith("needs:")
  );

  const dishRows = useMemo(
    () =>
      eventDishes.map((dish) => {
        const recipe = dish.recipeId
          ? (recipeById.get(dish.recipeId) ?? null)
          : null;
        const scaledIngredients = recipe
          ? scaleIngredients(
              recipe.ingredients,
              dish.quantityServings,
              recipe.yieldQuantity
            )
          : [];
        return { dish, recipe, scaledIngredients };
      }),
    [eventDishes, recipeById]
  );

  const aggregatedIngredients = useMemo(() => {
    const map = new Map<
      string,
      {
        ingredientId: string;
        ingredientName: string;
        quantity: number;
        unitCode: string | null;
        isOptional: boolean;
        sources: string[];
      }
    >();

    for (const row of dishRows) {
      if (!row.recipe) {
        continue;
      }
      for (const ingredient of row.scaledIngredients) {
        const existing = map.get(ingredient.ingredientId);
        const sourceName = row.dish.name;
        if (existing) {
          existing.quantity += ingredient.scaledQuantity;
          if (!existing.sources.includes(sourceName)) {
            existing.sources.push(sourceName);
          }
          continue;
        }
        map.set(ingredient.ingredientId, {
          ingredientId: ingredient.ingredientId,
          ingredientName: ingredient.ingredientName,
          quantity: ingredient.scaledQuantity,
          unitCode: ingredient.unitCode,
          isOptional: ingredient.isOptional,
          sources: [sourceName],
        });
      }
    }

    return Array.from(map.values()).sort((a, b) =>
      a.ingredientName.localeCompare(b.ingredientName)
    );
  }, [dishRows]);

  const inventoryStats = useMemo(() => {
    let tracked = 0;
    let low = 0;
    for (const ingredient of aggregatedIngredients) {
      const inventory = inventoryByIngredient.get(ingredient.ingredientId);
      if (!inventory) {
        continue;
      }
      tracked += 1;
      if (
        inventory.parLevel !== null &&
        inventory.onHand !== null &&
        inventory.onHand < inventory.parLevel
      ) {
        low += 1;
      }
    }
    return { tracked, low };
  }, [aggregatedIngredients, inventoryByIngredient]);

  const taskSummary = useMemo(() => {
    const counts = {
      pending: 0,
      in_progress: 0,
      completed: 0,
      canceled: 0,
      other: 0,
    };

    for (const task of initialPrepTasks) {
      if (task.status === "pending") {
        counts.pending += 1;
      } else if (task.status === "in_progress") {
        counts.in_progress += 1;
      } else if (task.status === "completed") {
        counts.completed += 1;
      } else if (task.status === "canceled") {
        counts.canceled += 1;
      } else {
        counts.other += 1;
      }
    }

    return counts;
  }, [initialPrepTasks]);

  const sortedPrepTasks = useMemo(() => {
    return [...initialPrepTasks].sort(
      (a, b) =>
        new Date(a.dueByDate).getTime() - new Date(b.dueByDate).getTime()
    );
  }, [initialPrepTasks]);

  const timeStatusLabel = isLive
    ? `Live for ${formatDuration(now.getTime() - eventStart.getTime())}`
    : isUpcoming
      ? `Starts in ${formatDuration(eventStart.getTime() - now.getTime())}`
      : `Ended ${formatDuration(now.getTime() - eventEnd.getTime())} ago`;

  const menuDishRows = useMemo(
    () =>
      eventDishes.map((dish) => ({
        link_id: dish.linkId,
        dish_id: dish.dishId,
        name: dish.name,
        category: dish.category,
        recipe_name: dish.recipeName,
        course: dish.course,
        quantity_servings: dish.quantityServings,
        dietary_tags: dish.dietaryTags,
      })),
    [eventDishes]
  );

  // Handlers
  const openRecipeDrawer = (
    recipeId: string,
    dishId: string,
    mode: DrawerMode
  ) => {
    setSelectedRecipeId(recipeId);
    setSelectedDishId(dishId);
    setDrawerMode(mode);
    setDrawerOpen(true);
  };

  const selectedRecipe = selectedRecipeId
    ? (recipeById.get(selectedRecipeId) ?? null)
    : null;
  const selectedDish = selectedDishId
    ? (eventDishes.find((dish) => dish.dishId === selectedDishId) ?? null)
    : null;
  const selectedScaledIngredients =
    selectedRecipe && selectedDish
      ? scaleIngredients(
          selectedRecipe.ingredients,
          selectedDish.quantityServings,
          selectedRecipe.yieldQuantity
        )
      : [];

  const handleCopyLink = async () => {
    const url = `${globalThis.location.origin}/events/${event.id}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Event link copied to clipboard");
    } catch {
      toast.error("Unable to copy link. Please try again.");
    }
  };

  const handleShare = async () => {
    const url = `${globalThis.location.origin}/events/${event.id}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: event.title,
          text: `Event: ${event.title}`,
          url,
        });
        return;
      } catch {
        // Fall through to copy link
      }
    }
    await handleCopyLink();
  };

  const handleInviteTeam = () => {
    const subject = encodeURIComponent(`Team invite: ${event.title}`);
    const body = encodeURIComponent(
      `Event: ${event.title}\nDate: ${new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }).format(
        eventDate
      )} (${timeZoneLabel})\nVenue: ${event.venueName ?? "TBD"}\nLink: ${globalThis.location.origin}/events/${event.id}`
    );
    globalThis.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  const handleToggleSave = () => {
    const stored = globalThis.localStorage.getItem("saved-events");
    const parsed = stored ? (JSON.parse(stored) as string[]) : [];
    const next = parsed.includes(event.id)
      ? parsed.filter((id) => id !== event.id)
      : [...parsed, event.id];
    globalThis.localStorage.setItem("saved-events", JSON.stringify(next));
    setIsSaved(next.includes(event.id));
    toast.success(next.includes(event.id) ? "Event saved" : "Event removed");
  };

  const handleQuickRsvp = async () => {
    if (!quickRsvpName.trim()) {
      toast.error("Guest name is required to RSVP");
      return;
    }
    setQuickRsvpLoading(true);
    const optimisticCount = rsvpCount + 1;
    setRsvpCount(optimisticCount);

    try {
      const response = await fetch(`/api/events/${event.id}/guests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          guestName: quickRsvpName.trim(),
          guestEmail: quickRsvpEmail.trim() || undefined,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to add RSVP");
      }

      toast.success("RSVP added");
      setQuickRsvpName("");
      setQuickRsvpEmail("");
      setQuickRsvpOpen(false);
    } catch {
      setRsvpCount((prev) => Math.max(prev - 1, 0));
      toast.error("Unable to RSVP. Please try again.");
    } finally {
      setQuickRsvpLoading(false);
    }
  };

  const handleGenerateBreakdown = useCallback(
    async (customInstructions?: string) => {
      setIsGenerating(true);
      setGenerationProgress("Analyzing event details...");
      const messages = [
        "Analyzing event details...",
        "Reviewing menu items...",
        "Creating prep tasks...",
        "Creating setup tasks...",
        "Creating cleanup tasks...",
        "Finalizing breakdown...",
      ];
      let idx = 0;
      const interval = setInterval(() => {
        if (idx < messages.length) {
          setGenerationProgress(messages[idx]);
          idx++;
        }
      }, 1500);
      try {
        const result = await generateTaskBreakdown({
          eventId: event.id,
          customInstructions,
        });
        clearInterval(interval);
        setGenerationProgress("");
        setBreakdown(result);
        setShowBreakdownModal(true);
        router.refresh();
      } catch {
        setGenerationProgress(
          "Failed to generate breakdown. Please try again."
        );
      } finally {
        clearInterval(interval);
        setIsGenerating(false);
      }
    },
    [event.id, router]
  );

  const handleSaveBreakdown = useCallback(async () => {
    if (!breakdown) {
      return;
    }
    try {
      await saveTaskBreakdown(event.id, breakdown);
      router.refresh();
    } catch {
      toast.error("Failed to save task breakdown");
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
    if (!summary?.id) {
      return;
    }
    await deleteEventSummary(summary.id);
    setSummary(null);
  }, [summary]);

  const handleUpdateEvent = useCallback(
    async (formData: FormData) => {
      try {
        await updateEvent(formData);
        toast.success("Event updated");
        router.refresh();
      } catch (e) {
        const message =
          e instanceof Error ? e.message : "Failed to update event";
        toast.error(message);
        throw e;
      }
    },
    [router]
  );

  const handleAddDish = useCallback(async () => {
    if (!selectedDishIdForAdd) {
      toast.error("Please select a dish");
      return;
    }
    const result = await addDishToEvent(
      event.id,
      selectedDishIdForAdd,
      selectedCourse || undefined
    );
    if (result.success) {
      toast.success("Dish added to event");
      setShowAddDishDialog(false);
      setSelectedDishIdForAdd("");
      setSelectedCourse("");
      router.refresh();
    } else {
      toast.error(result.error ?? "Failed to add dish");
    }
  }, [event.id, selectedCourse, selectedDishIdForAdd, router]);

  const handleRemoveDish = useCallback(
    async (linkId: string) => {
      const result = await removeDishFromEvent(event.id, linkId);
      if (result.success) {
        toast.success("Dish removed from event");
        router.refresh();
      } else {
        toast.error(result.error ?? "Failed to remove dish");
      }
    },
    [event.id, router]
  );

  const openVariantDialog = useCallback((linkId: string, name: string) => {
    setVariantLinkId(linkId);
    setVariantSourceName(name);
    setVariantName("");
    setShowVariantDialog(true);
  }, []);

  const handleCreateVariant = useCallback(async () => {
    if (!variantLinkId) {
      return;
    }
    const result = await createDishVariantForEvent(
      event.id,
      variantLinkId,
      variantName
    );
    if (result.success) {
      toast.success("Variant created");
      setShowVariantDialog(false);
      setVariantLinkId(null);
      setVariantSourceName("");
      setVariantName("");
      router.refresh();
    } else {
      toast.error(result.error ?? "Failed to create variant");
    }
  }, [event.id, variantLinkId, variantName, router]);

  const handleExportBreakdown = useCallback(() => {
    if (!breakdown) {
      toast.error("No task breakdown to export");
      return;
    }

    const rows: string[][] = [
      [
        "Section",
        "Task",
        "Description",
        "Duration (min)",
        "Start",
        "End",
        "Relative Time",
        "Assignment",
        "Ingredients",
        "Steps",
        "Critical",
        "Due (hours)",
        "Confidence",
      ],
    ];

    const pushTask = (section: string, task: TaskBreakdown["prep"][number]) => {
      rows.push([
        section,
        task.name,
        task.description ?? "",
        String(task.durationMinutes ?? ""),
        task.startTime ?? "",
        task.endTime ?? "",
        task.relativeTime ?? "",
        task.assignment ?? "",
        task.ingredients?.join("; ") ?? "",
        task.steps?.join("; ") ?? "",
        task.isCritical ? "yes" : "no",
        task.dueInHours ? String(task.dueInHours) : "",
        task.confidence ? String(task.confidence) : "",
      ]);
    };

    breakdown.prep.forEach((task) => pushTask("Prep", task));
    breakdown.setup.forEach((task) => pushTask("Setup", task));
    breakdown.cleanup.forEach((task) => pushTask("Cleanup", task));

    const escapeValue = (value: string) => `"${value.replace(/"/g, '""')}"`;
    const csv = rows
      .map((row) => row.map((value) => escapeValue(value ?? "")).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${event.title.replace(/[^\w\s-]/g, "").trim() || "event"}-task-breakdown.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }, [breakdown, event.title]);

  const resetFilters = () => {
    setQuickFilters([]);
    setSelectedDateStart("");
    setSelectedDateEnd("");
    setSelectedLocation("all");
    setSelectedOrganizer("all");
    setSelectedFormat("all");
    setSelectedPrice("all");
    setSelectedTags([]);
    setSelectedAccessibility([]);
  };

  // RSVP Dialog
  const rsvpDialog = (
    <>
      <button
        className="hidden"
        onClick={() => setQuickRsvpOpen(true)}
        type="button"
      >
        Open RSVP
      </button>
      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-muted/95 px-4 py-3 backdrop-blur sm:hidden">
        <div className="flex items-center gap-2">
          <button
            className="flex-1 bg-success text-success-foreground hover:bg-success/90 inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
            disabled={soldOut}
            onClick={() => setQuickRsvpOpen(true)}
          >
            RSVP
          </button>
          <button
            className="px-3 inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 border border-input bg-background hover:bg-accent hover:text-accent-foreground"
            disabled={!saveReady}
            onClick={handleToggleSave}
          >
            <svg
              className={cn("size-4", isSaved && "fill-current")}
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
          </button>
          <button
            className="px-3 inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 border border-input bg-background hover:bg-accent hover:text-accent-foreground"
            onClick={handleShare}
          >
            <svg
              className="size-4"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
            </svg>
          </button>
        </div>
      </div>
    </>
  );

  return (
    <div className="relative min-h-screen bg-background text-foreground">
      <GridBackground className="pointer-events-none absolute inset-0 opacity-15" />
      <div className="relative mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 pb-28 pt-10 sm:px-6 lg:px-8">
        <Separator />

        <EventOverviewCard
          aggregatedIngredientsCount={aggregatedIngredients.length}
          availability={availability}
          capacity={capacity}
          displayedTags={displayedTags}
          event={event}
          eventDate={eventDate}
          eventStart={eventStart}
          eventStatusLabel={eventStatusLabel}
          featuredMediaUrl={featuredMediaUrl}
          inventoryStats={inventoryStats}
          isLimited={limited}
          isLive={isLive}
          isPast={isPast}
          isSaved={isSaved}
          isSoldOut={soldOut}
          isUpcoming={isUpcoming}
          missingFields={missingFields}
          now={now}
          onEditEvent={() => setShowEditEvent(true)}
          onInviteTeam={handleInviteTeam}
          onQuickRsvp={() => setQuickRsvpOpen(true)}
          onShare={handleShare}
          onToggleSave={handleToggleSave}
          onUpdateDetails={() => setShowEditEvent(true)}
          prepTasks={initialPrepTasks}
          rsvpCount={rsvpCount}
          saveReady={saveReady}
          taskSummary={taskSummary}
          ticketPriceLabel={ticketPriceLabel}
          timeStatusLabel={timeStatusLabel}
          timeZoneLabel={timeZoneLabel}
        />

        <MenuIntelligenceSection
          aggregatedIngredients={aggregatedIngredients}
          availableDishes={availableDishes}
          dishRows={dishRows}
          inventoryByIngredient={inventoryByIngredient}
          isLoadingDishes={isLoadingDishes}
          menuDishRows={menuDishRows}
          onAddDish={handleAddDish}
          onOpenRecipeDrawer={openRecipeDrawer}
          onOpenVariantDialog={openVariantDialog}
          onRemoveDish={handleRemoveDish}
          onSelectedCourseChange={setSelectedCourse}
          onSelectedDishIdChange={setSelectedDishIdForAdd}
          onShowAddDialogChange={setShowAddDishDialog}
          selectedCourse={selectedCourse}
          selectedDishIdForAdd={selectedDishIdForAdd}
          showAddDishDialog={showAddDishDialog}
        />

        <AIInsightsPanel
          breakdown={breakdown}
          budget={budget}
          eventId={event.id}
          eventTitle={event.title}
          generationProgress={generationProgress}
          isGenerating={isGenerating}
          isLoadingSummary={isLoadingSummary}
          onCreateBudget={() => router.push("/events/budgets")}
          onDeleteSummary={handleDeleteSummary}
          onDismissSuggestion={dismissSuggestion}
          onExportBreakdown={handleExportBreakdown}
          onGenerateSummary={handleGenerateSummary}
          onHandleSuggestionAction={handleAction}
          onOpenBreakdownModal={() => setShowBreakdownModal(true)}
          onOpenGenerateModal={() => setShowBreakdownModal(true)}
          onOpenSummaryModal={() => setShowSummaryModal(true)}
          onRefreshSuggestions={fetchSuggestions}
          onRegenerateBreakdown={() => void handleGenerateBreakdown()}
          onSaveBreakdown={handleSaveBreakdown}
          onShowSuggestionsChange={setShowSuggestions}
          onViewBudget={(budgetId: string) =>
            router.push(`/events/budgets/${budgetId}`)
          }
          prepTasks={sortedPrepTasks}
          showSuggestions={showSuggestions}
          suggestions={suggestions}
          suggestionsLoading={suggestionsLoading}
          summary={summary}
        />

        <GuestManagementSection
          eventId={event.id}
          eventTitle={event.title}
          isSoldOut={soldOut}
          onQuickRsvp={() => setQuickRsvpOpen(true)}
        />

        <EventExplorer
          explorerView={explorerView}
          now={now}
          quickFilters={quickFilters}
          relatedEvents={relatedEvents}
          relatedGuestCounts={relatedGuestCounts}
          resetFilters={resetFilters}
          selectedAccessibility={selectedAccessibility}
          selectedDateEnd={selectedDateEnd}
          selectedDateStart={selectedDateStart}
          selectedFormat={selectedFormat}
          selectedLocation={selectedLocation}
          selectedOrganizer={selectedOrganizer}
          selectedPrice={selectedPrice}
          selectedTags={selectedTags}
          setExplorerView={setExplorerView}
          setQuickFilters={setQuickFilters}
          setSelectedAccessibility={setSelectedAccessibility}
          setSelectedDateEnd={setSelectedDateEnd}
          setSelectedDateStart={setSelectedDateStart}
          setSelectedFormat={setSelectedFormat}
          setSelectedLocation={setSelectedLocation}
          setSelectedOrganizer={setSelectedOrganizer}
          setSelectedPrice={setSelectedPrice}
          setSelectedTags={setSelectedTags}
          setSortBy={setSortBy}
          sortBy={sortBy}
        />
      </div>

      {/* Modals */}
      <EventEditorModal
        event={{
          id: event.id,
          title: event.title,
          description: event.notes ?? undefined,
          date: new Date(event.eventDate).toISOString().slice(0, 10),
          venueName: event.venueName ?? undefined,
          venueAddress: event.venueAddress ?? undefined,
          guestCount: event.guestCount ?? undefined,
          eventType: event.eventType ?? undefined,
          status: event.status ?? undefined,
          tags: event.tags ?? [],
          ticketTier: event.ticketTier ?? null,
          ticketPrice: event.ticketPrice ?? null,
          eventFormat: event.eventFormat ?? null,
          accessibilityOptions: event.accessibilityOptions ?? [],
          featuredMediaUrl: event.featuredMediaUrl ?? null,
        }}
        onOpenChange={setShowEditEvent}
        onSave={handleUpdateEvent}
        open={showEditEvent}
      />

      <GenerateTaskBreakdownModal
        eventDate={new Date(event.eventDate).toISOString()}
        eventId={event.id}
        eventTitle={event.title}
        guestCount={event.guestCount ?? 0}
        isOpen={showBreakdownModal}
        onGenerate={handleGenerateBreakdown}
        onOpenChange={setShowBreakdownModal}
        showTrigger={false}
        venueName={event.venueName ?? undefined}
      />

      <GenerateEventSummaryModal
        eventId={event.id}
        eventTitle={event.title}
        isOpen={showSummaryModal}
        onGenerate={handleGenerateSummary}
        onOpenChange={setShowSummaryModal}
        showTrigger={false}
      />

      <DishVariantDialog
        onCreate={handleCreateVariant}
        onOpenChange={setShowVariantDialog}
        onVariantNameChange={setVariantName}
        open={showVariantDialog}
        sourceName={variantSourceName}
        variantName={variantName}
      />

      {/* RSVP Dialog */}
      {rsvpDialog}

      {/* Quick RSVP Dialog */}
      <div
        className={`fixed inset-0 z-50 bg-black/80 ${quickRsvpOpen ? "" : "hidden"}`}
      >
        <div className="fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 sm:rounded-lg">
          <div className="flex flex-col space-y-1.5 text-center sm:text-left">
            <h2 className="text-lg font-semibold leading-none tracking-tight">
              Add RSVP
            </h2>
            <p className="text-sm text-muted-foreground">
              Add a guest to the RSVP list for {event.title}.
            </p>
          </div>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="rsvp-name">
                Guest name
              </label>
              <input
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                id="rsvp-name"
                onChange={(value) => setQuickRsvpName(value.target.value)}
                placeholder="Full name"
                value={quickRsvpName}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="rsvp-email">
                Guest email
              </label>
              <input
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                id="rsvp-email"
                onChange={(value) => setQuickRsvpEmail(value.target.value)}
                placeholder="Optional email"
                type="email"
                value={quickRsvpEmail}
              />
            </div>
          </div>
          <div className="flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2">
            <button
              className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2"
              onClick={() => setQuickRsvpOpen(false)}
            >
              Cancel
            </button>
            <button
              className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
              disabled={quickRsvpLoading}
              onClick={handleQuickRsvp}
            >
              {quickRsvpLoading ? "Saving..." : "Add RSVP"}
            </button>
          </div>
          <button
            className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none"
            onClick={() => setQuickRsvpOpen(false)}
          >
            <svg
              className="size-4"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      <RecipeDrawer
        drawerMode={drawerMode}
        onDrawerModeChange={setDrawerMode}
        onOpenChange={setDrawerOpen}
        open={drawerOpen}
        selectedDish={selectedDish}
        selectedRecipe={selectedRecipe}
        selectedScaledIngredients={selectedScaledIngredients}
      />
    </div>
  );
}

function cn(...classes: (string | boolean | undefined | null)[]) {
  return classes.filter(Boolean).join(" ");
}
