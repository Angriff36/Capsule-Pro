/**
 * @module AllergenManagementPage
 * @intent Provide interface for managing allergen warnings and dietary restrictions
 * @responsibility Display allergen warnings, event and dish allergen information, and edit interfaces
 * @domain Kitchen
 * @tags allergens, warnings, dietary-restrictions, dashboard
 * @canonical true
 */
"use client";

Object.defineProperty(exports, "__esModule", { value: true });
exports.default = AllergenManagementPage;
const badge_1 = require("@repo/design-system/components/ui/badge");
const button_1 = require("@repo/design-system/components/ui/button");
const card_1 = require("@repo/design-system/components/ui/card");
const input_1 = require("@repo/design-system/components/ui/input");
const tabs_1 = require("@repo/design-system/components/ui/tabs");
const lucide_react_1 = require("lucide-react");
const react_1 = require("react");
const sonner_1 = require("sonner");
const allergen_management_modal_1 = require("./allergen-management-modal");
function AllergenManagementPage() {
  const [searchTerm, setSearchTerm] = (0, react_1.useState)("");
  const [loading, setLoading] = (0, react_1.useState)(true);
  const [actionLoading, setActionLoading] = (0, react_1.useState)(false);
  // Data state
  const [warnings, setWarnings] = (0, react_1.useState)([]);
  const [events, setEvents] = (0, react_1.useState)([]);
  const [dishes, setDishes] = (0, react_1.useState)([]);
  const [recipes, setRecipes] = (0, react_1.useState)([]);
  // Fetch function declarations (must be before useEffect hooks that use them)
  const fetchWarnings = async () => {
    try {
      const response = await fetch("/api/kitchen/allergens/warnings");
      if (!response.ok) throw new Error("Failed to fetch warnings");
      const data = await response.json();
      setWarnings(data.warnings || []);
    } catch (error) {
      console.error("Error fetching warnings:", error);
      throw error;
    }
  };
  const fetchEvents = async () => {
    try {
      const response = await fetch("/api/events?limit=50");
      if (!response.ok) throw new Error("Failed to fetch events");
      const data = await response.json();
      setEvents(data.data || []);
    } catch (error) {
      console.error("Error fetching events:", error);
      throw error;
    }
  };
  const fetchDishes = async () => {
    try {
      const response = await fetch("/api/kitchen/dishes?limit=100");
      if (!response.ok) throw new Error("Failed to fetch dishes");
      const data = await response.json();
      setDishes(data.data || []);
    } catch (error) {
      console.error("Error fetching dishes:", error);
      throw error;
    }
  };
  const fetchRecipes = async () => {
    try {
      const response = await fetch("/api/kitchen/recipes?limit=100");
      if (!response.ok) throw new Error("Failed to fetch recipes");
      const data = await response.json();
      setRecipes(data.data || []);
    } catch (error) {
      console.error("Error fetching recipes:", error);
      throw error;
    }
  };
  // Fetch all data on mount
  (0, react_1.useEffect)(() => {
    Promise.all([fetchWarnings(), fetchEvents(), fetchDishes(), fetchRecipes()])
      .then(() => setLoading(false))
      .catch((error) => {
        console.error("Error fetching data:", error);
        sonner_1.toast.error("Failed to load allergen data");
        setLoading(false);
      });
  }, []);
  // Listen for allergen updates and refresh data
  (0, react_1.useEffect)(() => {
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
      (event.venueName &&
        event.venueName.toLowerCase().includes(searchTerm.toLowerCase()))
  );
  const filteredDishes = dishes.filter((dish) =>
    dish.name.toLowerCase().includes(searchTerm.toLowerCase())
  );
  const filteredRecipes = recipes.filter((recipe) =>
    recipe.name.toLowerCase().includes(searchTerm.toLowerCase())
  );
  const handleAcknowledgeWarning = async (warningId) => {
    setActionLoading(true);
    try {
      const response = await fetch(
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
      if (!response.ok) throw new Error("Failed to acknowledge warning");
      sonner_1.toast.success("Warning acknowledged");
      // Refresh warnings
      await fetchWarnings();
    } catch (error) {
      console.error("Error acknowledging warning:", error);
      sonner_1.toast.error("Failed to acknowledge warning");
    } finally {
      setActionLoading(false);
    }
  };
  const handleResolveWarning = async (warningId, overrideReason) => {
    setActionLoading(true);
    try {
      const response = await fetch(
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
      if (!response.ok) throw new Error("Failed to resolve warning");
      sonner_1.toast.success("Warning resolved");
      // Refresh warnings
      await fetchWarnings();
    } catch (error) {
      console.error("Error resolving warning:", error);
      sonner_1.toast.error("Failed to resolve warning");
    } finally {
      setActionLoading(false);
    }
  };
  const formatGuests = (guests) => {
    return guests.length > 0 ? `${guests.length} guest(s)` : "No guests";
  };
  const formatDateTime = (date) => {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(date));
  };
  const getSeverityBadgeColor = (severity) => {
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
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Allergen Management</h1>
          <p className="text-muted-foreground">
            Manage allergen warnings and dietary restrictions for events and
            dishes
          </p>
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <lucide_react_1.SearchIcon className="h-4 w-4 text-muted-foreground" />
        <input_1.Input
          className="w-64"
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search warnings, events, dishes..."
          value={searchTerm}
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <lucide_react_1.Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <tabs_1.Tabs className="space-y-4" defaultValue="warnings">
          <tabs_1.TabsList>
            <tabs_1.TabsTrigger value="warnings">
              Allergen Warnings
            </tabs_1.TabsTrigger>
            <tabs_1.TabsTrigger value="events">Events</tabs_1.TabsTrigger>
            <tabs_1.TabsTrigger value="dishes">Dishes</tabs_1.TabsTrigger>
            <tabs_1.TabsTrigger value="recipes">Recipes</tabs_1.TabsTrigger>
          </tabs_1.TabsList>

          {/* Allergen Warnings Tab */}
          <tabs_1.TabsContent className="space-y-4" value="warnings">
            <card_1.Card>
              <card_1.CardHeader>
                <card_1.CardTitle className="flex items-center space-x-2">
                  <lucide_react_1.AlertTriangle className="h-5 w-5" />
                  <span>All Allergen Warnings</span>
                  <badge_1.Badge variant="destructive">
                    {filteredWarnings.length}
                  </badge_1.Badge>
                </card_1.CardTitle>
              </card_1.CardHeader>
              <card_1.CardContent>
                {filteredWarnings.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No allergen warnings found
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredWarnings.map((warning) => (
                      <card_1.Card
                        className="border-l-4 border-l-yellow-500"
                        key={warning.id}
                      >
                        <card_1.CardContent className="pt-4">
                          <div className="flex items-start justify-between">
                            <div className="space-y-2">
                              <div className="flex items-center space-x-2">
                                <badge_1.Badge
                                  variant={getSeverityBadgeColor(
                                    warning.severity
                                  )}
                                >
                                  {warning.severity}
                                </badge_1.Badge>
                                <span className="text-sm text-muted-foreground">
                                  {formatDateTime(warning.createdAt)}
                                </span>
                                {warning.isAcknowledged && (
                                  <lucide_react_1.CheckCircle2 className="h-4 w-4 text-green-500" />
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
                                <button_1.Button
                                  disabled={actionLoading}
                                  onClick={() =>
                                    handleAcknowledgeWarning(warning.id)
                                  }
                                  size="sm"
                                  variant="outline"
                                >
                                  {actionLoading ? (
                                    <lucide_react_1.Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    "Acknowledge"
                                  )}
                                </button_1.Button>
                              )}
                              {!warning.resolved && (
                                <button_1.Button
                                  disabled={actionLoading}
                                  onClick={() => {
                                    const reason = prompt(
                                      "Please provide override reason:"
                                    );
                                    if (reason) {
                                      handleResolveWarning(warning.id, reason);
                                    }
                                  }}
                                  size="sm"
                                >
                                  {actionLoading ? (
                                    <lucide_react_1.Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    "Resolve"
                                  )}
                                </button_1.Button>
                              )}
                            </div>
                          </div>
                        </card_1.CardContent>
                      </card_1.Card>
                    ))}
                  </div>
                )}
              </card_1.CardContent>
            </card_1.Card>
          </tabs_1.TabsContent>

          {/* Events Tab */}
          <tabs_1.TabsContent className="space-y-4" value="events">
            <card_1.Card>
              <card_1.CardHeader>
                <card_1.CardTitle>Event Allergen Information</card_1.CardTitle>
              </card_1.CardHeader>
              <card_1.CardContent>
                {filteredEvents.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No events found
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredEvents.map((event) => (
                      <card_1.Card key={event.id}>
                        <card_1.CardContent className="pt-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <h3 className="font-medium">{event.title}</h3>
                              <p className="text-sm text-muted-foreground">
                                {new Date(event.eventDate).toLocaleDateString()}
                                {event.venueName && ` at ${event.venueName}`}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                Status:{" "}
                                <badge_1.Badge
                                  variant={
                                    event.status === "confirmed"
                                      ? "default"
                                      : "secondary"
                                  }
                                >
                                  {event.status}
                                </badge_1.Badge>
                              </p>
                            </div>
                            <badge_1.Badge variant="outline">
                              View Details
                            </badge_1.Badge>
                          </div>
                        </card_1.CardContent>
                      </card_1.Card>
                    ))}
                  </div>
                )}
              </card_1.CardContent>
            </card_1.Card>
          </tabs_1.TabsContent>

          {/* Dishes Tab */}
          <tabs_1.TabsContent className="space-y-4" value="dishes">
            <card_1.Card>
              <card_1.CardHeader>
                <card_1.CardTitle>Dish Allergen Information</card_1.CardTitle>
              </card_1.CardHeader>
              <card_1.CardContent>
                {filteredDishes.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No dishes found
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredDishes.map((dish) => (
                      <card_1.Card key={dish.id}>
                        <card_1.CardContent className="pt-4">
                          <div className="flex items-start justify-between">
                            <div className="space-y-2">
                              <h3 className="font-medium">{dish.name}</h3>
                              <div className="flex flex-wrap gap-2">
                                {dish.allergens.length > 0 ? (
                                  dish.allergens.map((allergen) => (
                                    <badge_1.Badge
                                      key={allergen}
                                      variant="destructive"
                                    >
                                      {allergen}
                                    </badge_1.Badge>
                                  ))
                                ) : (
                                  <badge_1.Badge variant="secondary">
                                    No allergens
                                  </badge_1.Badge>
                                )}
                                {dish.dietaryTags.map((tag) => (
                                  <badge_1.Badge key={tag} variant="outline">
                                    {tag}
                                  </badge_1.Badge>
                                ))}
                              </div>
                            </div>
                            <allergen_management_modal_1.AllergenManagementModal
                              currentAllergens={dish.allergens}
                              currentDietaryTags={dish.dietaryTags}
                              id={dish.id}
                              name={dish.name}
                              tenantId="" // Will be fetched from auth context in the modal
                              type="dish"
                            />
                          </div>
                        </card_1.CardContent>
                      </card_1.Card>
                    ))}
                  </div>
                )}
              </card_1.CardContent>
            </card_1.Card>
          </tabs_1.TabsContent>

          {/* Recipes Tab */}
          <tabs_1.TabsContent className="space-y-4" value="recipes">
            <card_1.Card>
              <card_1.CardHeader>
                <card_1.CardTitle>Recipe Information</card_1.CardTitle>
              </card_1.CardHeader>
              <card_1.CardContent>
                {filteredRecipes.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No recipes found
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredRecipes.map((recipe) => (
                      <card_1.Card key={recipe.id}>
                        <card_1.CardContent className="pt-4">
                          <div className="space-y-2">
                            <h3 className="font-medium">{recipe.name}</h3>
                            <div className="flex flex-wrap gap-2">
                              {recipe.tags.length > 0 ? (
                                recipe.tags.map((tag) => (
                                  <badge_1.Badge key={tag} variant="outline">
                                    {tag}
                                  </badge_1.Badge>
                                ))
                              ) : (
                                <badge_1.Badge variant="secondary">
                                  No tags
                                </badge_1.Badge>
                              )}
                              {recipe.category && (
                                <badge_1.Badge variant="secondary">
                                  {recipe.category}
                                </badge_1.Badge>
                              )}
                            </div>
                            <div className="text-sm text-muted-foreground mt-2 p-2 bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded">
                              <strong>Note:</strong> Recipe allergen management
                              is not available. Allergens are managed at the
                              dish level.
                            </div>
                          </div>
                        </card_1.CardContent>
                      </card_1.Card>
                    ))}
                  </div>
                )}
              </card_1.CardContent>
            </card_1.Card>
          </tabs_1.TabsContent>
        </tabs_1.Tabs>
      )}
    </div>
  );
}
