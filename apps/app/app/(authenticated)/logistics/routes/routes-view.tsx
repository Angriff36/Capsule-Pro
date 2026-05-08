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
import { Textarea } from "@repo/design-system/components/ui/textarea";
import {
  CheckCircle2,
  Clock,
  Loader2,
  MapPin,
  Navigation,
  Play,
  Plus,
  Route,
  Truck,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { apiFetch } from "@/app/lib/api";

interface RouteStop {
  id: string;
  stopNumber: number;
  name: string;
  addressLine1: string | null;
  city: string | null;
  stopType: string;
  status: string;
  plannedArrival: string | null;
  latitude: string | null;
  longitude: string | null;
}

interface DeliveryRoute {
  id: string;
  routeNumber: string;
  name: string;
  description: string | null;
  status: string;
  scheduledDate: string | null;
  totalDistance: string | null;
  totalDuration: number | null;
  stops: RouteStop[];
  createdAt: string;
}

const statusColors: Record<string, string> = {
  draft: "bg-muted/50 text-foreground",
  optimized: "bg-muted/50 text-foreground",
  in_progress: "bg-muted/50 text-foreground",
  completed: "bg-muted/50 text-foreground",
  cancelled: "bg-muted/50 text-foreground",
};

const stopStatusColors: Record<string, string> = {
  pending: "bg-muted/50 text-foreground",
  in_transit: "bg-muted/50 text-foreground",
  arrived: "bg-muted/50 text-foreground",
  completed: "bg-muted/50 text-foreground",
  skipped: "bg-muted/50 text-foreground",
};

export function RoutesView() {
  const [routes, setRoutes] = useState<DeliveryRoute[]>([]);
  const [loading, setLoading] = useState(true);
  const [optimizing, setOptimizing] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("all");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: "",
    scheduledDate: "",
    description: "",
  });
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadRoutes();
  }, []);

  const loadRoutes = async () => {
    try {
      const res = await apiFetch("/api/logistics/routes/list");
      const data = await res.json();
      setRoutes(data.routes || []);
    } catch (error) {
      console.error("Failed to load routes:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRoute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.name.trim()) return;

    setCreating(true);
    try {
      const res = await apiFetch("/api/logistics/routes/commands/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: createForm.name,
          description: createForm.description || null,
          scheduledDate: createForm.scheduledDate || null,
        }),
      });
      const data = await res.json();
      if (data.route) {
        setRoutes((prev) => [data.route, ...prev]);
        setShowCreateDialog(false);
        setCreateForm({ name: "", scheduledDate: "", description: "" });
      }
    } catch (error) {
      console.error("Failed to create route:", error);
    } finally {
      setCreating(false);
    }
  };

  const handleOptimize = async (routeId: string) => {
    setOptimizing(routeId);
    try {
      const res = await apiFetch("/api/logistics/routes/commands/optimize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ routeId }),
      });

      if (!res.ok) {
        if (res.status === 501) {
          toast.info(
            "Route optimization is not yet available. You can start the route directly from draft status."
          );
        } else {
          const data = await res.json().catch(() => null);
          toast.error(
            data?.error || `Failed to optimize route (HTTP ${res.status})`
          );
        }
        return;
      }

      const data = await res.json();
      if (data.route) {
        setRoutes((prev) =>
          prev.map((r) => (r.id === routeId ? data.route : r))
        );
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to optimize route"
      );
    } finally {
      setOptimizing(null);
    }
  };

  const handleStartRoute = async (routeId: string) => {
    try {
      const res = await apiFetch(
        "/api/logistics/routes/commands/update-status",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ routeId, status: "in_progress" }),
        }
      );
      const data = await res.json();
      if (data.route) {
        setRoutes((prev) =>
          prev.map((r) =>
            r.id === routeId ? { ...r, status: data.route.status } : r
          )
        );
      }
    } catch (error) {
      console.error("Failed to start route:", error);
    }
  };

  const handleCompleteRoute = async (routeId: string) => {
    try {
      const res = await apiFetch(
        "/api/logistics/routes/commands/update-status",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ routeId, status: "completed" }),
        }
      );
      const data = await res.json();
      if (data.route) {
        setRoutes((prev) =>
          prev.map((r) =>
            r.id === routeId ? { ...r, status: data.route.status } : r
          )
        );
      }
    } catch (error) {
      console.error("Failed to complete route:", error);
    }
  };

  const filteredRoutes = routes.filter((route) => {
    if (activeTab === "all") return true;
    return route.status === activeTab;
  });

  const formatDuration = (minutes: number | null) => {
    if (!minutes) return "--";
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Delivery Routes</h1>
          <p className="text-muted-foreground">
            Optimize delivery and catering routes for multi-venue events
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Route
        </Button>
      </div>

      <Tabs onValueChange={setActiveTab} value={activeTab}>
        <TabsList>
          <TabsTrigger value="all">All Routes</TabsTrigger>
          <TabsTrigger value="draft">Draft</TabsTrigger>
          <TabsTrigger value="optimized">Optimized</TabsTrigger>
          <TabsTrigger value="in_progress">In Progress</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
        </TabsList>

        <TabsContent className="space-y-4" value={activeTab}>
          {filteredRoutes.length === 0 ? (
            <Card tone="canvas">
              <CardContent className="py-8 text-center text-muted-foreground">
                No routes found. Create a new route to get started.
              </CardContent>
            </Card>
          ) : (
            filteredRoutes.map((route) => (
              <Card key={route.id} tone="canvas">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <Truck className="h-5 w-5" />
                      {route.routeNumber} - {route.name}
                    </CardTitle>
                    <Badge className={statusColors[route.status]}>
                      {route.status.replace("_", " ")}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  {route.description && (
                    <p className="text-sm text-muted-foreground mb-4">
                      {route.description}
                    </p>
                  )}

                  <div className="grid grid-cols-3 gap-4 mb-4 text-sm">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span>
                        {route.scheduledDate
                          ? new Date(route.scheduledDate).toLocaleDateString()
                          : "Not scheduled"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Navigation className="h-4 w-4 text-muted-foreground" />
                      <span>{route.totalDistance || "--"} km</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Route className="h-4 w-4 text-muted-foreground" />
                      <span>{formatDuration(route.totalDuration)}</span>
                    </div>
                  </div>

                  {route.stops.length > 0 && (
                    <div className="space-y-2 mb-4">
                      {route.stops.map((stop) => (
                        <div
                          className="flex items-center gap-3 p-2 rounded-lg bg-muted/50"
                          key={stop.id}
                        >
                          <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-medium">
                            {stop.stopNumber}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <MapPin className="h-3 w-3 text-muted-foreground" />
                              <span className="font-medium text-sm truncate">
                                {stop.name}
                              </span>
                            </div>
                            {stop.addressLine1 && (
                              <p className="text-xs text-muted-foreground truncate">
                                {stop.addressLine1}
                                {stop.city && `, ${stop.city}`}
                              </p>
                            )}
                          </div>
                          <Badge className={stopStatusColors[stop.status]}>
                            {stop.status}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex gap-2">
                    {route.status === "draft" && (
                      <Button
                        disabled={optimizing === route.id}
                        onClick={() => handleOptimize(route.id)}
                        size="sm"
                        variant="outline"
                      >
                        {optimizing === route.id ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Navigation className="mr-2 h-4 w-4" />
                        )}
                        Optimize
                      </Button>
                    )}
                    {(route.status === "optimized" ||
                      route.status === "draft") && (
                      <Button
                        onClick={() => handleStartRoute(route.id)}
                        size="sm"
                        variant="default"
                      >
                        <Play className="mr-2 h-4 w-4" />
                        Start Route
                      </Button>
                    )}
                    {route.status === "in_progress" && (
                      <Button
                        onClick={() => handleCompleteRoute(route.id)}
                        size="sm"
                        variant="default"
                      >
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                        Complete
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>

      {/* Create Route Dialog */}
      <Dialog onOpenChange={setShowCreateDialog} open={showCreateDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Route</DialogTitle>
            <DialogDescription>
              Add a new delivery route for your event catering.
            </DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={handleCreateRoute}>
            <div className="space-y-2">
              <Label htmlFor="routeName">Route Name</Label>
              <Input
                id="routeName"
                onChange={(e) =>
                  setCreateForm((prev) => ({ ...prev, name: e.target.value }))
                }
                placeholder="e.g., Downtown Lunch Route"
                required
                value={createForm.name}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="scheduledDate">Scheduled Date</Label>
              <Input
                id="scheduledDate"
                onChange={(e) =>
                  setCreateForm((prev) => ({
                    ...prev,
                    scheduledDate: e.target.value,
                  }))
                }
                type="date"
                value={createForm.scheduledDate}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                onChange={(e) =>
                  setCreateForm((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                placeholder="Route details..."
                value={createForm.description}
              />
            </div>
            <DialogFooter>
              <Button
                onClick={() => setShowCreateDialog(false)}
                type="button"
                variant="outline"
              >
                Cancel
              </Button>
              <Button
                disabled={!createForm.name.trim() || creating}
                type="submit"
              >
                {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Route
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
