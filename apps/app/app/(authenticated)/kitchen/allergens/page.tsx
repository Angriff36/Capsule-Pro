/**
 * @module AllergenManagementPage
 * @intent Provide interface for managing allergen warnings and dietary restrictions
 * @responsibility Display allergen warnings, event and dish allergen information, and edit interfaces
 * @domain Kitchen
 * @tags allergens, warnings, dietary-restrictions, dashboard
 * @canonical true
 */

"use client";

import { useState } from "react";
import { Button } from "@repo/design-system/components/ui/button";
import { Badge } from "@repo/design-system/components/ui/badge";
import { Input } from "@repo/design-system/components/ui/input";
import { Label } from "@repo/design-system/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@repo/design-system/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@repo/design-system/components/ui/tabs";
import { AlertTriangle, CheckCircle2, SearchIcon, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { AllergenManagementModal } from "./allergen-management-modal";

// Types - these would normally come from your database schema
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
}

interface Event {
  id: string;
  name: string;
  date: Date;
  location: string;
  status: string;
}

interface Dish {
  id: string;
  name: string;
  allergens: string[];
  dietary_tags: string[];
}

interface Recipe {
  id: string;
  name: string;
  allergens: string[];
  dietary_tags: string[];
}

// Mock data - replace with actual data fetching
const mockAllergenWarnings: AllergenWarning[] = [
  {
    id: "1",
    eventId: "event-1",
    warningType: "cross_contamination",
    allergens: ["gluten"],
    affectedGuests: ["guest-1", "guest-2"],
    severity: "high",
    isAcknowledged: false,
    resolved: false,
    createdAt: new Date("2024-01-15T10:00:00Z"),
    updatedAt: new Date("2024-01-15T10:00:00Z"),
  },
];

const mockEvents: Event[] = [
  {
    id: "event-1",
    name: "Corporate Dinner",
    date: new Date("2024-01-20T18:00:00Z"),
    location: "Main Ballroom",
    status: "confirmed",
  },
];

const mockDishes: Dish[] = [
  {
    id: "dish-1",
    name: "Gluten-Free Pasta",
    allergens: ["dairy", "eggs"],
    dietary_tags: ["gluten-free"],
  },
  {
    id: "dish-2",
    name: "Vegetable Stir Fry",
    allergens: [],
    dietary_tags: ["vegan", "gluten-free"],
  },
];

const mockRecipes: Recipe[] = [
  {
    id: "recipe-1",
    name: "Basic Pasta",
    allergens: ["gluten", "eggs"],
    dietary_tags: [],
  },
];

