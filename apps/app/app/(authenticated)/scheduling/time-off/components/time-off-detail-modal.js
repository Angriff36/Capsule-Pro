"use client";

Object.defineProperty(exports, "__esModule", { value: true });
exports.TimeOffDetailModal = TimeOffDetailModal;
const badge_1 = require("@repo/design-system/components/ui/badge");
const button_1 = require("@repo/design-system/components/ui/button");
const dialog_1 = require("@repo/design-system/components/ui/dialog");
const lucide_react_1 = require("lucide-react");
const react_1 = require("react");
const sonner_1 = require("sonner");
const actions_1 = require("../actions");
// Helper to get status badge style
const getStatusBadgeVariant = (status) => {
  switch (status) {
    case "PENDING":
      return "default";
    case "APPROVED":
      return "secondary";
    case "REJECTED":
      return "destructive";
    case "CANCELLED":
      return "outline";
    default:
      return "outline";
  }
};
// Helper to get type badge style
const getTypeBadgeVariant = (type) => {
  switch (type) {
    case "VACATION":
      return "default";
    case "SICK_LEAVE":
      return "destructive";
    case "PERSONAL_DAY":
      return "secondary";
    case "BEREAVEMENT":
      return "destructive";
    case "MATERNITY_LEAVE":
      return "default";
    case "PATERNITY_LEAVE":
      return "default";
    case "OTHER":
      return "outline";
    default:
      return "outline";
  }
};
// Helper to get color for type
const getTypeColor = (type) => {
  switch (type) {
    case "VACATION":
      return "bg-blue-100 text-blue-800 border-blue-200";
    case "SICK_LEAVE":
      return "bg-red-100 text-red-800 border-red-200";
    case "PERSONAL_DAY":
      return "bg-purple-100 text-purple-800 border-purple-200";
    case "BEREAVEMENT":
      return "bg-gray-100 text-gray-800 border-gray-200";
    case "MATERNITY_LEAVE":
      return "bg-pink-100 text-pink-800 border-pink-200";
    case "PATERNITY_LEAVE":
      return "bg-green-100 text-green-800 border-green-200";
    case "OTHER":
      return "bg-gray-100 text-gray-800 border-gray-200";
    default:
      return "bg-gray-100 text-gray-800 border-gray-200";
  }
};
function TimeOffDetailModal({ open, onClose, timeOffRequest, onDelete }) {
  const [isLoading, setIsLoading] = (0, react_1.useState)(false);
  const [showRejectionDialog, setShowRejectionDialog] = (0, react_1.useState)(
    false
  );
  const [rejectionReason, setRejectionReason] = (0, react_1.useState)("");
  if (!timeOffRequest) return null;
  const handleApprove = async () => {
    setIsLoading(true);
    try {
      await (0, actions_1.updateTimeOffStatus)(timeOffRequest.id, {
        status: "APPROVED",
      });
      sonner_1.toast.success("Time-off request approved");
      onDelete?.();
      onClose();
    } catch (error) {
      sonner_1.toast.error("Failed to approve request", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsLoading(false);
    }
  };
  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      sonner_1.toast.error("Please provide a reason for rejection");
      return;
    }
    setIsLoading(true);
    try {
      await (0, actions_1.updateTimeOffStatus)(timeOffRequest.id, {
        status: "REJECTED",
        rejectionReason: rejectionReason.trim(),
      });
      sonner_1.toast.success("Time-off request rejected");
      setRejectionReason("");
      setShowRejectionDialog(false);
      onDelete?.();
      onClose();
    } catch (error) {
      sonner_1.toast.error("Failed to reject request", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsLoading(false);
    }
  };
  const handleCancel = async () => {
    if (!confirm("Are you sure you want to cancel this time-off request?"))
      return;
    setIsLoading(true);
    try {
      await (0, actions_1.updateTimeOffStatus)(timeOffRequest.id, {
        status: "CANCELLED",
      });
      sonner_1.toast.success("Time-off request cancelled");
      onDelete?.();
      onClose();
    } catch (error) {
      sonner_1.toast.error("Failed to cancel request", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsLoading(false);
    }
  };
  const handleDelete = async () => {
    if (
      !confirm(
        "Are you sure you want to delete this time-off request? This action cannot be undone."
      )
    )
      return;
    setIsLoading(true);
    try {
      await (0, actions_1.deleteTimeOffRequest)(timeOffRequest.id);
      sonner_1.toast.success("Time-off request deleted");
      onDelete?.();
      onClose();
    } catch (error) {
      sonner_1.toast.error("Failed to delete request", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsLoading(false);
    }
  };
  const formatDate = (date) => {
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };
  const formatDateTime = (date) => {
    return date.toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };
  const calculateDuration = (start, end) => {
    const diffMs = end.getTime() - start.getTime();
    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const hours = Math.floor(
      (diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
    );
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    if (days > 0) {
      return `${days}d ${hours}h`;
    }
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };
  // Determine available actions based on status
  const availableActions = {
    PENDING: ["approve", "reject", "delete"],
    APPROVED: ["cancel"],
    REJECTED: ["delete"],
    CANCELLED: [],
  };
  return (
    <>
      <dialog_1.Dialog onOpenChange={onClose} open={open}>
        <dialog_1.DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <dialog_1.DialogHeader>
            <dialog_1.DialogTitle>
              Time-Off Request Details
            </dialog_1.DialogTitle>
            <dialog_1.DialogDescription>
              {timeOffRequest.employee_first_name}{" "}
              {timeOffRequest.employee_last_name} -{" "}
              {formatDate(timeOffRequest.start_date)}
            </dialog_1.DialogDescription>
          </dialog_1.DialogHeader>

          <div className="flex flex-col gap-6">
            {/* Employee Info */}
            <div className="flex items-start gap-4 p-4 border rounded-lg bg-muted/30">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <lucide_react_1.UserIcon className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-lg">
                  {timeOffRequest.employee_first_name}{" "}
                  {timeOffRequest.employee_last_name}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {timeOffRequest.employee_email}
                </p>
                <div className="mt-2 flex gap-2">
                  <badge_1.Badge variant="secondary">
                    {timeOffRequest.employee_role}
                  </badge_1.Badge>
                </div>
              </div>
            </div>

            {/* Date Range & Duration */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="flex items-start gap-3 p-4 border rounded-lg">
                <lucide_react_1.ClockIcon className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm text-muted-foreground">Date Range</p>
                  <p className="font-medium">
                    {formatDate(timeOffRequest.start_date)}
                  </p>
                  <p className="text-sm">
                    {formatDate(timeOffRequest.end_date)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Duration:{" "}
                    {calculateDuration(
                      timeOffRequest.start_date,
                      timeOffRequest.end_date
                    )}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 border rounded-lg">
                <div
                  className={`h-5 w-5 rounded-full border mt-0.5 ${getTypeColor(timeOffRequest.request_type)}`}
                />
                <div>
                  <p className="text-sm text-muted-foreground">Request Type</p>
                  <p className="font-medium">
                    {timeOffRequest.request_type.replace(/_/g, " ")}
                  </p>
                </div>
              </div>
            </div>

            {/* Status */}
            <div className="p-4 border rounded-lg bg-muted/30">
              <p className="text-sm text-muted-foreground mb-2">Status</p>
              <div className="flex items-center gap-2">
                <badge_1.Badge
                  variant={getStatusBadgeVariant(timeOffRequest.status)}
                >
                  {timeOffRequest.status.replace(/_/g, " ")}
                </badge_1.Badge>
              </div>
            </div>

            {/* Reason */}
            {timeOffRequest.reason && (
              <div className="p-4 border rounded-lg bg-muted/30">
                <p className="text-sm text-muted-foreground mb-1">Reason</p>
                <p className="text-sm">{timeOffRequest.reason}</p>
              </div>
            )}

            {/* Rejection Reason */}
            {timeOffRequest.status === "REJECTED" &&
              timeOffRequest.rejection_reason && (
                <div className="p-4 border rounded-lg bg-red-50 border-red-200">
                  <p className="text-sm text-muted-foreground mb-1">
                    Rejection Reason
                  </p>
                  <p className="text-sm text-red-800">
                    {timeOffRequest.rejection_reason}
                  </p>
                </div>
              )}

            {/* Processing Info */}
            {timeOffRequest.status !== "PENDING" && (
              <div className="grid gap-4 text-sm text-muted-foreground">
                <div className="flex justify-between">
                  <span>Processed By:</span>
                  <span>
                    {timeOffRequest.processed_by_first_name}{" "}
                    {timeOffRequest.processed_by_last_name}
                  </span>
                </div>
                {timeOffRequest.processed_at && (
                  <div className="flex justify-between">
                    <span>Processed At:</span>
                    <span>{formatDateTime(timeOffRequest.processed_at)}</span>
                  </div>
                )}
              </div>
            )}

            {/* Metadata */}
            <div className="grid gap-4 text-sm text-muted-foreground">
              <div className="flex justify-between">
                <span>Request ID:</span>
                <span className="font-mono">
                  {timeOffRequest.id.slice(0, 8)}...
                </span>
              </div>
              <div className="flex justify-between">
                <span>Created:</span>
                <span>{formatDateTime(timeOffRequest.created_at)}</span>
              </div>
              <div className="flex justify-between">
                <span>Last Updated:</span>
                <span>{formatDateTime(timeOffRequest.updated_at)}</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              {availableActions.PENDING.includes("approve") && (
                <button_1.Button
                  className="bg-green-600 hover:bg-green-700"
                  disabled={isLoading}
                  onClick={handleApprove}
                >
                  {isLoading ? (
                    <lucide_react_1.Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  Approve
                </button_1.Button>
              )}

              {availableActions.PENDING.includes("reject") && (
                <button_1.Button
                  disabled={isLoading}
                  onClick={() => setShowRejectionDialog(true)}
                  variant="destructive"
                >
                  {isLoading ? (
                    <lucide_react_1.Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  Reject
                </button_1.Button>
              )}

              {availableActions.APPROVED.includes("cancel") && (
                <button_1.Button
                  disabled={isLoading}
                  onClick={handleCancel}
                  variant="outline"
                >
                  {isLoading ? (
                    <lucide_react_1.Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  Cancel/Revoke
                </button_1.Button>
              )}

              {availableActions.REJECTED.includes("delete") && (
                <button_1.Button
                  disabled={isLoading}
                  onClick={handleDelete}
                  variant="outline"
                >
                  {isLoading ? (
                    <lucide_react_1.Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <lucide_react_1.Trash2Icon className="h-4 w-4 mr-2" />
                  )}
                  Delete
                </button_1.Button>
              )}
            </div>
          </div>
        </dialog_1.DialogContent>
      </dialog_1.Dialog>

      {/* Rejection Dialog */}
      {showRejectionDialog && (
        <dialog_1.Dialog
          onOpenChange={(open) => !open && setShowRejectionDialog(false)}
          open
        >
          <dialog_1.DialogContent className="max-w-md">
            <dialog_1.DialogHeader>
              <dialog_1.DialogTitle>
                Reject Time-Off Request
              </dialog_1.DialogTitle>
              <dialog_1.DialogDescription>
                Please provide a reason for rejecting this time-off request.
              </dialog_1.DialogDescription>
            </dialog_1.DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">
                  Reason for rejection
                </label>
                <textarea
                  className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Please explain why this request is being rejected..."
                  rows={4}
                  value={rejectionReason}
                />
              </div>
              <div className="flex justify-end gap-3">
                <button_1.Button
                  disabled={isLoading}
                  onClick={() => setShowRejectionDialog(false)}
                  variant="outline"
                >
                  Cancel
                </button_1.Button>
                <button_1.Button
                  disabled={isLoading}
                  onClick={handleReject}
                  variant="destructive"
                >
                  {isLoading ? (
                    <lucide_react_1.Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  Reject Request
                </button_1.Button>
              </div>
            </div>
          </dialog_1.DialogContent>
        </dialog_1.Dialog>
      )}
    </>
  );
}
