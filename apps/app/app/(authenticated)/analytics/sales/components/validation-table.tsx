import { Badge } from "@repo/design-system/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/design-system/components/ui/table";
import type { FunnelValidationResult } from "../lib/sales-analytics";

const formatNumber = (value: number) =>
  new Intl.NumberFormat("en-US").format(value);

const formatPercent = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "percent",
    maximumFractionDigits: 0,
  }).format(value);

const formatSignedNumber = (value: number) =>
  value >= 0 ? `+${formatNumber(value)}` : formatNumber(value);

const formatSignedPercent = (value: number) =>
  value >= 0 ? `+${formatPercent(value)}` : formatPercent(value);

interface ValidationTableProps {
  results: FunnelValidationResult[];
}

function ValidationTable({ results }: ValidationTableProps) {
  if (!results.length) {
    return <div className="text-sm text-muted-foreground">No results.</div>;
  }
  const isRateMetric = (metric: string) =>
    metric.toLowerCase().includes("ratio") ||
    metric.toLowerCase().includes("rate");

  const formatValidationValue = (value: number | null, metric: string) => {
    if (value === null) {
      return "-";
    }
    return isRateMetric(metric) ? formatPercent(value) : formatNumber(value);
  };

  const formatDelta = (value: number | null, metric: string) => {
    if (value === null) {
      return "-";
    }
    return isRateMetric(metric)
      ? formatSignedPercent(value)
      : formatSignedNumber(value);
  };

  const formatDeltaPct = (value: number | null) =>
    value === null ? "-" : formatSignedPercent(value);

  const statusVariant = (status: FunnelValidationResult["status"]) => {
    if (status === "Pass") {
      return "secondary" as const;
    }
    if (status === "Fail") {
      return "destructive" as const;
    }
    return "outline" as const;
  };

  return (
    <div className="overflow-x-auto rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Metric</TableHead>
            <TableHead className="text-right">Expected</TableHead>
            <TableHead className="text-right">Actual</TableHead>
            <TableHead className="text-right">Delta</TableHead>
            <TableHead className="text-right">Delta %</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {results.map((row) => (
            <TableRow key={row.metric}>
              <TableCell className="font-medium">{row.metric}</TableCell>
              <TableCell className="text-right">
                {formatValidationValue(row.expected, row.metric)}
              </TableCell>
              <TableCell className="text-right">
                {formatValidationValue(row.actual, row.metric)}
              </TableCell>
              <TableCell className="text-right">
                {formatDelta(row.delta, row.metric)}
              </TableCell>
              <TableCell className="text-right">
                {formatDeltaPct(row.delta_pct)}
              </TableCell>
              <TableCell>
                <Badge variant={statusVariant(row.status)}>{row.status}</Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export { ValidationTable };
export type { ValidationTableProps };
