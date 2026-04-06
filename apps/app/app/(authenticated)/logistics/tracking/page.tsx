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
  MapPin,
  Navigation,
  Package,
  Phone,
  RefreshCw,
  Truck,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";

// Types
interface DeliveryPosition {
  lat: number;
  lng: number;
  heading: number;
  speed: number;
  updatedAt: string;
}

interface ActiveDelivery {
  id: string;
  shipmentNumber: string;
  driverName: string;
  driverPhone: string | null;
  vehicle: string;
  status: "dispatched" | "in_transit" | "arriving" | "delivered";
  origin: string;
  destination: string;
  estimatedArrival: string;
  position: DeliveryPosition;
  timeline: TimelineEvent[];
  items: number;
}

interface TimelineEvent {
  status: string;
  timestamp: string;
  description: string;
  completed: boolean;
}

// Mock data for active deliveries
const MOCK_DELIVERIES: ActiveDelivery[] = [
  {
    id: "del-1",
    shipmentNumber: "SHP-2026-0042",
    driverName: "Marcus Johnson",
    driverPhone: "(555) 234-5678",
    vehicle: "Van #3 - Ford Transit",
    status: "in_transit",
    origin: "Main Warehouse",
    destination: "Grand Ballroom - Downtown",
    estimatedArrival: "2026-03-27T09:30:00",
    position: {
      lat: 34.052,
      lng: -118.243,
      heading: 45,
      speed: 28,
      updatedAt: new Date().toISOString(),
    },
    timeline: [
      {
        status: "dispatched",
        timestamp: "2026-03-27T07:00:00",
        description: "Dispatched from warehouse",
        completed: true,
      },
      {
        status: "picked_up",
        timestamp: "2026-03-27T07:15:00",
        description: "All items loaded",
        completed: true,
      },
      {
        status: "in_transit",
        timestamp: "2026-03-27T07:30:00",
        description: "En route to destination",
        completed: true,
      },
      {
        status: "arriving",
        timestamp: "",
        description: "Approaching destination",
        completed: false,
      },
      {
        status: "delivered",
        timestamp: "",
        description: "Delivered and confirmed",
        completed: false,
      },
    ],
    items: 12,
  },
  {
    id: "del-2",
    shipmentNumber: "SHP-2026-0043",
    driverName: "Sarah Chen",
    driverPhone: "(555) 345-6789",
    vehicle: "Van #1 - Mercedes Sprinter",
    status: "dispatched",
    origin: "Main Warehouse",
    destination: "Beachfront Venue - Santa Monica",
    estimatedArrival: "2026-03-27T10:15:00",
    position: {
      lat: 34.019,
      lng: -118.491,
      heading: 0,
      speed: 0,
      updatedAt: new Date().toISOString(),
    },
    timeline: [
      {
        status: "dispatched",
        timestamp: "2026-03-27T07:45:00",
        description: "Dispatched from warehouse",
        completed: true,
      },
      {
        status: "picked_up",
        timestamp: "",
        description: "All items loaded",
        completed: false,
      },
      {
        status: "in_transit",
        timestamp: "",
        description: "En route to destination",
        completed: false,
      },
      {
        status: "arriving",
        timestamp: "",
        description: "Approaching destination",
        completed: false,
      },
      {
        status: "delivered",
        timestamp: "",
        description: "Delivered and confirmed",
        completed: false,
      },
    ],
    items: 8,
  },
  {
    id: "del-3",
    shipmentNumber: "SHP-2026-0041",
    driverName: "David Kim",
    driverPhone: "(555) 456-7890",
    vehicle: "Van #5 - RAM ProMaster",
    status: "arriving",
    origin: "Main Warehouse",
    destination: "Rooftop Gardens - Hollywood",
    estimatedArrival: "2026-03-27T08:10:00",
    position: {
      lat: 34.098,
      lng: -118.326,
      heading: 180,
      speed: 12,
      updatedAt: new Date().toISOString(),
    },
    timeline: [
      {
        status: "dispatched",
        timestamp: "2026-03-27T06:30:00",
        description: "Dispatched from warehouse",
        completed: true,
      },
      {
        status: "picked_up",
        timestamp: "2026-03-27T06:45:00",
        description: "All items loaded",
        completed: true,
      },
      {
        status: "in_transit",
        timestamp: "2026-03-27T07:00:00",
        description: "En route to destination",
        completed: true,
      },
      {
        status: "arriving",
        timestamp: "2026-03-27T08:00:00",
        description: "Approaching destination",
        completed: true,
      },
      {
        status: "delivered",
        timestamp: "",
        description: "Delivered and confirmed",
        completed: false,
      },
    ],
    items: 24,
  },
  {
    id: "del-4",
    shipmentNumber: "SHP-2026-0040",
    driverName: "Maria Garcia",
    driverPhone: "(555) 567-8901",
    vehicle: "Van #2 - Ford Transit",
    status: "delivered",
    origin: "Main Warehouse",
    destination: "Country Club - Pasadena",
    estimatedArrival: "2026-03-27T07:30:00",
    position: {
      lat: 34.147,
      lng: -118.145,
      heading: 0,
      speed: 0,
      updatedAt: new Date().toISOString(),
    },
    timeline: [
      {
        status: "dispatched",
        timestamp: "2026-03-27T05:30:00",
        description: "Dispatched from warehouse",
        completed: true,
      },
      {
        status: "picked_up",
        timestamp: "2026-03-27T05:45:00",
        description: "All items loaded",
        completed: true,
      },
      {
        status: "in_transit",
        timestamp: "2026-03-27T06:00:00",
        description: "En route to destination",
        completed: true,
      },
      {
        status: "arriving",
        timestamp: "2026-03-27T07:10:00",
        description: "Approaching destination",
        completed: true,
      },
      {
        status: "delivered",
        timestamp: "2026-03-27T07:25:00",
        description: "Delivered and confirmed",
        completed: true,
      },
    ],
    items: 16,
  },
];

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
    color: "bg-gray-100 text-gray-700",
    icon: Package,
  },
  in_transit: {
    label: "In Transit",
    color: "bg-blue-100 text-blue-700",
    icon: Truck,
  },
  arriving: {
    label: "Arriving",
    color: "bg-amber-100 text-amber-700",
    icon: Navigation,
  },
  delivered: {
    label: "Delivered",
    color: "bg-green-100 text-green-700",
    icon: CheckCircle2,
  },
};

