'use client';

import { useState, useEffect } from 'react';
import {
  MapPin,
  Navigation,
  Truck,
  Clock,
  Route,
  Plus,
  Play,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

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
  draft: 'bg-gray-100 text-gray-700',
  optimized: 'bg-blue-100 text-blue-700',
  in_progress: 'bg-yellow-100 text-yellow-700',
  completed: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
};

const stopStatusColors: Record<string, string> = {
  pending: 'bg-gray-100 text-gray-600',
  in_transit: 'bg-blue-100 text-blue-600',
  arrived: 'bg-yellow-100 text-yellow-600',
  completed: 'bg-green-100 text-green-600',
  skipped: 'bg-red-100 text-red-600',
};

export function RoutesView() {
  const [routes, setRoutes] = useState<DeliveryRoute[]>([]);
  const [loading, setLoading] = useState(true);
  const [optimizing, setOptimizing] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('all');

  useEffect(() => {
    loadRoutes();
  }, []);

  const loadRoutes = async () => {
    try {
      const res = await fetch('/api/logistics/routes/list');
      const data = await res.json();
      setRoutes(data.routes || []);
    } catch (error) {
      console.error('Failed to load routes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOptimize = async (routeId: string) => {
    setOptimizing(routeId);
    try {
      const res = await fetch('/api/logistics/routes/commands/optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ routeId }),
      });
      const data = await res.json();
      if (data.route) {
        setRoutes((prev) =>
          prev.map((r) => (r.id === routeId ? data.route : r))
        );
      }
    } catch (error) {
      console.error('Failed to optimize route:', error);
    } finally {
      setOptimizing(null);
    }
  };

  const handleStartRoute = async (routeId: string) => {
    try {
      const res = await fetch('/api/logistics/routes/commands/update-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ routeId, status: 'in_progress' }),
      });
      const data = await res.json();
      if (data.route) {
        setRoutes((prev) =>
          prev.map((r) => (r.id === routeId ? { ...r, status: data.route.status } : r))
        );
      }
    } catch (error) {
      console.error('Failed to start route:', error);
    }
  };

  const handleCompleteRoute = async (routeId: string) => {
    try {
      const res = await fetch('/api/logistics/routes/commands/update-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ routeId, status: 'completed' }),
      });
      const data = await res.json();
      if (data.route) {
        setRoutes((prev) =>
          prev.map((r) => (r.id === routeId ? { ...r, status: data.route.status } : r))
        );
      }
    } catch (error) {
      console.error('Failed to complete route:', error);
    }
  };

  const filteredRoutes = routes.filter((route) => {
    if (activeTab === 'all') return true;
    return route.status === activeTab;
  });

  const formatDuration = (minutes: number | null) => {
    if (!minutes) return '--';
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
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          New Route
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all">All Routes</TabsTrigger>
          <TabsTrigger value="draft">Draft</TabsTrigger>
          <TabsTrigger value="optimized">Optimized</TabsTrigger>
          <TabsTrigger value="in_progress">In Progress</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="space-y-4">
          {filteredRoutes.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No routes found. Create a new route to get started.
              </CardContent>
            </Card>
          ) : (
            filteredRoutes.map((route) => (
              <Card key={route.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <Truck className="h-5 w-5" />
                      {route.routeNumber} - {route.name}
                    </CardTitle>
                    <Badge className={statusColors[route.status]}>
                      {route.status.replace('_', ' ')}
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
                          : 'Not scheduled'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Navigation className="h-4 w-4 text-muted-foreground" />
                      <span>{route.totalDistance || '--'} km</span>
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
                          key={stop.id}
                          className="flex items-center gap-3 p-2 rounded-lg bg-muted/50"
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
                    {route.status === 'draft' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOptimize(route.id)}
                        disabled={optimizing === route.id}
                      >
                        {optimizing === route.id ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Navigation className="mr-2 h-4 w-4" />
                        )}
                        Optimize
                      </Button>
                    )}
                    {route.status === 'optimized' && (
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => handleStartRoute(route.id)}
                      >
                        <Play className="mr-2 h-4 w-4" />
                        Start Route
                      </Button>
                    )}
                    {route.status === 'in_progress' && (
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => handleCompleteRoute(route.id)}
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
    </div>
  );
}
