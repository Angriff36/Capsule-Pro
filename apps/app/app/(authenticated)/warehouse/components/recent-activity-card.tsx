import { Badge } from "@repo/design-system/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  MinusIcon,
  PackageIcon,
  RotateCcwIcon,
} from "lucide-react";

type Transaction = {
  id: string;
  itemName: string;
  transactionType: string;
  quantity: number;
  transactionDate: Date;
  reference: string | null;
};

type RecentActivityCardProps = {
  transactions: Transaction[];
  maxItems?: number;
};

function getTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60_000);
  if (diffMins < 60) {
    return `${diffMins}m ago`;
  }
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

function getTransactionIcon(type: string) {
  switch (type.toLowerCase()) {
    case "receipt":
    case "inbound":
      return <ArrowDownIcon className="size-4 text-green-500" />;
    case "issue":
    case "outbound":
    case "consumption":
      return <ArrowUpIcon className="size-4 text-red-500" />;
    case "adjustment":
      return <MinusIcon className="size-4 text-amber-500" />;
    case "transfer":
      return <RotateCcwIcon className="size-4 text-blue-500" />;
    default:
      return <PackageIcon className="size-4 text-muted-foreground" />;
  }
}

function getTransactionBadgeVariant(
  type: string
): "default" | "secondary" | "destructive" | "outline" {
  switch (type.toLowerCase()) {
    case "receipt":
    case "inbound":
      return "default";
    case "issue":
    case "outbound":
    case "consumption":
      return "destructive";
    case "adjustment":
      return "secondary";
    default:
      return "outline";
  }
}

function formatQuantity(type: string, quantity: number): string {
  const isInbound =
    type.toLowerCase() === "receipt" || type.toLowerCase() === "inbound";
  const sign = isInbound ? "+" : "-";
  return `${sign}${Math.abs(quantity).toLocaleString()}`;
}

export function RecentActivityCard({
  transactions,
  maxItems = 6,
}: RecentActivityCardProps) {
  const displayTransactions = transactions.slice(0, maxItems);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Recent Activity</CardTitle>
        <CardDescription className="text-xs">
          Latest inventory movements
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {displayTransactions.length > 0 ? (
          displayTransactions.map((tx) => (
            <div
              className="flex items-center justify-between gap-2 rounded-md border-b border-dashed py-2 last:border-0"
              key={tx.id}
            >
              <div className="flex items-center gap-2 min-w-0">
                {getTransactionIcon(tx.transactionType)}
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{tx.itemName}</p>
                  <p className="text-xs text-muted-foreground">
                    {tx.reference ?? "No reference"}
                  </p>
                </div>
              </div>
              <div className="flex flex-col items-end gap-1">
                <Badge
                  className="text-xs font-mono"
                  variant={getTransactionBadgeVariant(tx.transactionType)}
                >
                  {formatQuantity(tx.transactionType, tx.quantity)}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {getTimeAgo(tx.transactionDate)}
                </span>
              </div>
            </div>
          ))
        ) : (
          <div className="py-4 text-center text-sm text-muted-foreground">
            No recent activity
          </div>
        )}
      </CardContent>
    </Card>
  );
}
