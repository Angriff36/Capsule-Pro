import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/design-system/components/ui/table";
import type { QuarterlyMetrics } from "../lib/sales-analytics";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);

const formatPercent = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "percent",
    maximumFractionDigits: 0,
  }).format(value);

interface PricingSummaryTableProps {
  rows: QuarterlyMetrics["pricingSummary"];
}

function PricingSummaryTable({ rows }: PricingSummaryTableProps) {
  if (!rows.length) {
    return (
      <div className="text-sm text-muted-foreground">
        No pricing summary data.
      </div>
    );
  }
  const isPercentMetric = (metric: string) => {
    const normalized = metric.toLowerCase();
    return (
      normalized.includes("pct") ||
      normalized.includes("percent") ||
      normalized.includes("discount")
    );
  };

  return (
    <div className="overflow-x-auto rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Metric</TableHead>
            <TableHead className="text-right">Value</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.metric}>
              <TableCell className="font-medium">{row.metric}</TableCell>
              <TableCell className="text-right">
                {isPercentMetric(row.metric)
                  ? formatPercent(row.value)
                  : formatCurrency(row.value)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export { PricingSummaryTable };
