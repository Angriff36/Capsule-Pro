import {
  PageCanvas,
  CommandBand,
  CommandBandHeader,
  CommandBandLede,
  DisplayHeading,
  MonoLabel,
  PageBody,
  OperationalColumn,
} from "@repo/design-system/components/blocks/page-shell";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";

export function SalesDashboardSkeleton() {
  return (
    <PageCanvas>
      <CommandBand>
        <CommandBandHeader>
          <div>
            <MonoLabel tone="dark">Analytics</MonoLabel>
            <DisplayHeading size="md">Sales Dashboard</DisplayHeading>
            <CommandBandLede>
              Upload a workbook to explore weekly, monthly, quarterly, and
              annual sales performance.
            </CommandBandLede>
          </div>
        </CommandBandHeader>
      </CommandBand>

      <PageBody>
        <OperationalColumn>
          <Card tone="canvas">
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
        </OperationalColumn>
      </PageBody>
    </PageCanvas>
  );
}
