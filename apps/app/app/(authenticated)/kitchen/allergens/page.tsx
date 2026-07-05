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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@repo/design-system/components/ui/dialog";
import { Input } from "@repo/design-system/components/ui/input";
import { Label } from "@repo/design-system/components/ui/label";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@repo/design-system/components/ui/tabs";
// biome-ignore lint/performance/noBarrelFile: Sentry requires namespace import for logger
import * as Sentry from "@sentry/nextjs";
import { AlertTriangle, CheckCircle2, Loader2, SearchIcon } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { apiUrl } from "@/app/lib/api";
import {
  allergenWarningAcknowledge,
  allergenWarningMarkResolved,
  listAllergenWarnings,
  listDishes,
  listEvents,
  listRecipes,
} from "@/app/lib/manifest-client.generated";
import { AllergenMatrix } from "@/components/allergen-matrix";
import {
  OperationalPageShell,
  OperationalSection,
} from "../../components/operational-page-shell";
import { AllergenManagementModal } from "./allergen-management-modal";

const { logger, captureException } = Sentry;

// Types matching database schema
interface AllergenWarning {
  acknowledgedAt?: Date;
  acknowledgedBy?: string;
  affectedGuests: string[];
  allergens: string[];
  createdAt: Date;
  dish?: {
    id: string;
    name: string;
  };
  dishId?: string;
  event?: {
    id: string;
    title: string;
    startDate: Date;
    location?: string;
  };
  eventId?: string;
  id: string;
  isAcknowledged: boolean;
  notes?: string;
  overrideReason?: string;
  resolved: boolean;
  resolvedAt?: Date;
  severity: string;
  updatedAt: Date;
  warningType: string;
}

interface Event {
  eventDate: Date;
  id: string;
  status: string;
  title: string;
  venueName?: string;
}

interface Dish {
  allergens: string[];
  dietaryTags: string[];
  id: string;
  name: string;
}

interface Recipe {
  category?: string;
  id: string;
  name: string;
  tags: string[];
}

