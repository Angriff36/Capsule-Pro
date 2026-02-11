import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";
import { Separator } from "@repo/design-system/components/ui/separator";
import { CalendarIcon, DollarSignIcon, UsersIcon } from "lucide-react";

type PayrollRunStatus =
  | "pending"
  | "processing"
  | "completed"
  | "approved"
  | "paid"
  | "failed";

interface PayrollRun {
  id: string;
  tenantId: string;
  payrollPeriodId: string;
  runDate: Date;
  status: PayrollRunStatus;
  totalGross: number;
  totalDeductions: number;
  totalNet: number;
  approvedBy: string | null;
  approvedAt: Date | null;
  paidAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  periodStart: Date | null;
  periodEnd: Date | null;
  employeeCount: number;
}

interface PayrollRunDetailsProps {
  run: PayrollRun;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);
}

function formatDate(date: Date | null) {
  if (!date) {
    return "N/A";
  }
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

export default function PayrollRunDetails({ run }: PayrollRunDetailsProps) {
  return (
    <section>
      <h2 className="font-medium text-sm text-muted-foreground mb-4">
        Payroll Run Summary
      </h2>
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Financial Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Financial Summary</CardTitle>
            <CardDescription>Total payroll amounts</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground text-sm">Gross Pay</span>
                <DollarSignIcon className="h-4 w-4 text-muted-foreground" />
              </div>
              <p className="font-semibold text-2xl">
                {formatCurrency(run.totalGross)}
              </p>
            </div>
            <Separator />
            <div className="space-y-1">
              <span className="text-muted-foreground text-sm">Deductions</span>
              <p className="font-medium text-lg">
                {formatCurrency(run.totalDeductions)}
              </p>
            </div>
            <Separator />
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Net Pay</span>
                <DollarSignIcon className="h-4 w-4 text-green-600" />
              </div>
              <p className="font-bold text-2xl text-green-600">
                {formatCurrency(run.totalNet)}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Period Information */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Period Information</CardTitle>
            <CardDescription>Payroll period dates</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground text-sm">
                  Period Start
                </span>
              </div>
              <p className="font-medium text-lg">
                {formatDate(run.periodStart)}
              </p>
            </div>
            <Separator />
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground text-sm">
                  Period End
                </span>
              </div>
              <p className="font-medium text-lg">{formatDate(run.periodEnd)}</p>
            </div>
            <Separator />
            <div className="space-y-1">
              <span className="text-muted-foreground text-sm">Run Date</span>
              <p className="font-medium">{formatDate(run.runDate)}</p>
            </div>
          </CardContent>
        </Card>

        {/* Employee Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Employee Summary</CardTitle>
            <CardDescription>Workforce information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <UsersIcon className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground text-sm">
                  Total Employees
                </span>
              </div>
              <p className="font-semibold text-2xl">{run.employeeCount}</p>
            </div>
            <Separator />
            <div className="space-y-1">
              <span className="text-muted-foreground text-sm">
                Average Net Pay
              </span>
              <p className="font-medium text-lg">
                {formatCurrency(
                  run.employeeCount > 0 ? run.totalNet / run.employeeCount : 0
                )}
              </p>
            </div>
            <Separator />
            <div className="space-y-1">
              <span className="text-muted-foreground text-sm">Created</span>
              <p className="font-medium text-sm">{formatDate(run.createdAt)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Approval Status */}
      {(run.approvedAt || run.paidAt) && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-base">Approval Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              {run.approvedAt && (
                <div className="rounded-md bg-green-50 dark:bg-green-950/20 p-4">
                  <p className="text-muted-foreground text-sm mb-1">
                    Approved On
                  </p>
                  <p className="font-medium">{formatDate(run.approvedAt)}</p>
                </div>
              )}
              {run.paidAt && (
                <div className="rounded-md bg-blue-50 dark:bg-blue-950/20 p-4">
                  <p className="text-muted-foreground text-sm mb-1">Paid On</p>
                  <p className="font-medium">{formatDate(run.paidAt)}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </section>
  );
}
