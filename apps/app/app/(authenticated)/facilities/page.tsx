"use client";

import Link from "next/link";
import { Wrench, Calendar, MapPin, Package } from "lucide-react";
import { Card, CardContent } from "@repo/design-system/components/ui/card";
import { UpcomingMaintenanceWidget } from "./components/upcoming-maintenance-widget";

export default function FacilitiesPage() {
  return (
    <div className="flex flex-1 flex-col gap-8 p-4 pt-0">
      <div className="space-y-0.5">
        <h1 className="text-3xl font-bold tracking-tight">Facilities</h1>
        <p className="text-muted-foreground">
          Maintenance scheduling, work orders, and facility management.
        </p>
      </div>

      {/* Upcoming Maintenance Widget */}
      <UpcomingMaintenanceWidget />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Link href="/facilities/work-orders">
          <div className="group rounded-lg border bg-card p-6 transition-colors hover:bg-accent cursor-pointer">
            <div className="flex items-center gap-3 mb-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 text-amber-600 dark:bg-amber-950 dark:text-amber-400">
                <Wrench className="h-5 w-5" />
              </div>
              <h3 className="font-semibold">Work Orders</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              Report issues, track repairs, and manage maintenance tasks.
            </p>
          </div>
        </Link>

        <Link href="/facilities/schedules">
          <div className="group rounded-lg border bg-card p-6 transition-colors hover:bg-accent cursor-pointer">
            <div className="flex items-center gap-3 mb-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-400">
                <Calendar className="h-5 w-5" />
              </div>
              <h3 className="font-semibold">PM Schedules</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              Preventive maintenance scheduling with calendar view.
            </p>
          </div>
        </Link>

        <Link href="/facilities/areas">
          <div className="group rounded-lg border bg-card p-6 transition-colors hover:bg-accent cursor-pointer">
            <div className="flex items-center gap-3 mb-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400">
                <MapPin className="h-5 w-5" />
              </div>
              <h3 className="font-semibold">Areas</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              Define and manage areas within your facility.
            </p>
          </div>
        </Link>

        <Link href="/facilities/assets">
          <div className="group rounded-lg border bg-card p-6 transition-colors hover:bg-accent cursor-pointer">
            <div className="flex items-center gap-3 mb-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100 text-purple-600 dark:bg-purple-950 dark:text-purple-400">
                <Package className="h-5 w-5" />
              </div>
              <h3 className="font-semibold">Assets</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              Track equipment, warranties, and maintenance needs.
            </p>
          </div>
        </Link>
      </div>
    </div>
  );
}