export default function AllergenManagementPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Resolve warning dialog state
  const [resolveDialogOpen, setResolveDialogOpen] = useState(false);
  const [resolveWarningId, setResolveWarningId] = useState<string | null>(null);
  const [overrideReason, setOverrideReason] = useState("");

  // Data state
  const [warnings, setWarnings] = useState<AllergenWarning[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);

  // Fetch helpers — stable refs (empty deps) so mount effects don't re-fire every render
  const fetchWarnings = useCallback(async () => {
    try {
      const data = await listAllergenWarnings();
      setWarnings((data.data || []) as unknown as AllergenWarning[]);
    } catch (error) {
      // Network errors or other issues - handle gracefully
      logger.warn(logger.fmt`Error fetching warnings: ${String(error)}`);
      setWarnings([]);
    }
  }, []);

  const fetchEvents = useCallback(async () => {
    try {
      const data = await listEvents({ limit: 50 });
      setEvents((data.data || []) as unknown as Event[]);
    } catch (error) {
      logger.warn(logger.fmt`Error fetching events: ${String(error)}`);
      setEvents([]);
    }
  }, []);

  const fetchDishes = useCallback(async () => {
    try {
      const data = await listDishes({ limit: 100 });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setDishes((data.data || []) as any);
    } catch (error) {
      logger.warn(logger.fmt`Error fetching dishes: ${String(error)}`);
      setDishes([]);
    }
  }, []);

  const fetchRecipes = useCallback(async () => {
    try {
      const data = await listRecipes({ limit: 100 });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setRecipes((data.data || []) as any);
    } catch (error) {
      logger.warn(logger.fmt`Error fetching recipes: ${String(error)}`);
      setRecipes([]);
    }
  }, []);

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
      const meRes = await fetch(apiUrl("/api/me"), { credentials: "include" });
      const me = await meRes.json().catch(() => ({}));
      await allergenWarningAcknowledge({
        id: warningId,
        acknowledgedBy: me.id,
        notes: "",
      });

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
    _overrideReason: string
  ) => {
    setActionLoading(true);
    try {
      await allergenWarningMarkResolved({ id: warningId });

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

  const formatGuests = (guests: string[]) =>
    guests.length > 0 ? `${guests.length} guest(s)` : "No guests";

  const formatDateTime = (date: Date | string) =>
    new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(date));

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
    <OperationalPageShell
      description="Manage allergen warnings and dietary restrictions for events and dishes."
      eyebrow="Kitchen / Allergens"
      title="Allergen management"
      withCanvas={false}
    >
      <OperationalSection title="Search">
        <div className="flex items-center gap-2">
          <SearchIcon className="size-4 text-muted-foreground" />
          <Input
            className="w-64"
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search warnings, events, dishes..."
            value={searchTerm}
          />
        </div>
      </OperationalSection>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <OperationalSection title="Allergen information">
          <Tabs className="space-y-4" defaultValue="warnings">
            <TabsList>
              <TabsTrigger value="warnings">Allergen Warnings</TabsTrigger>
              <TabsTrigger value="events">Events</TabsTrigger>
              <TabsTrigger value="dishes">Dishes</TabsTrigger>
              <TabsTrigger value="recipes">Recipes</TabsTrigger>
              <TabsTrigger value="matrix">Allergen Matrix</TabsTrigger>
            </TabsList>

            {/* Allergen Warnings Tab */}
            <TabsContent className="space-y-4" value="warnings">
              <Card tone="canvas">
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
                    <div className="py-8 text-center text-muted-foreground">
                      No allergen warnings found
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {filteredWarnings.map((warning) => (
                        <Card
                          className="border-l-4 border-l-yellow-500"
                          key={warning.id}
                          tone="canvas"
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
                                  <span className="text-muted-foreground text-sm">
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
                                    <p className="text-muted-foreground text-sm">
                                      Event: {warning.event.title} on{" "}
                                      {new Date(
                                        warning.event.startDate
                                      ).toLocaleDateString()}
                                    </p>
                                  )}
                                  {warning.dish && (
                                    <p className="text-muted-foreground text-sm">
                                      Dish: {warning.dish.name}
                                    </p>
                                  )}
                                  <p className="text-muted-foreground text-sm">
                                    Allergens:{" "}
                                    {warning.allergens.join(", ") || "None"}
                                  </p>
                                  <p className="text-muted-foreground text-sm">
                                    {formatGuests(warning.affectedGuests)}
                                  </p>
                                  {warning.notes && (
                                    <p className="mt-2 text-sm">
                                      {warning.notes}
                                    </p>
                                  )}
                                  {warning.overrideReason && (
                                    <p className="mt-2 text-muted-foreground text-sm">
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
                                      setResolveWarningId(warning.id);
                                      setOverrideReason("");
                                      setResolveDialogOpen(true);
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
              <Card tone="canvas">
                <CardHeader>
                  <CardTitle>Event Allergen Information</CardTitle>
                </CardHeader>
                <CardContent>
                  {filteredEvents.length === 0 ? (
                    <div className="py-8 text-center text-muted-foreground">
                      No events found
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {filteredEvents.map((event) => (
                        <Card key={event.id} tone="canvas">
                          <CardContent className="pt-4">
                            <div className="flex items-center justify-between">
                              <div>
                                <h3 className="font-medium">{event.title}</h3>
                                <p className="text-muted-foreground text-sm">
                                  {new Date(
                                    event.eventDate
                                  ).toLocaleDateString()}
                                  {event.venueName && ` at ${event.venueName}`}
                                </p>
                                <p className="text-muted-foreground text-sm">
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
              <Card tone="canvas">
                <CardHeader>
                  <CardTitle>Dish Allergen Information</CardTitle>
                </CardHeader>
                <CardContent>
                  {filteredDishes.length === 0 ? (
                    <div className="py-8 text-center text-muted-foreground">
                      No dishes found
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {filteredDishes.map((dish) => (
                        <Card key={dish.id} tone="canvas">
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
              <Card tone="canvas">
                <CardHeader>
                  <CardTitle>Recipe Information</CardTitle>
                </CardHeader>
                <CardContent>
                  {filteredRecipes.length === 0 ? (
                    <div className="py-8 text-center text-muted-foreground">
                      No recipes found
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {filteredRecipes.map((recipe) => (
                        <Card key={recipe.id} tone="canvas">
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
                              <div className="mt-2 rounded border border-hairline bg-muted/50 p-2 text-muted-foreground text-sm">
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

            {/* Allergen Matrix Tab */}
            <TabsContent className="space-y-4" value="matrix">
              <AllergenMatrix itemType="dish" showDietaryTags showExport />
            </TabsContent>
          </Tabs>
        </OperationalSection>
      )}

      {/* Resolve Warning Dialog */}
      <Dialog onOpenChange={setResolveDialogOpen} open={resolveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resolve Warning</DialogTitle>
            <DialogDescription>
              Please provide an override reason for resolving this allergen
              warning.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="override-reason">Override Reason</Label>
            <Input
              id="override-reason"
              onChange={(e) => setOverrideReason(e.target.value)}
              placeholder="Enter override reason"
              value={overrideReason}
            />
          </div>
          <DialogFooter>
            <Button
              onClick={() => setResolveDialogOpen(false)}
              variant="outline"
            >
              Cancel
            </Button>
            <Button
              disabled={!overrideReason.trim()}
              onClick={() => {
                if (resolveWarningId) {
                  handleResolveWarning(resolveWarningId, overrideReason);
                }
                setResolveDialogOpen(false);
              }}
            >
              Resolve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </OperationalPageShell>
  );
}
