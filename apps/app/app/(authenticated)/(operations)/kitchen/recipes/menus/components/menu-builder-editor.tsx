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
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@repo/design-system/components/ui/collapsible";
import { Input } from "@repo/design-system/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/design-system/components/ui/select";
import { formatCurrency } from "@repo/design-system/lib/format-currency";
import { ChevronDown, GripVertical, Plus, Search, X } from "lucide-react";
import type React from "react";
import { useCallback, useMemo, useState } from "react";
import type { DishWithCost } from "../actions";

// Course configuration
export const COURSES = [
  {
    id: "appetizer",
    label: "Appetizer",
    color: "bg-muted/50 text-foreground",
  },
  {
    id: "main",
    label: "Main Course",
    color: "bg-muted/50 text-foreground",
  },
  {
    id: "dessert",
    label: "Dessert",
    color: "bg-muted/50 text-foreground",
  },
  {
    id: "beverage",
    label: "Beverage",
    color: "bg-muted/20 text-foreground",
  },
  {
    id: "side",
    label: "Side",
    color: "bg-muted/20 text-foreground",
  },
] as const;

export type CourseId = (typeof COURSES)[number]["id"];

export interface MenuDishEntry {
  allergens: string[];
  costPerPerson: number | null;
  course: CourseId;
  dietaryTags: string[];
  dishId: string;
  dishName: string;
  id: string; // Unique ID for drag-and-drop
  isOptional: boolean;
  pricePerPerson: number | null;
  sortOrder: number;
}

interface MenuBuilderEditorProps {
  availableDishes: DishWithCost[];
  onChange: (dishes: MenuDishEntry[]) => void;
  selectedDishes: MenuDishEntry[];
}

