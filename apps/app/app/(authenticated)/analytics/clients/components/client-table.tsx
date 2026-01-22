"use client";

import { Badge } from "@repo/design-system/components/ui/badge";
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

type ClientTableProps = {
  clients: Array<{
    id: string;
    name: string;
    email: string | null;
    lifetimeValue: number;
    orderCount: number;
    lastOrderDate: Date | null;
    averageOrderValue: number;
  }>;
  className?: string;
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);

const formatDate = (date: Date | null) =>
  date
    ? new Date(date).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "-";

export function ClientTable({ clients, className }: ClientTableProps) {
  const getBadgeVariant = (index: number) => {
    if (index === 0) return "default";
    if (index === 1) return "secondary";
    return "outline";
  };

  return (
    <Card className={cn("", className)}>
      <CardHeader>
        <CardTitle>Top Clients by LTV</CardTitle>
        <CardDescription>Highest lifetime value clients</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Client</TableHead>
                <TableHead className="text-right">Orders</TableHead>
                <TableHead className="text-right">LTV</TableHead>
                <TableHead className="text-right">AOV</TableHead>
                <TableHead>Last Order</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clients.length === 0 ? (
                <TableRow>
                  <TableCell
                    className="text-center text-muted-foreground"
                    colSpan={5}
                  >
                    No client data available
                  </TableCell>
                </TableRow>
              ) : (
                clients.map((client, index) => (
                  <TableRow key={client.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{client.name}</span>
                        {index < 3 && (
                          <Badge
                            className="text-xs"
                            variant={getBadgeVariant(index)}
                          >
                            #{index + 1}
                          </Badge>
                        )}
                      </div>
                      {client.email && (
                        <span className="text-xs text-muted-foreground">
                          {client.email}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {client.orderCount}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(client.lifetimeValue)}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {formatCurrency(client.averageOrderValue)}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {formatDate(client.lastOrderDate)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
