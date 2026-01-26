import { AspectRatio } from "@repo/design-system/components/ui/aspect-ratio";
import { Card, CardHeader } from "@repo/design-system/components/ui/card";
import { Skeleton } from "@repo/design-system/components/ui/skeleton";

/**
 * Skeleton loading card that matches recipe card dimensions.
 * Uses shimmer animation via the design-system Skeleton component.
 */
export function SkeletonCard() {
  return (
    <Card className="overflow-hidden" data-testid="skeleton-card">
      <AspectRatio className="relative w-full" ratio={16 / 9}>
        <Skeleton className="h-full w-full rounded-none" />
      </AspectRatio>
      <CardHeader className="space-y-2">
        <Skeleton className="h-5 w-3/4" />
        <div className="flex flex-wrap items-center gap-2">
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-5 w-12 rounded-full" />
        </div>
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
      </CardHeader>
    </Card>
  );
}

/**
 * Grid of skeleton cards for loading state.
 * Matches the recipe grid layout (responsive columns).
 */
/** Pre-generated stable keys for skeleton cards (never reorders). */
const SKELETON_KEYS = Array.from({ length: 12 }, (_, i) => `skeleton-${i}`);

export function SkeletonCardGrid({ count = 6 }: { count?: number }) {
  return (
    <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
      {SKELETON_KEYS.slice(0, count).map((key) => (
        <SkeletonCard key={key} />
      ))}
    </section>
  );
}
