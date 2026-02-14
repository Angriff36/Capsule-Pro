import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/design-system/components/ui/table";
import type { CellValue, DataRow } from "../lib/sales-analytics";

const formatNumber = (value: number) =>
  new Intl.NumberFormat("en-US").format(value);

const formatCellValue = (value: unknown) => {
  if (value instanceof Date) {
    return value.toLocaleDateString();
  }
  if (typeof value === "number") {
    return formatNumber(value);
  }
  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }
  return value ? String(value) : "-";
};

const getColumnsFromRows = (rows: DataRow[]) => {
  const columns = new Set<string>();
  for (const row of rows) {
    for (const key of Object.keys(row)) {
      columns.add(key);
    }
  }
  return Array.from(columns);
};

interface DataTableProps {
  rows: DataRow[];
  columns?: string[];
  maxRows?: number;
  emptyText?: string;
}

function DataTable({
  rows,
  columns,
  maxRows = 8,
  emptyText = "No data available.",
}: DataTableProps) {
  const previewRows = rows.slice(0, maxRows);
  const resolvedColumns = columns ?? getColumnsFromRows(previewRows);
  const displayColumns = resolvedColumns.slice(0, 6);
  if (!(previewRows.length && displayColumns.length)) {
    return <div className="text-sm text-muted-foreground">{emptyText}</div>;
  }
  const isNumericColumn = (column: string) =>
    previewRows.some((row) => typeof row[column] === "number");

  return (
    <div className="overflow-x-auto rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            {displayColumns.map((column) => (
              <TableHead
                className={isNumericColumn(column) ? "text-right" : undefined}
                key={column}
              >
                {column}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {previewRows.map((row, rowIndex) => (
            <TableRow key={`row-${rowIndex}`}>
              {displayColumns.map((column) => (
                <TableCell
                  className={isNumericColumn(column) ? "text-right" : undefined}
                  key={`${rowIndex}-${column}`}
                >
                  {formatCellValue(row[column])}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export { DataTable, formatCellValue, formatNumber, getColumnsFromRows };
export type { DataTableProps };
