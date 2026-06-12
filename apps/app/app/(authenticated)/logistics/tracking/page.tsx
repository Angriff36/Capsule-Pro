"use client";

import { Badge } from "@repo/design-system/components/ui/badge";
import { Button } from "@repo/design-system/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";
import { Separator } from "@repo/design-system/components/ui/separator";
import {
  CheckCircle2,
  Loader2,
  MapPin,
  Navigation,
  Package,
  Phone,
  RefreshCw,
  Truck,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/app/lib/api";

// Types
interface DeliveryPosition {
  heading: number;
  lat: number;
  lng: number;
  speed: number;
  updatedAt: string;
}

interface ActiveDelivery {
  carrier: string | null;
  destination: string;
  driverName: string;
  driverPhone: string | null;
  estimatedArrival: string;
  id: string;
  items: number;
  origin: string;
  position: DeliveryPosition;
  shipmentNumber: string;
  shippingMethod: string | null;
  status: "dispatched" | "in_transit" | "arriving" | "delivered";
  timeline: TimelineEvent[];
  trackingNumber: string | null;
  vehicle: string;
}

interface TimelineEvent {
  completed: boolean;
  description: string;
  status: string;
  timestamp: string;
}

interface TrackingResponse {
  deliveries: ActiveDelivery[];
  stats: {
    active: number;
    dispatched: number;
    delivered: number;
  };
}

const STATUS_CONFIG: Record<
  string,
  {
    label: string;
    color: string;
    icon: React.ComponentType<{ className?: string }>;
  }
> = {
  dispatched: {
    label: "Dispatched",
    color: "bg-muted/50 text-foreground",
    icon: Package,
  },
  in_transit: {
    label: "In Transit",
    color: "bg-muted/50 text-foreground",
    icon: Truck,
  },
  arriving: {
    label: "Preparing",
    color: "bg-muted/50 text-foreground",
    icon: Navigation,
  },
  delivered: {
    label: "Delivered",
    color: "bg-muted/50 text-foreground",
    icon: CheckCircle2,
  },
};

// Simple SVG map visualization
function MiniMap({ deliveries }: { deliveries: ActiveDelivery[] }) {
  const activeDeliveries = deliveries.filter((d) => d.status !== "delivered");

  // Auto-compute bounds from delivery positions
  if (deliveries.length === 0) {
    return (
      <div className="flex h-full items-center justify-center rounded-lg bg-muted/30 text-muted-foreground">
        No deliveries to display
      </div>
    );
  }

  const lats = deliveries.map((d) => d.position.lat);
  const lngs = deliveries.map((d) => d.position.lng);
  const padFactor = 0.3;
  const bounds = {
    minLat: Math.min(...lats) - padFactor,
    maxLat: Math.max(...lats) + padFactor,
    minLng: Math.min(...lngs) - padFactor,
    maxLng: Math.max(...lngs) + padFactor,
  };

  const toX = (lng: number) =>
    ((lng - bounds.minLng) / (bounds.maxLng - bounds.minLng)) * 100;
  const toY = (lat: number) =>
    (1 - (lat - bounds.minLat) / (bounds.maxLat - bounds.minLat)) * 100;

  return (
    <div className="relative h-full w-full overflow-hidden rounded-lg bg-gradient-to-br from-muted/20 to-muted/50 dark:from-slate-900 dark:to-slate-800">
      <svg
        className="absolute inset-0 h-full w-full"
        preserveAspectRatio="none"
      >
        {Array.from({ length: 8 }).map((_, i) => (
          <line
            key={`h-${i}`}
            stroke="currentColor"
            strokeOpacity="0.05"
            x1="0"
            x2="100%"
            y1={`${(i / 7) * 100}%`}
            y2={`${(i / 7) * 100}%`}
          />
        ))}
        {Array.from({ length: 8 }).map((_, i) => (
          <line
            key={`v-${i}`}
            stroke="currentColor"
            strokeOpacity="0.05"
            x1={`${(i / 7) * 100}%`}
            x2={`${(i / 7) * 100}%`}
            y1="0"
            y2="100%"
          />
        ))}

        {deliveries.map((delivery) => {
          const x = toX(delivery.position.lng);
          const y = toY(delivery.position.lat);
          const isActive = delivery.status !== "delivered";
          const isPulsing = delivery.status === "in_transit";

          return (
            <g key={delivery.id}>
              {isPulsing && (
                <circle
                  cx={`${x}%`}
                  cy={`${y}%`}
                  fill="none"
                  r="12"
                  stroke="currentColor"
                  strokeOpacity="0.15"
                  strokeWidth="1"
                >
                  <animate
                    attributeName="r"
                    dur="2s"
                    from="8"
                    repeatCount="indefinite"
                    to="20"
                  />
                  <animate
                    attributeName="stroke-opacity"
                    dur="2s"
                    from="0.2"
                    repeatCount="indefinite"
                    to="0"
                  />
                </circle>
              )}

              <circle
                cx={`${x}%`}
                cy={`${y}%`}
                fill={isActive ? "#3b82f6" : "#22c55e"}
                r={isActive ? "6" : "4"}
                stroke="white"
                strokeWidth="2"
              />

              <text
                fill="currentColor"
                fillOpacity="0.7"
                fontFamily="monospace"
                fontSize="9"
                x={`${x + 2}%`}
                y={`${y - 3}%`}
              >
                {delivery.shipmentNumber.slice(-4)}
              </text>
            </g>
          );
        })}
      </svg>

      <div className="absolute right-3 bottom-3 space-y-1 rounded-md border border-hairline bg-white p-2 text-xs dark:bg-slate-800">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-blue-500" />
          <span>In Transit ({activeDeliveries.length})</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-green-500" />
          <span>Delivered ({deliveries.length - activeDeliveries.length})</span>
        </div>
      </div>

      <div className="absolute bottom-3 left-3 rounded bg-white/80 px-2 py-1 text-muted-foreground text-xs dark:bg-slate-800/80">
        Delivery Area
      </div>
    </div>
  );
}

function DeliveryTimeline({ timeline }: { timeline: TimelineEvent[] }) {
  return (
    <div className="space-y-3">
      {timeline.map((event, i) => (
        <div className="flex gap-3" key={event.status}>
          <div className="flex flex-col items-center">
            <div
              className={`h-3 w-3 rounded-full border-2 ${event.completed ? "border-green-500 bg-green-500" : "border-gray-300 bg-white"}`}
            />
            {i < timeline.length - 1 && (
              <div
                className={`h-8 w-0.5 ${event.completed ? "bg-green-300" : "bg-gray-200"}`}
              />
            )}
          </div>
          <div className="pb-4">
            <p
              className={`font-medium text-sm ${event.completed ? "" : "text-muted-foreground"}`}
            >
              {event.description}
            </p>
            {event.timestamp && (
              <p className="text-muted-foreground text-xs">
                {new Date(event.timestamp).toLocaleTimeString([], {
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function TrackingPage() {
  const [deliveries, setDeliveries] = useState<ActiveDelivery[]>([]);
  const [stats, setStats] = useState({
    active: 0,
    dispatched: 0,
    delivered: 0,
  });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const selected = deliveries.find((d) => d.id === selectedId);

  const loadTrackingData = useCallback(async () => {
    try {
      // NOTE: No generated Manifest client function exists for /api/logistics/tracking.
      // This is an aggregate endpoint (deliveries + stats), not a standard entity read route.
      // Keeping apiFetch until a generated function is added for this endpoint.
      const res = await apiFetch("/api/logistics/tracking");
      const data: TrackingResponse = await res.json();
      setDeliveries(data.deliveries || []);
      setStats(data.stats || { active: 0, dispatched: 0, delivered: 0 });
      setLastRefresh(new Date());
    } catch (error) {
      console.error("Failed to load tracking data:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const refreshPositions = useCallback(() => {
    setRefreshing(true);
    loadTrackingData();
  }, [loadTrackingData]);

  // Initial load
  useEffect(() => {
    loadTrackingData();
  }, [loadTrackingData]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(loadTrackingData, 30_000);
    return () => clearInterval(interval);
  }, [loadTrackingData]);

  const formatTime = (dateStr: string) =>
    new Date(dateStr).toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
    });

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 pt-0">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <h1 className="font-semibold text-2xl tracking-tight">
            Delivery Tracking
            <Badge
              className="ml-2 font-normal text-muted-foreground text-xs"
              variant="outline"
            >
              Simulated Positions
            </Badge>
          </h1>
          <p className="text-muted-foreground">
            Tracking for active deliveries (map positions are simulated).
            {deliveries.length === 0 &&
              " No active shipments found — create shipments and assign them to routes to see tracking data here."}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-muted-foreground text-xs">
            Updated {formatTime(lastRefresh.toISOString())}
          </span>
          <Button
            disabled={refreshing}
            onClick={refreshPositions}
            size="sm"
            variant="outline"
          >
            <RefreshCw
              className={`mr-2 h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card tone="soft-stone">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="font-medium text-sm">
              Active Deliveries
            </CardTitle>
            <Truck className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="font-bold text-2xl">{stats.active}</div>
            <p className="text-muted-foreground text-xs">
              Currently in transit
            </p>
          </CardContent>
        </Card>
        <Card tone="soft-stone">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="font-medium text-sm">Dispatched</CardTitle>
            <Package className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="font-bold text-2xl">{stats.dispatched}</div>
          </CardContent>
        </Card>
        <Card tone="soft-stone">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="font-medium text-sm">
              Delivered Today
            </CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="font-bold text-2xl">{stats.delivered}</div>
          </CardContent>
        </Card>
      </div>

      {deliveries.length === 0 ? (
        <Card tone="canvas">
          <CardContent className="py-16 text-center">
            <Truck className="mx-auto mb-4 h-12 w-12 text-muted-foreground/50" />
            <h3 className="mb-1 font-semibold text-lg">
              No deliveries to track
            </h3>
            <p className="mx-auto max-w-md text-muted-foreground text-sm">
              Create shipments and assign them to delivery routes to see
              real-time tracking here. Go to Shipments to create a new shipment,
              then use Dispatch to assign drivers and vehicles.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Map + List Layout */}
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_380px]">
            {/* Map */}
            <Card className="overflow-hidden" tone="canvas">
              <CardContent className="p-0">
                <div className="h-[500px]">
                  <MiniMap deliveries={deliveries} />
                </div>
              </CardContent>
            </Card>

            {/* Delivery List */}
            <Card className="max-h-[500px] overflow-auto" tone="canvas">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Active Deliveries</CardTitle>
                <CardDescription>Click a delivery for details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {deliveries.map((delivery) => {
                  const config =
                    STATUS_CONFIG[delivery.status] || STATUS_CONFIG.dispatched;
                  const Icon = config.icon;
                  const isSelected = selectedId === delivery.id;

                  return (
                    <button
                      className={`w-full rounded-lg border p-3 text-left transition-colors ${
                        isSelected
                          ? "border-primary bg-muted/50"
                          : "hover:bg-accent"
                      }`}
                      key={delivery.id}
                      onClick={() =>
                        setSelectedId(isSelected ? null : delivery.id)
                      }
                    >
                      <div className="mb-1 flex items-center gap-2">
                        <Icon
                          className={`h-4 w-4 ${delivery.status === "in_transit" ? "text-blue-500" : delivery.status === "delivered" ? "text-green-500" : "text-gray-500"}`}
                        />
                        <span className="font-mono text-xs">
                          {delivery.shipmentNumber}
                        </span>
                        <Badge className={config.color}>{config.label}</Badge>
                      </div>
                      <p className="font-medium text-sm">
                        {delivery.destination}
                      </p>
                      <div className="mt-1 flex items-center gap-3 text-muted-foreground text-xs">
                        <span>{delivery.driverName}</span>
                        <span>·</span>
                        <span>{delivery.items} items</span>
                        {delivery.estimatedArrival && (
                          <>
                            <span>·</span>
                            <span>
                              ETA {formatTime(delivery.estimatedArrival)}
                            </span>
                          </>
                        )}
                      </div>
                      {(delivery.carrier || delivery.trackingNumber) && (
                        <div className="mt-1 flex items-center gap-3 text-muted-foreground text-xs">
                          {delivery.carrier && <span>{delivery.carrier}</span>}
                          {delivery.trackingNumber && (
                            <>
                              <span>·</span>
                              <span className="font-mono">
                                {delivery.trackingNumber}
                              </span>
                            </>
                          )}
                        </div>
                      )}
                    </button>
                  );
                })}
              </CardContent>
            </Card>
          </div>

          {/* Selected Delivery Detail */}
          {selected && (
            <Card tone="canvas">
              <CardContent className="pt-6">
                <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_280px]">
                  {/* Timeline */}
                  <div>
                    <h3 className="mb-4 font-semibold">Delivery Timeline</h3>
                    <DeliveryTimeline timeline={selected.timeline} />
                  </div>

                  {/* Driver & Vehicle Info */}
                  <div className="space-y-4">
                    <div>
                      <h3 className="mb-3 font-semibold">Driver Info</h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2">
                          <Truck className="h-4 w-4 text-muted-foreground" />
                          <span>{selected.driverName}</span>
                        </div>
                        {selected.driverPhone && (
                          <div className="flex items-center gap-2">
                            <Phone className="h-4 w-4 text-muted-foreground" />
                            <span>{selected.driverPhone}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-2">
                          <Navigation className="h-4 w-4 text-muted-foreground" />
                          <span>{selected.vehicle}</span>
                        </div>
                      </div>
                    </div>

                    <Separator />

                    <div>
                      <h3 className="mb-3 font-semibold">Route</h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-gray-400" />
                          <span className="text-muted-foreground">
                            {selected.origin}
                          </span>
                        </div>
                        <div className="ml-2 h-4 border-l-2 border-dashed" />
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-red-500" />
                          <span className="font-medium">
                            {selected.destination}
                          </span>
                        </div>
                      </div>
                    </div>

                    <Separator />

                    <div>
                      <h3 className="mb-3 font-semibold">Live Data</h3>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Speed</span>
                          <span>{selected.position.speed.toFixed(0)} mph</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Heading</span>
                          <span>{selected.position.heading}°</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">
                            Last update
                          </span>
                          <span>{formatTime(selected.position.updatedAt)}</span>
                        </div>
                      </div>
                    </div>

                    {(selected.carrier ||
                      selected.trackingNumber ||
                      selected.shippingMethod) && (
                      <>
                        <Separator />
                        <div>
                          <h3 className="mb-3 font-semibold">
                            Shipping Details
                          </h3>
                          <div className="space-y-1 text-sm">
                            {selected.carrier && (
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">
                                  Carrier
                                </span>
                                <span>{selected.carrier}</span>
                              </div>
                            )}
                            {selected.trackingNumber && (
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">
                                  Tracking #
                                </span>
                                <span className="font-mono">
                                  {selected.trackingNumber}
                                </span>
                              </div>
                            )}
                            {selected.shippingMethod && (
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">
                                  Method
                                </span>
                                <span className="capitalize">
                                  {selected.shippingMethod.replace("_", " ")}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
