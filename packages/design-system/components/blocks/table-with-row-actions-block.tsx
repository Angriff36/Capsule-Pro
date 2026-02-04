"use client";

import { MoreHorizontal } from "lucide-react";

import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";

/**
 * TableWithRowActionsBlock - A table with row actions component block
 */
export function TableWithRowActionsBlock() {
  const rows = [
    {
      id: "INV-1042",
      customer: "Brightwell Media",
      status: "Paid",
      amount: "$3,250.00",
      updated: "Jan 28, 2026",
    },
    {
      id: "INV-1041",
      customer: "Atlas Freight",
      status: "Processing",
      amount: "$1,920.00",
      updated: "Jan 27, 2026",
    },
    {
      id: "INV-1039",
      customer: "Northwind Logistics",
      status: "Overdue",
      amount: "$4,870.00",
      updated: "Jan 24, 2026",
    },
    {
      id: "INV-1035",
      customer: "Silverline Health",
      status: "Draft",
      amount: "$980.00",
      updated: "Jan 22, 2026",
    },
  ];

  const statusTone: Record<string, "default" | "secondary" | "destructive"> = {
    Paid: "secondary",
    Processing: "default",
    Overdue: "destructive",
    Draft: "secondary",
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Invoices</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Invoice</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead className="text-right">Updated</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell className="font-medium">{row.id}</TableCell>
                <TableCell>{row.customer}</TableCell>
                <TableCell>
                  <Badge variant={statusTone[row.status]}>{row.status}</Badge>
                </TableCell>
                <TableCell className="text-right">{row.amount}</TableCell>
                <TableCell className="text-right">{row.updated}</TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size="icon" variant="ghost">
                        <MoreHorizontal />
                        <span className="sr-only">Open menu</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      <DropdownMenuItem>View details</DropdownMenuItem>
                      <DropdownMenuItem>Duplicate</DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem variant="destructive">
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
