import { SkeletonCardGrid } from "./components/skeleton-card";

/**
 * Loading state for the recipes listing page.
 * Shows a grid of skeleton cards while recipes are being fetched.
 */
export default function Loading() {
  return (
    <div className="flex flex-1 flex-col gap-6 p-4 pt-0">
      {/* Toolbar skeleton */}
      <div className="rounded-3xl border bg-card/80 p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            <div className="h-9 w-20 rounded-full bg-muted" />
            <div className="h-9 w-20 rounded-full bg-muted" />
            <div className="h-9 w-20 rounded-full bg-muted" />
            <div className="h-9 w-20 rounded-full bg-muted" />
            <div className="h-9 w-20 rounded-full bg-muted" />
          </div>
          <div className="h-9 w-28 rounded-full bg-muted" />
        </div>
      </div>

      {/* Recipe grid skeleton */}
      <div className="rounded-3xl border bg-muted/40 p-4">
        <SkeletonCardGrid count={12} />
      </div>
    </div>
  );
}
