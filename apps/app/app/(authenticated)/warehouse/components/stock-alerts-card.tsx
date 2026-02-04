import { Badge } from "@repo/design-system/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";
import { Progress } from "@repo/design-system/components/ui/progress";
import {
  AlertTriangleIcon,
  PackageXIcon,
  TrendingDownIcon,
} from "lucide-react";
import Link from "next/link";
import {
  type StockHealthStatus,
  stockHealthBadgeVariants,
} from "../lib/inventory-status";

interface AlertItem {
  id: string;
  name: string;
  itemNumber: string;
  category: string;
  quantityOnHand: number;
  reorderLevel: number;
  status: StockHealthStatus;
}

interface StockAlertsCardProps {
  alerts: AlertItem[];
  maxItems?: number;
}

function getAlertIcon(status: StockHealthStatus) {
  switch (status) {
    case "out_of_stock":
      return <PackageXIcon className="size-4 text-destructive" />;
    case "critical":
      return <AlertTriangleIcon className="size-4 text-destructive" />;
    default:
      return <TrendingDownIcon className="size-4 text-amber-500" />;
  }
}

export function StockAlertsCard({
  alerts,
  maxItems = 5,
}: StockAlertsCardProps) {
  const displayAlerts = alerts.slice(0, maxItems);
  const criticalCount = alerts.filter(
    (a) => a.status === "critical" || a.status === "out_of_stock"
  ).length;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Stock Alerts</CardTitle>
          {criticalCount > 0 && (
            <Badge className="text-xs" variant="destructive">
              {criticalCount} critical
            </Badge>
          )}
        </div>
        <CardDescription className="text-xs">
          Items requiring attention
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {displayAlerts.length > 0 ? (
          displayAlerts.map((item) => (
            <Link
              className="group block"
              href={`/inventory/items?highlight=${item.id}`}
              key={item.id}
            >
              <div className="flex items-start justify-between gap-2 rounded-md border p-2 transition hover:bg-muted/50">
                <div className="flex items-start gap-2 min-w-0">
                  {getAlertIcon(item.status)}
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate group-hover:text-primary">
                      {item.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {item.itemNumber}
                    </p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <Badge
                    className="text-xs whitespace-nowrap"
                    variant={stockHealthBadgeVariants[item.status]}
                  >
                    {item.quantityOnHand} / {item.reorderLevel}
                  </Badge>
                  <Progress
                    className="h-1 w-12"
                    value={Math.min(
                      (item.quantityOnHand / item.reorderLevel) * 100,
                      100
                    )}
                  />
                </div>
              </div>
            </Link>
          ))
        ) : (
          <div className="py-4 text-center text-sm text-muted-foreground">
            No stock alerts
          </div>
        )}
        {alerts.length > maxItems && (
          <Link
            className="block text-center text-xs text-muted-foreground hover:text-primary"
            href="/inventory/items?filter=low_stock"
          >
            View all {alerts.length} alerts
          </Link>
        )}
      </CardContent>
    </Card>
  );
}
