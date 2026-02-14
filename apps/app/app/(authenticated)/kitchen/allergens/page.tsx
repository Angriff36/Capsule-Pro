/**
 * @module AllergenManagementPage
 * @intent Provide interface for managing allergen warnings and dietary restrictions
 * @responsibility Display allergen warnings, event and dish allergen information, and edit interfaces
 * @domain Kitchen
 * @tags allergens, warnings, dietary-restrictions, dashboard
 * @canonical true
 */

"use client";

import { Badge } from "@repo/design-system/components/ui/badge";
import { Button } from "@repo/design-system/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";
import { Input } from "@repo/design-system/components/ui/input";
import { Separator } from "@repo/design-system/components/ui/separator";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@repo/design-system/components/ui/tabs";
// biome-ignore lint/performance/noBarrelFile: Sentry requires namespace import for logger
import * as Sentry from "@sentry/nextjs";
import { AlertTriangle, CheckCircle2, Loader2, SearchIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { apiFetch } from "@/app/lib/api";
import { AllergenManagementModal } from "./allergen-management-modal";

const { logger, captureException } = Sentry;

// Types matching database schema
interface AllergenWarning {
  id: string;
  eventId?: string;
  dishId?: string;
  warningType: string;
  allergens: string[];
  affectedGuests: string[];
  severity: string;
  isAcknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
  overrideReason?: string;
  resolved: boolean;
  resolvedAt?: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
  event?: {
    id: string;
    title: string;
    startDate: Date;
    location?: string;
  };
  dish?: {
    id: string;
    name: string;
  };
}

interface Event {
  id: string;
  title: string;
  eventDate: Date;
  venueName?: string;
  status: string;
}

interface Dish {
  id: string;
  name: string;
  allergens: string[];
  dietaryTags: string[];
}

interface Recipe {
  id: string;
  name: string;
  tags: string[];
  category?: string;
}

export default function AllergenManagementPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Data state
  const [warnings, setWarnings] = useState<AllergenWarning[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);

  // Fetch function declarations (must be before useEffect hooks that use them)
  const fetchWarnings = async () => {
    try {
      const response = await apiFetch("/api/kitchen/allergens/warnings");
      if (!response.ok) {
        // Don't throw - handle gracefully and return empty array
        logger.warn("Failed to fetch warnings, server may be unavailable");
        setWarnings([]);
        return;
      }
      const data = await response.json();
      setWarnings(data.warnings || []);
    } catch (error) {
      // Network errors or other issues - handle gracefully
      logger.warn(logger.fmt`Error fetching warnings: ${String(error)}`);
      setWarnings([]);
    }
  };

  const fetchEvents = async () => {
    try {
      const response = await apiFetch("/api/events?limit=50");
      if (!response.ok) {
        logger.warn("Failed to fetch events, server may be unavailable");
        setEvents([]);
        return;
      }
      const data = await response.json();
      setEvents(data.data || []);
    } catch (error) {
      logger.warn(logger.fmt`Error fetching events: ${String(error)}`);
      setEvents([]);
    }
  };

  const fetchDishes = async () => {
    try {
      const response = await apiFetch("/api/kitchen/dishes?limit=100");
      if (!response.ok) {
        logger.warn("Failed to fetch dishes, server may be unavailable");
        setDishes([]);
        return;
      }
      const data = await response.json();
      setDishes(data.data || []);
    } catch (error) {
      logger.warn(logger.fmt`Error fetching dishes: ${String(error)}`);
      setDishes([]);
    }
  };

  const fetchRecipes = async () => {
    try {
      const response = await apiFetch("/api/kitchen/recipes?limit=100");
      if (!response.ok) {
        logger.warn("Failed to fetch recipes, server may be unavailable");
        setRecipes([]);
        return;
      }
      const data = await response.json();
      setRecipes(data.data || []);
    } catch (error) {
      logger.warn(logger.fmt`Error fetching recipes: ${String(error)}`);
      setRecipes([]);
    }
  };

  // Fetch all data on mount
  useEffect(() => {
    let isMounted = true;
    const loadData = async () => {
      await Promise.all([
        fetchWarnings(),
        fetchEvents(),
        fetchDishes(),
        fetchRecipes(),
      ]);
      if (isMounted) {
        setLoading(false);
      }
    };
    loadData();
    return () => {
      isMounted = false;
    };
  }, [fetchDishes, fetchEvents, fetchRecipes, fetchWarnings]);

  // Listen for allergen updates and refresh data
  useEffect(() => {
    const handleAllergenUpdate = () => {
      fetchDishes();
    };

    window.addEventListener("allergen-updated", handleAllergenUpdate);
    return () => {
      window.removeEventListener("allergen-updated", handleAllergenUpdate);
    };
  }, [fetchDishes]);

  // Filter data based on search term
  const filteredWarnings = warnings.filter(
    (warning) =>
      warning.warningType.toLowerCase().includes(searchTerm.toLowerCase()) ||
      warning.allergens.some((allergen) =>
        allergen.toLowerCase().includes(searchTerm.toLowerCase())
      ) ||
      warning.event?.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredEvents = events.filter(
    (event) =>
      event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      event.venueName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredDishes = dishes.filter((dish) =>
    dish.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredRecipes = recipes.filter((recipe) =>
    recipe.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAcknowledgeWarning = async (warningId: string) => {
    setActionLoading(true);
    try {
      const response = await apiFetch(
        "/api/events/allergens/warnings/acknowledge",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            warningId,
            resolved: false,
          }),
        }
      );

      if (!response.ok) {
        toast.error("Failed to acknowledge warning");
        return;
      }

      toast.success("Warning acknowledged");

      // Refresh warnings
      await fetchWarnings();
    } catch (error) {
      captureException(error);
      toast.error("Failed to acknowledge warning");
    } finally {
      setActionLoading(false);
    }
  };

  const handleResolveWarning = async (
    warningId: string,
    overrideReason: string
  ) => {
    setActionLoading(true);
    try {
      const response = await apiFetch(
        "/api/events/allergens/warnings/acknowledge",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            warningId,
            overrideReason,
            resolved: true,
          }),
        }
      );

      if (!response.ok) {
        toast.error("Failed to resolve warning");
        return;
      }

      toast.success("Warning resolved");

      // Refresh warnings
      await fetchWarnings();
    } catch (error) {
      captureException(error);
      toast.error("Failed to resolve warning");
    } finally {
      setActionLoading(false);
    }
  };

  const formatGuests = (guests: string[]) => {
    return guests.length > 0 ? `${guests.length} guest(s)` : "No guests";
  };

  const formatDateTime = (date: Date | string) => {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(date));
  };

  const getSeverityBadgeColor = (severity: string) => {
    switch (severity) {
      case "critical":
      case "high":
        return "destructive";
      case "medium":
        return "default";
      case "low":
        return "secondary";
      default:
        return "default";
    }
  };

  return (
    <div className="flex flex-1 flex-col gap-8 p-4 pt-0">
      {/* Page Header */}
      <div className="space-y-0.5">
        <h1 className="text-3xl font-bold tracking-tight">
          Allergen Management
        </h1>
        <p className="text-muted-foreground">
          Manage allergen warnings and dietary restrictions for events and
          dishes
        </p>
      </div>

      <Separator />

      {/* Search Section */}
      <section className="space-y-4">
        <h2 className="text-sm font-medium text-muted-foreground">Search</h2>
        <div className="flex items-center gap-2">
          <SearchIcon className="size-4 text-muted-foreground" />
          <Input
            className="w-64"
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search warnings, events, dishes..."
            value={searchTerm}
          />
        </div>
      </section>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        /* Allergen Information Section */
        <section className="space-y-4">
          <h2 className="text-sm font-medium text-muted-foreground">
            Allergen Information
          </h2>
          <Tabs className="space-y-4" defaultValue="warnings">
            <TabsList>
              <TabsTrigger value="warnings">Allergen Warnings</TabsTrigger>
              <TabsTrigger value="events">Events</TabsTrigger>
              <TabsTrigger value="dishes">Dishes</TabsTrigger>
              <TabsTrigger value="recipes">Recipes</TabsTrigger>
            </TabsList>

            {/* Allergen Warnings Tab */}
            <TabsContent className="space-y-4" value="warnings">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <AlertTriangle className="size-5" />
                    <span>All Allergen Warnings</span>
                    <Badge variant="destructive">
                      {filteredWarnings.length}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {filteredWarnings.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No allergen warnings found
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {filteredWarnings.map((warning) => (
                        <Card
                          className="border-l-4 border-l-yellow-500"
                          key={warning.id}
                        >
                          <CardContent className="pt-4">
                            <div className="flex items-start justify-between">
                              <div className="space-y-2">
                                <div className="flex items-center space-x-2">
                                  <Badge
                                    variant={getSeverityBadgeColor(
                                      warning.severity
                                    )}
                                  >
                                    {warning.severity}
                                  </Badge>
                                  <span className="text-sm text-muted-foreground">
                                    {formatDateTime(warning.createdAt)}
                                  </span>
                                  {warning.isAcknowledged && (
                                    <CheckCircle2 className="size-4 text-green-500" />
                                  )}
                                </div>
                                <div>
                                  <p className="font-medium">
                                    {warning.warningType}
                                  </p>
                                  {warning.event && (
                                    <p className="text-sm text-muted-foreground">
                                      Event: {warning.event.title} on{" "}
                                      {new Date(
                                        warning.event.startDate
                                      ).toLocaleDateString()}
                                    </p>
                                  )}
                                  {warning.dish && (
                                    <p className="text-sm text-muted-foreground">
                                      Dish: {warning.dish.name}
                                    </p>
                                  )}
                                  <p className="text-sm text-muted-foreground">
                                    Allergens:{" "}
                                    {warning.allergens.join(", ") || "None"}
                                  </p>
                                  <p className="text-sm text-muted-foreground">
                                    {formatGuests(warning.affectedGuests)}
                                  </p>
                                  {warning.notes && (
                                    <p className="text-sm mt-2">
                                      {warning.notes}
                                    </p>
                                  )}
                                  {warning.overrideReason && (
                                    <p className="text-sm mt-2 text-muted-foreground">
                                      Override: {warning.overrideReason}
                                    </p>
                                  )}
                                </div>
                              </div>
                              <div className="flex space-x-2">
                                {!warning.isAcknowledged && (
                                  <Button
                                    disabled={actionLoading}
                                    onClick={() =>
                                      handleAcknowledgeWarning(warning.id)
                                    }
                                    size="sm"
                                    variant="outline"
                                  >
                                    {actionLoading ? (
                                      <Loader2 className="size-4 animate-spin" />
                                    ) : (
                                      "Acknowledge"
                                    )}
                                  </Button>
                                )}
                                {!warning.resolved && (
                                  <Button
                                    disabled={actionLoading}
                                    onClick={() => {
                                      const reason = prompt(
                                        "Please provide override reason:"
                                      );
                                      if (reason) {
                                        handleResolveWarning(
                                          warning.id,
                                          reason
                                        );
                                      }
                                    }}
                                    size="sm"
                                  >
                                    {actionLoading ? (
                                      <Loader2 className="size-4 animate-spin" />
                                    ) : (
                                      "Resolve"
                                    )}
                                  </Button>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Events Tab */}
            <TabsContent className="space-y-4" value="events">
              <Card>
                <CardHeader>
                  <CardTitle>Event Allergen Information</CardTitle>
                </CardHeader>
                <CardContent>
                  {filteredEvents.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No events found
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {filteredEvents.map((event) => (
                        <Card key={event.id}>
                          <CardContent className="pt-4">
                            <div className="flex items-center justify-between">
                              <div>
                                <h3 className="font-medium">{event.title}</h3>
                                <p className="text-sm text-muted-foreground">
                                  {new Date(
                                    event.eventDate
                                  ).toLocaleDateString()}
                                  {event.venueName && ` at ${event.venueName}`}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  Status:{" "}
                                  <Badge
                                    variant={
                                      event.status === "confirmed"
                                        ? "default"
                                        : "secondary"
                                    }
                                  >
                                    {event.status}
                                  </Badge>
                                </p>
                              </div>
                              <Badge variant="outline">View Details</Badge>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Dishes Tab */}
            <TabsContent className="space-y-4" value="dishes">
              <Card>
                <CardHeader>
                  <CardTitle>Dish Allergen Information</CardTitle>
                </CardHeader>
                <CardContent>
                  {filteredDishes.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No dishes found
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {filteredDishes.map((dish) => (
                        <Card key={dish.id}>
                          <CardContent className="pt-4">
                            <div className="flex items-start justify-between">
                              <div className="space-y-2">
                                <h3 className="font-medium">{dish.name}</h3>
                                <div className="flex flex-wrap gap-2">
                                  {dish.allergens.length > 0 ? (
                                    dish.allergens.map((allergen) => (
                                      <Badge
                                        key={allergen}
                                        variant="destructive"
                                      >
                                        {allergen}
                                      </Badge>
                                    ))
                                  ) : (
                                    <Badge variant="secondary">
                                      No allergens
                                    </Badge>
                                  )}
                                  {dish.dietaryTags.map((tag) => (
                                    <Badge key={tag} variant="outline">
                                      {tag}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                              <AllergenManagementModal
                                currentAllergens={dish.allergens}
                                currentDietaryTags={dish.dietaryTags}
                                id={dish.id}
                                name={dish.name}
                                tenantId="" // Will be fetched from auth context in the modal
                                type="dish"
                              />
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Recipes Tab */}
            <TabsContent className="space-y-4" value="recipes">
              <Card>
                <CardHeader>
                  <CardTitle>Recipe Information</CardTitle>
                </CardHeader>
                <CardContent>
                  {filteredRecipes.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No recipes found
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {filteredRecipes.map((recipe) => (
                        <Card key={recipe.id}>
                          <CardContent className="pt-4">
                            <div className="space-y-2">
                              <h3 className="font-medium">{recipe.name}</h3>
                              <div className="flex flex-wrap gap-2">
                                {recipe.tags.length > 0 ? (
                                  recipe.tags.map((tag) => (
                                    <Badge key={tag} variant="outline">
                                      {tag}
                                    </Badge>
                                  ))
                                ) : (
                                  <Badge variant="secondary">No tags</Badge>
                                )}
                                {recipe.category && (
                                  <Badge variant="secondary">
                                    {recipe.category}
                                  </Badge>
                                )}
                              </div>
                              <div className="text-sm text-muted-foreground mt-2 p-2 bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded">
                                <strong>Note:</strong> Recipe allergen
                                management is not available. Allergens are
                                managed at the dish level.
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </section>
      )}
    </div>
  );
}
