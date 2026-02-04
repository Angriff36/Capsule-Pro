"use client";

import type { Event } from "@repo/database";
import { Badge } from "@repo/design-system/components/ui/badge";
import { Button } from "@repo/design-system/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";
import { Checkbox } from "@repo/design-system/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@repo/design-system/components/ui/dialog";
import { GridBackground } from "@repo/design-system/components/ui/grid-background";
import { Input } from "@repo/design-system/components/ui/input";
import { Label } from "@repo/design-system/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@repo/design-system/components/ui/popover";
import { Progress } from "@repo/design-system/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/design-system/components/ui/select";
import { Separator } from "@repo/design-system/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@repo/design-system/components/ui/sheet";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@repo/design-system/components/ui/toggle-group";
import { cn } from "@repo/design-system/lib/utils";
import {
  ActivityIcon,
  AlarmClockIcon,
  CalendarDaysIcon,
  CalendarPlusIcon,
  ChefHatIcon,
  ChevronRightIcon,
  ClipboardCopyIcon,
  CrownIcon,
  FilterIcon,
  Globe2Icon,
  HeartIcon,
  LayoutGridIcon,
  LinkIcon,
  ListIcon,
  MapPinIcon,
  PartyPopperIcon,
  ShieldCheckIcon,
  SparklesIcon,
  TagIcon,
  TicketIcon,
  TimerIcon,
  UsersIcon,
  WalletIcon,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useSuggestions } from "../../kitchen/lib/use-suggestions";
import { updateEvent } from "../actions";
import {
  addDishToEvent,
  createDishVariantForEvent,
  getAvailableDishes,
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
import { GenerateEventSummaryModal } from "../components/event-summary-display";
import { GuestManagement } from "../components/guest-management";
import { GenerateTaskBreakdownModal } from "../components/task-breakdown-display";
import { EventEditorModal } from "../event-editor-modal";
import {
  type AvailableDishOption,
  BudgetSection,
  DishVariantDialog,
  type EventBudgetForDisplay,
  ExecutiveSummarySection,
  MenuDishesSection,
  MissingFieldsBanner,
  PrepTasksSection,
  SuggestionsSection,
  TaskBreakdownSection,
} from "./event-details-sections";
import type {
  EventDishSummary,
  InventoryCoverageItem,
  RecipeDetailSummary,
  RelatedEventSummary,
} from "./event-details-types";
import type { PrepTaskSummaryClient } from "./prep-task-contract";

const statusVariantMap = {
  draft: "outline",
  confirmed: "default",
  tentative: "secondary",
  postponed: "outline",
  completed: "secondary",
  cancelled: "destructive",
} as const;

type ExplorerView = "grid" | "calendar";

// Distance sorting requires geocoded coordinates, which are not available on events.
type SortOption = "relevance" | "soonest" | "popularity" | "price";

type QuickFilter =
  | "live-now"
  | "starting-soon"
  | "high-capacity"
  | "sold-out"
  | "free"
  | "paid";

type DrawerMode = "instructions" | "ingredients";

type EventDetailsClientProps = {
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
};

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2,
});

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

const shortDateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
});

const calendarDateFormatter = new Intl.DateTimeFormat("en-CA", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const startOfDay = (date: Date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate());

const endOfDay = (date: Date) =>
  new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    23,
    59,
    59,
    999
  );

const addDays = (date: Date, days: number) =>
  new Date(date.getTime() + days * 24 * 60 * 60 * 1000);

const addHours = (date: Date, hours: number) =>
  new Date(date.getTime() + hours * 60 * 60 * 1000);

const getTimeZoneLabel = () => {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZoneName: "short",
  }).formatToParts(new Date());
  const timeZone = parts.find((part) => part.type === "timeZoneName");
  return timeZone?.value ?? "Local time";
};

const formatCurrency = (value: number) => currencyFormatter.format(value);

const formatEventFormat = (value?: string | null) => {
  if (!value) {
    return "Format not set";
  }
  if (value === "in_person") {
    return "In-person";
  }
  if (value === "virtual") {
    return "Virtual";
  }
  if (value === "hybrid") {
    return "Hybrid";
  }
  return value;
};

const formatDuration = (milliseconds: number) => {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
};

