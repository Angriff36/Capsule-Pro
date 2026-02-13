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

const formatNumber = (value: number) =>
  new Intl.NumberFormat("en-US").format(value);

interface SegmentSummaryTableProps {
  rows: QuarterlyMetrics["segmentSummary"];
}

function SegmentSummaryTable({ rows }: SegmentSummaryTableProps) {
  if (!rows.length) {
    return (
      <div className="text-sm text-muted-foreground">No segment data.</div>
    );
  }
  const displayRows = rows.slice(0, 12);
  return (
    <div className="overflow-x-auto rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Event Type</TableHead>
            <TableHead>Size Bucket</TableHead>
            <TableHead>Budget Tier</TableHead>
            <TableHead className="text-right">Count</TableHead>
            <TableHead className="text-right">Revenue</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {displayRows.map((row, index) => (
            <TableRow key={`${row.event_type}-${index}`}>
              <TableCell className="font-medium">{row.event_type}</TableCell>
              <TableCell>{row.size_bucket}</TableCell>
              <TableCell>{row.budget_tier}</TableCell>
              <TableCell className="text-right">
                {formatNumber(row.count)}
              </TableCell>
              <TableCell className="text-right">
                {formatCurrency(row.revenue)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export { SegmentSummaryTable };
