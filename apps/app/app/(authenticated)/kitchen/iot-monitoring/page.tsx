/**
 * IoT Kitchen Monitoring Dashboard
 *
 * Real-time monitoring dashboard for kitchen equipment with IoT sensors.
 * Displays temperature readings, equipment status, and food safety alerts.
 *
 * @module IotMonitoringDashboard
 * @tags iot, monitoring, kitchen, dashboard
 */

import { Suspense } from "react";
import { IotMonitoringDashboardClient } from "./iot-monitoring-client";

export const metadata = {
  title: "IoT Kitchen Monitoring",
  description:
    "Real-time monitoring of kitchen equipment temperatures and food safety compliance",
};

export const dynamic = "force-dynamic";

export default function IotMonitoringPage() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            IoT Kitchen Monitoring
          </h1>
          <p className="text-muted-foreground">
            Real-time equipment monitoring and food safety compliance
          </p>
        </div>
      </div>

      <Suspense fallback={<IotMonitoringSkeleton />}>
        <IotMonitoringDashboardClient />
      </Suspense>
    </div>
  );
}

function IotMonitoringSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div className="h-32 bg-muted rounded-lg animate-pulse" key={i} />
        ))}
      </div>
      <div className="h-96 bg-muted rounded-lg animate-pulse" />
    </div>
  );
}