export default function AllergenManagementPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const tenantId = "tenant-1"; // This would come from auth context

  // Filter data based on search term
  const filteredWarnings = mockAllergenWarnings.filter(warning =>
    warning.warningType.toLowerCase().includes(searchTerm.toLowerCase()) ||
    warning.allergens.some(allergen => allergen.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const filteredEvents = mockEvents.filter(event =>
    event.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    event.location.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredDishes = mockDishes.filter(dish =>
    dish.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredRecipes = mockRecipes.filter(recipe =>
    recipe.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAcknowledgeWarning = async (warningId: string) => {
    setLoading(true);
    try {
      // In a real app, this would make an API call
      console.log(`Acknowledging warning: ${warningId}`);
      toast.success("Warning acknowledged");
    } catch (error) {
      console.error("Error acknowledging warning:", error);
      toast.error("Failed to acknowledge warning");
    } finally {
      setLoading(false);
    }
  };

  const handleResolveWarning = async (warningId: string, overrideReason: string) => {
    setLoading(true);
    try {
      // In a real app, this would make an API call
      console.log(`Resolving warning: ${warningId}`, { overrideReason });
      toast.success("Warning resolved");
    } catch (error) {
      console.error("Error resolving warning:", error);
      toast.error("Failed to resolve warning");
    } finally {
      setLoading(false);
    }
  };

  const formatGuests = (guests: string[]) => {
    // In a real app, this would fetch guest names
    return guests.length > 0 ? `${guests.length} guest(s)` : "No guests";
  };

  const formatDateTime = (date: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };

  const getSeverityBadgeColor = (severity: string) => {
    switch (severity) {
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
            Manage allergen warnings and dietary restrictions for events and dishes
          </p>
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <SearchIcon className="h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search warnings, events, dishes..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-64"
        />
      </div>

      <Tabs defaultValue="warnings" className="space-y-4">
        <TabsList>
          <TabsTrigger value="warnings">Allergen Warnings</TabsTrigger>
          <TabsTrigger value="events">Events</TabsTrigger>
          <TabsTrigger value="dishes">Dishes</TabsTrigger>
          <TabsTrigger value="recipes">Recipes</TabsTrigger>
        </TabsList>

        {/* Allergen Warnings Tab */}
        <TabsContent value="warnings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <AlertTriangle className="h-5 w-5" />
                <span>Active Allergen Warnings</span>
                <Badge variant="destructive">{filteredWarnings.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {filteredWarnings.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No active allergen warnings
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredWarnings.map((warning) => (
                    <Card key={warning.id} className="border-l-4 border-l-yellow-500">
                      <CardContent className="pt-4">
                        <div className="flex items-start justify-between">
                          <div className="space-y-2">
                            <div className="flex items-center space-x-2">
                              <Badge variant={getSeverityBadgeColor(warning.severity)}>
                                {warning.severity}
                              </Badge>
                              <span className="text-sm text-muted-foreground">
                                {formatDateTime(warning.createdAt)}
                              </span>
                              {warning.isAcknowledged && (
                                <CheckCircle2 className="h-4 w-4 text-green-500" />
                              )}
                            </div>
                            <div>
                              <p className="font-medium">Warning Type: {warning.warningType}</p>
                              <p className="text-sm text-muted-foreground">
                                Allergens: {warning.allergens.join(", ") || "None"}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {formatGuests(warning.affectedGuests)}
                              </p>
                              {warning.notes && (
                                <p className="text-sm mt-2">{warning.notes}</p>
                              )}
                            </div>
                          </div>
                          <div className="flex space-x-2">
                            {!warning.isAcknowledged && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleAcknowledgeWarning(warning.id)}
                                disabled={loading}
                              >
                                {loading ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  "Acknowledge"
                                )}
                              </Button>
                            )}
                            {!warning.resolved && (
                              <Button
                                size="sm"
                                onClick={() => {
                                  // In a real app, this would open a modal for override reason
                                  const reason = prompt("Please provide override reason:");
                                  if (reason) {
                                    handleResolveWarning(warning.id, reason);
                                  }
                                }}
                                disabled={loading}
                              >
                                {loading ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
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
        <TabsContent value="events" className="space-y-4">
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
                            <h3 className="font-medium">{event.name}</h3>
                            <p className="text-sm text-muted-foreground">
                              {event.date.toLocaleDateString()} at {event.location}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              Status: <Badge variant={event.status === "confirmed" ? "default" : "secondary"}>
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
        <TabsContent value="dishes" className="space-y-4">
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
                                  <Badge key={allergen} variant="destructive">
                                    {allergen}
                                  </Badge>
                                ))
                              ) : (
                                <Badge variant="secondary">No allergens</Badge>
                              )}
                              {dish.dietary_tags.map((tag) => (
                                <Badge key={tag} variant="outline">
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          </div>
                          <AllergenManagementModal
                            type="dish"
                            id={dish.id}
                            name={dish.name}
                            currentAllergens={dish.allergens}
                            currentDietaryTags={dish.dietary_tags}
                            tenantId={tenantId}
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
        <TabsContent value="recipes" className="space-y-4">
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
                            {recipe.allergens.length > 0 ? (
                              recipe.allergens.map((allergen) => (
                                <Badge key={allergen} variant="destructive">
                                  {allergen}
                                </Badge>
                              ))
                            ) : (
                              <Badge variant="secondary">No allergens</Badge>
                            )}
                            {recipe.dietary_tags.map((tag) => (
                              <Badge key={tag} variant="outline">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                          <div className="text-sm text-muted-foreground mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded">
                            <strong>Note:</strong> Recipe allergen management is not available. Allergens are managed at the dish level.
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
    </div>
  );
}