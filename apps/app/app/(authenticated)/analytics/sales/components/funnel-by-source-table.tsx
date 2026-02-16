import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/design-system/components/ui/table";
import type { QuarterlyMetrics } from "../lib/sales-analytics";

const formatNumber = (value: number) =>
  new Intl.NumberFormat("en-US").format(value);

const formatPercent = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "percent",
    maximumFractionDigits: 0,
  }).format(value);

interface FunnelBySourceTableProps {
  rows: QuarterlyMetrics["funnelBySource"];
}

function FunnelBySourceTable({ rows }: FunnelBySourceTableProps) {
  if (!rows.length) {
    return <div className="text-sm text-muted-foreground">No funnel data.</div>;
  }
  return (
    <div className="overflow-x-auto rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Lead Source</TableHead>
            <TableHead className="text-right">Inquiries</TableHead>
            <TableHead className="text-right">Qualified</TableHead>
            <TableHead className="text-right">Proposals</TableHead>
            <TableHead className="text-right">Won</TableHead>
            <TableHead className="text-right">Lost</TableHead>
            <TableHead className="text-right">Proposal Rate</TableHead>
            <TableHead className="text-right">Win Rate</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.lead_source}>
              <TableCell className="font-medium">{row.lead_source}</TableCell>
              <TableCell className="text-right">
                {formatNumber(row.Inquiries)}
              </TableCell>
              <TableCell className="text-right">
                {formatNumber(row.qualified)}
              </TableCell>
              <TableCell className="text-right">
                {formatNumber(row.proposals)}
              </TableCell>
              <TableCell className="text-right">
                {formatNumber(row.won)}
              </TableCell>
              <TableCell className="text-right">
                {formatNumber(row.lost)}
              </TableCell>
              <TableCell className="text-right">
                {formatPercent(row.proposal_rate)}
              </TableCell>
              <TableCell className="text-right">
                {formatPercent(row.win_rate)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export { FunnelBySourceTable };
