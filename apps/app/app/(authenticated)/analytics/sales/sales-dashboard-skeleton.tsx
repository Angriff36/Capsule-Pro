import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";
import { Separator } from "@repo/design-system/components/ui/separator";

export function SalesDashboardSkeleton() {
  return (
    <div className="flex flex-1 flex-col gap-8 p-4 pt-0">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight">Sales Dashboard</h1>
        <p className="text-muted-foreground">
          Upload a workbook to explore weekly, monthly, quarterly, and annual
          sales performance.
        </p>
      </div>

      <Separator />

      <Card>
        <CardHeader>
          <CardTitle>Upload Workbook</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="h-10 w-full animate-pulse rounded bg-muted" />
          <div className="h-4 w-48 animate-pulse rounded bg-muted" />
        </CardContent>
      </Card>

      <div className="space-y-4">
        <div className="h-32 animate-pulse rounded-lg bg-muted" />
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="h-64 animate-pulse rounded-lg bg-muted" />
          <div className="h-64 animate-pulse rounded-lg bg-muted" />
        </div>
      </div>
    </div>
  );
}