// Simple SVG map visualization (no external dependencies)
function MiniMap({ deliveries }: { deliveries: ActiveDelivery[] }) {
  const activeDeliveries = deliveries.filter((d) => d.status !== "delivered");

  // Map bounds (LA area approximate)
  const bounds = { minLat: 33.9, maxLat: 34.3, minLng: -118.6, maxLng: -118.0 };

  const toX = (lng: number) =>
    ((lng - bounds.minLng) / (bounds.maxLng - bounds.minLng)) * 100;
  const toY = (lat: number) =>
    (1 - (lat - bounds.minLat) / (bounds.maxLat - bounds.minLat)) * 100;

  return (
    <div className="relative w-full h-full bg-gradient-to-br from-blue-50 to-blue-100 dark:from-slate-900 dark:to-slate-800 rounded-lg overflow-hidden">
      {/* Grid lines */}
      <svg
        className="absolute inset-0 w-full h-full"
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

        {/* Delivery markers */}
        {deliveries.map((delivery) => {
          const x = toX(delivery.position.lng);
          const y = toY(delivery.position.lat);
          const isActive = delivery.status !== "delivered";
          const isPulsing = delivery.status === "in_transit";

          return (
            <g key={delivery.id}>
              {/* Destination marker (faded) */}
              <circle
                cx={`${x + 3}%`}
                cy={`${y - 2}%`}
                fill="currentColor"
                fillOpacity="0.2"
                r="4"
              />

              {/* Pulse effect for in-transit */}
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

              {/* Vehicle dot */}
              <circle
                cx={`${x}%`}
                cy={`${y}%`}
                fill={isActive ? "#3b82f6" : "#22c55e"}
                r={isActive ? "6" : "4"}
                stroke="white"
                strokeWidth="2"
              />

              {/* Shipment number label */}
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

      {/* Legend */}
      <div className="absolute bottom-3 right-3 bg-white dark:bg-slate-800 rounded-md p-2 shadow-sm text-xs space-y-1">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-blue-500" />
          <span>In Transit ({activeDeliveries.length})</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-500" />
          <span>Delivered ({deliveries.length - activeDeliveries.length})</span>
        </div>
      </div>

      {/* Scale bar */}
      <div className="absolute bottom-3 left-3 text-xs text-muted-foreground bg-white/80 dark:bg-slate-800/80 rounded px-2 py-1">
        LA Metro Area
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
              className={`w-3 h-3 rounded-full border-2 ${event.completed ? "bg-green-500 border-green-500" : "bg-white border-gray-300"}`}
            />
            {i < timeline.length - 1 && (
              <div
                className={`w-0.5 h-8 ${event.completed ? "bg-green-300" : "bg-gray-200"}`}
              />
            )}
          </div>
          <div className="pb-4">
            <p
              className={`text-sm font-medium ${event.completed ? "" : "text-muted-foreground"}`}
            >
              {event.description}
            </p>
            {event.timestamp && (
              <p className="text-xs text-muted-foreground">
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
  const [deliveries, setDeliveries] =
    useState<ActiveDelivery[]>(MOCK_DELIVERIES);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [refreshing, setRefreshing] = useState(false);

  const selected = deliveries.find((d) => d.id === selectedId);

  // Simulate position updates (in production, this would poll an API)
  const refreshPositions = useCallback(() => {
    setRefreshing(true);
    setDeliveries((prev) =>
      prev.map((d) => {
        if (d.status === "in_transit") {
          const jitter = (Math.random() - 0.5) * 0.005;
          return {
            ...d,
            position: {
              ...d.position,
              lat: d.position.lat + jitter,
              lng: d.position.lng + jitter,
              speed: 20 + Math.random() * 15,
              updatedAt: new Date().toISOString(),
            },
          };
        }
        return d;
      })
    );
    setLastRefresh(new Date());
    setTimeout(() => setRefreshing(false), 500);
  }, []);

  // Auto-refresh every 15 seconds
  useEffect(() => {
    const interval = setInterval(refreshPositions, 15_000);
    return () => clearInterval(interval);
  }, [refreshPositions]);

  const formatTime = (dateStr: string) =>
    new Date(dateStr).toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
    });

  const stats = {
    active: deliveries.filter(
      (d) => d.status === "in_transit" || d.status === "arriving"
    ).length,
    dispatched: deliveries.filter((d) => d.status === "dispatched").length,
    delivered: deliveries.filter((d) => d.status === "delivered").length,
  };

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 pt-0">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <h1 className="text-3xl font-bold tracking-tight">
            Delivery Tracking
          </h1>
          <p className="text-muted-foreground">
            Real-time GPS tracking for active deliveries.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground">
            Updated {formatTime(lastRefresh.toISOString())}
          </span>
          <Button
            disabled={refreshing}
            onClick={refreshPositions}
            size="sm"
            variant="outline"
          >
            <RefreshCw
              className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Active Deliveries
            </CardTitle>
            <Truck className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.active}</div>
            <p className="text-xs text-muted-foreground">
              Currently in transit
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Dispatched</CardTitle>
            <Package className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.dispatched}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Delivered Today
            </CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.delivered}</div>
          </CardContent>
        </Card>
      </div>

      {/* Map + List Layout */}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_380px]">
        {/* Map */}
        <Card className="overflow-hidden">
          <CardContent className="p-0">
            <div className="h-[500px]">
              <MiniMap deliveries={deliveries} />
            </div>
          </CardContent>
        </Card>

        {/* Delivery List */}
        <Card className="overflow-auto max-h-[500px]">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Active Deliveries</CardTitle>
            <CardDescription>Click a delivery for details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {deliveries.map((delivery) => {
              const config = STATUS_CONFIG[delivery.status];
              const Icon = config.icon;
              const isSelected = selectedId === delivery.id;

              return (
                <button
                  className={`w-full text-left rounded-lg border p-3 transition-colors ${
                    isSelected
                      ? "border-blue-300 bg-blue-50 dark:bg-blue-950/30"
                      : "hover:bg-accent"
                  }`}
                  key={delivery.id}
                  onClick={() => setSelectedId(isSelected ? null : delivery.id)}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Icon
                      className={`h-4 w-4 ${delivery.status === "in_transit" ? "text-blue-500" : delivery.status === "delivered" ? "text-green-500" : "text-gray-500"}`}
                    />
                    <span className="font-mono text-xs">
                      {delivery.shipmentNumber}
                    </span>
                    <Badge className={config.color}>{config.label}</Badge>
                  </div>
                  <p className="text-sm font-medium">{delivery.destination}</p>
                  <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                    <span>{delivery.driverName}</span>
                    <span>·</span>
                    <span>{delivery.items} items</span>
                    <span>·</span>
                    <span>ETA {formatTime(delivery.estimatedArrival)}</span>
                  </div>
                </button>
              );
            })}
          </CardContent>
        </Card>
      </div>

      {/* Selected Delivery Detail */}
      {selected && (
        <Card>
          <CardContent className="pt-6">
            <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_280px]">
              {/* Timeline */}
              <div>
                <h3 className="font-semibold mb-4">Delivery Timeline</h3>
                <DeliveryTimeline timeline={selected.timeline} />
              </div>

              {/* Driver & Vehicle Info */}
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold mb-3">Driver Info</h3>
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
                  <h3 className="font-semibold mb-3">Route</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-gray-400" />
                      <span className="text-muted-foreground">
                        {selected.origin}
                      </span>
                    </div>
                    <div className="ml-2 border-l-2 border-dashed h-4" />
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
                  <h3 className="font-semibold mb-3">Live Data</h3>
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
                      <span className="text-muted-foreground">Last update</span>
                      <span>{formatTime(selected.position.updatedAt)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
