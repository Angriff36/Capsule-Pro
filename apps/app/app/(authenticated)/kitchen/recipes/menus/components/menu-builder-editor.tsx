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
import {
  ChevronDown,
  GripVertical,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import React, { useCallback, useMemo, useState } from "react";
import type { DishWithCost } from "../actions";

// Course configuration
export const COURSES = [
  { id: "appetizer", label: "Appetizer", color: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200" },
  { id: "main", label: "Main Course", color: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200" },
  { id: "dessert", label: "Dessert", color: "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200" },
  { id: "beverage", label: "Beverage", color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200" },
  { id: "side", label: "Side", color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" },
] as const;

export type CourseId = typeof COURSES[number]["id"];

export interface MenuDishEntry {
  id: string; // Unique ID for drag-and-drop
  dishId: string;
  dishName: string;
  course: CourseId;
  sortOrder: number;
  isOptional: boolean;
  dietaryTags: string[];
  allergens: string[];
  pricePerPerson: number | null;
  costPerPerson: number | null;
}

interface MenuBuilderEditorProps {
  availableDishes: DishWithCost[];
  selectedDishes: MenuDishEntry[];
  onChange: (dishes: MenuDishEntry[]) => void;
}

// Generate unique ID for drag-and-drop
const generateId = () => `md-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

// Format currency
const formatCurrency = (value: number | null) => {
  if (value === null || value === undefined) return "-";
  return `$${value.toFixed(2)}`;
};

// Calculate margin percentage
const calculateMargin = (price: number | null, cost: number | null) => {
  if (!price || !cost || price === 0) return null;
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
    if (!searchQuery.trim()) return availableDishes;
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
  const handleDragStart = useCallback(
    (e: React.DragEvent, entryId: string) => {
      setDraggedItem(entryId);
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", entryId);
    },
    []
  );

  const handleDragOver = useCallback((e: React.DragEvent, courseId: CourseId) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverCourse(courseId);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOverCourse(null);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent, targetCourse: CourseId) => {
      e.preventDefault();
      setDragOverCourse(null);

      if (!draggedItem) return;

      const entry = selectedDishes.find((d) => d.id === draggedItem);
      if (!entry) return;

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
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Dish Selector Panel */}
      <div className="lg:col-span-1">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Available Dishes</CardTitle>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
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
              <div className="p-4 text-center text-sm text-muted-foreground">
                {searchQuery
                  ? "No dishes match your search"
                  : "All dishes have been added"}
              </div>
            ) : (
              <div className="divide-y">
                {unselectedDishes.map((dish) => (
                  <div
                    className="p-3 hover:bg-muted/50 flex items-start justify-between gap-2"
                    key={dish.id}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">
                        {dish.name}
                      </div>
                      {dish.category && (
                        <div className="text-xs text-muted-foreground">
                          {dish.category}
                        </div>
                      )}
                      <div className="flex flex-wrap gap-1 mt-1">
                        {dish.dietaryTags.slice(0, 3).map((tag) => (
                          <Badge
                            className="text-[10px] px-1 py-0"
                            key={tag}
                            variant="outline"
                          >
                            {tag}
                          </Badge>
                        ))}
                        {dish.allergens.slice(0, 2).map((allergen) => (
                          <Badge
                            className="text-[10px] px-1 py-0"
                            key={allergen}
                            variant="destructive"
                          >
                            {allergen}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <span className="text-xs text-muted-foreground mr-1">
                        {formatCurrency(dish.pricePerPerson)}
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
      <div className="lg:col-span-2 space-y-4">
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
              >
                <CollapsibleTrigger asChild>
                  <CardHeader className="cursor-pointer hover:bg-muted/50 py-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Badge className={course.color}>{course.label}</Badge>
                        <span className="text-sm text-muted-foreground">
                          {courseDishes.length} dish
                          {courseDishes.length !== 1 ? "es" : ""}
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
                      <div className="py-8 text-center text-sm text-muted-foreground border-2 border-dashed rounded-lg">
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
                              className={`flex items-center gap-2 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-opacity ${isDragging ? "opacity-50" : ""}`}
                              draggable
                              key={entry.id}
                              onDragEnd={handleDragEnd}
                              onDragStart={(e) => handleDragStart(e, entry.id)}
                            >
                              <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab shrink-0" />

                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium text-sm truncate">
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
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {entry.dietaryTags.slice(0, 3).map((tag) => (
                                    <Badge
                                      className="text-[10px] px-1 py-0"
                                      key={tag}
                                      variant="outline"
                                    >
                                      {tag}
                                    </Badge>
                                  ))}
                                  {entry.allergens.length > 0 && (
                                    <Badge
                                      className="text-[10px] px-1 py-0"
                                      variant="destructive"
                                    >
                                      {entry.allergens.length} allergen
                                      {entry.allergens.length !== 1 ? "s" : ""}
                                    </Badge>
                                  )}
                                </div>
                              </div>

                              <div className="flex items-center gap-3 shrink-0">
                                <div className="text-right text-xs">
                                  <div className="text-muted-foreground">
                                    Cost: {formatCurrency(entry.costPerPerson)}
                                  </div>
                                  <div className="font-medium">
                                    Price: {formatCurrency(entry.pricePerPerson)}
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
                                  <SelectTrigger className="w-28 h-8 text-xs">
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
                                  variant={entry.isOptional ? "default" : "outline"}
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
