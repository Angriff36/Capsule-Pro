import {
  Car,
  LayoutGrid,
  MapPin,
  Package,
  Route,
  Truck,
  User,
} from "lucide-react";
import Link from "next/link";

const LogisticsPage = () => (
  <div className="flex flex-1 flex-col gap-8 p-4 pt-0">
    {/* Page Header */}
    <div className="space-y-0.5">
      <h1 className="text-3xl font-bold tracking-tight">Logistics</h1>
      <p className="text-muted-foreground">
        Manage deliveries, shipments, routes, drivers, and vehicles for catering
        operations.
      </p>
    </div>

    {/* Quick Access Cards */}
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      <Link href="/logistics/dispatch">
        <div className="group rounded-lg border bg-card p-6 transition-colors hover:bg-accent cursor-pointer">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400">
              <LayoutGrid className="h-5 w-5" />
            </div>
            <h3 className="font-semibold">Dispatch</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            Assign drivers to routes and track today&apos;s deliveries.
          </p>
        </div>
      </Link>

      <Link href="/logistics/tracking">
        <div className="group rounded-lg border bg-card p-6 transition-colors hover:bg-accent cursor-pointer">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-400">
              <MapPin className="h-5 w-5" />
            </div>
            <h3 className="font-semibold">Live Tracking</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            Real-time GPS tracking for active deliveries.
          </p>
        </div>
      </Link>

      <Link href="/logistics/shipments">
        <div className="group rounded-lg border bg-card p-6 transition-colors hover:bg-accent cursor-pointer">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-400">
              <Package className="h-5 w-5" />
            </div>
            <h3 className="font-semibold">Shipments</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            Track incoming and outgoing shipments, manage delivery status.
          </p>
        </div>
      </Link>

      <Link href="/logistics/routes">
        <div className="group rounded-lg border bg-card p-6 transition-colors hover:bg-accent cursor-pointer">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400">
              <Route className="h-5 w-5" />
            </div>
            <h3 className="font-semibold">Delivery Routes</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            Optimize multi-stop delivery routes for events.
          </p>
        </div>
      </Link>

      <Link href="/logistics/drivers">
        <div className="group rounded-lg border bg-card p-6 transition-colors hover:bg-accent cursor-pointer">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100 text-purple-600 dark:bg-purple-950 dark:text-purple-400">
              <User className="h-5 w-5" />
            </div>
            <h3 className="font-semibold">Drivers</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            Manage delivery drivers and vehicle assignments.
          </p>
        </div>
      </Link>

      <Link href="/logistics/vehicles">
        <div className="group rounded-lg border bg-card p-6 transition-colors hover:bg-accent cursor-pointer">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-100 text-cyan-600 dark:bg-cyan-950 dark:text-cyan-400">
              <Car className="h-5 w-5" />
            </div>
            <h3 className="font-semibold">Vehicles</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            Manage your delivery fleet and maintenance.
          </p>
        </div>
      </Link>

      <Link href="/inventory/levels">
        <div className="group rounded-lg border bg-card p-6 transition-colors hover:bg-accent cursor-pointer">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 text-amber-600 dark:bg-amber-950 dark:text-amber-400">
              <Truck className="h-5 w-5" />
            </div>
            <h3 className="font-semibold">Inventory Transfers</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            Transfer stock between locations and venues.
          </p>
        </div>
      </Link>
    </div>
  </div>
);

export default LogisticsPage;
