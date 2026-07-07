import { SkeletonCardGrid } from "./components/skeleton-card";
import { OperationalPageShell } from "../../../components/operational-page-shell";

/**
 * Loading state for the recipes listing page.
 * Shows a grid of skeleton cards while recipes are being fetched.
 */
export default function Loading() {
  return (
    <OperationalPageShell
      description="Loading recipes…"
      eyebrow="Kitchen / Recipes"
      title="Recipes"
      withCanvas={false}
    >
      {/* Toolbar skeleton */}
      <div className="rounded-3xl border bg-card/80 p-4">
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
    </OperationalPageShell>
  );
}
