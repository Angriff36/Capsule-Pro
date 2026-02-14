"use client";

import { captureException } from "@sentry/nextjs";
import {
  ConstraintOverrideDialog,
  useConstraintOverride,
} from "@repo/design-system/components/constraint-override-dialog";
import type { OverrideReasonCode } from "@repo/design-system/components/override-reasons";
import {
  Alert,
  AlertDescription,
} from "@repo/design-system/components/ui/alert";
import { Checkbox } from "@repo/design-system/components/ui/checkbox";
import { Input } from "@repo/design-system/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/design-system/components/ui/select";
import { AlertCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import React, { useState, useTransition } from "react";
import type { DishSummary, MenuDetail } from "../actions";
import { getDishes } from "../actions";
import type { MenuManifestActionResult } from "../actions-manifest";
import {
  createMenuManifest,
  createMenuWithOverride,
  updateMenuManifest,
  updateMenuWithOverride,
} from "../actions-manifest";

interface SelectedDish {
  dish: DishSummary;
  course: string | null;
}

const COURSE_OPTIONS = [
  { value: "appetizer", label: "Appetizer" },
  { value: "main", label: "Main Course" },
  { value: "dessert", label: "Dessert" },
  { value: "beverage", label: "Beverage" },
  { value: "side", label: "Side" },
  { value: "other", label: "Other" },
];

interface MenuFormWithConstraintsProps {
  formMode: "create" | "update";
  menuId?: string;
  initialData?: MenuDetail;
  children: (props: {
    handleSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
    isSubmitting: boolean;
    error: string | null;
    dishesSelector: React.ReactNode;
  }) => React.ReactNode;
}

export function MenuFormWithConstraints({
  formMode,
  menuId,
  initialData,
  children,
}: MenuFormWithConstraintsProps) {
  const router = useRouter();
  const [isPending, startTransitionAction] = useTransition();
  const [result, setResult] = useState<MenuManifestActionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData | null>(null);

  // Dish selection state
  const [dishes, setDishes] = useState<DishSummary[]>([]);
  const [selectedDishes, setSelectedDishes] = useState<SelectedDish[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoadingDishes, setIsLoadingDishes] = useState(true);

  // Fetch dishes on mount
  React.useEffect(() => {
    const fetchDishes = async () => {
      try {
        const result = await getDishes();
        setDishes(result);
      } catch (err) {
        captureException(err);
      } finally {
        setIsLoadingDishes(false);
      }
    };
    fetchDishes();
  }, []);

  // Pre-select dishes from initial data
  React.useEffect(() => {
    if (initialData?.dishes) {
      const dishMap = new Map(dishes.map((d) => [d.id, d]));
      const preselected: SelectedDish[] = initialData.dishes
        .map((md) => {
          const dish = dishMap.get(md.dishId);
          if (!dish) {
            return null;
          }
          return {
            dish,
            course: md.course,
          };
        })
        .filter((sd): sd is SelectedDish => sd !== null);
      setSelectedDishes(preselected);
    }
  }, [initialData, dishes]);

  const filteredDishes = dishes.filter(
    (dish) =>
      dish.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (dish.category?.toLowerCase() || "").includes(searchQuery.toLowerCase())
  );

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    setFormData(data);
    setError(null);
    setResult(null);

    startTransitionAction(async () => {
      try {
        let actionResult: MenuManifestActionResult;

        if (formMode === "create") {
          actionResult = await createMenuManifest(data);
        } else {
          actionResult = await updateMenuManifest(menuId!, data);
        }

        setResult(actionResult);

        if (actionResult.success) {
          if (actionResult.redirectUrl) {
            router.push(actionResult.redirectUrl);
          } else if (formMode === "update") {
            router.push(`/kitchen/recipes/menus/${menuId}`);
          }
        } else if (actionResult.error) {
          setError(actionResult.error);
        }
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "An unknown error occurred";
        setError(message);
      }
    });
  };

  const handleOverride = async (
    reason: OverrideReasonCode,
    details: string
  ) => {
    if (!formData) {
      return;
    }

    startTransitionAction(async () => {
      try {
        let actionResult: MenuManifestActionResult;

        if (formMode === "create") {
          actionResult = await createMenuWithOverride(
            formData,
            reason,
            details
          );
        } else {
          actionResult = await updateMenuWithOverride(
            menuId!,
            formData,
            reason,
            details
          );
        }

        setResult(actionResult);

        if (actionResult.success) {
          if (actionResult.redirectUrl) {
            router.push(actionResult.redirectUrl);
          } else if (formMode === "update") {
            router.push(`/kitchen/recipes/menus/${menuId}`);
          }
        } else if (actionResult.error) {
          setError(actionResult.error);
        }
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "An unknown error occurred";
        setError(message);
      }
    });
  };

  const constraintState = useConstraintOverride({
    result: result
      ? { constraintOutcomes: result.constraintOutcomes }
      : { success: true },
    onOverride: handleOverride,
  });

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

  const dishesSelector = (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Select Dishes</h2>
      <p className="text-sm text-muted-foreground">
        Choose dishes to include in this menu and assign them to courses
      </p>

      <Input
        onChange={(e) => setSearchQuery(e.target.value)}
        placeholder="Search dishes..."
        value={searchQuery}
      />

      <div className="border rounded-md">
        <div className="max-h-96 overflow-y-auto">
          {isLoadingDishes ? (
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
                        id={`dish-${dish.id}`}
                        onCheckedChange={() => handleDishToggle(dish)}
                      />
                      <div className="flex-1 space-y-1">
                        <label
                          className="font-medium cursor-pointer flex-1"
                          htmlFor={`dish-${dish.id}`}
                        >
                          {dish.name}
                        </label>
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
                            handleCourseChange(dish.id, value)
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

  const isSubmitting = isPending;

  return (
    <>
      {children({ handleSubmit, isSubmitting, error, dishesSelector })}
      <ConstraintOverrideDialog
        actionDescription={
          formMode === "create" ? "create this menu" : "update this menu"
        }
        constraints={constraintState.overrideConstraints}
        onConfirm={constraintState.handleOverride}
        onOpenChange={constraintState.setShowOverrideDialog}
        open={constraintState.showOverrideDialog}
        warningsOnly={constraintState.warningsOnly}
      />
      {error && (
        <Alert className="mt-4" variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </>
  );
}

