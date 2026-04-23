"use client";

import { Skeleton } from "@repo/design-system/components/ui/skeleton";
import dynamic from "next/dynamic";

const ForecastsPageClient = dynamic(
  () =>
    import("./forecasts-page-client").then((mod) => ({
      default: mod.ForecastsPageClient,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="flex flex-1 flex-col gap-8 p-4 pt-0">
        <div className="space-y-0.5">
          <Skeleton className="h-9 w-64" />
          <Skeleton className="h-5 w-96" />
        </div>
        <Skeleton className="h-px w-full" />
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton className="h-32 w-full rounded-lg" key={i} />
          ))}
        </div>
      </div>
    ),
  }
);

const ForecastsPage = () => <ForecastsPageClient />;

export default ForecastsPage;
