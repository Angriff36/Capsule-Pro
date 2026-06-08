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
import { ScrollArea } from "@repo/design-system/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/design-system/components/ui/select";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Loader2,
  MapPin,
  Navigation,
  Route,
  Truck,
  User,
  Users,
} from "lucide-react";
import { useEffect, useState } from "react";
import { apiFetch } from "@/app/lib/api";
import { logisticsDispatchAssign } from "@/app/lib/manifest-client.generated";

interface RouteStop {
  id: string;
  stopNumber: number;
  name: string;
  status: string;
}

interface DispatchRoute {
  id: string;
  routeNumber: string;
  name: string;
  status: string;
  dispatchStatus: string;
  scheduledDate: string | null;
  totalDistance: string | null;
  totalDuration: number | null;
  driverId: string | null;
  driverName: string | null;
  driverPhone: string | null;
  vehicleId: string | null;
  vehicleName: string | null;
  stops: RouteStop[];
  stopCount: number;
}

interface AvailableDriver {
  id: string;
  name: string;
  phone: string | null;
  vehicle_name: string | null;
}

interface DispatchData {
  routes: DispatchRoute[];
  availableDrivers: AvailableDriver[];
  stats: {
    unassigned: number;
    assigned: number;
    inProgress: number;
    completed: number;
  };
}

const DISPATCH_STATUS_CONFIG: Record<
  string,
  {
    label: string;
    color: string;
    icon: React.ComponentType<{ className?: string }>;
  }
> = {
  unassigned: {
    label: "Unassigned",
    color: "bg-muted/50 text-foreground dark:bg-muted/50",
    icon: AlertCircle,
  },
  assigned: {
    label: "Assigned",
    color: "bg-muted/50 text-foreground dark:bg-muted/50",
    icon: User,
  },
  in_progress: {
    label: "In Progress",
    color: "bg-muted/50 text-foreground dark:bg-muted/50",
    icon: Truck,
  },
  complete: {
    label: "Complete",
    color: "bg-muted/50 text-foreground dark:bg-muted/50",
    icon: CheckCircle2,
  },
};

