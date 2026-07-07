import { Badge } from "@repo/design-system/components/ui/badge";
import { Card, CardContent } from "@repo/design-system/components/ui/card";
import { CheckCircleIcon, ClockIcon, EditIcon, UserIcon } from "lucide-react";

interface ApprovalHistoryEntry {
  action: string;
  createdAt: Date;
  id: string;
  newValues: Record<string, unknown> | null;
  oldValues: Record<string, unknown> | null;
  performedBy: string | null;
  performerFirstName: string | null;
  performerLastName: string | null;
}

interface ApprovalHistoryTimelineProps {
  approvalHistory: ApprovalHistoryEntry[];
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(date);
}

function getActionDetails(
  action: string,
  oldValues: Record<string, unknown> | null,
  newValues: Record<string, unknown> | null
) {
  if (action === "insert") {
    return {
      label: "Created",
      description: "Payroll run was created",
      icon: <ClockIcon className="h-4 w-4" />,
      variant: "secondary" as const,
    };
  }

  if (action === "update") {
    const oldStatus = oldValues?.status as string | undefined;
    const newStatus = newValues?.status as string | undefined;

    if (oldStatus && newStatus && oldStatus !== newStatus) {
      const statusTransitions: Record<string, string> = {
        pending: "Pending Processing",
        processing: "Processing",
        completed: "Completed",
        approved: "Approved",
        paid: "Paid",
        failed: "Rejected",
      };

      const fromLabel = statusTransitions[oldStatus] || oldStatus;
      const toLabel = statusTransitions[newStatus] || newStatus;

      if (newStatus === "approved") {
        return {
          label: "Approved",
          description: `Status changed from "${fromLabel}" to "Approved"`,
          icon: <CheckCircleIcon className="h-4 w-4" />,
          variant: "default" as const,
        };
      }

      if (newStatus === "paid") {
        return {
          label: "Payment Finalized",
          description: `Status changed from "${fromLabel}" to "Paid"`,
          icon: <CheckCircleIcon className="h-4 w-4" />,
          variant: "default" as const,
        };
      }

      if (newStatus === "failed") {
        return {
          label: "Rejected",
          description: `Status changed from "${fromLabel}" to "Rejected"`,
          icon: <EditIcon className="h-4 w-4" />,
          variant: "destructive" as const,
        };
      }

      return {
        label: "Status Changed",
        description: `Changed from "${fromLabel}" to "${toLabel}"`,
        icon: <EditIcon className="h-4 w-4" />,
        variant: "secondary" as const,
      };
    }

    return {
      label: "Updated",
      description: "Payroll run details were updated",
      icon: <EditIcon className="h-4 w-4" />,
      variant: "secondary" as const,
    };
  }

  return {
    label: action,
    description: "Action performed",
    icon: <EditIcon className="h-4 w-4" />,
    variant: "secondary" as const,
  };
}

function getPerformerName(
  performerFirstName: string | null,
  performerLastName: string | null
) {
  if (!(performerFirstName || performerLastName)) {
    return "System";
  }
  return [performerFirstName, performerLastName].filter(Boolean).join(" ");
}

export default function ApprovalHistoryTimeline({
  approvalHistory,
}: ApprovalHistoryTimelineProps) {
  if (approvalHistory.length === 0) {
    return null;
  }

  return (
    <section>
      <h2 className="mb-4 font-medium text-muted-foreground text-sm">
        Approval History
      </h2>
      <Card>
        <CardContent className="p-6">
          <div className="space-y-6">
            {approvalHistory.map((entry, index) => {
              const actionDetails = getActionDetails(
                entry.action,
                entry.oldValues,
                entry.newValues
              );
              const performerName = getPerformerName(
                entry.performerFirstName,
                entry.performerLastName
              );

              return (
                <div key={entry.id}>
                  <div className="flex items-start gap-4">
                    {/* Icon */}
                    <div
                      className={`mt-0.5 flex-shrink-0 rounded-full p-1 ${
                        actionDetails.variant === "destructive"
                          ? "bg-destructive/10 text-destructive"
                          : actionDetails.variant === "default"
                            ? "bg-primary/10 text-primary"
                            : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {actionDetails.icon}
                    </div>

                    {/* Content */}
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">
                            {actionDetails.label}
                          </span>
                          <Badge variant={actionDetails.variant}>
                            {entry.action.toUpperCase()}
                          </Badge>
                        </div>
                        <span className="whitespace-nowrap text-muted-foreground text-sm">
                          {formatDate(entry.createdAt)}
                        </span>
                      </div>
                      <p className="mb-2 text-muted-foreground text-sm">
                        {actionDetails.description}
                      </p>
                      <div className="flex items-center gap-2 text-muted-foreground text-sm">
                        <UserIcon className="h-3 w-3" />
                        <span>by {performerName}</span>
                      </div>
                    </div>
                  </div>

                  {/* Separator */}
                  {index < approvalHistory.length - 1 && (
                    <div className="mt-6 ml-6 border-muted border-l-2 border-dashed" />
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
