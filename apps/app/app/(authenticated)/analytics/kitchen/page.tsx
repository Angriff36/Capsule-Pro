"use client";
import { Skeleton } from "@repo/design-system/components/ui/skeleton";
import dynamic from "next/dynamic";

const KitchenAnalyticsClient = dynamic(
  () => import("./kitchen-analytics-client"),
  {
    ssr: false,
    loading: () => (
      <div className="flex flex-1 flex-col gap-8 p-4 pt-0">
        <div className="space-y-0.5">
          <Skeleton className="h-9 w-64" />
          <Skeleton className="h-5 w-96" />
        </div>
        <Skeleton className="h-px w-full" />
        <div className="grid gap-6 lg:grid-cols-2">
          <Skeleton className="h-64 w-full rounded-lg" />
          <Skeleton className="h-64 w-full rounded-lg" />
        </div>
      </div>
    ),
  }
);

const KitchenAnalyticsPage = () => <KitchenAnalyticsClient />;

export default KitchenAnalyticsPage;
