/**
 * @module GuestManagement
 * @intent Manage event guests with comprehensive list view, add/edit forms, and real-time conflict detection
 * @responsibility Provide full CRUD functionality for event guests with dietary/allergen conflict warnings
 * @domain Events
 * @tags guests, events, dietary-restrictions, allergens
 * @canonical true
 */
"use client";

Object.defineProperty(exports, "__esModule", { value: true });
exports.GuestManagement = GuestManagement;
const badge_1 = require("@repo/design-system/components/ui/badge");
const button_1 = require("@repo/design-system/components/ui/button");
const dialog_1 = require("@repo/design-system/components/ui/dialog");
const input_1 = require("@repo/design-system/components/ui/input");
const label_1 = require("@repo/design-system/components/ui/label");
const select_1 = require("@repo/design-system/components/ui/select");
const switch_1 = require("@repo/design-system/components/ui/switch");
const table_1 = require("@repo/design-system/components/ui/table");
const textarea_1 = require("@repo/design-system/components/ui/textarea");
const lucide_react_1 = require("lucide-react");
const react_1 = require("react");
const sonner_1 = require("sonner");
// Common dietary restrictions and allergens
const COMMON_DIETARY_RESTRICTIONS = [
  "Vegetarian",
  "Vegan",
  "Gluten-Free",
  "Dairy-Free",
  "Keto",
  "Paleo",
  "Low-Sodium",
  "Halal",
  "Kosher",
];
const COMMON_ALLERGENS = [
  "Milk",
  "Eggs",
  "Fish",
  "Shellfish",
  "Tree Nuts",
  "Peanuts",
  "Wheat",
  "Soybeans",
  "Sesame",
];
const MEAL_PREFERENCES = [
  "Regular",
  "Vegetarian",
  "Vegan",
  "Gluten-Free",
  "Dairy-Free",
  "Keto",
  "Kids Meal",
];
function GuestManagement({ eventId }) {
  const [guests, setGuests] = (0, react_1.useState)([]);
  const [isLoading, setIsLoading] = (0, react_1.useState)(true);
  const [searchQuery, setSearchQuery] = (0, react_1.useState)("");
  const [isAddDialogOpen, setIsAddDialogOpen] = (0, react_1.useState)(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = (0, react_1.useState)(false);
  const [selectedGuest, setSelectedGuest] = (0, react_1.useState)(null);
  const [isDeleting, setIsDeleting] = (0, react_1.useState)(false);
  const [eventDishes, setEventDishes] = (0, react_1.useState)([]);
  // Form state
  const [formData, setFormData] = (0, react_1.useState)({
    guestName: "",
    guestEmail: "",
    guestPhone: "",
    isPrimaryContact: false,
    dietaryRestrictions: [],
    allergenRestrictions: [],
    specialMealRequired: false,
    specialMealNotes: "",
    tableAssignment: "",
    mealPreference: "",
    notes: "",
  });
  // Custom restriction input
  const [customDietaryInput, setCustomDietaryInput] = (0, react_1.useState)("");
  const [customAllergenInput, setCustomAllergenInput] = (0, react_1.useState)(
    ""
  );
  const [showConflicts, setShowConflicts] = (0, react_1.useState)(true);
  // Fetch guests
  const fetchGuests = (0, react_1.useCallback)(
    async (query) => {
      setIsLoading(true);
      try {
        const params = new URLSearchParams();
        if (query) params.append("guestName", query);
        const response = await fetch(
          `/api/events/${eventId}/guests${params.toString() ? `?${params.toString()}` : ""}`
        );
        if (!response.ok) {
          throw new Error("Failed to fetch guests");
        }
        const data = await response.json();
        setGuests(data.guests);
      } catch (error) {
        console.error("Error fetching guests:", error);
        sonner_1.toast.error("Failed to load guests");
      } finally {
        setIsLoading(false);
      }
    },
    [eventId]
  );
  // Fetch event dishes for conflict detection
  const fetchEventDishes = (0, react_1.useCallback)(async () => {
    try {
      const response = await fetch(`/api/events/${eventId}/dishes`);
      if (response.ok) {
        const dishes = await response.json();
        setEventDishes(dishes);
      }
    } catch (error) {
      console.error("Error fetching dishes:", error);
    }
  }, [eventId]);
  (0, react_1.useEffect)(() => {
    fetchGuests();
    fetchEventDishes();
  }, [fetchGuests, fetchEventDishes]);
  // Search handler with debouncing
  (0, react_1.useEffect)(() => {
    const timeoutId = setTimeout(() => {
      fetchGuests(searchQuery);
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [searchQuery, fetchGuests]);
  // Conflict detection
  const detectConflicts = (0, react_1.useCallback)(
    (dietaryRestrictions, allergenRestrictions) => {
      const conflicts = [];
      eventDishes.forEach((dish) => {
        // Check allergen conflicts (critical)
        allergenRestrictions.forEach((allergen) => {
          const dishAllergens = dish.dietary_tags || [];
          const hasAllergen = dishAllergens.some(
            (tag) => tag.toLowerCase() === allergen.toLowerCase()
          );
          if (hasAllergen) {
            conflicts.push({
              type: "allergen",
              severity: "critical",
              dishName: dish.name,
              restriction: allergen,
              message: `${dish.name} contains ${allergen}`,
            });
          }
        });
        // Check dietary conflicts (warning)
        dietaryRestrictions.forEach((restriction) => {
          const dishTags = dish.dietary_tags || [];
          const lowerRestriction = restriction.toLowerCase();
          // Check if dish violates dietary restriction
          if (lowerRestriction === "vegan") {
            const hasAnimalProducts = dishTags.some((tag) =>
              ["milk", "eggs", "honey", "dairy"].includes(tag.toLowerCase())
            );
            if (hasAnimalProducts) {
              conflicts.push({
                type: "dietary",
                severity: "warning",
                dishName: dish.name,
                restriction,
                message: `${dish.name} may not be vegan-friendly`,
              });
            }
          } else if (lowerRestriction === "vegetarian") {
            const hasMeat = dishTags.some((tag) =>
              [
                "fish",
                "shellfish",
                "meat",
                "poultry",
                "pork",
                "beef",
                "chicken",
              ].includes(tag.toLowerCase())
            );
            if (hasMeat) {
              conflicts.push({
                type: "dietary",
                severity: "warning",
                dishName: dish.name,
                restriction,
                message: `${dish.name} may not be vegetarian`,
              });
            }
          }
        });
      });
      return conflicts;
    },
    [eventDishes]
  );
  const currentConflicts = detectConflicts(
    formData.dietaryRestrictions,
    formData.allergenRestrictions
  );
  // Add custom restriction
  const addCustomDietaryRestriction = () => {
    if (
      customDietaryInput.trim() &&
      !formData.dietaryRestrictions.includes(customDietaryInput.trim())
    ) {
      setFormData({
        ...formData,
        dietaryRestrictions: [
          ...formData.dietaryRestrictions,
          customDietaryInput.trim(),
        ],
      });
      setCustomDietaryInput("");
    }
  };
  const addCustomAllergen = () => {
    if (
      customAllergenInput.trim() &&
      !formData.allergenRestrictions.includes(customAllergenInput.trim())
    ) {
      setFormData({
        ...formData,
        allergenRestrictions: [
          ...formData.allergenRestrictions,
          customAllergenInput.trim(),
        ],
      });
      setCustomAllergenInput("");
    }
  };
  // Remove restriction
  const removeDietaryRestriction = (restriction) => {
    setFormData({
      ...formData,
      dietaryRestrictions: formData.dietaryRestrictions.filter(
        (r) => r !== restriction
      ),
    });
  };
  const removeAllergen = (allergen) => {
    setFormData({
      ...formData,
      allergenRestrictions: formData.allergenRestrictions.filter(
        (a) => a !== allergen
      ),
    });
  };
  // Reset form
  const resetForm = () => {
    setFormData({
      guestName: "",
      guestEmail: "",
      guestPhone: "",
      isPrimaryContact: false,
      dietaryRestrictions: [],
      allergenRestrictions: [],
      specialMealRequired: false,
      specialMealNotes: "",
      tableAssignment: "",
      mealPreference: "",
      notes: "",
    });
    setCustomDietaryInput("");
    setCustomAllergenInput("");
  };
  // Open add dialog
  const openAddDialog = () => {
    resetForm();
    setIsAddDialogOpen(true);
  };
  // Open edit dialog
  const openEditDialog = (guest) => {
    setSelectedGuest(guest);
    setFormData({
      guestName: guest.guestName,
      guestEmail: guest.guestEmail || "",
      guestPhone: guest.guestPhone || "",
      isPrimaryContact: guest.isPrimaryContact,
      dietaryRestrictions: guest.dietaryRestrictions || [],
      allergenRestrictions: guest.allergenRestrictions || [],
      specialMealRequired: guest.specialMealRequired,
      specialMealNotes: guest.specialMealNotes || "",
      tableAssignment: guest.tableAssignment || "",
      mealPreference: guest.mealPreference || "",
      notes: guest.notes || "",
    });
    setIsEditDialogOpen(true);
  };
  // Create guest
  const createGuest = async () => {
    if (!formData.guestName.trim()) {
      sonner_1.toast.error("Guest name is required");
      return;
    }
    try {
      const response = await fetch(`/api/events/${eventId}/guests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to add guest");
      }
      await fetchGuests(searchQuery);
      setIsAddDialogOpen(false);
      resetForm();
      sonner_1.toast.success("Guest added successfully");
    } catch (error) {
      console.error("Error creating guest:", error);
      sonner_1.toast.error(
        error instanceof Error ? error.message : "Failed to add guest"
      );
    }
  };
  // Update guest
  const updateGuest = async () => {
    if (!selectedGuest) return;
    if (!formData.guestName.trim()) {
      sonner_1.toast.error("Guest name is required");
      return;
    }
    try {
      const response = await fetch(`/api/events/guests/${selectedGuest.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to update guest");
      }
      await fetchGuests(searchQuery);
      setIsEditDialogOpen(false);
      setSelectedGuest(null);
      resetForm();
      sonner_1.toast.success("Guest updated successfully");
    } catch (error) {
      console.error("Error updating guest:", error);
      sonner_1.toast.error(
        error instanceof Error ? error.message : "Failed to update guest"
      );
    }
  };
  // Delete guest
  const deleteGuest = async (guestId) => {
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/events/guests/${guestId}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        throw new Error("Failed to delete guest");
      }
      await fetchGuests(searchQuery);
      sonner_1.toast.success("Guest deleted successfully");
    } catch (error) {
      console.error("Error deleting guest:", error);
      sonner_1.toast.error("Failed to delete guest");
    } finally {
      setIsDeleting(false);
    }
  };
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold">Guest Management</h2>
          <p className="text-muted-foreground text-sm">
            Manage guest list, dietary restrictions, and special meals
          </p>
        </div>
        <dialog_1.Dialog
          onOpenChange={setIsAddDialogOpen}
          open={isAddDialogOpen}
        >
          <dialog_1.DialogTrigger asChild>
            <button_1.Button onClick={openAddDialog}>
              <lucide_react_1.PlusIcon className="mr-2 size-4" />
              Add Guest
            </button_1.Button>
          </dialog_1.DialogTrigger>
          <dialog_1.DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <dialog_1.DialogHeader>
              <dialog_1.DialogTitle>Add New Guest</dialog_1.DialogTitle>
              <dialog_1.DialogDescription>
                Add a guest to this event with dietary restrictions and meal
                preferences
              </dialog_1.DialogDescription>
            </dialog_1.DialogHeader>

            <div className="space-y-6 py-4">
              {/* Guest Information */}
              <div className="space-y-4">
                <h3 className="font-medium text-sm">Guest Information</h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label_1.Label htmlFor="guestName">
                      Guest Name *
                    </label_1.Label>
                    <input_1.Input
                      id="guestName"
                      onChange={(e) =>
                        setFormData({ ...formData, guestName: e.target.value })
                      }
                      placeholder="John Doe"
                      value={formData.guestName}
                    />
                  </div>
                  <div className="space-y-2">
                    <label_1.Label htmlFor="guestEmail">
                      Email (optional)
                    </label_1.Label>
                    <input_1.Input
                      id="guestEmail"
                      onChange={(e) =>
                        setFormData({ ...formData, guestEmail: e.target.value })
                      }
                      placeholder="john@example.com"
                      type="email"
                      value={formData.guestEmail}
                    />
                  </div>
                  <div className="space-y-2">
                    <label_1.Label htmlFor="guestPhone">
                      Phone (optional)
                    </label_1.Label>
                    <input_1.Input
                      id="guestPhone"
                      onChange={(e) =>
                        setFormData({ ...formData, guestPhone: e.target.value })
                      }
                      placeholder="(555) 123-4567"
                      type="tel"
                      value={formData.guestPhone}
                    />
                  </div>
                  <div className="space-y-2">
                    <label_1.Label htmlFor="tableAssignment">
                      Table Assignment
                    </label_1.Label>
                    <input_1.Input
                      id="tableAssignment"
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          tableAssignment: e.target.value,
                        })
                      }
                      placeholder="Table 1"
                      value={formData.tableAssignment}
                    />
                  </div>
                </div>
              </div>

              {/* Primary Contact Toggle */}
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-1">
                  <label_1.Label
                    className="flex items-center gap-2"
                    htmlFor="isPrimaryContact"
                  >
                    <lucide_react_1.StarIcon className="size-4 text-yellow-500" />
                    Primary Contact
                  </label_1.Label>
                  <p className="text-muted-foreground text-xs">
                    This guest is the primary contact for the event
                  </p>
                </div>
                <switch_1.Switch
                  checked={formData.isPrimaryContact}
                  id="isPrimaryContact"
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, isPrimaryContact: checked })
                  }
                />
              </div>

              {/* Dietary Restrictions */}
              <div className="space-y-4">
                <h3 className="font-medium text-sm">Dietary Restrictions</h3>
                <div className="flex flex-wrap gap-2">
                  {COMMON_DIETARY_RESTRICTIONS.map((restriction) => (
                    <badge_1.Badge
                      className="cursor-pointer"
                      key={restriction}
                      onClick={() => {
                        if (
                          formData.dietaryRestrictions.includes(restriction)
                        ) {
                          removeDietaryRestriction(restriction);
                        } else {
                          setFormData({
                            ...formData,
                            dietaryRestrictions: [
                              ...formData.dietaryRestrictions,
                              restriction,
                            ],
                          });
                        }
                      }}
                      variant={
                        formData.dietaryRestrictions.includes(restriction)
                          ? "default"
                          : "outline"
                      }
                    >
                      {restriction}
                    </badge_1.Badge>
                  ))}
                </div>
                {formData.dietaryRestrictions.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {formData.dietaryRestrictions.map((restriction) => (
                      <badge_1.Badge
                        className="gap-1"
                        key={restriction}
                        variant="secondary"
                      >
                        {restriction}
                        <button
                          className="hover:bg-destructive/20 rounded-full p-0.5"
                          onClick={() => removeDietaryRestriction(restriction)}
                          type="button"
                        >
                          <lucide_react_1.XIcon className="size-3" />
                        </button>
                      </badge_1.Badge>
                    ))}
                  </div>
                )}
                <div className="flex gap-2">
                  <input_1.Input
                    onChange={(e) => setCustomDietaryInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addCustomDietaryRestriction();
                      }
                    }}
                    placeholder="Add custom restriction"
                    value={customDietaryInput}
                  />
                  <button_1.Button
                    onClick={addCustomDietaryRestriction}
                    type="button"
                    variant="outline"
                  >
                    Add
                  </button_1.Button>
                </div>
              </div>

              {/* Allergen Restrictions */}
              <div className="space-y-4">
                <h3 className="font-medium text-sm text-destructive">
                  Allergen Restrictions
                </h3>
                <p className="text-muted-foreground text-xs">
                  Critical: These items must be avoided completely
                </p>
                <div className="flex flex-wrap gap-2">
                  {COMMON_ALLERGENS.map((allergen) => (
                    <badge_1.Badge
                      className="cursor-pointer"
                      key={allergen}
                      onClick={() => {
                        if (formData.allergenRestrictions.includes(allergen)) {
                          removeAllergen(allergen);
                        } else {
                          setFormData({
                            ...formData,
                            allergenRestrictions: [
                              ...formData.allergenRestrictions,
                              allergen,
                            ],
                          });
                        }
                      }}
                      variant={
                        formData.allergenRestrictions.includes(allergen)
                          ? "destructive"
                          : "outline"
                      }
                    >
                      {allergen}
                    </badge_1.Badge>
                  ))}
                </div>
                {formData.allergenRestrictions.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {formData.allergenRestrictions.map((allergen) => (
                      <badge_1.Badge
                        className="gap-1"
                        key={allergen}
                        variant="destructive"
                      >
                        {allergen}
                        <button
                          className="hover:bg-background/20 rounded-full p-0.5"
                          onClick={() => removeAllergen(allergen)}
                          type="button"
                        >
                          <lucide_react_1.XIcon className="size-3" />
                        </button>
                      </badge_1.Badge>
                    ))}
                  </div>
                )}
                <div className="flex gap-2">
                  <input_1.Input
                    onChange={(e) => setCustomAllergenInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addCustomAllergen();
                      }
                    }}
                    placeholder="Add custom allergen"
                    value={customAllergenInput}
                  />
                  <button_1.Button
                    onClick={addCustomAllergen}
                    type="button"
                    variant="outline"
                  >
                    Add
                  </button_1.Button>
                </div>
              </div>

              {/* Conflict Detection Warnings */}
              {showConflicts && currentConflicts.length > 0 && (
                <div className="space-y-3 rounded-lg border bg-muted/50 p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <lucide_react_1.AlertTriangleIcon className="size-4 text-amber-500" />
                      <h4 className="font-medium text-sm">
                        Menu Conflicts Detected
                      </h4>
                    </div>
                    <button_1.Button
                      onClick={() => setShowConflicts(false)}
                      size="sm"
                      type="button"
                      variant="ghost"
                    >
                      <lucide_react_1.XIcon className="size-4" />
                    </button_1.Button>
                  </div>
                  <div className="space-y-2">
                    {currentConflicts.map((conflict, index) => (
                      <div
                        className={`flex items-start gap-2 rounded-md p-3 ${
                          conflict.severity === "critical"
                            ? "bg-destructive/10 border border-destructive/20"
                            : "bg-amber-50 border border-amber-200 dark:bg-amber-950/50"
                        }`}
                        key={index}
                      >
                        {conflict.severity === "critical" ? (
                          <lucide_react_1.AlertCircleIcon className="size-4 flex-shrink-0 mt-0.5 text-destructive" />
                        ) : (
                          <lucide_react_1.AlertTriangleIcon className="size-4 flex-shrink-0 mt-0.5 text-amber-600" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">
                            {conflict.message}
                          </p>
                          <p className="text-muted-foreground text-xs">
                            {conflict.type === "allergen"
                              ? "Allergen alert"
                              : "Dietary notice"}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Special Meal */}
              <div className="space-y-4">
                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-1">
                    <label_1.Label
                      className="flex items-center gap-2"
                      htmlFor="specialMealRequired"
                    >
                      <lucide_react_1.UtensilsIcon className="size-4" />
                      Special Meal Required
                    </label_1.Label>
                    <p className="text-muted-foreground text-xs">
                      This guest requires a specially prepared meal
                    </p>
                  </div>
                  <switch_1.Switch
                    checked={formData.specialMealRequired}
                    id="specialMealRequired"
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, specialMealRequired: checked })
                    }
                  />
                </div>

                {formData.specialMealRequired && (
                  <div className="space-y-2">
                    <label_1.Label htmlFor="specialMealNotes">
                      Special Meal Notes
                    </label_1.Label>
                    <textarea_1.Textarea
                      id="specialMealNotes"
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          specialMealNotes: e.target.value,
                        })
                      }
                      placeholder="Describe the special meal requirements..."
                      rows={3}
                      value={formData.specialMealNotes}
                    />
                  </div>
                )}
              </div>

              {/* Meal Preference */}
              <div className="space-y-2">
                <label_1.Label htmlFor="mealPreference">
                  Meal Preference
                </label_1.Label>
                <select_1.Select
                  onValueChange={(value) =>
                    setFormData({ ...formData, mealPreference: value })
                  }
                  value={formData.mealPreference}
                >
                  <select_1.SelectTrigger id="mealPreference">
                    <select_1.SelectValue placeholder="Select meal preference" />
                  </select_1.SelectTrigger>
                  <select_1.SelectContent>
                    {MEAL_PREFERENCES.map((preference) => (
                      <select_1.SelectItem key={preference} value={preference}>
                        {preference}
                      </select_1.SelectItem>
                    ))}
                  </select_1.SelectContent>
                </select_1.Select>
              </div>

              {/* Additional Notes */}
              <div className="space-y-2">
                <label_1.Label htmlFor="notes">Additional Notes</label_1.Label>
                <textarea_1.Textarea
                  id="notes"
                  onChange={(e) =>
                    setFormData({ ...formData, notes: e.target.value })
                  }
                  placeholder="Any additional notes about this guest..."
                  rows={3}
                  value={formData.notes}
                />
              </div>
            </div>

            <dialog_1.DialogFooter>
              <button_1.Button
                onClick={() => setIsAddDialogOpen(false)}
                type="button"
                variant="outline"
              >
                Cancel
              </button_1.Button>
              <button_1.Button onClick={createGuest} type="button">
                Add Guest
              </button_1.Button>
            </dialog_1.DialogFooter>
          </dialog_1.DialogContent>
        </dialog_1.Dialog>
      </div>

      {/* Search */}
      <div className="relative">
        <lucide_react_1.SearchIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <input_1.Input
          className="pl-10"
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search guests by name..."
          value={searchQuery}
        />
      </div>

      {/* Guests Table */}
      <div className="rounded-lg border">
        <table_1.Table>
          <table_1.TableHeader>
            <table_1.TableRow>
              <table_1.TableHead>Guest</table_1.TableHead>
              <table_1.TableHead>Contact Info</table_1.TableHead>
              <table_1.TableHead>Dietary Restrictions</table_1.TableHead>
              <table_1.TableHead>Allergens</table_1.TableHead>
              <table_1.TableHead>Table</table_1.TableHead>
              <table_1.TableHead>Meal</table_1.TableHead>
              <table_1.TableHead className="text-right">
                Actions
              </table_1.TableHead>
            </table_1.TableRow>
          </table_1.TableHeader>
          <table_1.TableBody>
            {isLoading ? (
              <table_1.TableRow>
                <table_1.TableCell className="text-center py-8" colSpan={7}>
                  <div className="flex items-center justify-center">
                    <div className="size-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  </div>
                </table_1.TableCell>
              </table_1.TableRow>
            ) : guests.length === 0 ? (
              <table_1.TableRow>
                <table_1.TableCell className="text-center py-8" colSpan={7}>
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <lucide_react_1.UserIcon className="size-8" />
                    <p>No guests found</p>
                    <p className="text-sm">
                      Add your first guest to get started
                    </p>
                  </div>
                </table_1.TableCell>
              </table_1.TableRow>
            ) : (
              guests.map((guest) => {
                const guestConflicts = detectConflicts(
                  guest.dietaryRestrictions || [],
                  guest.allergenRestrictions || []
                );
                return (
                  <table_1.TableRow key={guest.id}>
                    <table_1.TableCell>
                      <div className="flex items-center gap-2">
                        <div className="flex flex-col">
                          <span className="font-medium">{guest.guestName}</span>
                          {guest.isPrimaryContact && (
                            <badge_1.Badge
                              className="w-fit gap-1 text-xs"
                              variant="secondary"
                            >
                              <lucide_react_1.StarIcon className="size-3 text-yellow-500" />
                              Primary
                            </badge_1.Badge>
                          )}
                        </div>
                      </div>
                    </table_1.TableCell>
                    <table_1.TableCell>
                      <div className="text-sm">
                        {guest.guestEmail && (
                          <div className="text-muted-foreground">
                            {guest.guestEmail}
                          </div>
                        )}
                        {guest.guestPhone && (
                          <div className="text-muted-foreground">
                            {guest.guestPhone}
                          </div>
                        )}
                      </div>
                    </table_1.TableCell>
                    <table_1.TableCell>
                      <div className="flex flex-wrap gap-1">
                        {(guest.dietaryRestrictions || []).length === 0 ? (
                          <span className="text-muted-foreground text-xs">
                            None
                          </span>
                        ) : (
                          guest.dietaryRestrictions.map((restriction) => (
                            <badge_1.Badge
                              className="text-xs"
                              key={restriction}
                              variant="secondary"
                            >
                              {restriction}
                            </badge_1.Badge>
                          ))
                        )}
                      </div>
                    </table_1.TableCell>
                    <table_1.TableCell>
                      <div className="flex flex-wrap gap-1">
                        {(guest.allergenRestrictions || []).length === 0 ? (
                          <span className="text-muted-foreground text-xs">
                            None
                          </span>
                        ) : (
                          guest.allergenRestrictions.map((allergen) => (
                            <badge_1.Badge
                              className="text-xs"
                              key={allergen}
                              variant="destructive"
                            >
                              {allergen}
                            </badge_1.Badge>
                          ))
                        )}
                      </div>
                      {guestConflicts.some(
                        (c) => c.severity === "critical"
                      ) && (
                        <div className="mt-1">
                          <badge_1.Badge
                            className="gap-1 text-xs"
                            variant="destructive"
                          >
                            <lucide_react_1.AlertCircleIcon className="size-3" />
                            Menu Conflict
                          </badge_1.Badge>
                        </div>
                      )}
                    </table_1.TableCell>
                    <table_1.TableCell>
                      <span className="text-sm">
                        {guest.tableAssignment || (
                          <span className="text-muted-foreground text-xs">
                            Unassigned
                          </span>
                        )}
                      </span>
                    </table_1.TableCell>
                    <table_1.TableCell>
                      <div className="flex flex-col gap-1">
                        {guest.mealPreference && (
                          <span className="text-sm">
                            {guest.mealPreference}
                          </span>
                        )}
                        {guest.specialMealRequired && (
                          <badge_1.Badge
                            className="w-fit gap-1 text-xs"
                            variant="outline"
                          >
                            <lucide_react_1.UtensilsIcon className="size-3" />
                            Special
                          </badge_1.Badge>
                        )}
                      </div>
                    </table_1.TableCell>
                    <table_1.TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <button_1.Button
                          aria-label="Edit guest"
                          onClick={() => openEditDialog(guest)}
                          size="icon"
                          variant="ghost"
                        >
                          <lucide_react_1.Edit2Icon className="size-4" />
                        </button_1.Button>
                        <button_1.Button
                          aria-label="Delete guest"
                          disabled={isDeleting}
                          onClick={() => deleteGuest(guest.id)}
                          size="icon"
                          variant="ghost"
                        >
                          <lucide_react_1.Trash2Icon className="size-4" />
                        </button_1.Button>
                      </div>
                    </table_1.TableCell>
                  </table_1.TableRow>
                );
              })
            )}
          </table_1.TableBody>
        </table_1.Table>
      </div>

      {/* Edit Dialog */}
      <dialog_1.Dialog
        onOpenChange={(open) => {
          setIsEditDialogOpen(open);
          if (!open) {
            setSelectedGuest(null);
            resetForm();
          }
        }}
        open={isEditDialogOpen}
      >
        <dialog_1.DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <dialog_1.DialogHeader>
            <dialog_1.DialogTitle>Edit Guest</dialog_1.DialogTitle>
            <dialog_1.DialogDescription>
              Update guest information, restrictions, and preferences
            </dialog_1.DialogDescription>
          </dialog_1.DialogHeader>

          <div className="space-y-6 py-4">
            {/* Guest Information */}
            <div className="space-y-4">
              <h3 className="font-medium text-sm">Guest Information</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label_1.Label htmlFor="edit-guestName">
                    Guest Name *
                  </label_1.Label>
                  <input_1.Input
                    id="edit-guestName"
                    onChange={(e) =>
                      setFormData({ ...formData, guestName: e.target.value })
                    }
                    placeholder="John Doe"
                    value={formData.guestName}
                  />
                </div>
                <div className="space-y-2">
                  <label_1.Label htmlFor="edit-guestEmail">
                    Email (optional)
                  </label_1.Label>
                  <input_1.Input
                    id="edit-guestEmail"
                    onChange={(e) =>
                      setFormData({ ...formData, guestEmail: e.target.value })
                    }
                    placeholder="john@example.com"
                    type="email"
                    value={formData.guestEmail}
                  />
                </div>
                <div className="space-y-2">
                  <label_1.Label htmlFor="edit-guestPhone">
                    Phone (optional)
                  </label_1.Label>
                  <input_1.Input
                    id="edit-guestPhone"
                    onChange={(e) =>
                      setFormData({ ...formData, guestPhone: e.target.value })
                    }
                    placeholder="(555) 123-4567"
                    type="tel"
                    value={formData.guestPhone}
                  />
                </div>
                <div className="space-y-2">
                  <label_1.Label htmlFor="edit-tableAssignment">
                    Table Assignment
                  </label_1.Label>
                  <input_1.Input
                    id="edit-tableAssignment"
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        tableAssignment: e.target.value,
                      })
                    }
                    placeholder="Table 1"
                    value={formData.tableAssignment}
                  />
                </div>
              </div>
            </div>

            {/* Primary Contact Toggle */}
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-1">
                <label_1.Label
                  className="flex items-center gap-2"
                  htmlFor="edit-isPrimaryContact"
                >
                  <lucide_react_1.StarIcon className="size-4 text-yellow-500" />
                  Primary Contact
                </label_1.Label>
                <p className="text-muted-foreground text-xs">
                  This guest is the primary contact for the event
                </p>
              </div>
              <switch_1.Switch
                checked={formData.isPrimaryContact}
                id="edit-isPrimaryContact"
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, isPrimaryContact: checked })
                }
              />
            </div>

            {/* Dietary Restrictions */}
            <div className="space-y-4">
              <h3 className="font-medium text-sm">Dietary Restrictions</h3>
              <div className="flex flex-wrap gap-2">
                {COMMON_DIETARY_RESTRICTIONS.map((restriction) => (
                  <badge_1.Badge
                    className="cursor-pointer"
                    key={restriction}
                    onClick={() => {
                      if (formData.dietaryRestrictions.includes(restriction)) {
                        removeDietaryRestriction(restriction);
                      } else {
                        setFormData({
                          ...formData,
                          dietaryRestrictions: [
                            ...formData.dietaryRestrictions,
                            restriction,
                          ],
                        });
                      }
                    }}
                    variant={
                      formData.dietaryRestrictions.includes(restriction)
                        ? "default"
                        : "outline"
                    }
                  >
                    {restriction}
                  </badge_1.Badge>
                ))}
              </div>
              {formData.dietaryRestrictions.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {formData.dietaryRestrictions.map((restriction) => (
                    <badge_1.Badge
                      className="gap-1"
                      key={restriction}
                      variant="secondary"
                    >
                      {restriction}
                      <button
                        className="hover:bg-destructive/20 rounded-full p-0.5"
                        onClick={() => removeDietaryRestriction(restriction)}
                        type="button"
                      >
                        <lucide_react_1.XIcon className="size-3" />
                      </button>
                    </badge_1.Badge>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <input_1.Input
                  onChange={(e) => setCustomDietaryInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addCustomDietaryRestriction();
                    }
                  }}
                  placeholder="Add custom restriction"
                  value={customDietaryInput}
                />
                <button_1.Button
                  onClick={addCustomDietaryRestriction}
                  type="button"
                  variant="outline"
                >
                  Add
                </button_1.Button>
              </div>
            </div>

            {/* Allergen Restrictions */}
            <div className="space-y-4">
              <h3 className="font-medium text-sm text-destructive">
                Allergen Restrictions
              </h3>
              <p className="text-muted-foreground text-xs">
                Critical: These items must be avoided completely
              </p>
              <div className="flex flex-wrap gap-2">
                {COMMON_ALLERGENS.map((allergen) => (
                  <badge_1.Badge
                    className="cursor-pointer"
                    key={allergen}
                    onClick={() => {
                      if (formData.allergenRestrictions.includes(allergen)) {
                        removeAllergen(allergen);
                      } else {
                        setFormData({
                          ...formData,
                          allergenRestrictions: [
                            ...formData.allergenRestrictions,
                            allergen,
                          ],
                        });
                      }
                    }}
                    variant={
                      formData.allergenRestrictions.includes(allergen)
                        ? "destructive"
                        : "outline"
                    }
                  >
                    {allergen}
                  </badge_1.Badge>
                ))}
              </div>
              {formData.allergenRestrictions.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {formData.allergenRestrictions.map((allergen) => (
                    <badge_1.Badge
                      className="gap-1"
                      key={allergen}
                      variant="destructive"
                    >
                      {allergen}
                      <button
                        className="hover:bg-background/20 rounded-full p-0.5"
                        onClick={() => removeAllergen(allergen)}
                        type="button"
                      >
                        <lucide_react_1.XIcon className="size-3" />
                      </button>
                    </badge_1.Badge>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <input_1.Input
                  onChange={(e) => setCustomAllergenInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addCustomAllergen();
                    }
                  }}
                  placeholder="Add custom allergen"
                  value={customAllergenInput}
                />
                <button_1.Button
                  onClick={addCustomAllergen}
                  type="button"
                  variant="outline"
                >
                  Add
                </button_1.Button>
              </div>
            </div>

            {/* Conflict Detection Warnings */}
            {showConflicts && currentConflicts.length > 0 && (
              <div className="space-y-3 rounded-lg border bg-muted/50 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <lucide_react_1.AlertTriangleIcon className="size-4 text-amber-500" />
                    <h4 className="font-medium text-sm">
                      Menu Conflicts Detected
                    </h4>
                  </div>
                  <button_1.Button
                    onClick={() => setShowConflicts(false)}
                    size="sm"
                    type="button"
                    variant="ghost"
                  >
                    <lucide_react_1.XIcon className="size-4" />
                  </button_1.Button>
                </div>
                <div className="space-y-2">
                  {currentConflicts.map((conflict, index) => (
                    <div
                      className={`flex items-start gap-2 rounded-md p-3 ${
                        conflict.severity === "critical"
                          ? "bg-destructive/10 border border-destructive/20"
                          : "bg-amber-50 border border-amber-200 dark:bg-amber-950/50"
                      }`}
                      key={index}
                    >
                      {conflict.severity === "critical" ? (
                        <lucide_react_1.AlertCircleIcon className="size-4 flex-shrink-0 mt-0.5 text-destructive" />
                      ) : (
                        <lucide_react_1.AlertTriangleIcon className="size-4 flex-shrink-0 mt-0.5 text-amber-600" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">
                          {conflict.message}
                        </p>
                        <p className="text-muted-foreground text-xs">
                          {conflict.type === "allergen"
                            ? "Allergen alert"
                            : "Dietary notice"}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Special Meal */}
            <div className="space-y-4">
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-1">
                  <label_1.Label
                    className="flex items-center gap-2"
                    htmlFor="edit-specialMealRequired"
                  >
                    <lucide_react_1.UtensilsIcon className="size-4" />
                    Special Meal Required
                  </label_1.Label>
                  <p className="text-muted-foreground text-xs">
                    This guest requires a specially prepared meal
                  </p>
                </div>
                <switch_1.Switch
                  checked={formData.specialMealRequired}
                  id="edit-specialMealRequired"
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, specialMealRequired: checked })
                  }
                />
              </div>

              {formData.specialMealRequired && (
                <div className="space-y-2">
                  <label_1.Label htmlFor="edit-specialMealNotes">
                    Special Meal Notes
                  </label_1.Label>
                  <textarea_1.Textarea
                    id="edit-specialMealNotes"
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        specialMealNotes: e.target.value,
                      })
                    }
                    placeholder="Describe the special meal requirements..."
                    rows={3}
                    value={formData.specialMealNotes}
                  />
                </div>
              )}
            </div>

            {/* Meal Preference */}
            <div className="space-y-2">
              <label_1.Label htmlFor="edit-mealPreference">
                Meal Preference
              </label_1.Label>
              <select_1.Select
                onValueChange={(value) =>
                  setFormData({ ...formData, mealPreference: value })
                }
                value={formData.mealPreference}
              >
                <select_1.SelectTrigger id="edit-mealPreference">
                  <select_1.SelectValue placeholder="Select meal preference" />
                </select_1.SelectTrigger>
                <select_1.SelectContent>
                  {MEAL_PREFERENCES.map((preference) => (
                    <select_1.SelectItem key={preference} value={preference}>
                      {preference}
                    </select_1.SelectItem>
                  ))}
                </select_1.SelectContent>
              </select_1.Select>
            </div>

            {/* Additional Notes */}
            <div className="space-y-2">
              <label_1.Label htmlFor="edit-notes">
                Additional Notes
              </label_1.Label>
              <textarea_1.Textarea
                id="edit-notes"
                onChange={(e) =>
                  setFormData({ ...formData, notes: e.target.value })
                }
                placeholder="Any additional notes about this guest..."
                rows={3}
                value={formData.notes}
              />
            </div>
          </div>

          <dialog_1.DialogFooter>
            <button_1.Button
              onClick={() => setIsEditDialogOpen(false)}
              type="button"
              variant="outline"
            >
              Cancel
            </button_1.Button>
            <button_1.Button onClick={updateGuest} type="button">
              Save Changes
            </button_1.Button>
          </dialog_1.DialogFooter>
        </dialog_1.DialogContent>
      </dialog_1.Dialog>
    </div>
  );
}
