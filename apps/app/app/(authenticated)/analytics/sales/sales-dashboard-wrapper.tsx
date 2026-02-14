"use client";

import dynamic from "next/dynamic";
import { Suspense } from "react";
import { SalesDashboardSkeleton } from "./sales-dashboard-skeleton";

// Lazy load the sales dashboard to keep heavy libraries (@react-pdf/renderer, xlsx, recharts)
// out of the initial bundle. SSR is disabled because the dashboard uses browser-only
// libraries and provides no meaningful SEO value.
const SalesDashboardClient = dynamic(
  () =>
    import("./sales-dashboard-client").then((m) => ({
      default: m.SalesDashboardClient,
    })),
  { ssr: false }
);

export function SalesDashboardWrapper() {
  return (
    <Suspense fallback={<SalesDashboardSkeleton />}>
      <SalesDashboardClient />
    </Suspense>
  );
}