// Generate unique ID for drag-and-drop
const generateId = () =>
  `md-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

// Calculate margin percentage
const calculateMargin = (price: number | null, cost: number | null) => {
  if (!(price && cost) || price === 0) {
    return null;
  }
  return ((price - cost) / price) * 100;
};

export function MenuBuilderEditor({
  availableDishes,
  selectedDishes,
  onChange,
}: MenuBuilderEditorProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [draggedItem, setDraggedItem] = useState<string | null>(null);
  const [dragOverCourse, setDragOverCourse] = useState<string | null>(null);
  const [expandedCourses, setExpandedCourses] = useState<Set<CourseId>>(
    new Set(COURSES.map((c) => c.id))
  );

  // Filter dishes by search
  const filteredDishes = useMemo(() => {
    if (!searchQuery.trim()) {
      return availableDishes;
    }
    const query = searchQuery.toLowerCase();
    return availableDishes.filter(
      (dish) =>
        dish.name.toLowerCase().includes(query) ||
        dish.category?.toLowerCase().includes(query)
    );
  }, [availableDishes, searchQuery]);

  // Get dishes not yet selected
  const unselectedDishes = useMemo(() => {
    const selectedIds = new Set(selectedDishes.map((d) => d.dishId));
    return filteredDishes.filter((d) => !selectedIds.has(d.id));
  }, [filteredDishes, selectedDishes]);

  // Group selected dishes by course
  const dishesByCourse = useMemo(() => {
    const grouped: Record<CourseId, MenuDishEntry[]> = {
      appetizer: [],
      main: [],
      dessert: [],
      beverage: [],
      side: [],
    };
    for (const dish of selectedDishes) {
      const courseId = dish.course as CourseId;
      if (grouped[courseId]) {
        grouped[courseId].push(dish);
      }
    }
    // Sort each course by sortOrder
    for (const course of Object.keys(grouped)) {
      grouped[course as CourseId].sort((a, b) => a.sortOrder - b.sortOrder);
    }
    return grouped;
  }, [selectedDishes]);

  // Toggle course expansion
  const toggleCourse = useCallback((courseId: CourseId) => {
    setExpandedCourses((prev) => {
      const next = new Set(prev);
      if (next.has(courseId)) {
        next.delete(courseId);
      } else {
        next.add(courseId);
      }
      return next;
    });
  }, []);

  // Add dish to menu
  const addDish = useCallback(
    (dish: DishWithCost, course: CourseId = "main") => {
      const newEntry: MenuDishEntry = {
        id: generateId(),
        dishId: dish.id,
        dishName: dish.name,
        course,
        sortOrder: dishesByCourse[course].length,
        isOptional: false,
        dietaryTags: dish.dietaryTags,
        allergens: dish.allergens,
        pricePerPerson: dish.pricePerPerson,
        costPerPerson: dish.costPerPerson,
      };
      onChange([...selectedDishes, newEntry]);
    },
    [dishesByCourse, onChange, selectedDishes]
  );

  // Remove dish from menu
  const removeDish = useCallback(
    (entryId: string) => {
      onChange(selectedDishes.filter((d) => d.id !== entryId));
    },
    [onChange, selectedDishes]
  );

  // Change dish course
  const changeCourse = useCallback(
    (entryId: string, newCourse: CourseId) => {
      onChange(
        selectedDishes.map((d) =>
          d.id === entryId
            ? {
                ...d,
                course: newCourse,
                sortOrder: dishesByCourse[newCourse].length,
              }
            : d
        )
      );
    },
    [dishesByCourse, onChange, selectedDishes]
  );

  // Toggle optional
  const toggleOptional = useCallback(
    (entryId: string) => {
      onChange(
        selectedDishes.map((d) =>
          d.id === entryId ? { ...d, isOptional: !d.isOptional } : d
        )
      );
    },
    [onChange, selectedDishes]
  );

  // Drag handlers for HTML5 Drag API
  const handleDragStart = useCallback((e: React.DragEvent, entryId: string) => {
    setDraggedItem(entryId);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", entryId);
  }, []);

  const handleDragOver = useCallback(
    (e: React.DragEvent, courseId: CourseId) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      setDragOverCourse(courseId);
    },
    []
  );

  const handleDragLeave = useCallback(() => {
    setDragOverCourse(null);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent, targetCourse: CourseId) => {
      e.preventDefault();
      setDragOverCourse(null);

      if (!draggedItem) {
        return;
      }

      const entry = selectedDishes.find((d) => d.id === draggedItem);
      if (!entry) {
        return;
      }

      if (entry.course !== targetCourse) {
        changeCourse(draggedItem, targetCourse);
      }

      setDraggedItem(null);
    },
    [changeCourse, draggedItem, selectedDishes]
  );

  const handleDragEnd = useCallback(() => {
    setDraggedItem(null);
    setDragOverCourse(null);
  }, []);

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      {/* Dish Selector Panel */}
      <div className="lg:col-span-1">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Available Dishes</CardTitle>
            <div className="relative">
              <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search dishes..."
                value={searchQuery}
              />
            </div>
          </CardHeader>
          <CardContent className="max-h-[500px] overflow-y-auto p-0">
            {unselectedDishes.length === 0 ? (
              <div className="p-4 text-center text-muted-foreground text-sm">
                {searchQuery
                  ? "No dishes match your search"
                  : "All dishes have been added"}
              </div>
            ) : (
              <div className="divide-y">
                {unselectedDishes.map((dish) => (
                  <div
                    className="flex items-start justify-between gap-2 p-3 hover:bg-muted/50"
                    key={dish.id}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium text-sm">
                        {dish.name}
                      </div>
                      {dish.category && (
                        <div className="text-muted-foreground text-xs">
                          {dish.category}
                        </div>
                      )}
                      <div className="mt-1 flex flex-wrap gap-1">
                        {dish.dietaryTags.slice(0, 3).map((tag) => (
                          <Badge
                            className="px-1 py-0 text-[10px]"
                            key={tag}
                            variant="outline"
                          >
                            {tag}
                          </Badge>
                        ))}
                        {dish.allergens.slice(0, 2).map((allergen) => (
                          <Badge
                            className="px-1 py-0 text-[10px]"
                            key={allergen}
                            variant="destructive"
                          >
                            {allergen}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <span className="mr-1 text-muted-foreground text-xs">
                        {formatCurrency(dish.pricePerPerson, {
                          nullDisplay: "-",
                        })}
                      </span>
                      <Button
                        className="h-7 w-7"
                        onClick={() => addDish(dish)}
                        size="icon"
                        variant="ghost"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Course Sections Panel */}
      <div className="space-y-4 lg:col-span-2">
        {COURSES.map((course) => {
          const courseDishes = dishesByCourse[course.id];
          const isExpanded = expandedCourses.has(course.id);
          const isDragOver = dragOverCourse === course.id;

          return (
            <Collapsible
              key={course.id}
              onOpenChange={() => toggleCourse(course.id)}
              open={isExpanded}
            >
              <Card
                className={`transition-colors ${isDragOver ? "ring-2 ring-primary" : ""}`}
                onDragLeave={handleDragLeave}
                onDragOver={(e) => handleDragOver(e, course.id)}
                onDrop={(e) => handleDrop(e, course.id)}
                tone="canvas"
              >
                <CollapsibleTrigger asChild>
                  <CardHeader className="cursor-pointer py-3 hover:bg-muted/50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Badge className={course.color}>{course.label}</Badge>
                        <span className="text-muted-foreground text-sm">
                          {courseDishes.length} dish
                          {courseDishes.length === 1 ? "" : "es"}
                        </span>
                      </div>
                      <ChevronDown
                        className={`h-5 w-5 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                      />
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="pt-0">
                    {courseDishes.length === 0 ? (
                      <div className="rounded-lg border-2 border-dashed py-8 text-center text-muted-foreground text-sm">
                        Drag dishes here or add from the panel
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {courseDishes.map((entry) => {
                          const margin = calculateMargin(
                            entry.pricePerPerson,
                            entry.costPerPerson
                          );
                          const isDragging = draggedItem === entry.id;

                          return (
                            <div
                              className={`flex items-center gap-2 rounded-lg border bg-card p-3 transition-opacity hover:bg-muted/50 ${isDragging ? "opacity-50" : ""}`}
                              draggable
                              key={entry.id}
                              onDragEnd={handleDragEnd}
                              onDragStart={(e) => handleDragStart(e, entry.id)}
                            >
                              <GripVertical className="h-4 w-4 shrink-0 cursor-grab text-muted-foreground" />

                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="truncate font-medium text-sm">
                                    {entry.dishName}
                                  </span>
                                  {entry.isOptional && (
                                    <Badge
                                      className="text-[10px]"
                                      variant="secondary"
                                    >
                                      Optional
                                    </Badge>
                                  )}
                                </div>
                                <div className="mt-1 flex flex-wrap gap-1">
                                  {entry.dietaryTags.slice(0, 3).map((tag) => (
                                    <Badge
                                      className="px-1 py-0 text-[10px]"
                                      key={tag}
                                      variant="outline"
                                    >
                                      {tag}
                                    </Badge>
                                  ))}
                                  {entry.allergens.length > 0 && (
                                    <Badge
                                      className="px-1 py-0 text-[10px]"
                                      variant="destructive"
                                    >
                                      {entry.allergens.length} allergen
                                      {entry.allergens.length === 1 ? "" : "s"}
                                    </Badge>
                                  )}
                                </div>
                              </div>

                              <div className="flex shrink-0 items-center gap-3">
                                <div className="text-right text-xs">
                                  <div className="text-muted-foreground">
                                    Cost:{" "}
                                    {formatCurrency(entry.costPerPerson, {
                                      nullDisplay: "-",
                                    })}
                                  </div>
                                  <div className="font-medium">
                                    Price:{" "}
                                    {formatCurrency(entry.pricePerPerson, {
                                      nullDisplay: "-",
                                    })}
                                  </div>
                                  {margin !== null && (
                                    <div
                                      className={
                                        margin >= 60
                                          ? "text-green-600 dark:text-green-400"
                                          : margin >= 30
                                            ? "text-amber-600 dark:text-amber-400"
                                            : "text-red-600 dark:text-red-400"
                                      }
                                    >
                                      {margin.toFixed(0)}% margin
                                    </div>
                                  )}
                                </div>

                                <Select
                                  onValueChange={(value) =>
                                    changeCourse(entry.id, value as CourseId)
                                  }
                                  value={entry.course}
                                >
                                  <SelectTrigger className="h-8 w-28 text-xs">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {COURSES.map((c) => (
                                      <SelectItem key={c.id} value={c.id}>
                                        {c.label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>

                                <Button
                                  className="h-8 w-8"
                                  onClick={() => toggleOptional(entry.id)}
                                  size="icon"
                                  variant={
                                    entry.isOptional ? "default" : "outline"
                                  }
                                >
                                  <span className="text-xs">Opt</span>
                                </Button>

                                <Button
                                  className="h-8 w-8"
                                  onClick={() => removeDish(entry.id)}
                                  size="icon"
                                  variant="ghost"
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          );
        })}
      </div>
    </div>
  );
}