const scaleIngredients = (
  ingredients: RecipeDetailSummary["ingredients"],
  dishServings: number,
  yieldQuantity: number
) => {
  const servingsMultiplier = dishServings / Math.max(1, yieldQuantity);
  return ingredients.map((ingredient) => ({
    ...ingredient,
    scaledQuantity:
      Math.round(ingredient.quantity * servingsMultiplier * 100) / 100,
  }));
};

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

  const [now, setNow] = useState(() => new Date());
  const [showEditEvent, setShowEditEvent] = useState(false);
  const [rsvpCount, setRsvpCount] = useState(initialRsvpCount);
  const [isSaved, setIsSaved] = useState(false);
  const [saveReady, setSaveReady] = useState(false);
  const [quickRsvpOpen, setQuickRsvpOpen] = useState(false);
  const [quickRsvpName, setQuickRsvpName] = useState("");
  const [quickRsvpEmail, setQuickRsvpEmail] = useState("");
  const [quickRsvpLoading, setQuickRsvpLoading] = useState(false);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState<DrawerMode>("instructions");
  const [selectedRecipeId, setSelectedRecipeId] = useState<string | null>(null);
  const [selectedDishId, setSelectedDishId] = useState<string | null>(null);

  const [showBreakdownModal, setShowBreakdownModal] = useState(false);
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [breakdown, setBreakdown] = useState<TaskBreakdown | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState("");

  const [summary, setSummary] = useState<
    GeneratedEventSummary | null | undefined
  >(undefined);
  const [isLoadingSummary, setIsLoadingSummary] = useState(true);
  const [showSummaryModal, setShowSummaryModal] = useState(false);

  const [availableDishes, setAvailableDishes] = useState<AvailableDishOption[]>(
    []
  );
  const [isLoadingDishes, setIsLoadingDishes] = useState(false);
  const [showAddDishDialog, setShowAddDishDialog] = useState(false);
  const [selectedDishIdForAdd, setSelectedDishIdForAdd] = useState("");
  const [selectedCourse, setSelectedCourse] = useState("");

  const [showVariantDialog, setShowVariantDialog] = useState(false);
  const [variantLinkId, setVariantLinkId] = useState<string | null>(null);
  const [variantSourceName, setVariantSourceName] = useState("");
  const [variantName, setVariantName] = useState("");

  const [showSuggestions, setShowSuggestions] = useState(false);
  const {
    suggestions,
    isLoading: suggestionsLoading,
    fetchSuggestions,
    dismissSuggestion,
    handleAction,
  } = useSuggestions(tenantId);

  const [explorerView, setExplorerView] = useState<ExplorerView>("grid");
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
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
  const [sortBy, setSortBy] = useState<SortOption>("relevance");

  const missingFields = (event.tags ?? [])
    .filter((tag) => typeof tag === "string" && tag.startsWith("needs:"))
    .map((tag) => (tag as string).replace("needs:", ""))
    .filter(Boolean);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setNow(new Date());
    }, 30_000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    setRsvpCount(initialRsvpCount);
  }, [initialRsvpCount]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const stored = window.localStorage.getItem("saved-events");
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
  const timeZoneLabel = useMemo(getTimeZoneLabel, []);

  const capacity = event.guestCount ?? 0;
  const availability = capacity > 0 ? capacity - rsvpCount : 0;
  const soldOut = capacity > 0 && rsvpCount >= capacity;
  const limited = capacity > 0 && !soldOut && rsvpCount / capacity >= 0.85;

  const eventStatusLabel = isLive ? "Live" : isPast ? "Past" : "Upcoming";

  const eventStatusVariant =
    statusVariantMap[event.status as keyof typeof statusVariantMap] ??
    "outline";

  const timeUntilStart = eventStart.getTime() - now.getTime();
  const timeSinceStart = now.getTime() - eventStart.getTime();
  const timeSinceEnd = now.getTime() - eventEnd.getTime();

  const timeStatusLabel = isLive
    ? `Live for ${formatDuration(timeSinceStart)}`
    : isUpcoming
      ? `Starts in ${formatDuration(timeUntilStart)}`
      : `Ended ${formatDuration(timeSinceEnd)} ago`;

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

  const dishRows = eventDishes.map((dish) => {
    const recipe = dish.recipeId ? recipeById.get(dish.recipeId) : null;
    const scaledIngredients = recipe
      ? scaleIngredients(
          recipe.ingredients,
          dish.quantityServings,
          recipe.yieldQuantity
        )
      : [];
    return { dish, recipe, scaledIngredients };
  });

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
    const url = `${window.location.origin}/events/${event.id}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Event link copied to clipboard");
    } catch (error) {
      console.error("Failed to copy link:", error);
      toast.error("Unable to copy link. Please try again.");
    }
  };

  const handleShare = async () => {
    const url = `${window.location.origin}/events/${event.id}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: event.title,
          text: `Event: ${event.title}`,
          url,
        });
        return;
      } catch (error) {
        console.error("Share failed:", error);
      }
    }
    await handleCopyLink();
  };

  const buildCalendarUrl = () => {
    const start = calendarDateFormatter.format(eventStart).replace(/-/g, "");
    const end = calendarDateFormatter
      .format(addDays(eventStart, 1))
      .replace(/-/g, "");
    const title = encodeURIComponent(event.title);
    const details = encodeURIComponent(
      [
        event.eventType ? `Event type: ${event.eventType}` : "",
        event.notes ?? "",
      ]
        .filter(Boolean)
        .join("\n")
    );
    const location = encodeURIComponent(
      [event.venueName, event.venueAddress].filter(Boolean).join(" · ")
    );
    return `https://www.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${start}/${end}&details=${details}&location=${location}`;
  };

  const handleInviteTeam = () => {
    const subject = encodeURIComponent(`Team invite: ${event.title}`);
    const body = encodeURIComponent(
      `Event: ${event.title}\nDate: ${dateFormatter.format(eventDate)} (${timeZoneLabel})\nVenue: ${event.venueName ?? "TBD"}\nLink: ${window.location.origin}/events/${event.id}`
    );
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  const handleToggleSave = () => {
    const stored = window.localStorage.getItem("saved-events");
    const parsed = stored ? (JSON.parse(stored) as string[]) : [];
    const next = parsed.includes(event.id)
      ? parsed.filter((id) => id !== event.id)
      : [...parsed, event.id];
    window.localStorage.setItem("saved-events", JSON.stringify(next));
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
    } catch (error) {
      console.error("RSVP error:", error);
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
        setShowBreakdown(true);
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

  const sortedPrepTasks = useMemo(() => {
    return [...initialPrepTasks].sort(
      (a, b) =>
        new Date(a.dueByDate).getTime() - new Date(b.dueByDate).getTime()
    );
  }, [initialPrepTasks]);

  const relatedEventsWithCounts = useMemo(
    () =>
      relatedEvents.map((related) => ({
        ...related,
        rsvpCount: relatedGuestCounts[related.id] ?? 0,
      })),
    [relatedEvents, relatedGuestCounts]
  );

  const highCapacityThreshold = useMemo(() => {
    const counts = relatedEventsWithCounts
      .map((related) => related.guestCount)
      .filter((count) => count > 0)
      .sort((a, b) => a - b);
    if (counts.length === 0) {
      return 0;
    }
    const index = Math.floor(counts.length * 0.75);
    return counts[index] ?? counts[counts.length - 1] ?? 0;
  }, [relatedEventsWithCounts]);

  const locationOptions = useMemo(() => {
    const locations = new Set<string>();
    let hasUnassigned = false;

    for (const related of relatedEventsWithCounts) {
      if (related.venueAddress && related.venueAddress.trim()) {
        locations.add(related.venueAddress.trim());
      } else {
        hasUnassigned = true;
      }
    }

    return { locations: Array.from(locations).sort(), hasUnassigned };
  }, [relatedEventsWithCounts]);

  const organizerOptions = useMemo(() => {
    const organizers = new Set<string>();
    let hasUnassigned = false;

    for (const related of relatedEventsWithCounts) {
      if (related.venueName && related.venueName.trim()) {
        organizers.add(related.venueName.trim());
      } else {
        hasUnassigned = true;
      }
    }

    return { organizers: Array.from(organizers).sort(), hasUnassigned };
  }, [relatedEventsWithCounts]);

  const tagOptions = useMemo(() => {
    const tags = new Set<string>();
    for (const related of relatedEventsWithCounts) {
      for (const tag of related.tags) {
        if (!tag.startsWith("needs:")) {
          tags.add(tag);
        }
      }
    }
    return Array.from(tags).sort();
  }, [relatedEventsWithCounts]);

  const accessibilityOptions = useMemo(() => {
    const options = new Set<string>();
    for (const related of relatedEventsWithCounts) {
      for (const option of related.accessibilityOptions) {
        options.add(option);
      }
    }
    return Array.from(options).sort();
  }, [relatedEventsWithCounts]);

  const filterStart = selectedDateStart
    ? new Date(`${selectedDateStart}T00:00:00`)
    : null;
  const filterEnd = selectedDateEnd
    ? new Date(`${selectedDateEnd}T00:00:00`)
    : null;

  const dateRangeInvalid =
    filterStart && filterEnd ? filterEnd < filterStart : false;

  const filteredRelatedEvents = useMemo(() => {
    if (dateRangeInvalid) {
      return [];
    }

    return relatedEventsWithCounts.filter((related) => {
      const relatedDate = new Date(related.eventDate);
      if (filterStart && relatedDate < filterStart) {
        return false;
      }
      if (filterEnd && relatedDate > endOfDay(filterEnd)) {
        return false;
      }
      if (selectedLocation !== "all") {
        if (selectedLocation === "unassigned") {
          if (related.venueAddress && related.venueAddress.trim()) {
            return false;
          }
        } else if ((related.venueAddress ?? "").trim() !== selectedLocation) {
          return false;
        }
      }
      if (selectedOrganizer !== "all") {
        if (selectedOrganizer === "unassigned") {
          if (related.venueName && related.venueName.trim()) {
            return false;
          }
        } else if ((related.venueName ?? "").trim() !== selectedOrganizer) {
          return false;
        }
      }
      if (selectedFormat !== "all" && related.eventFormat !== selectedFormat) {
        return false;
      }
      if (
        selectedPrice === "free" &&
        (related.ticketPrice === null || related.ticketPrice > 0)
      ) {
        return false;
      }
      if (
        selectedPrice === "paid" &&
        (related.ticketPrice === null || related.ticketPrice <= 0)
      ) {
        return false;
      }
      if (selectedTags.length > 0) {
        const hasTag = selectedTags.some((tag) => related.tags.includes(tag));
        if (!hasTag) {
          return false;
        }
      }
      if (selectedAccessibility.length > 0) {
        const hasAccess = selectedAccessibility.some((option) =>
          related.accessibilityOptions.includes(option)
        );
        if (!hasAccess) {
          return false;
        }
      }

      const relatedStart = startOfDay(new Date(related.eventDate));
      const relatedEnd = endOfDay(new Date(related.eventDate));
      const isRelatedLive = now >= relatedStart && now <= relatedEnd;
      const isRelatedStartingSoon =
        relatedStart > now && relatedStart <= addDays(now, 7);
      const isRelatedSoldOut =
        related.guestCount > 0 && related.rsvpCount >= related.guestCount;
      const isRelatedHighCapacity =
        highCapacityThreshold > 0 &&
        related.guestCount >= highCapacityThreshold;

      if (quickFilters.includes("live-now") && !isRelatedLive) {
        return false;
      }
      if (quickFilters.includes("starting-soon") && !isRelatedStartingSoon) {
        return false;
      }
      if (quickFilters.includes("sold-out") && !isRelatedSoldOut) {
        return false;
      }
      if (quickFilters.includes("high-capacity") && !isRelatedHighCapacity) {
        return false;
      }
      if (
        quickFilters.includes("free") &&
        !(related.ticketPrice !== null && related.ticketPrice <= 0)
      ) {
        return false;
      }
      if (
        quickFilters.includes("paid") &&
        !(related.ticketPrice !== null && related.ticketPrice > 0)
      ) {
        return false;
      }

      return true;
    });
  }, [
    dateRangeInvalid,
    filterEnd,
    filterStart,
    highCapacityThreshold,
    now,
    quickFilters,
    relatedEventsWithCounts,
    selectedAccessibility,
    selectedFormat,
    selectedLocation,
    selectedOrganizer,
    selectedPrice,
    selectedTags,
  ]);

  const sortedRelatedEvents = useMemo(() => {
    const data = [...filteredRelatedEvents];

    if (sortBy === "soonest") {
      return data.sort(
        (a, b) =>
          new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime()
      );
    }

    if (sortBy === "popularity") {
      return data.sort((a, b) => b.rsvpCount - a.rsvpCount);
    }

    if (sortBy === "price") {
      return data.sort((a, b) => {
        const priceA = a.ticketPrice ?? Number.POSITIVE_INFINITY;
        const priceB = b.ticketPrice ?? Number.POSITIVE_INFINITY;
        return priceA - priceB;
      });
    }

    return data.sort((a, b) => {
      const aStart = startOfDay(new Date(a.eventDate));
      const bStart = startOfDay(new Date(b.eventDate));
      const aLive = now >= aStart && now <= endOfDay(new Date(a.eventDate));
      const bLive = now >= bStart && now <= endOfDay(new Date(b.eventDate));
      if (aLive && !bLive) {
        return -1;
      }
      if (!aLive && bLive) {
        return 1;
      }
      return aStart.getTime() - bStart.getTime();
    });
  }, [filteredRelatedEvents, now, sortBy]);

  const featuredEvents = sortedRelatedEvents.slice(0, 13);

  const todayEvents = sortedRelatedEvents.filter((related) => {
    const relatedDate = new Date(related.eventDate);
    return startOfDay(relatedDate).getTime() === startOfDay(now).getTime();
  });

  const thisWeekEvents = sortedRelatedEvents.filter((related) => {
    const relatedDate = new Date(related.eventDate);
    return (
      relatedDate >= startOfDay(now) &&
      relatedDate <= addDays(startOfDay(now), 7)
    );
  });

  const todayKey = calendarDateFormatter.format(now);
  const highCapacityLabel =
    highCapacityThreshold > 0
      ? `High capacity (${highCapacityThreshold}+ guests)`
      : "High capacity";

  const timelineGroups = useMemo(() => {
    const groups = new Map<string, typeof sortedRelatedEvents>();
    for (const related of sortedRelatedEvents) {
      const key = calendarDateFormatter.format(new Date(related.eventDate));
      const existing = groups.get(key);
      if (existing) {
        existing.push(related);
      } else {
        groups.set(key, [related]);
      }
    }

    return Array.from(groups.entries())
      .map(([key, items]) => ({
        key,
        date: new Date(items[0]?.eventDate ?? new Date()),
        items: items.sort(
          (a, b) =>
            new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime()
        ),
      }))
      .sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [sortedRelatedEvents]);

  const hasActiveFilters =
    quickFilters.length > 0 ||
    selectedDateStart.length > 0 ||
    selectedDateEnd.length > 0 ||
    selectedLocation !== "all" ||
    selectedOrganizer !== "all" ||
    selectedFormat !== "all" ||
    selectedPrice !== "all" ||
    selectedTags.length > 0 ||
    selectedAccessibility.length > 0;

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

  const toggleQuickFilter = (filter: QuickFilter) => {
    setQuickFilters((prev) =>
      prev.includes(filter)
        ? prev.filter((value) => value !== filter)
        : [...prev, filter]
    );
  };

  const FiltersPanel = ({ className }: { className?: string }) => (
    <div className={cn("space-y-5", className)}>
      <div className="space-y-2">
        <Label htmlFor="explorer-start">Start date</Label>
        <Input
          id="explorer-start"
          onChange={(eventInput) =>
            setSelectedDateStart(eventInput.target.value)
          }
          type="date"
          value={selectedDateStart}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="explorer-end">End date</Label>
        <Input
          id="explorer-end"
          onChange={(eventInput) => setSelectedDateEnd(eventInput.target.value)}
          type="date"
          value={selectedDateEnd}
        />
      </div>
      <div className="space-y-2">
        <Label>Location</Label>
        <Select onValueChange={setSelectedLocation} value={selectedLocation}>
          <SelectTrigger>
            <SelectValue placeholder="All locations" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All locations</SelectItem>
            {locationOptions.locations.map((location) => (
              <SelectItem key={location} value={location}>
                {location}
              </SelectItem>
            ))}
            {locationOptions.hasUnassigned && (
              <SelectItem value="unassigned">Location not set</SelectItem>
            )}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Organizer</Label>
        <Select onValueChange={setSelectedOrganizer} value={selectedOrganizer}>
          <SelectTrigger>
            <SelectValue placeholder="All organizers" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All organizers</SelectItem>
            {organizerOptions.organizers.map((organizer) => (
              <SelectItem key={organizer} value={organizer}>
                {organizer}
              </SelectItem>
            ))}
            {organizerOptions.hasUnassigned && (
              <SelectItem value="unassigned">Organizer not set</SelectItem>
            )}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Format</Label>
        <Select onValueChange={setSelectedFormat} value={selectedFormat}>
          <SelectTrigger>
            <SelectValue placeholder="All formats" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All formats</SelectItem>
            <SelectItem value="in_person">In-person</SelectItem>
            <SelectItem value="virtual">Virtual</SelectItem>
            <SelectItem value="hybrid">Hybrid</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Price</Label>
        <Select onValueChange={setSelectedPrice} value={selectedPrice}>
          <SelectTrigger>
            <SelectValue placeholder="All prices" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All prices</SelectItem>
            <SelectItem value="free">Free</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Tags</Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button className="w-full justify-between" variant="outline">
              {selectedTags.length > 0
                ? `${selectedTags.length} tag${selectedTags.length > 1 ? "s" : ""} selected`
                : "Choose tags"}
              <TagIcon className="size-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-64 p-3">
            {tagOptions.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No tags available.
              </p>
            ) : (
              <div className="space-y-2">
                {tagOptions.map((tag) => (
                  <label className="flex items-center gap-2 text-sm" key={tag}>
                    <Checkbox
                      checked={selectedTags.includes(tag)}
                      onCheckedChange={() =>
                        setSelectedTags((prev) =>
                          prev.includes(tag)
                            ? prev.filter((value) => value !== tag)
                            : [...prev, tag]
                        )
                      }
                    />
                    <span>{tag}</span>
                  </label>
                ))}
              </div>
            )}
          </PopoverContent>
        </Popover>
      </div>
      <div className="space-y-2">
        <Label>Accessibility</Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button className="w-full justify-between" variant="outline">
              {selectedAccessibility.length > 0
                ? `${selectedAccessibility.length} option${selectedAccessibility.length > 1 ? "s" : ""}`
                : "Choose options"}
              <ShieldCheckIcon className="size-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-64 p-3">
            {accessibilityOptions.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No accessibility options listed.
              </p>
            ) : (
              <div className="space-y-2">
                {accessibilityOptions.map((option) => (
                  <label
                    className="flex items-center gap-2 text-sm"
                    key={option}
                  >
                    <Checkbox
                      checked={selectedAccessibility.includes(option)}
                      onCheckedChange={() =>
                        setSelectedAccessibility((prev) =>
                          prev.includes(option)
                            ? prev.filter((value) => value !== option)
                            : [...prev, option]
                        )
                      }
                    />
                    <span>{option}</span>
                  </label>
                ))}
              </div>
            )}
          </PopoverContent>
        </Popover>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          {filteredRelatedEvents.length} events matched
        </span>
        <Button
          disabled={!hasActiveFilters}
          onClick={resetFilters}
          size="sm"
          variant="ghost"
        >
          Reset
        </Button>
      </div>
    </div>
  );

  return (
    <div className="relative min-h-screen bg-[#0b0f1a] text-slate-50">
      <GridBackground className="pointer-events-none absolute inset-0 opacity-15" />
      <div className="relative mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 pb-28 pt-10 sm:px-6 lg:px-8">
        <MissingFieldsBanner
          missingFields={missingFields}
          onUpdateDetails={() => setShowEditEvent(true)}
        />
        <Separator />

        <section>
          <div className="mb-4 flex items-center gap-2">
            <p className="text-xs uppercase tracking-[0.25em] text-slate-400">
              Event Overview
            </p>
          </div>
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
            <Card className="border-slate-800/60 bg-slate-900/70 text-slate-50 shadow-[0_20px_60px_-30px_rgba(0,0,0,0.6)]">
              <CardHeader className="space-y-4">
                <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.18em] text-slate-300">
                  <Badge
                    className={cn(
                      "border text-[11px]",
                      isLive
                        ? "border-emerald-400/40 bg-emerald-500/20 text-emerald-200"
                        : isPast
                          ? "border-slate-500/40 bg-slate-500/10 text-slate-200"
                          : "border-sky-400/40 bg-sky-500/10 text-sky-200"
                    )}
                    variant="outline"
                  >
                    {eventStatusLabel}
                  </Badge>
                  {soldOut && (
                    <Badge
                      className="border-rose-500/40 bg-rose-500/20 text-rose-100"
                      variant="outline"
                    >
                      Sold out
                    </Badge>
                  )}
                  {!soldOut && limited && (
                    <Badge
                      className="border-amber-400/40 bg-amber-500/20 text-amber-100"
                      variant="outline"
                    >
                      Limited
                    </Badge>
                  )}
                  <Badge className="capitalize" variant={eventStatusVariant}>
                    {event.status}
                  </Badge>
                  {event.eventFormat && (
                    <Badge
                      className="border-slate-600/60 bg-slate-950/30 text-slate-200"
                      variant="outline"
                    >
                      {formatEventFormat(event.eventFormat)}
                    </Badge>
                  )}
                  {event.ticketTier && (
                    <Badge
                      className="border-slate-600/60 bg-slate-950/30 text-slate-200"
                      variant="outline"
                    >
                      {event.ticketTier}
                    </Badge>
                  )}
                </div>
                <div className="space-y-2">
                  <CardTitle className="text-3xl font-semibold tracking-tight">
                    {event.title}
                  </CardTitle>
                  <CardDescription className="text-slate-300">
                    {event.eventType} <span className="text-slate-500">•</span>{" "}
                    {event.venueName ?? "Venue TBD"}
                  </CardDescription>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {displayedTags.length > 0 ? (
                    displayedTags.map((tag) => (
                      <Badge
                        className="border-slate-700/70 bg-slate-950/40 text-slate-200"
                        key={tag}
                        variant="outline"
                      >
                        {tag}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-xs text-slate-400">No tags yet</span>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-2xl border border-slate-800/70 bg-slate-950/40 p-4">
                    <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-slate-400">
                      <CalendarDaysIcon className="size-3" />
                      Date & Time
                    </div>
                    <div className="mt-2 text-lg font-semibold">
                      {dateFormatter.format(eventDate)}
                    </div>
                    {/* Event schema stores date without time-of-day. */}
                    <div className="text-sm text-slate-300">
                      Time not set • {timeZoneLabel}
                    </div>
                    <div className="mt-1 text-xs text-slate-400">
                      {timeStatusLabel}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-slate-800/70 bg-slate-950/40 p-4">
                    <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-slate-400">
                      <MapPinIcon className="size-3" />
                      Organizer / Venue
                    </div>
                    <div className="mt-2 text-sm font-semibold">
                      {event.venueName ?? "Organizer not set"}
                    </div>
                    <div className="text-xs text-slate-300">
                      {event.venueAddress ?? "Venue address not set"}
                    </div>
                    <div className="mt-2 inline-flex items-center gap-1 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-2 py-1 text-[11px] text-emerald-200">
                      <ShieldCheckIcon className="size-3" />
                      Verified venue
                    </div>
                  </div>
                  <div className="rounded-2xl border border-slate-800/70 bg-slate-950/40 p-4">
                    <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-slate-400">
                      <WalletIcon className="size-3" />
                      Pricing & Format
                    </div>
                    <div className="mt-2 text-lg font-semibold">
                      {ticketPriceLabel}
                    </div>
                    <div className="text-xs text-slate-300">
                      {event.ticketTier ?? "Ticket tier not set"}
                    </div>
                    <div className="text-xs text-slate-400">
                      {formatEventFormat(event.eventFormat)}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-slate-800/70 bg-slate-950/40 p-4">
                    <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-slate-400">
                      <UsersIcon className="size-3" />
                      Capacity & RSVPs
                    </div>
                    <div className="mt-2 text-lg font-semibold">
                      {rsvpCount} RSVPs
                    </div>
                    <div className="text-xs text-slate-300">
                      {capacity > 0
                        ? `${capacity} total capacity`
                        : "Capacity not set"}
                    </div>
                    <div className="text-xs text-slate-400">
                      {soldOut
                        ? "Sold out"
                        : limited
                          ? "Limited seats"
                          : capacity > 0
                            ? `${Math.max(availability, 0)} seats available`
                            : "Availability not set"}
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    className="bg-emerald-400 text-slate-950 hover:bg-emerald-300"
                    disabled={soldOut}
                    onClick={() => setQuickRsvpOpen(true)}
                  >
                    <PartyPopperIcon className="mr-2 size-4" />
                    {soldOut ? "Sold out" : "RSVP / Join"}
                  </Button>
                  <Button
                    disabled={!saveReady}
                    onClick={handleToggleSave}
                    variant="outline"
                  >
                    <HeartIcon
                      className={cn("mr-2 size-4", isSaved && "fill-current")}
                    />
                    {isSaved ? "Saved" : "Save"}
                  </Button>
                  <Button onClick={handleShare} variant="outline">
                    <LinkIcon className="mr-2 size-4" />
                    Share
                  </Button>
                  <Button asChild variant="ghost">
                    <a
                      href={buildCalendarUrl()}
                      rel="noreferrer"
                      target="_blank"
                    >
                      <CalendarPlusIcon className="mr-2 size-4" />
                      Add to calendar
                    </a>
                  </Button>
                  <Button onClick={handleInviteTeam} variant="ghost">
                    <UsersIcon className="mr-2 size-4" />
                    Invite team
                  </Button>
                  <Button asChild variant="ghost">
                    <Link href="/crm/venues">
                      <MapPinIcon className="mr-2 size-4" />
                      View organizer
                    </Link>
                  </Button>
                  <Button
                    onClick={() => setShowEditEvent(true)}
                    variant="ghost"
                  >
                    <SparklesIcon className="mr-2 size-4" />
                    Edit details
                  </Button>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-6">
              <div className="relative overflow-hidden rounded-3xl border border-slate-800/60 bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900">
                {featuredMediaUrl ? (
                  <img
                    alt={event.title}
                    className="h-72 w-full object-cover"
                    loading="lazy"
                    src={featuredMediaUrl}
                  />
                ) : (
                  <div className="flex h-72 flex-col items-center justify-center gap-2 text-slate-400">
                    <SparklesIcon className="size-10 text-slate-500" />
                    <p className="text-sm">Featured media not set</p>
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/20 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-5">
                  <p className="text-[11px] uppercase tracking-[0.25em] text-slate-300">
                    Featured media
                  </p>
                  <p className="mt-1 text-lg font-semibold">
                    {event.eventType}
                  </p>
                  <p className="text-xs text-slate-300">
                    {event.venueName ?? "Venue TBD"} •{" "}
                    {shortDateFormatter.format(eventDate)}
                  </p>
                </div>
              </div>

              <Card className="border-slate-800/60 bg-slate-900/70 text-slate-50">
                <CardHeader className="space-y-1">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <ActivityIcon className="size-5 text-emerald-400" />
                    Operations snapshot
                  </CardTitle>
                  <CardDescription className="text-slate-300">
                    Live readiness across guests, tasks, and inventory.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="rounded-2xl border border-slate-800/70 bg-slate-950/40 p-4">
                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <span>RSVP progress</span>
                      <span>
                        {capacity > 0
                          ? `${rsvpCount}/${capacity}`
                          : `${rsvpCount} RSVPs`}
                      </span>
                    </div>
                    <Progress
                      className="mt-2"
                      value={
                        capacity > 0
                          ? Math.min((rsvpCount / capacity) * 100, 100)
                          : 0
                      }
                    />
                    <div className="mt-2 text-xs text-slate-300">
                      {soldOut
                        ? "Guest list is full"
                        : limited
                          ? "Seats are nearly full"
                          : "Guest list still open"}
                    </div>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl border border-slate-800/70 bg-slate-950/40 p-4">
                      <div className="text-[11px] uppercase tracking-[0.2em] text-slate-400">
                        Prep tasks
                      </div>
                      <div className="mt-2 text-lg font-semibold">
                        {initialPrepTasks.length}
                      </div>
                      <div className="text-xs text-slate-300">
                        {taskSummary.pending} pending •{" "}
                        {taskSummary.in_progress} in progress •{" "}
                        {taskSummary.completed} done
                      </div>
                    </div>
                    <div className="rounded-2xl border border-slate-800/70 bg-slate-950/40 p-4">
                      <div className="text-[11px] uppercase tracking-[0.2em] text-slate-400">
                        Inventory coverage
                      </div>
                      <div className="mt-2 text-lg font-semibold">
                        {inventoryStats.tracked}/{aggregatedIngredients.length}
                      </div>
                      <div className="text-xs text-slate-300">
                        {inventoryStats.low} low stock alerts
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button asChild size="sm" variant="outline">
                      <a href="#guests">Guest list</a>
                    </Button>
                    <Button asChild size="sm" variant="outline">
                      <a href="#recipes">Menu intelligence</a>
                    </Button>
                    <Button asChild size="sm" variant="outline">
                      <a href="#explore">Explore events</a>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        <section id="recipes">
          <div className="mb-4 flex items-center gap-2">
            <p className="text-xs uppercase tracking-[0.25em] text-slate-400">
              Menu Intelligence
            </p>
          </div>
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
            <Card className="border-slate-800/60 bg-slate-900/70 text-slate-50">
              <CardHeader className="space-y-1">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <ChefHatIcon className="size-5 text-amber-300" />
                  Menu intelligence
                </CardTitle>
                <CardDescription className="text-slate-300">
                  Recipes, yields, and ingredient summaries for this event.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {dishRows.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-800/70 p-8 text-center">
                    <p className="text-sm text-slate-300">
                      No dishes linked yet.
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      Add dishes to start building recipe intelligence.
                    </p>
                    <Button
                      className="mt-4"
                      onClick={() => setShowAddDishDialog(true)}
                      size="sm"
                      variant="outline"
                    >
                      Add dishes
                    </Button>
                  </div>
                ) : (
                  dishRows.map((row, index) => (
                    <div
                      className="group rounded-2xl border border-slate-800/70 bg-slate-950/40 p-4 transition duration-300 hover:-translate-y-0.5 hover:border-emerald-500/40"
                      key={`${row.dish.dishId}-${index}`}
                      style={{ animationDelay: `${index * 40}ms` }}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div className="space-y-1">
                          <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">
                            {row.dish.course ?? "Course not set"}
                          </p>
                          <p className="text-lg font-semibold">
                            {row.dish.name}
                          </p>
                          <p className="text-xs text-slate-300">
                            {row.dish.recipeName ?? "Recipe not linked"}
                          </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button size="sm" variant="outline">
                                <ClipboardCopyIcon className="mr-2 size-3" />
                                Ingredients
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent
                              align="end"
                              className="w-72 border-slate-800 bg-slate-950 text-slate-50"
                            >
                              {row.recipe ? (
                                <div className="space-y-3 text-sm">
                                  <div className="flex items-center justify-between">
                                    <span className="font-semibold">
                                      {row.recipe.recipeName}
                                    </span>
                                    <Badge
                                      className="border-slate-700/70 bg-slate-900/70 text-slate-200"
                                      variant="outline"
                                    >
                                      {row.recipe.ingredients.length}{" "}
                                      ingredients
                                    </Badge>
                                  </div>
                                  <div className="max-h-56 space-y-2 overflow-y-auto pr-1 text-xs">
                                    {row.scaledIngredients.map((ingredient) => (
                                      <div
                                        className="flex items-start justify-between gap-3"
                                        key={ingredient.ingredientId}
                                      >
                                        <span>{ingredient.ingredientName}</span>
                                        <span className="text-slate-300">
                                          {ingredient.scaledQuantity}{" "}
                                          {ingredient.unitCode ?? ""}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                                    <span>
                                      Yield: {row.recipe.yieldQuantity}{" "}
                                      {row.recipe.yieldUnitCode ?? "servings"}
                                    </span>
                                    {row.recipe.versionId ? (
                                      <Link
                                        className="text-emerald-300 hover:text-emerald-200"
                                        href={`/inventory/recipes/${row.recipe.versionId}`}
                                      >
                                        View recipe
                                      </Link>
                                    ) : null}
                                  </div>
                                </div>
                              ) : (
                                <p className="text-sm text-slate-300">
                                  No recipe linked yet.
                                </p>
                              )}
                            </PopoverContent>
                          </Popover>
                          <Button
                            disabled={!row.recipe}
                            onClick={() =>
                              row.recipe &&
                              openRecipeDrawer(
                                row.recipe.recipeId,
                                row.dish.dishId,
                                "instructions"
                              )
                            }
                            size="sm"
                            variant="secondary"
                          >
                            <ChevronRightIcon className="mr-2 size-3" />
                            Instructions
                          </Button>
                          <Button
                            disabled={!row.recipe}
                            onClick={() =>
                              row.recipe &&
                              openRecipeDrawer(
                                row.recipe.recipeId,
                                row.dish.dishId,
                                "ingredients"
                              )
                            }
                            size="sm"
                            variant="outline"
                          >
                            <ListIcon className="mr-2 size-3" />
                            Full ingredients
                          </Button>
                        </div>
                      </div>
                      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-300">
                        <Badge
                          className="border-slate-700/70 bg-slate-900/70"
                          variant="outline"
                        >
                          {row.dish.quantityServings} servings
                        </Badge>
                        {row.dish.pricePerPerson !== null && (
                          <Badge
                            className="border-emerald-400/40 bg-emerald-500/10 text-emerald-200"
                            variant="outline"
                          >
                            Price {formatCurrency(row.dish.pricePerPerson)} /
                            person
                          </Badge>
                        )}
                        {row.dish.costPerPerson !== null && (
                          <Badge
                            className="border-amber-400/40 bg-amber-500/10 text-amber-100"
                            variant="outline"
                          >
                            Cost {formatCurrency(row.dish.costPerPerson)} /
                            person
                          </Badge>
                        )}
                        {row.dish.dietaryTags.map((tag) => (
                          <Badge
                            className="border-slate-700/70 bg-slate-900/70 text-slate-200"
                            key={tag}
                            variant="outline"
                          >
                            {tag}
                          </Badge>
                        ))}
                      </div>
                      {row.recipe && (
                        <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-400 opacity-0 transition group-hover:opacity-100">
                          <span>
                            Prep: {row.recipe.prepTimeMinutes ?? 0}m • Cook:{" "}
                            {row.recipe.cookTimeMinutes ?? 0}m • Rest:{" "}
                            {row.recipe.restTimeMinutes ?? 0}m
                          </span>
                          <span>
                            Yield {row.recipe.yieldQuantity}{" "}
                            {row.recipe.yieldUnitCode ?? "servings"}
                          </span>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <div className="space-y-6">
              <MenuDishesSection
                availableDishes={availableDishes}
                eventDishes={menuDishRows}
                isLoading={isLoadingDishes}
                onAddDish={handleAddDish}
                onOpenVariantDialog={openVariantDialog}
                onRemoveDish={handleRemoveDish}
                onSelectedCourseChange={setSelectedCourse}
                onSelectedDishIdChange={setSelectedDishIdForAdd}
                onShowAddDialogChange={setShowAddDishDialog}
                selectedCourse={selectedCourse}
                selectedDishId={selectedDishIdForAdd}
                showAddDialog={showAddDishDialog}
              />

              <Card className="border-slate-800/60 bg-slate-900/70 text-slate-50">
                <CardHeader className="space-y-1">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <ClipboardCopyIcon className="size-5 text-sky-300" />
                    Ingredient coverage
                  </CardTitle>
                  <CardDescription className="text-slate-300">
                    Consolidated ingredient list mapped against inventory
                    levels.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {aggregatedIngredients.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-800/70 p-8 text-center">
                      <p className="text-sm text-slate-300">
                        No ingredients yet.
                      </p>
                      <p className="mt-1 text-xs text-slate-400">
                        Link recipes to see ingredient coverage.
                      </p>
                    </div>
                  ) : (
                    <div className="max-h-[420px] space-y-3 overflow-y-auto pr-1">
                      {aggregatedIngredients.map((ingredient) => {
                        const inventory = inventoryByIngredient.get(
                          ingredient.ingredientId
                        );
                        const unitMatch =
                          ingredient.unitCode &&
                          inventory?.onHandUnitCode &&
                          ingredient.unitCode === inventory.onHandUnitCode;
                        const requiredLabel = `${ingredient.quantity} ${ingredient.unitCode ?? ""}`;
                        const onHandLabel =
                          inventory && inventory.onHand !== null
                            ? `${inventory.onHand} ${inventory.onHandUnitCode ?? ""}`
                            : "Not tracked";
                        const coverageRatio =
                          unitMatch &&
                          inventory &&
                          inventory.onHand !== null &&
                          ingredient.quantity > 0
                            ? Math.min(
                                (inventory.onHand / ingredient.quantity) * 100,
                                100
                              )
                            : null;
                        const isLow =
                          inventory &&
                          inventory.onHand !== null &&
                          inventory.parLevel !== null &&
                          inventory.onHand < inventory.parLevel;
                        const isShort =
                          unitMatch &&
                          inventory?.onHand !== null &&
                          ingredient.quantity > 0 &&
                          inventory.onHand < ingredient.quantity;

                        return (
                          <div
                            className="rounded-2xl border border-slate-800/70 bg-slate-950/40 p-4"
                            key={ingredient.ingredientId}
                          >
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <div>
                                <p className="font-semibold">
                                  {ingredient.ingredientName}
                                </p>
                                <p className="text-xs text-slate-400">
                                  Required: {requiredLabel}
                                </p>
                                <p className="text-xs text-slate-400">
                                  On hand: {onHandLabel}
                                </p>
                              </div>
                              <div className="flex flex-col items-end gap-1 text-xs">
                                {inventory ? (
                                  <Badge
                                    className={cn(
                                      "border",
                                      isShort || isLow
                                        ? "border-rose-400/40 bg-rose-500/20 text-rose-100"
                                        : "border-emerald-400/40 bg-emerald-500/10 text-emerald-200"
                                    )}
                                    variant="outline"
                                  >
                                    {isShort
                                      ? "Short"
                                      : isLow
                                        ? "Low stock"
                                        : "Covered"}
                                  </Badge>
                                ) : (
                                  <Badge
                                    className="border-slate-600/60 bg-slate-900/70 text-slate-200"
                                    variant="outline"
                                  >
                                    Not tracked
                                  </Badge>
                                )}
                                {ingredient.isOptional && (
                                  <Badge
                                    className="border-slate-600/60 bg-slate-900/70 text-slate-200"
                                    variant="outline"
                                  >
                                    Optional
                                  </Badge>
                                )}
                              </div>
                            </div>
                            {coverageRatio !== null && (
                              <Progress
                                className="mt-3"
                                value={coverageRatio}
                              />
                            )}
                            {ingredient.sources.length > 0 && (
                              <p className="mt-2 text-[11px] text-slate-500">
                                Used in {ingredient.sources.join(", ")}
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        <section>
          <div className="mb-4 flex items-center gap-2">
            <p className="text-xs uppercase tracking-[0.25em] text-slate-400">
              AI Insights
            </p>
          </div>
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)]">
            <div className="space-y-6">
              <ExecutiveSummarySection
                eventId={event.id}
                eventTitle={event.title}
                isLoading={isLoadingSummary}
                onDelete={handleDeleteSummary}
                onGenerate={handleGenerateSummary}
                onOpenGenerateModal={() => setShowSummaryModal(true)}
                summary={summary}
              />
              <TaskBreakdownSection
                breakdown={breakdown}
                generationProgress={generationProgress}
                isGenerating={isGenerating}
                onExport={handleExportBreakdown}
                onOpenGenerateModal={() => setShowBreakdownModal(true)}
                onRegenerate={() => void handleGenerateBreakdown()}
                onSave={handleSaveBreakdown}
              />
            </div>
            <div className="space-y-6">
              <SuggestionsSection
                isLoading={suggestionsLoading}
                onAction={handleAction}
                onDismiss={dismissSuggestion}
                onRefresh={fetchSuggestions}
                onShowSuggestionsChange={setShowSuggestions}
                showSuggestions={showSuggestions}
                suggestions={suggestions}
              />
              <PrepTasksSection
                onOpenGenerateModal={() => setShowBreakdownModal(true)}
                prepTasks={sortedPrepTasks}
              />
              <BudgetSection
                budget={budget}
                onCreateBudget={() => router.push("/events/budgets")}
                onViewBudget={(budgetId) =>
                  router.push(`/events/budgets/${budgetId}`)
                }
              />
            </div>
          </div>
        </section>

        <section className="space-y-4" id="guests">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.25em] text-slate-400">
                Guests & RSVPs
              </p>
              <h2 className="text-2xl font-semibold">Guest management</h2>
              <p className="text-sm text-slate-300">
                Manage RSVPs, dietary restrictions, and seating preferences.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                className="bg-emerald-400 text-slate-950 hover:bg-emerald-300"
                onClick={() => setQuickRsvpOpen(true)}
              >
                Quick RSVP
              </Button>
              <Button asChild variant="outline">
                <a href="/events">View all events</a>
              </Button>
            </div>
          </div>
          <Card className="border-slate-800/60 bg-slate-900/70 text-slate-50">
            <CardContent className="pt-6">
              <GuestManagement eventId={event.id} />
            </CardContent>
          </Card>
        </section>

        <section className="space-y-6" id="explore">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.25em] text-slate-400">
                Event explorer
              </p>
              <h2 className="text-2xl font-semibold">Schedule + browse</h2>
              <p className="text-sm text-slate-300">
                Editorial overview for high-volume event browsing.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <ToggleGroup
                className="rounded-full border border-slate-800/70 bg-slate-950/40"
                onValueChange={(value) => {
                  if (value) {
                    setExplorerView(value as ExplorerView);
                  }
                }}
                type="single"
                value={explorerView}
              >
                <ToggleGroupItem className="gap-2" value="grid">
                  <LayoutGridIcon className="size-4" />
                  Grid
                </ToggleGroupItem>
                <ToggleGroupItem className="gap-2" value="calendar">
                  <ListIcon className="size-4" />
                  Timeline
                </ToggleGroupItem>
              </ToggleGroup>
              <Select
                onValueChange={(value) => setSortBy(value as SortOption)}
                value={sortBy}
              >
                <SelectTrigger className="w-[160px] border-slate-800/70 bg-slate-950/40">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="relevance">Relevance</SelectItem>
                  <SelectItem value="soonest">Soonest</SelectItem>
                  <SelectItem value="popularity">Popularity</SelectItem>
                  <SelectItem value="price">Price</SelectItem>
                </SelectContent>
              </Select>
              <Sheet onOpenChange={setFilterSheetOpen} open={filterSheetOpen}>
                <SheetTrigger asChild>
                  <Button className="lg:hidden" variant="outline">
                    <FilterIcon className="mr-2 size-4" />
                    Filters
                  </Button>
                </SheetTrigger>
                <SheetContent
                  className="border-slate-800 bg-slate-950 text-slate-50"
                  side="left"
                >
                  <SheetHeader>
                    <SheetTitle className="text-slate-100">Filters</SheetTitle>
                  </SheetHeader>
                  <div className="px-4 pb-6">
                    <FiltersPanel />
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
          <div className="grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
            <aside className="sticky top-6 hidden self-start lg:block">
              <Card className="border-slate-800/60 bg-slate-900/70 text-slate-50">
                <CardHeader>
                  <CardTitle className="text-base">Filters</CardTitle>
                  <CardDescription className="text-slate-300">
                    Refine by date, venue, tags, and accessibility.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <FiltersPanel />
                </CardContent>
              </Card>
            </aside>

            <div className="space-y-8">
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  onClick={() => toggleQuickFilter("live-now")}
                  size="sm"
                  variant={
                    quickFilters.includes("live-now") ? "default" : "outline"
                  }
                >
                  <ActivityIcon className="mr-2 size-3" />
                  Live now
                </Button>
                <Button
                  onClick={() => toggleQuickFilter("starting-soon")}
                  size="sm"
                  variant={
                    quickFilters.includes("starting-soon")
                      ? "default"
                      : "outline"
                  }
                >
                  <AlarmClockIcon className="mr-2 size-3" />
                  Starting soon
                </Button>
                <Button
                  onClick={() => toggleQuickFilter("high-capacity")}
                  size="sm"
                  variant={
                    quickFilters.includes("high-capacity")
                      ? "default"
                      : "outline"
                  }
                >
                  <UsersIcon className="mr-2 size-3" />
                  {highCapacityLabel}
                </Button>
                <Button
                  onClick={() => toggleQuickFilter("sold-out")}
                  size="sm"
                  variant={
                    quickFilters.includes("sold-out") ? "default" : "outline"
                  }
                >
                  <TicketIcon className="mr-2 size-3" />
                  Sold out
                </Button>
                <Button
                  onClick={() => toggleQuickFilter("free")}
                  size="sm"
                  variant={
                    quickFilters.includes("free") ? "default" : "outline"
                  }
                >
                  Free
                </Button>
                <Button
                  onClick={() => toggleQuickFilter("paid")}
                  size="sm"
                  variant={
                    quickFilters.includes("paid") ? "default" : "outline"
                  }
                >
                  Paid
                </Button>
                {hasActiveFilters && (
                  <Button onClick={resetFilters} size="sm" variant="ghost">
                    Clear all
                  </Button>
                )}
              </div>

              <div className="rounded-3xl border border-slate-800/60 bg-slate-900/70 p-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.25em] text-slate-400">
                      Featured
                    </p>
                    <h3 className="text-xl font-semibold">
                      13 featured events
                    </h3>
                  </div>
                  <Badge
                    className="border-slate-700/70 bg-slate-950/40 text-slate-200"
                    variant="outline"
                  >
                    {featuredEvents.length} featured
                  </Badge>
                </div>
                {featuredEvents.length === 0 ? (
                  <p className="mt-4 text-sm text-slate-300">
                    No featured events available yet.
                  </p>
                ) : (
                  <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {featuredEvents.map((related, index) => (
                      <Link
                        className="group overflow-hidden rounded-2xl border border-slate-800/70 bg-slate-950/40 transition hover:-translate-y-0.5 hover:border-emerald-400/50"
                        href={`/events/${related.id}`}
                        key={related.id}
                        style={{ animationDelay: `${index * 50}ms` }}
                      >
                        <div className="relative h-28 overflow-hidden">
                          {related.featuredMediaUrl ? (
                            <img
                              alt={related.title}
                              className="h-full w-full object-cover"
                              loading="lazy"
                              src={related.featuredMediaUrl}
                            />
                          ) : (
                            <div className="flex h-full items-center justify-center bg-gradient-to-br from-slate-800 to-slate-950 text-slate-500">
                              <CrownIcon className="size-6" />
                            </div>
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-transparent" />
                        </div>
                        <div className="space-y-1 p-3">
                          <div className="flex items-center justify-between text-xs text-slate-400">
                            <span>
                              {shortDateFormatter.format(
                                new Date(related.eventDate)
                              )}
                            </span>
                            <span>{related.eventType}</span>
                          </div>
                          <p className="text-sm font-semibold">
                            {related.title}
                          </p>
                          <p className="text-xs text-slate-300">
                            {related.venueName ?? "Venue TBD"}
                          </p>
                          <div className="mt-2 flex items-center gap-1 text-[11px] text-emerald-200">
                            <ShieldCheckIcon className="size-3" />
                            Verified venue
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <Card className="border-slate-800/60 bg-slate-900/70 text-slate-50">
                  <CardHeader className="space-y-1">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <TimerIcon className="size-4 text-emerald-300" />
                      Today&apos;s spotlight
                    </CardTitle>
                    <CardDescription className="text-slate-300">
                      {todayEvents.length} event
                      {todayEvents.length === 1 ? "" : "s"} today.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {todayEvents.length === 0 ? (
                      <p className="text-sm text-slate-300">
                        No events scheduled for today.
                      </p>
                    ) : (
                      todayEvents.slice(0, 3).map((related) => (
                        <Link
                          className="flex items-center justify-between gap-3 rounded-xl border border-slate-800/70 bg-slate-950/40 px-3 py-2 text-sm transition hover:border-emerald-400/40"
                          href={`/events/${related.id}`}
                          key={related.id}
                        >
                          <div>
                            <p className="font-semibold">{related.title}</p>
                            <p className="text-xs text-slate-400">
                              {related.venueName ?? "Venue TBD"}
                            </p>
                          </div>
                          <Badge
                            className="border-slate-700/70 bg-slate-900/70 text-slate-200"
                            variant="outline"
                          >
                            {related.rsvpCount}/{related.guestCount || 0} RSVPs
                          </Badge>
                        </Link>
                      ))
                    )}
                    <Button
                      onClick={() => {
                        setSelectedDateStart(todayKey);
                        setSelectedDateEnd(todayKey);
                      }}
                      size="sm"
                      variant="outline"
                    >
                      Focus today
                    </Button>
                  </CardContent>
                </Card>

                <Card className="border-slate-800/60 bg-slate-900/70 text-slate-50">
                  <CardHeader className="space-y-1">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <CalendarDaysIcon className="size-4 text-sky-300" />
                      This week
                    </CardTitle>
                    <CardDescription className="text-slate-300">
                      {thisWeekEvents.length} event
                      {thisWeekEvents.length === 1 ? "" : "s"} in the next 7
                      days.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {thisWeekEvents.length === 0 ? (
                      <p className="text-sm text-slate-300">
                        No events scheduled this week.
                      </p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {thisWeekEvents.slice(0, 8).map((related) => (
                          <Link
                            className="rounded-full border border-slate-800/70 bg-slate-950/40 px-3 py-1 text-xs text-slate-200 transition hover:border-emerald-400/40"
                            href={`/events/${related.id}`}
                            key={related.id}
                          >
                            {shortDateFormatter.format(
                              new Date(related.eventDate)
                            )}{" "}
                            • {related.title}
                          </Link>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {dateRangeInvalid && (
                <Card className="border-rose-500/40 bg-rose-500/10 text-rose-100">
                  <CardContent className="py-6 text-sm">
                    End date must be after the start date. Adjust your range or
                    reset filters.
                  </CardContent>
                </Card>
              )}
              {sortedRelatedEvents.length === 0 ? (
                <Card className="border-slate-800/60 bg-slate-900/70 text-slate-50">
                  <CardContent className="py-10 text-center">
                    <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-slate-950/60">
                      <Globe2Icon className="size-5 text-slate-400" />
                    </div>
                    <p className="text-sm text-slate-200">
                      {hasActiveFilters
                        ? "No events match the current filters."
                        : "No events available yet."}
                    </p>
                    <p className="mt-2 text-xs text-slate-400">
                      Try resetting filters or browse all events.
                    </p>
                    <div className="mt-4 flex flex-wrap justify-center gap-2">
                      <Button
                        disabled={!hasActiveFilters}
                        onClick={resetFilters}
                        size="sm"
                        variant="outline"
                      >
                        Reset filters
                      </Button>
                      <Button asChild size="sm" variant="ghost">
                        <Link href="/events">View all events</Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ) : explorerView === "grid" ? (
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {sortedRelatedEvents.map((related, index) => {
                    const relatedDate = new Date(related.eventDate);
                    const relatedStart = startOfDay(relatedDate);
                    const relatedEnd = endOfDay(relatedDate);
                    const relatedLive =
                      now >= relatedStart && now <= relatedEnd;
                    const relatedPast = now > relatedEnd;
                    const relatedUpcoming = now < relatedStart;
                    const relatedSoldOut =
                      related.guestCount > 0 &&
                      related.rsvpCount >= related.guestCount;
                    const relatedLimited =
                      related.guestCount > 0 &&
                      !relatedSoldOut &&
                      related.rsvpCount / related.guestCount >= 0.85;
                    const relatedTimeUntil =
                      relatedStart.getTime() - now.getTime();
                    const relatedTimeSince =
                      now.getTime() - relatedStart.getTime();

                    return (
                      <Link
                        className="group rounded-2xl border border-slate-800/70 bg-slate-950/40 p-4 transition duration-300 hover:-translate-y-0.5 hover:border-emerald-400/50"
                        href={`/events/${related.id}`}
                        key={related.id}
                        style={{ animationDelay: `${index * 40}ms` }}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <Badge
                            className={cn(
                              "border text-[11px]",
                              relatedLive
                                ? "border-emerald-400/40 bg-emerald-500/20 text-emerald-200"
                                : relatedPast
                                  ? "border-slate-500/40 bg-slate-500/10 text-slate-200"
                                  : "border-sky-400/40 bg-sky-500/10 text-sky-200"
                            )}
                            variant="outline"
                          >
                            {relatedLive
                              ? "Live"
                              : relatedPast
                                ? "Past"
                                : "Upcoming"}
                          </Badge>
                          {relatedSoldOut && (
                            <Badge
                              className="border-rose-500/40 bg-rose-500/20 text-rose-100"
                              variant="outline"
                            >
                              Sold out
                            </Badge>
                          )}
                          {!relatedSoldOut && relatedLimited && (
                            <Badge
                              className="border-amber-400/40 bg-amber-500/20 text-amber-100"
                              variant="outline"
                            >
                              Limited
                            </Badge>
                          )}
                        </div>
                        <div className="mt-3 space-y-1">
                          <p className="text-lg font-semibold">
                            {related.title}
                          </p>
                          <p className="text-xs text-slate-300">
                            {shortDateFormatter.format(relatedDate)} •{" "}
                            {related.venueName ?? "Venue TBD"}
                          </p>
                        </div>
                        <div className="mt-3 flex items-center justify-between text-xs text-slate-400">
                          <span>{related.eventType}</span>
                          <span>
                            {related.ticketPrice === null
                              ? "Ticketing not set"
                              : related.ticketPrice <= 0
                                ? "Free"
                                : formatCurrency(related.ticketPrice)}
                          </span>
                        </div>
                        <div className="mt-3 flex items-center gap-2 text-xs text-slate-300">
                          <UsersIcon className="size-3" />
                          {related.rsvpCount}/{related.guestCount || 0} RSVPs
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {related.tags.slice(0, 3).map((tag) => (
                            <Badge
                              className="border-slate-700/70 bg-slate-900/70 text-slate-200"
                              key={tag}
                              variant="outline"
                            >
                              {tag}
                            </Badge>
                          ))}
                        </div>
                        <div className="mt-3 space-y-1 text-xs text-slate-400 opacity-0 transition group-hover:opacity-100">
                          <div className="flex items-center gap-2">
                            <TimerIcon className="size-3" />
                            {relatedLive
                              ? `Live for ${formatDuration(relatedTimeSince)}`
                              : relatedUpcoming
                                ? `Starts in ${formatDuration(relatedTimeUntil)}`
                                : "Completed"}
                          </div>
                          <div className="flex items-center gap-1 text-emerald-200">
                            <ShieldCheckIcon className="size-3" />
                            Verified venue
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              ) : (
                <div className="space-y-4">
                  {timelineGroups.map((group) => (
                    <div
                      className="rounded-2xl border border-slate-800/70 bg-slate-950/40 p-4"
                      key={group.key}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold">
                            {dateFormatter.format(group.date)}
                          </p>
                          <p className="text-xs text-slate-400">
                            {group.items.length} events
                          </p>
                        </div>
                        <Badge
                          className="border-slate-700/70 bg-slate-900/70 text-slate-200"
                          variant="outline"
                        >
                          {shortDateFormatter.format(group.date)}
                        </Badge>
                      </div>
                      <div className="mt-4 space-y-3">
                        {group.items.map((related) => {
                          const relatedDate = new Date(related.eventDate);
                          const relatedStart = startOfDay(relatedDate);
                          const relatedEnd = endOfDay(relatedDate);
                          const relatedLive =
                            now >= relatedStart && now <= relatedEnd;
                          const relatedPast = now > relatedEnd;
                          const relatedSoldOut =
                            related.guestCount > 0 &&
                            related.rsvpCount >= related.guestCount;
                          return (
                            <Link
                              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-800/70 bg-slate-900/60 px-4 py-3 text-sm transition hover:border-emerald-400/40"
                              href={`/events/${related.id}`}
                              key={related.id}
                            >
                              <div className="space-y-1">
                                <p className="font-semibold">{related.title}</p>
                                <p className="text-xs text-slate-400">
                                  {related.venueName ?? "Venue TBD"} •{" "}
                                  {related.eventType}
                                </p>
                              </div>
                              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-300">
                                <Badge
                                  className={cn(
                                    "border text-[11px]",
                                    relatedLive
                                      ? "border-emerald-400/40 bg-emerald-500/20 text-emerald-200"
                                      : relatedPast
                                        ? "border-slate-500/40 bg-slate-500/10 text-slate-200"
                                        : "border-sky-400/40 bg-sky-500/10 text-sky-200"
                                  )}
                                  variant="outline"
                                >
                                  {relatedLive
                                    ? "Live"
                                    : relatedPast
                                      ? "Past"
                                      : "Upcoming"}
                                </Badge>
                                {relatedSoldOut && (
                                  <Badge
                                    className="border-rose-500/40 bg-rose-500/20 text-rose-100"
                                    variant="outline"
                                  >
                                    Sold out
                                  </Badge>
                                )}
                                <span>
                                  {related.rsvpCount}/{related.guestCount || 0}{" "}
                                  RSVPs
                                </span>
                              </div>
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>
      </div>

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

      <Dialog onOpenChange={setQuickRsvpOpen} open={quickRsvpOpen}>
        <DialogContent className="border-slate-800 bg-slate-950 text-slate-50">
          <DialogHeader>
            <DialogTitle>Add RSVP</DialogTitle>
            <DialogDescription className="text-slate-300">
              Add a guest to the RSVP list for {event.title}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="rsvp-name">Guest name</Label>
              <Input
                id="rsvp-name"
                onChange={(value) => setQuickRsvpName(value.target.value)}
                placeholder="Full name"
                value={quickRsvpName}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rsvp-email">Guest email</Label>
              <Input
                id="rsvp-email"
                onChange={(value) => setQuickRsvpEmail(value.target.value)}
                placeholder="Optional email"
                type="email"
                value={quickRsvpEmail}
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setQuickRsvpOpen(false)} variant="outline">
              Cancel
            </Button>
            <Button disabled={quickRsvpLoading} onClick={handleQuickRsvp}>
              {quickRsvpLoading ? "Saving..." : "Add RSVP"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Sheet onOpenChange={setDrawerOpen} open={drawerOpen}>
        <SheetContent
          className="border-slate-800 bg-slate-950 text-slate-50 sm:max-w-2xl lg:max-w-4xl"
          side="right"
        >
          <SheetHeader className="border-b border-slate-800 pb-4">
            <SheetTitle className="text-slate-50">
              {selectedDish?.name ?? "Recipe details"}
            </SheetTitle>
            <p className="text-xs text-slate-400">
              {selectedRecipe?.recipeName ?? "Recipe not linked"}
            </p>
          </SheetHeader>
          <div className="flex flex-wrap items-center gap-2 px-4">
            <ToggleGroup
              className="rounded-full border border-slate-800/70 bg-slate-900/60"
              onValueChange={(value) => {
                if (value) {
                  setDrawerMode(value as DrawerMode);
                }
              }}
              type="single"
              value={drawerMode}
            >
              <ToggleGroupItem value="instructions">
                Instructions
              </ToggleGroupItem>
              <ToggleGroupItem value="ingredients">Ingredients</ToggleGroupItem>
            </ToggleGroup>
            <Button
              asChild
              disabled={!selectedRecipe?.versionId}
              size="sm"
              variant="outline"
            >
              {selectedRecipe?.versionId ? (
                <Link href={`/inventory/recipes/${selectedRecipe.versionId}`}>
                  Open recipe
                </Link>
              ) : (
                <span>Open recipe</span>
              )}
            </Button>
          </div>
          <div className="max-h-[70vh] space-y-6 overflow-y-auto px-4 pb-6 pt-2">
            {selectedRecipe ? (
              <>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="rounded-xl border border-slate-800/70 bg-slate-900/60 p-3 text-sm">
                    <div className="text-xs text-slate-400">Prep time</div>
                    <div className="font-semibold">
                      {selectedRecipe.prepTimeMinutes ?? 0}m
                    </div>
                  </div>
                  <div className="rounded-xl border border-slate-800/70 bg-slate-900/60 p-3 text-sm">
                    <div className="text-xs text-slate-400">Cook time</div>
                    <div className="font-semibold">
                      {selectedRecipe.cookTimeMinutes ?? 0}m
                    </div>
                  </div>
                  <div className="rounded-xl border border-slate-800/70 bg-slate-900/60 p-3 text-sm">
                    <div className="text-xs text-slate-400">Rest time</div>
                    <div className="font-semibold">
                      {selectedRecipe.restTimeMinutes ?? 0}m
                    </div>
                  </div>
                  <div className="rounded-xl border border-slate-800/70 bg-slate-900/60 p-3 text-sm">
                    <div className="text-xs text-slate-400">Yield</div>
                    <div className="font-semibold">
                      {selectedRecipe.yieldQuantity}{" "}
                      {selectedRecipe.yieldUnitCode ?? "servings"}
                    </div>
                  </div>
                </div>

                {drawerMode === "ingredients" ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold">Ingredients</h3>
                      <Badge
                        className="border-slate-700/70 bg-slate-900/60 text-slate-200"
                        variant="outline"
                      >
                        {selectedScaledIngredients.length} items
                      </Badge>
                    </div>
                    <div className="space-y-2">
                      {selectedScaledIngredients.map((ingredient) => (
                        <div
                          className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-800/70 bg-slate-900/60 px-3 py-2 text-sm"
                          key={ingredient.ingredientId}
                        >
                          <div>
                            <p className="font-medium">
                              {ingredient.ingredientName}
                            </p>
                            {ingredient.preparationNotes && (
                              <p className="text-xs text-slate-400">
                                {ingredient.preparationNotes}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-slate-300">
                            <span>
                              {ingredient.scaledQuantity}{" "}
                              {ingredient.unitCode ?? ""}
                            </span>
                            {ingredient.isOptional && (
                              <Badge
                                className="border-slate-700/70 bg-slate-950/40 text-slate-200"
                                variant="outline"
                              >
                                Optional
                              </Badge>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <h3 className="text-lg font-semibold">Instructions</h3>
                    {selectedRecipe.steps.length > 0 ? (
                      <ol className="space-y-4">
                        {selectedRecipe.steps.map((step) => (
                          <li
                            className="rounded-2xl border border-slate-800/70 bg-slate-900/60 p-4"
                            key={`${step.stepNumber}-${step.instruction}`}
                          >
                            <div className="flex items-center justify-between text-xs text-slate-400">
                              <span>Step {step.stepNumber}</span>
                              {step.durationMinutes && (
                                <span>{step.durationMinutes}m</span>
                              )}
                            </div>
                            <p className="mt-2 text-sm text-slate-100">
                              {step.instruction}
                            </p>
                            {step.equipmentNeeded.length > 0 && (
                              <p className="mt-2 text-xs text-slate-400">
                                Equipment: {step.equipmentNeeded.join(", ")}
                              </p>
                            )}
                            {step.tips && (
                              <p className="mt-2 text-xs text-slate-300">
                                Tip: {step.tips}
                              </p>
                            )}
                          </li>
                        ))}
                      </ol>
                    ) : selectedRecipe.instructions ? (
                      <div className="rounded-2xl border border-slate-800/70 bg-slate-900/60 p-4 text-sm text-slate-100">
                        <p className="whitespace-pre-line">
                          {selectedRecipe.instructions}
                        </p>
                      </div>
                    ) : (
                      <p className="text-sm text-slate-300">
                        No instructions available.
                      </p>
                    )}
                  </div>
                )}
              </>
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-800/70 p-8 text-center">
                <p className="text-sm text-slate-300">
                  No recipe linked to this dish yet.
                </p>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-800 bg-slate-950/95 px-4 py-3 backdrop-blur sm:hidden">
        <div className="flex items-center gap-2">
          <Button
            className="flex-1 bg-emerald-400 text-slate-950 hover:bg-emerald-300"
            disabled={soldOut}
            onClick={() => setQuickRsvpOpen(true)}
            size="sm"
          >
            RSVP
          </Button>
          <Button
            className="px-3"
            disabled={!saveReady}
            onClick={handleToggleSave}
            size="sm"
            variant="outline"
          >
            <HeartIcon className={cn("size-4", isSaved && "fill-current")} />
          </Button>
          <Button
            className="px-3"
            onClick={handleShare}
            size="sm"
            variant="outline"
          >
            <LinkIcon className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
