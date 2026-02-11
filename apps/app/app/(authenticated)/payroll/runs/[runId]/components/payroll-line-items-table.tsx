import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@repo/design-system/components/ui/avatar";
import { Badge } from "@repo/design-system/components/ui/badge";
import { Button } from "@repo/design-system/components/ui/button";
import { Card, CardContent } from "@repo/design-system/components/ui/card";
import { Input } from "@repo/design-system/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/design-system/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/design-system/components/ui/table";
import { SearchIcon, UserIcon } from "lucide-react";
import { useState } from "react";

interface PayrollLineItem {
  id: string;
  payrollRunId: string;
  employeeId: string;
  employeeFirstName: string | null;
  employeeLastName: string | null;
  employeeEmail: string;
  employeeRole: string;
  hoursRegular: number;
  hoursOvertime: number;
  rateRegular: number;
  rateOvertime: number;
  grossPay: number;
  deductions: Record<string, number>;
  netPay: number;
  createdAt: Date;
  updatedAt: Date;
}

interface PayrollLineItemsTableProps {
  lineItems: PayrollLineItem[];
  runId: string;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);
}

function formatHours(value: number) {
  const hours = Math.floor(value);
  const minutes = Math.round((value - hours) * 60);
  if (minutes === 0) {
    return `${hours}h`;
  }
  return `${hours}h ${minutes}m`;
}

function getEmployeeName(firstName: string | null, lastName: string | null) {
  return [firstName, lastName].filter(Boolean).join(" ") || "Unknown";
}

function getInitials(firstName: string | null, lastName: string | null) {
  return [firstName, lastName]
    .filter((n): n is string => Boolean(n))
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export default function PayrollLineItemsTable({
  lineItems,
  runId,
}: PayrollLineItemsTableProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<"name" | "netPay" | "grossPay">(
    "name"
  );
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  // Filter and sort line items
  const filteredItems = lineItems
    .filter((item) => {
      const searchLower = searchQuery.toLowerCase();
      const fullName = getEmployeeName(
        item.employeeFirstName,
        item.employeeLastName
      ).toLowerCase();
      const email = item.employeeEmail.toLowerCase();
      const role = item.employeeRole.toLowerCase();

      return (
        fullName.includes(searchLower) ||
        email.includes(searchLower) ||
        role.includes(searchLower)
      );
    })
    .sort((a, b) => {
      let comparison = 0;

      if (sortField === "name") {
        const nameA = getEmployeeName(
          a.employeeFirstName,
          a.employeeLastName
        );
        const nameB = getEmployeeName(
          b.employeeFirstName,
          b.employeeLastName
        );
        comparison = nameA.localeCompare(nameB);
      } else if (sortField === "netPay") {
        comparison = a.netPay - b.netPay;
      } else if (sortField === "grossPay") {
        comparison = a.grossPay - b.grossPay;
      }

      return sortOrder === "asc" ? comparison : -comparison;
    });

  const handleSort = (field: "name" | "netPay" | "grossPay") => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  const getTotalDeductions = (deductions: Record<string, number>) => {
    return Object.values(deductions).reduce((sum, val) => sum + val, 0);
  };

  return (
    <section>
      <h2 className="font-medium text-sm text-muted-foreground mb-4">
        Payroll Line Items ({filteredItems.length})
      </h2>
      <Card>
        <CardContent className="p-4">
          {/* Search and Filter */}
          <div className="flex flex-wrap items-center gap-4 mb-4">
            <div className="flex-1 min-w-[200px] relative">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search employees..."
                value={searchQuery}
                className="pl-9"
              />
            </div>

            <Select
              onValueChange={(value) =>
                handleSort(value as "name" | "netPay" | "grossPay")
              }
              value={sortField}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name">Employee Name</SelectItem>
                <SelectItem value="netPay">Net Pay</SelectItem>
                <SelectItem value="grossPay">Gross Pay</SelectItem>
              </SelectContent>
            </Select>

            <Button
              onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
              size="sm"
              variant="outline"
            >
              {sortOrder === "asc" ? "Ascending" : "Descending"}
            </Button>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead className="text-right">Regular Hours</TableHead>
                  <TableHead className="text-right">Overtime Hours</TableHead>
                  <TableHead className="text-right">Regular Rate</TableHead>
                  <TableHead className="text-right">OT Rate</TableHead>
                  <TableHead className="text-right">Gross Pay</TableHead>
                  <TableHead className="text-right">Deductions</TableHead>
                  <TableHead className="text-right">Net Pay</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems.length === 0 ? (
                  <TableRow>
                    <TableCell
                      className="text-center text-muted-foreground"
                      colSpan={8}
                    >
                      No line items found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredItems.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage
                              alt={getEmployeeName(
                                item.employeeFirstName,
                                item.employeeLastName
                              )}
                            />
                            <AvatarFallback>
                              {getInitials(
                                item.employeeFirstName,
                                item.employeeLastName
                              )}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium">
                              {getEmployeeName(
                                item.employeeFirstName,
                                item.employeeLastName
                              )}
                            </div>
                            <div className="text-muted-foreground text-xs">
                              {item.employeeRole}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        {formatHours(item.hoursRegular)}
                      </TableCell>
                      <TableCell className="text-right">
                        {item.hoursOvertime > 0 ? (
                          <Badge variant="secondary">
                            {formatHours(item.hoursOvertime)}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-sm">
                            —
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(item.rateRegular)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(item.rateOvertime)}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(item.grossPay)}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {formatCurrency(getTotalDeductions(item.deductions))}
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {formatCurrency(item.netPay)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Summary */}
          {filteredItems.length > 0 && (
            <div className="mt-4 pt-4 border-t">
              <div className="grid gap-4 md:grid-cols-4 text-sm">
                <div>
                  <span className="text-muted-foreground">
                    Total Employees:
                  </span>{" "}
                  <span className="font-medium">{filteredItems.length}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Total Gross:</span>{" "}
                  <span className="font-medium">
                    {formatCurrency(
                      filteredItems.reduce((sum, item) => sum + item.grossPay, 0)
                    )}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">
                    Total Deductions:
                  </span>{" "}
                  <span className="font-medium">
                    {formatCurrency(
                      filteredItems.reduce(
                        (sum, item) => sum + getTotalDeductions(item.deductions),
                        0
                      )
                    )}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Total Net:</span>{" "}
                  <span className="font-semibold">
                    {formatCurrency(
                      filteredItems.reduce((sum, item) => sum + item.netPay, 0)
                    )}
                  </span>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
