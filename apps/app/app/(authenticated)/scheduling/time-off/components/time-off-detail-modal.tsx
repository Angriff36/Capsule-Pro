"use client";

import type {
  TimeOffRequest,
  TimeOffStatus,
  TimeOffType,
} from "@api/staff/time-off/types";
import { Badge } from "@repo/design-system/components/ui/badge";
import { Button } from "@repo/design-system/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@repo/design-system/components/ui/dialog";
import { ClockIcon, Loader2Icon, Trash2Icon, UserIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { deleteTimeOffRequest, updateTimeOffStatus } from "../actions";

type TimeOffDetailModalProps = {
  open: boolean;
  onClose: () => void;
  timeOffRequest: TimeOffRequest | null;
  onDelete?: () => void;
};

// Helper to get status badge style
const getStatusBadgeVariant = (
  status: TimeOffStatus
): "default" | "secondary" | "destructive" | "outline" => {
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
const _getTypeBadgeVariant = (
  type: TimeOffType
): "default" | "secondary" | "destructive" | "outline" => {
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
const getTypeColor = (type: TimeOffType): string => {
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

export function TimeOffDetailModal({
  open,
  onClose,
  timeOffRequest,
  onDelete,
}: TimeOffDetailModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [showRejectionDialog, setShowRejectionDialog] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");

  if (!timeOffRequest) {
    return null;
  }

  const handleApprove = async () => {
    setIsLoading(true);
    try {
      await updateTimeOffStatus(timeOffRequest.id, {
        status: "APPROVED",
      });
      toast.success("Time-off request approved");
      onDelete?.();
      onClose();
    } catch (error) {
      toast.error("Failed to approve request", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      toast.error("Please provide a reason for rejection");
      return;
    }

    setIsLoading(true);
    try {
      await updateTimeOffStatus(timeOffRequest.id, {
        status: "REJECTED",
        rejectionReason: rejectionReason.trim(),
      });
      toast.success("Time-off request rejected");
      setRejectionReason("");
      setShowRejectionDialog(false);
      onDelete?.();
      onClose();
    } catch (error) {
      toast.error("Failed to reject request", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!confirm("Are you sure you want to cancel this time-off request?")) {
      return;
    }

    setIsLoading(true);
    try {
      await updateTimeOffStatus(timeOffRequest.id, {
        status: "CANCELLED",
      });
      toast.success("Time-off request cancelled");
      onDelete?.();
      onClose();
    } catch (error) {
      toast.error("Failed to cancel request", {
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
    ) {
      return;
    }

    setIsLoading(true);
    try {
      await deleteTimeOffRequest(timeOffRequest.id);
      toast.success("Time-off request deleted");
      onDelete?.();
      onClose();
    } catch (error) {
      toast.error("Failed to delete request", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatDateTime = (date: Date) => {
    return date.toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const calculateDuration = (start: Date, end: Date) => {
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
      <Dialog onOpenChange={onClose} open={open}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Time-Off Request Details</DialogTitle>
            <DialogDescription>
              {timeOffRequest.employee_first_name}{" "}
              {timeOffRequest.employee_last_name} -{" "}
              {formatDate(timeOffRequest.start_date)}
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-6">
            {/* Employee Info */}
            <div className="flex items-start gap-4 p-4 border rounded-lg bg-muted/30">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <UserIcon className="h-6 w-6 text-primary" />
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
                  <Badge variant="secondary">
                    {timeOffRequest.employee_role}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Date Range & Duration */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="flex items-start gap-3 p-4 border rounded-lg">
                <ClockIcon className="h-5 w-5 text-muted-foreground mt-0.5" />
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
                <Badge variant={getStatusBadgeVariant(timeOffRequest.status)}>
                  {timeOffRequest.status.replace(/_/g, " ")}
                </Badge>
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
                <Button
                  className="bg-green-600 hover:bg-green-700"
                  disabled={isLoading}
                  onClick={handleApprove}
                >
                  {isLoading ? (
                    <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  Approve
                </Button>
              )}

              {availableActions.PENDING.includes("reject") && (
                <Button
                  disabled={isLoading}
                  onClick={() => setShowRejectionDialog(true)}
                  variant="destructive"
                >
                  {isLoading ? (
                    <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  Reject
                </Button>
              )}

              {availableActions.APPROVED.includes("cancel") && (
                <Button
                  disabled={isLoading}
                  onClick={handleCancel}
                  variant="outline"
                >
                  {isLoading ? (
                    <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  Cancel/Revoke
                </Button>
              )}

              {availableActions.REJECTED.includes("delete") && (
                <Button
                  disabled={isLoading}
                  onClick={handleDelete}
                  variant="outline"
                >
                  {isLoading ? (
                    <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2Icon className="h-4 w-4 mr-2" />
                  )}
                  Delete
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Rejection Dialog */}
      {showRejectionDialog && (
        <Dialog
          onOpenChange={(open) => !open && setShowRejectionDialog(false)}
          open
        >
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Reject Time-Off Request</DialogTitle>
              <DialogDescription>
                Please provide a reason for rejecting this time-off request.
              </DialogDescription>
            </DialogHeader>
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
                <Button
                  disabled={isLoading}
                  onClick={() => setShowRejectionDialog(false)}
                  variant="outline"
                >
                  Cancel
                </Button>
                <Button
                  disabled={isLoading}
                  onClick={handleReject}
                  variant="destructive"
                >
                  {isLoading ? (
                    <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  Reject Request
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
