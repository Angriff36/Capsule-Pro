"use client";

import { Skeleton } from "@repo/design-system/components/ui/skeleton";
import dynamic from "next/dynamic";

/**
 * Lazy-loaded AIInsightsPanel with skeleton loader.
 *
 * This component is below-the-fold content that includes AI-powered features
 * like executive summary, task breakdown, suggestions, and prep tasks.
 * Lazy loading reduces initial bundle size and improves page load performance.
 *
 * The skeleton matches the two-column grid layout of AIInsightsPanel:
 * - Left column: Executive Summary, Task Breakdown
 * - Right column: Suggestions, Prep Tasks, Budget
 */
const AIInsightsPanel = dynamic(
  () => import("./ai-insights-panel").then((mod) => mod.AIInsightsPanel),
  {
    loading: () => <AIInsightsPanelSkeleton />,
    ssr: true,
  }
);

export { AIInsightsPanel };

/**
 * Skeleton loader for AIInsightsPanel.
 *
 * Displays a grid of skeleton elements matching the actual component layout
 * to prevent layout shift during lazy loading.
 */
function AIInsightsPanelSkeleton() {
  return (
    <section>
      <div className="mb-4 flex items-center gap-2">
        <Skeleton className="h-4 w-24" />
      </div>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)]">
        {/* Left column: Executive Summary + Task Breakdown */}
        <div className="space-y-6">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-9 w-36" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-4 w-4/6" />
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-9 w-48" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-20 w-full rounded-lg" />
              <Skeleton className="h-20 w-full rounded-lg" />
            </div>
          </div>
        </div>

        {/* Right column: Suggestions + Prep Tasks + Budget */}
        <div className="space-y-6">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Skeleton className="h-5 w-28" />
              <Skeleton className="h-9 w-40" />
            </div>
            <div className="rounded-lg border p-4">
              <Skeleton className="h-16 w-full" />
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Skeleton className="h-5 w-24" />
            </div>
            <Skeleton className="h-16 w-full rounded-lg border p-4" />
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Skeleton className="h-5 w-28" />
            </div>
            <Skeleton className="h-32 w-full rounded-lg border p-4" />
          </div>
        </div>
      </div>
    </section>
  );
}