export default function DispatchPage() {
  const [data, setData] = useState<DispatchData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [selectedRoute, setSelectedRoute] = useState<DispatchRoute | null>(
    null
  );
  const [selectedDriverId, setSelectedDriverId] = useState<string>("__none__");
  const [assigning, setAssigning] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // NOTE: No generated function for /api/logistics/dispatch — custom aggregate endpoint (routes + drivers + stats).
      const res = await apiFetch("/api/logistics/dispatch");
      const json = await res.json();
      if (json.success) {
        setData(json.data);
      }
    } catch (e) {
      console.error("Failed to load dispatch data:", e);
    } finally {
      setLoading(false);
    }
  };

  const openAssignDialog = (route: DispatchRoute) => {
    setSelectedRoute(route);
    setSelectedDriverId(route.driverId || "");
    setShowAssignDialog(true);
  };

  const handleAssign = async () => {
    if (!selectedRoute) return;

    setAssigning(true);
    try {
      await logisticsDispatchAssign({
        routeId: selectedRoute.id,
        driverId: selectedDriverId === "__none__" ? null : selectedDriverId || null,
      });
      await loadData();
      setShowAssignDialog(false);
    } catch (e) {
      console.error("Failed to assign driver:", e);
    } finally {
      setAssigning(false);
    }
  };

  const formatDuration = (minutes: number | null) => {
    if (!minutes) return "--";
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  const groupRoutesByStatus = (routes: DispatchRoute[]) => {
    const groups: Record<string, DispatchRoute[]> = {
      unassigned: [],
      assigned: [],
      in_progress: [],
      complete: [],
    };

    routes.forEach((route) => {
      const status = route.dispatchStatus;
      if (groups[status]) {
        groups[status].push(route);
      }
    });

    return groups;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-muted-foreground">Failed to load dispatch data</p>
      </div>
    );
  }

  const groupedRoutes = groupRoutesByStatus(data.routes);

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 pt-0">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <h1 className="text-2xl font-semibold tracking-tight">
            Dispatch Board
          </h1>
          <p className="text-muted-foreground">
            Assign drivers to routes and track today&apos;s deliveries.
          </p>
        </div>
        <Button onClick={loadData} variant="outline">
          <Navigation className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        {(
          [
            ["unassigned", "Unassigned", AlertCircle],
            ["assigned", "Assigned", User],
            ["inProgress", "In Progress", Truck],
            ["completed", "Completed", CheckCircle2],
          ] as const
        ).map(([key, label, Icon]) => (
          <Card key={key} tone="soft-stone">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{label}</CardTitle>
              <Icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {key === "inProgress"
                  ? data.stats.inProgress
                  : data.stats[key as keyof typeof data.stats]}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Content */}
      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        {/* Routes List */}
        <div className="space-y-4">
          {(["unassigned", "assigned", "in_progress"] as const).map(
            (status) => {
              const config = DISPATCH_STATUS_CONFIG[status];
              const routes = groupedRoutes[status];
              if (routes.length === 0) return null;

              return (
                <div key={status}>
                  <div className="flex items-center gap-2 mb-3">
                    <Badge className={config.color}>
                      <config.icon className="h-3 w-3 mr-1" />
                      {config.label}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {routes.length} route{routes.length !== 1 ? "s" : ""}
                    </span>
                  </div>

                  <div className="space-y-3">
                    {routes.map((route) => (
                      <Card
                        className="hover:border-primary/40 transition-shadow"
                        key={route.id}
                        tone="canvas"
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-semibold">
                                  {route.routeNumber}
                                </span>
                                <span className="text-muted-foreground">—</span>
                                <span className="truncate">{route.name}</span>
                              </div>

                              <div className="flex items-center gap-4 text-sm text-muted-foreground mb-2">
                                {route.scheduledDate && (
                                  <span className="flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    {new Date(
                                      route.scheduledDate
                                    ).toLocaleDateString()}
                                  </span>
                                )}
                                <span className="flex items-center gap-1">
                                  <Route className="h-3 w-3" />
                                  {route.stopCount} stop
                                  {route.stopCount !== 1 ? "s" : ""}
                                </span>
                                {route.totalDuration && (
                                  <span>
                                    {formatDuration(route.totalDuration)}
                                  </span>
                                )}
                              </div>

                              {route.driverName && (
                                <div className="flex items-center gap-2 text-sm">
                                  <User className="h-3 w-3 text-muted-foreground" />
                                  <span className="font-medium">
                                    {route.driverName}
                                  </span>
                                  {route.vehicleName && (
                                    <>
                                      <span className="text-muted-foreground">
                                        •
                                      </span>
                                      <Truck className="h-3 w-3 text-muted-foreground" />
                                      <span>{route.vehicleName}</span>
                                    </>
                                  )}
                                </div>
                              )}

                              {route.stops.length > 0 && (
                                <div className="mt-2 flex flex-wrap gap-1">
                                  {route.stops.slice(0, 3).map((stop) => (
                                    <span
                                      className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-muted"
                                      key={stop.id}
                                    >
                                      <MapPin className="h-2.5 w-2.5" />
                                      {stop.name}
                                    </span>
                                  ))}
                                  {route.stopCount > 3 && (
                                    <span className="text-xs text-muted-foreground">
                                      +{route.stopCount - 3} more
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>

                            <Button
                              onClick={() => openAssignDialog(route)}
                              size="sm"
                              variant={route.driverId ? "outline" : "default"}
                            >
                              {route.driverId ? "Reassign" : "Assign"}
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              );
            }
          )}

          {data.routes.length === 0 && (
            <Card tone="canvas">
              <CardContent className="py-12 text-center text-muted-foreground">
                <Truck className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No routes scheduled for today.</p>
                <p className="text-sm">
                  Create routes in the Routes section to dispatch them.
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Available Drivers Sidebar */}
        <div className="space-y-4">
          <Card tone="canvas">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Users className="h-4 w-4" />
                Available Drivers
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {data.availableDrivers.length === 0 ? (
                <div className="px-6 pb-4 text-sm text-muted-foreground">
                  No drivers currently available
                </div>
              ) : (
                <ScrollArea className="h-[300px]">
                  <div className="space-y-1 px-2 pb-2">
                    {data.availableDrivers.map((driver) => (
                      <div
                        className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50"
                        key={driver.id}
                      >
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted/50 text-foreground dark:bg-muted/50">
                          <User className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm truncate">
                            {driver.name}
                          </div>
                          {driver.vehicle_name && (
                            <div className="text-xs text-muted-foreground truncate">
                              {driver.vehicle_name}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Assign Dialog */}
      <Dialog onOpenChange={setShowAssignDialog} open={showAssignDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Assign Driver</DialogTitle>
            <DialogDescription>
              {selectedRoute && (
                <>
                  Assign a driver to{" "}
                  <strong>{selectedRoute.routeNumber}</strong> —{" "}
                  {selectedRoute.name}
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Select Driver</label>
              <Select
                onValueChange={setSelectedDriverId}
                value={selectedDriverId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose a driver..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Unassigned</SelectItem>
                  {data.availableDrivers.map((driver) => (
                    <SelectItem key={driver.id} value={driver.id}>
                      {driver.name}
                      {driver.vehicle_name && ` (${driver.vehicle_name})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedDriverId === "__none__" && selectedRoute?.driverId && (
              <p className="text-sm text-muted-foreground">
                This will remove the current driver assignment.
              </p>
            )}
          </div>

          <DialogFooter>
            <Button
              onClick={() => setShowAssignDialog(false)}
              variant="outline"
            >
              Cancel
            </Button>
            <Button disabled={assigning} onClick={handleAssign}>
              {assigning && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {selectedDriverId !== "__none__" ? "Assign" : "Unassign"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
