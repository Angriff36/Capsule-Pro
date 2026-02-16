import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/design-system/components/ui/table";
import type { PeriodSummary } from "../lib/sales-analytics";

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

const formatNumber = (value: number) =>
  new Intl.NumberFormat("en-US").format(value);

interface ComparisonTableProps {
  summaries: PeriodSummary[];
}

function ComparisonTable({ summaries }: ComparisonTableProps) {
  return (
    <div className="overflow-x-auto rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Period</TableHead>
            <TableHead className="text-right">Leads</TableHead>
            <TableHead className="text-right">Qualified</TableHead>
            <TableHead className="text-right">Proposals</TableHead>
            <TableHead className="text-right">Won</TableHead>
            <TableHead className="text-right">Close Rate</TableHead>
            <TableHead className="text-right">Revenue</TableHead>
            <TableHead className="text-right">Events</TableHead>
            <TableHead className="text-right">Avg Event</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {summaries.map((summary) => (
            <TableRow key={summary.label}>
              <TableCell className="font-medium">{summary.label}</TableCell>
              <TableCell className="text-right">
                {formatNumber(summary.leadsReceived)}
              </TableCell>
              <TableCell className="text-right">
                {formatNumber(summary.qualifiedLeads)}
              </TableCell>
              <TableCell className="text-right">
                {formatNumber(summary.proposalsSent)}
              </TableCell>
              <TableCell className="text-right">
                {formatNumber(summary.eventsWon)}
              </TableCell>
              <TableCell className="text-right">
                {formatPercent(summary.closingRatio)}
              </TableCell>
              <TableCell className="text-right">
                {formatCurrency(summary.revenue)}
              </TableCell>
              <TableCell className="text-right">
                {formatNumber(summary.eventsClosed)}
              </TableCell>
              <TableCell className="text-right">
                {formatCurrency(summary.averageEventValue)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export { ComparisonTable };
export type { ComparisonTableProps };
