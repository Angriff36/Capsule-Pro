import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@repo/design-system/components/ui/alert";
import { Badge } from "@repo/design-system/components/ui/badge";
import { Button } from "@repo/design-system/components/ui/button";
import { Card, CardContent } from "@repo/design-system/components/ui/card";
import { Separator } from "@repo/design-system/components/ui/separator";
import {
  AlertCircleIcon,
  AlertTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  DollarSignIcon,
  FileTextIcon,
  Loader2Icon,
  SendIcon,
  XCircleIcon,
} from "lucide-react";

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

interface ApprovalWorkflowPanelProps {
  run: PayrollRun;
  canApprove: boolean;
  canReject: boolean;
  canFinalize: boolean;
  actionLoading: boolean;
  onApprove: () => void;
  onReject: () => void;
  onFinalize: () => void;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);
}

export default function ApprovalWorkflowPanel({
  run,
  canApprove,
  canReject,
  canFinalize,
  actionLoading,
  onApprove,
  onReject,
  onFinalize,
}: ApprovalWorkflowPanelProps) {
  const getStatusMessage = () => {
    switch (run.status) {
      case "pending":
        return {
          title: "Pending Processing",
          description:
            "This payroll run is waiting to be processed. Please wait for calculations to complete.",
          icon: <ClockIcon className="h-5 w-5" />,
          variant: "default" as const,
        };
      case "processing":
        return {
          title: "Processing",
          description:
            "Payroll calculations are in progress. This may take a few minutes.",
          icon: <Loader2Icon className="h-5 w-5 animate-spin" />,
          variant: "default" as const,
        };
      case "completed":
        return {
          title: "Ready for Approval",
          description:
            "Payroll processing is complete. Review the details and approve when ready.",
          icon: <CheckCircleIcon className="h-5 w-5 text-green-600" />,
          variant: "default" as const,
        };
      case "approved":
        return {
          title: "Approved - Ready for Payment",
          description:
            "This payroll run has been approved and is ready for payment processing.",
          icon: <CheckCircleIcon className="h-5 w-5 text-green-600" />,
          variant: "default" as const,
        };
      case "paid":
        return {
          title: "Payment Complete",
          description:
            "This payroll run has been finalized and payments have been processed.",
          icon: <DollarSignIcon className="h-5 w-5 text-green-600" />,
          variant: "default" as const,
        };
      case "failed":
        return {
          title: "Payroll Run Failed",
          description:
            "This payroll run was rejected and needs attention before it can be processed.",
          icon: <XCircleIcon className="h-5 w-5 text-destructive" />,
          variant: "destructive" as const,
        };
      default:
        return {
          title: "Unknown Status",
          description: "Status information unavailable.",
          icon: <AlertCircleIcon className="h-5 w-5" />,
          variant: "default" as const,
        };
    }
  };

  const statusMessage = getStatusMessage();

  return (
    <section>
      <h2 className="font-medium text-sm text-muted-foreground mb-4">
        Approval Workflow
      </h2>

      {/* Status Alert */}
      <Alert variant={statusMessage.variant} className="mb-6">
        {statusMessage.icon}
        <AlertTitle>{statusMessage.title}</AlertTitle>
        <AlertDescription>{statusMessage.description}</AlertDescription>
      </Alert>

      {/* Action Buttons */}
      <Card>
        <CardContent className="p-6">
          <div className="space-y-6">
            {/* Current Status */}
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-lg">
                  Payroll Run Actions
                </h3>
                <p className="text-muted-foreground text-sm">
                  Current Status:{" "}
                  <Badge variant="outline" className="ml-1">
                    {run.status.toUpperCase()}
                  </Badge>
                </p>
              </div>
            </div>

            <Separator />

            {/* Financial Summary */}
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-md bg-muted/50 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <DollarSignIcon className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground text-sm">
                    Total Gross
                  </span>
                </div>
                <p className="font-semibold text-xl">
                  {formatCurrency(run.totalGross)}
                </p>
              </div>

              <div className="rounded-md bg-muted/50 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <FileTextIcon className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground text-sm">
                    Total Net
                  </span>
                </div>
                <p className="font-semibold text-xl">
                  {formatCurrency(run.totalNet)}
                </p>
              </div>

              <div className="rounded-md bg-muted/50 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircleIcon className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground text-sm">
                    Employees
                  </span>
                </div>
                <p className="font-semibold text-xl">{run.employeeCount}</p>
              </div>
            </div>

            <Separator />

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-3">
              {canApprove && (
                <>
                  <Button
                    disabled={actionLoading}
                    onClick={onApprove}
                    size="lg"
                    variant="default"
                    className="flex-1 min-w-[200px]"
                  >
                    {actionLoading ? (
                      <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <CheckCircleIcon className="mr-2 h-4 w-4" />
                    )}
                    Approve Payroll Run
                  </Button>
                  <Button
                    disabled={actionLoading}
                    onClick={onReject}
                    size="lg"
                    variant="destructive"
                  >
                    {actionLoading ? (
                      <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <XCircleIcon className="mr-2 h-4 w-4" />
                    )}
                    Reject
                  </Button>
                </>
              )}

              {canFinalize && (
                <Button
                  disabled={actionLoading}
                  onClick={onFinalize}
                  size="lg"
                  variant="default"
                  className="flex-1 min-w-[200px]"
                >
                  {actionLoading ? (
                    <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <SendIcon className="mr-2 h-4 w-4" />
                  )}
                  Finalize Payment
                </Button>
              )}

              {run.status === "paid" && (
                <div className="flex-1 min-w-[200px] flex items-center justify-center gap-2 text-muted-foreground">
                  <CheckCircleIcon className="h-5 w-5 text-green-600" />
                  <span className="font-medium">Payroll Complete</span>
                </div>
              )}

              {run.status === "failed" && (
                <div className="flex-1 min-w-[200px] flex items-center justify-center gap-2 text-destructive">
                  <AlertTriangleIcon className="h-5 w-5" />
                  <span className="font-medium">
                    Action Required - Contact Support
                  </span>
                </div>
              )}
            </div>

            {/* Warning Messages */}
            {canReject && (
              <Alert variant="default">
                <AlertTriangleIcon className="h-4 w-4" />
                <AlertDescription className="text-sm">
                  <strong>Warning:</strong> Rejecting this payroll run will
                  prevent payment processing. You will need to regenerate the
                  payroll after resolving any issues.
                </AlertDescription>
              </Alert>
            )}

            {canFinalize && (
              <Alert variant="default">
                <AlertCircleIcon className="h-4 w-4" />
                <AlertDescription className="text-sm">
                  <strong>Note:</strong> Finalizing the payroll run will initiate
                  payment processing. This action cannot be undone.
                </AlertDescription>
              </Alert>
            )}
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
