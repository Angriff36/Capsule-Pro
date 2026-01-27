"use client";

import { Button } from "@repo/design-system/components/ui/button";
import { Checkbox } from "@repo/design-system/components/ui/checkbox";
import { Input } from "@repo/design-system/components/ui/input";
import { Label } from "@repo/design-system/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/design-system/components/ui/select";
import { useRouter } from "next/navigation";
import React, { useState, useTransition } from "react";
import {
  addDishToMenu,
  createMenu,
  type DishSummary,
  getDishes,
  updateMenu,
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
  const [isPending, _startTransition] = useTransition();
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
    if (basePrice) {
      formData.append("basePrice", basePrice);
    }
    if (pricePerPerson) {
      formData.append("pricePerPerson", pricePerPerson);
    }
    if (minGuests) {
      formData.append("minGuests", minGuests);
    }
    if (maxGuests) {
      formData.append("maxGuests", maxGuests);
    }

    try {
      if (menuId) {
        // Update existing menu
        await updateMenu(menuId, formData);

        // Add new dishes
        for (const selectedDish of selectedDishes) {
          await addDishToMenu(
            menuId,
            selectedDish.dish.id,
            selectedDish.course || undefined
          );
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
      prev.map((sd) => (sd.dish.id === dishId ? { ...sd, course } : sd))
    );
  };

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      <div className="grid gap-6">
        {/* Basic Info Section */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Menu Information</h2>

          <div className="grid gap-2">
            <Label htmlFor="name">Menu Name *</Label>
            <Input
              id="name"
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter menu name"
              required
              value={name}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter menu description"
              value={description}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="category">Category</Label>
            <Input
              id="category"
              onChange={(e) => setCategory(e.target.value)}
              placeholder="e.g., Italian, Asian, Buffet"
              value={category}
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
                onChange={(e) => setBasePrice(e.target.value)}
                placeholder="0.00"
                step="0.01"
                type="number"
                value={basePrice}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="pricePerPerson">Price Per Person ($)</Label>
              <Input
                id="pricePerPerson"
                onChange={(e) => setPricePerPerson(e.target.value)}
                placeholder="0.00"
                step="0.01"
                type="number"
                value={pricePerPerson}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="minGuests">Min Guests</Label>
              <Input
                id="minGuests"
                onChange={(e) => setMinGuests(e.target.value)}
                placeholder="0"
                type="number"
                value={minGuests}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="maxGuests">Max Guests</Label>
              <Input
                id="maxGuests"
                onChange={(e) => setMaxGuests(e.target.value)}
                placeholder="0"
                type="number"
                value={maxGuests}
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
            onCourseChange={handleCourseChange}
            onDishToggle={handleDishToggle}
            selectedDishes={selectedDishes}
          />
        </div>

        {/* Submit Button */}
        <div className="flex justify-end gap-4">
          <Button
            disabled={isPending}
            onClick={() => router.back()}
            type="button"
            variant="outline"
          >
            Cancel
          </Button>
          <Button disabled={isPending} type="submit">
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

  const filteredDishes = dishes.filter(
    (dish) =>
      dish.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (dish.category?.toLowerCase() || "").includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <Input
        onChange={(e) => setSearchQuery(e.target.value)}
        placeholder="Search dishes..."
        value={searchQuery}
      />

      <div className="border rounded-md">
        <div className="max-h-96 overflow-y-auto">
          {isLoading ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              Loading dishes...
            </div>
          ) : filteredDishes.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              {searchQuery
                ? "No dishes found matching your search"
                : "No dishes available"}
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
                  <div className="p-4 space-y-2" key={dish.id}>
                    <div className="flex items-start gap-3">
                      <Checkbox
                        checked={isSelected}
                        className="mt-1"
                        onCheckedChange={() => onDishToggle(dish)}
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
                          onValueChange={(value) =>
                            onCourseChange(dish.id, value)
                          }
                          value={selectedDish?.course || ""}
                        >
                          <SelectTrigger className="w-48">
                            <SelectValue placeholder="Select course" />
                          </SelectTrigger>
                          <SelectContent>
                            {COURSE_OPTIONS.map((option) => (
                              <SelectItem
                                key={option.value}
                                value={option.value}
                              >
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
          {selectedDishes.length} dish{selectedDishes.length !== 1 ? "es" : ""}{" "}
          selected
        </div>
      )}
    </div>
  );
}
