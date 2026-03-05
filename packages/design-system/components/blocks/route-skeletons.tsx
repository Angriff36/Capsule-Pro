import { Card, CardContent, CardHeader } from "../ui/card";
import { Skeleton } from "../ui/skeleton";

/**
 * Skeleton variants for different page types.
 */
export type RouteSkeletonVariant =
  | "dashboard"
  | "table"
  | "grid"
  | "form"
  | "details";

/**
 * Page header skeleton with title and description.
 */
function PageHeaderSkeleton() {
  return (
    <div className="space-y-2">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-4 w-96" />
    </div>
  );
}

/**
 * Metric card skeleton for dashboard pages.
 */
function MetricCardSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-7 w-32 mt-2" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-3 w-40" />
      </CardContent>
    </Card>
  );
}

/**
 * Table row skeleton for list/table pages.
 */
function TableRowSkeleton({ columns = 5 }: { columns?: number }) {
  return (
    <div className="flex gap-4 border-b py-3 px-4">
      {Array.from({ length: columns }).map((_, i) => (
        <Skeleton
          className="h-4 flex-1"
          key={i}
          style={{ maxWidth: i === 0 ? "30%" : undefined }}
        />
      ))}
    </div>
  );
}

/**
 * Table skeleton with header and multiple rows.
 */
export function TableSkeleton({
  rows = 8,
  columns = 5,
}: {
  rows?: number;
  columns?: number;
} = {}) {
  return (
    <Card>
      <CardContent className="p-0">
        <div className="border-b py-3 px-4 bg-muted/30">
          <Skeleton className="h-4 w-24" />
        </div>
        {Array.from({ length: rows }).map((_, i) => (
          <TableRowSkeleton columns={columns} key={i} />
        ))}
      </CardContent>
    </Card>
  );
}

/**
 * Dashboard page skeleton with metrics and sections.
 */
export function DashboardSkeleton() {
  return (
    <div className="flex flex-1 flex-col gap-6 p-4 pt-0">
      <PageHeaderSkeleton />
      <div className="grid gap-4 md:grid-cols-3">
        <MetricCardSkeleton />
        <MetricCardSkeleton />
        <MetricCardSkeleton />
      </div>
      <TableSkeleton columns={4} rows={6} />
    </div>
  );
}

/**
 * Grid card skeleton for card-based layouts.
 */
function GridCardSkeleton() {
  return (
    <Card className="overflow-hidden">
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
 * Grid skeleton for card-based pages.
 */
export function GridSkeleton({ count = 8 }: { count?: number } = {}) {
  return (
    <div className="flex flex-1 flex-col gap-6 p-4 pt-0">
      <PageHeaderSkeleton />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
        {Array.from({ length: count }).map((_, i) => (
          <GridCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

/**
 * Form skeleton for create/edit pages.
 */
export function FormSkeleton() {
  return (
    <div className="flex flex-1 flex-col gap-6 p-4 pt-0">
      <PageHeaderSkeleton />
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-64 mt-1" />
        </CardHeader>
        <CardContent className="space-y-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div className="space-y-2" key={i}>
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-10 w-full" />
            </div>
          ))}
          <div className="flex gap-2 pt-4">
            <Skeleton className="h-10 w-24" />
            <Skeleton className="h-10 w-16" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Details page skeleton with header and content sections.
 */
export function DetailsSkeleton() {
  return (
    <div className="flex flex-1 flex-col gap-6 p-4 pt-0">
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <Skeleton className="h-7 w-64" />
              <Skeleton className="h-4 w-96" />
            </div>
            <div className="flex gap-2">
              <Skeleton className="h-9 w-24" />
              <Skeleton className="h-9 w-16" />
            </div>
          </div>
        </CardHeader>
      </Card>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader>
              <Skeleton className="h-5 w-32" />
            </CardHeader>
            <CardContent className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div className="flex justify-between" key={i}>
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-4 w-32" />
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <Skeleton className="h-5 w-24" />
            </CardHeader>
            <CardContent className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton className="h-14 w-full" key={i} />
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
