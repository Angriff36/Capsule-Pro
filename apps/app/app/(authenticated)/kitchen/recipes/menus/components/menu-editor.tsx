"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@repo/design-system/components/ui/button";
import { Input } from "@repo/design-system/components/ui/input";
import { Label } from "@repo/design-system/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/design-system/components/ui/select";
import { Checkbox } from "@repo/design-system/components/ui/checkbox";
import {
  createMenu,
  updateMenu,
  addDishToMenu,
  removeDishFromMenu,
  getDishes,
  getMenuById,
  type DishSummary,
  type MenuDetail,
} from "../actions";

type MenuEditorProps = {
  menuId?: string;
};

type SelectedDish = {
  dish: DishSummary;
  course: string | null;
};

const COURSE_OPTIONS = [
  { value: "appetizer", label: "Appetizer" },
  { value: "main", label: "Main Course" },
  { value: "dessert", label: "Dessert" },
  { value: "beverage", label: "Beverage" },
  { value: "side", label: "Side" },
  { value: "other", label: "Other" },
];

export function MenuEditor({ menuId }: MenuEditorProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selectedDishes, setSelectedDishes] = useState<SelectedDish[]>([]);

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [basePrice, setBasePrice] = useState("");
  const [pricePerPerson, setPricePerPerson] = useState("");
  const [minGuests, setMinGuests] = useState("");
  const [maxGuests, setMaxGuests] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      alert("Menu name is required");
      return;
    }

    const formData = new FormData();

    // Add menu fields
    formData.append("name", name);
    formData.append("description", description);
    formData.append("category", category);
    if (basePrice) formData.append("basePrice", basePrice);
    if (pricePerPerson) formData.append("pricePerPerson", pricePerPerson);
    if (minGuests) formData.append("minGuests", minGuests);
    if (maxGuests) formData.append("maxGuests", maxGuests);

    try {
      if (menuId) {
        // Update existing menu
        await updateMenu(menuId, formData);

        // Add new dishes
        for (const selectedDish of selectedDishes) {
          await addDishToMenu(menuId, selectedDish.dish.id, selectedDish.course || undefined);
        }
      } else {
        // Create new menu
        await createMenu(formData);
        // The createMenu action handles redirection, so we don't need to do anything else
        return;
      }

      router.push("/kitchen/recipes/menus");
    } catch (error) {
      console.error("Error saving menu:", error);
      alert("Error saving menu. Please try again.");
    }
  };

  const handleDishToggle = (dish: DishSummary) => {
    const isSelected = selectedDishes.some((sd) => sd.dish.id === dish.id);

    if (isSelected) {
      setSelectedDishes((prev) => prev.filter((sd) => sd.dish.id !== dish.id));
    } else {
      setSelectedDishes((prev) => [...prev, { dish, course: null }]);
    }
  };

  const handleCourseChange = (dishId: string, course: string) => {
    setSelectedDishes((prev) =>
      prev.map((sd) =>
        sd.dish.id === dishId ? { ...sd, course } : sd
      )
    );
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid gap-6">
        {/* Basic Info Section */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Menu Information</h2>

          <div className="grid gap-2">
            <Label htmlFor="name">Menu Name *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter menu name"
              required
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter menu description"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="category">Category</Label>
            <Input
              id="category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="e.g., Italian, Asian, Buffet"
            />
          </div>
        </div>

        {/* Pricing Section */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Pricing</h2>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="basePrice">Base Price ($)</Label>
              <Input
                id="basePrice"
                type="number"
                step="0.01"
                value={basePrice}
                onChange={(e) => setBasePrice(e.target.value)}
                placeholder="0.00"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="pricePerPerson">Price Per Person ($)</Label>
              <Input
                id="pricePerPerson"
                type="number"
                step="0.01"
                value={pricePerPerson}
                onChange={(e) => setPricePerPerson(e.target.value)}
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="minGuests">Min Guests</Label>
              <Input
                id="minGuests"
                type="number"
                value={minGuests}
                onChange={(e) => setMinGuests(e.target.value)}
                placeholder="0"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="maxGuests">Max Guests</Label>
              <Input
                id="maxGuests"
                type="number"
                value={maxGuests}
                onChange={(e) => setMaxGuests(e.target.value)}
                placeholder="0"
              />
            </div>
          </div>
        </div>

        {/* Dishes Section */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Select Dishes</h2>
          <p className="text-sm text-muted-foreground">
            Choose dishes to include in this menu and assign them to courses
          </p>

          <DishesSelector
            selectedDishes={selectedDishes}
            onDishToggle={handleDishToggle}
            onCourseChange={handleCourseChange}
          />
        </div>

        {/* Submit Button */}
        <div className="flex justify-end gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isPending}>
            {isPending ? "Saving..." : menuId ? "Update Menu" : "Create Menu"}
          </Button>
        </div>
      </div>
    </form>
  );
}

function DishesSelector({
  selectedDishes,
  onDishToggle,
  onCourseChange,
}: {
  selectedDishes: SelectedDish[];
  onDishToggle: (dish: DishSummary) => void;
  onCourseChange: (dishId: string, course: string) => void;
}) {
  const [dishes, setDishes] = useState<DishSummary[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  // Fetch dishes on mount
  React.useEffect(() => {
    const fetchDishes = async () => {
      try {
        const result = await getDishes();
        setDishes(result);
      } catch (error) {
        console.error("Error fetching dishes:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchDishes();
  }, []);

  const filteredDishes = dishes.filter((dish) =>
    dish.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (dish.category?.toLowerCase() || "").includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <Input
        placeholder="Search dishes..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
      />

      <div className="border rounded-md">
        <div className="max-h-96 overflow-y-auto">
          {isLoading ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              Loading dishes...
            </div>
          ) : filteredDishes.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              {searchQuery ? "No dishes found matching your search" : "No dishes available"}
            </div>
          ) : (
            <div className="divide-y">
              {filteredDishes.map((dish) => {
                const isSelected = selectedDishes.some(
                  (sd) => sd.dish.id === dish.id
                );
                const selectedDish = selectedDishes.find(
                  (sd) => sd.dish.id === dish.id
                );

                return (
                  <div key={dish.id} className="p-4 space-y-2">
                    <div className="flex items-start gap-3">
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => onDishToggle(dish)}
                        className="mt-1"
                      />
                      <div className="flex-1 space-y-1">
                        <div className="font-medium">{dish.name}</div>
                        {dish.description && (
                          <div className="text-sm text-muted-foreground">
                            {dish.description}
                          </div>
                        )}
                        {dish.category && (
                          <div className="text-xs text-muted-foreground">
                            {dish.category}
                          </div>
                        )}
                      </div>
                    </div>

                    {isSelected && (
                      <div className="ml-7">
                        <Select
                          value={selectedDish?.course || ""}
                          onValueChange={(value) =>
                            onCourseChange(dish.id, value)
                          }
                        >
                          <SelectTrigger className="w-48">
                            <SelectValue placeholder="Select course" />
                          </SelectTrigger>
                          <SelectContent>
                            {COURSE_OPTIONS.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {selectedDishes.length > 0 && (
        <div className="text-sm text-muted-foreground">
          {selectedDishes.length} dish{selectedDishes.length !== 1 ? "es" : ""} selected
        </div>
      )}
    </div>
  );
}
