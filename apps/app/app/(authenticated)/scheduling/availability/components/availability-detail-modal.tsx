"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@repo/design-system/components/ui/alert-dialog";
import { Button } from "@repo/design-system/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@repo/design-system/components/ui/dialog";
import {
  CalendarIcon,
  ClockIcon,
  InfoIcon,
  PencilIcon,
  TrashIcon,
  UserIcon,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { deleteAvailability } from "../actions";

interface AvailabilityDetailModalProps {
  open: boolean;
  onClose: () => void;
  onDelete: () => void;
  onEdit: () => void;
  availability: {
    id: string;
    employeeId: string;
    employeeFirstName: string | null;
    employeeLastName: string | null;
    employeeEmail: string;
    employeeRole: string;
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    isAvailable: boolean;
    effectiveFrom: Date;
    effectiveUntil: Date | null;
    createdAt: Date;
    updatedAt: Date;
  } | null;
}

export function AvailabilityDetailModal({
  open,
  onClose,
  onDelete,
  onEdit,
  availability,
}: AvailabilityDetailModalProps) {
  const [loading, setLoading] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const handleDelete = async () => {
    if (!availability) {
      return;
    }

    setDeleteDialogOpen(false);
    setLoading(true);
    try {
      await deleteAvailability(availability.id);
      toast.success("Availability deleted successfully");
      onDelete();
      onClose();
    } catch (error) {
      toast.error(
        "Failed to delete availability",
        error instanceof Error
          ? { description: error.message }
          : { description: "Unknown error occurred" }
      );
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatTime = (timeString: string) => {
    const date = new Date(`2000-01-01T${timeString}`);
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const days = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];

  return (
    <Dialog onOpenChange={onClose} open={open}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5" />
            Availability Details
          </DialogTitle>
          <DialogDescription>
            Detailed information about this availability entry
          </DialogDescription>
        </DialogHeader>

        {availability && (
          <div className="space-y-4">
            {/* Basic Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <UserIcon className="h-4 w-4" />
                  Employee
                </div>
                <div className="font-medium">
                  {availability.employeeFirstName}{" "}
                  {availability.employeeLastName}
                </div>
                <div className="text-sm text-muted-foreground">
                  {availability.employeeEmail} • {availability.employeeRole}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <CalendarIcon className="h-4 w-4" />
                  Day of Week
                </div>
                <div className="font-medium">
                  {days[availability.dayOfWeek]}
                </div>
              </div>
            </div>

            {/* Time Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <ClockIcon className="h-4 w-4" />
                  Start Time
                </div>
                <div className="font-medium">
                  {formatTime(availability.startTime)}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <ClockIcon className="h-4 w-4" />
                  End Time
                </div>
                <div className="font-medium">
                  {formatTime(availability.endTime)}
                </div>
              </div>
            </div>

            {/* Status and Effective Dates */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <InfoIcon className="h-4 w-4" />
                  Status
                </div>
                <div className="font-medium">
                  {availability.isAvailable ? "Available" : "Unavailable"}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <CalendarIcon className="h-4 w-4" />
                  Effective From
                </div>
                <div className="font-medium">
                  {formatDate(availability.effectiveFrom)}
                </div>
              </div>
            </div>

            {/* Effective Until Date */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <CalendarIcon className="h-4 w-4" />
                Effective Until
              </div>
              <div className="font-medium">
                {availability.effectiveUntil
                  ? formatDate(availability.effectiveUntil)
                  : "Ongoing"}
              </div>
            </div>

            {/* Audit Information */}
            <div className="space-y-2">
              <div className="text-sm font-medium text-muted-foreground">
                Audit Information
              </div>
              <div className="text-xs text-muted-foreground">
                Created: {formatDate(availability.createdAt)}
              </div>
              <div className="text-xs text-muted-foreground">
                Last Updated: {formatDate(availability.updatedAt)}
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button onClick={onClose} variant="outline">
            Close
          </Button>
          {availability && (
            <>
              <Button onClick={onEdit} variant="default">
                <PencilIcon className="h-4 w-4 mr-2" />
                Edit
              </Button>
              <Button
                disabled={loading}
                onClick={() => setDeleteDialogOpen(true)}
                variant="destructive"
              >
                <TrashIcon className="h-4 w-4 mr-2" />
                {loading ? "Deleting..." : "Delete"}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>

      {/* Delete confirmation */}
      <AlertDialog onOpenChange={setDeleteDialogOpen} open={deleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete availability</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove this availability entry. This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={handleDelete}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}
