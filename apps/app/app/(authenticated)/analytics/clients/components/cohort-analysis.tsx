"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/design-system/components/ui/table";
import { cn } from "@repo/design-system/lib/utils";

interface CohortAnalysisProps {
  data: Array<{
    cohort: string;
    month0: number;
    month1: number;
    month2: number;
    month3: number;
    month4: number;
    month5: number;
    month6: number;
    month7: number;
    month8: number;
    month9: number;
    month10: number;
    month11: number;
  }>;
  className?: string;
}

function getRetentionColor(value: number): string {
  if (value >= 80) {
    return "bg-emerald-500/90";
  }
  if (value >= 60) {
    return "bg-emerald-400/80";
  }
  if (value >= 40) {
    return "bg-emerald-300/70";
  }
  if (value >= 20) {
    return "bg-amber-300/60";
  }
  if (value > 0) {
    return "bg-amber-500/80";
  }
  return "bg-muted/50";
}

export function CohortAnalysis({ data, className }: CohortAnalysisProps) {
  const months = [
    "M0",
    "M1",
    "M2",
    "M3",
    "M4",
    "M5",
    "M6",
    "M7",
    "M8",
    "M9",
    "M10",
    "M11",
  ];

  return (
    <Card className={cn("", className)}>
      <CardHeader>
        <CardTitle>Cohort Analysis</CardTitle>
        <CardDescription>Client retention by acquisition month</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Cohort</TableHead>
              {months.map((month) => (
                <TableHead className="text-center px-1" key={month}>
                  {month}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((row) => (
              <TableRow key={row.cohort}>
                <TableCell className="font-medium">
                  {new Date(`${row.cohort}-01`).toLocaleDateString("en-US", {
                    month: "short",
                    year: "2-digit",
                  })}
                </TableCell>
                {months.map((_, index) => {
                  const value = row[
                    `month${index as 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11}` as keyof typeof row
                  ] as number;
                  return (
                    <TableCell className="py-1 px-0.5" key={index}>
                      <div
                        className={cn(
                          "h-8 w-full rounded text-center text-xs flex items-center justify-center text-white font-medium",
                          getRetentionColor(value)
                        )}
                      >
                        {value > 0 ? `${value.toFixed(0)}%` : "-"}
                      </div>
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <div className="h-3 w-3 rounded bg-emerald-500/90" />
            <span>80%+</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="h-3 w-3 rounded bg-emerald-300/70" />
            <span>40-79%</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="h-3 w-3 rounded bg-amber-500/80" />
            <span>&lt;40%</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
