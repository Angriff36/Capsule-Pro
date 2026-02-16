"use client";

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
  availability: {
    id: string;
    employee_id: string;
    employee_first_name: string | null;
    employee_last_name: string | null;
    employee_email: string;
    employee_role: string;
    day_of_week: number;
    start_time: string;
    end_time: string;
    is_available: boolean;
    effective_from: Date;
    effective_until: Date | null;
    created_at: Date;
    updated_at: Date;
  } | null;
}

export function AvailabilityDetailModal({
  open,
  onClose,
  onDelete,
  availability,
}: AvailabilityDetailModalProps) {
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    if (!availability) {
      return;
    }

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
                  {availability.employee_first_name}{" "}
                  {availability.employee_last_name}
                </div>
                <div className="text-sm text-muted-foreground">
                  {availability.employee_email} • {availability.employee_role}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <CalendarIcon className="h-4 w-4" />
                  Day of Week
                </div>
                <div className="font-medium">
                  {days[availability.day_of_week]}
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
                  {formatTime(availability.start_time)}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <ClockIcon className="h-4 w-4" />
                  End Time
                </div>
                <div className="font-medium">
                  {formatTime(availability.end_time)}
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
                  {availability.is_available ? "Available" : "Unavailable"}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <CalendarIcon className="h-4 w-4" />
                  Effective From
                </div>
                <div className="font-medium">
                  {formatDate(availability.effective_from)}
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
                {availability.effective_until
                  ? formatDate(availability.effective_until)
                  : "Ongoing"}
              </div>
            </div>

            {/* Audit Information */}
            <div className="space-y-2">
              <div className="text-sm font-medium text-muted-foreground">
                Audit Information
              </div>
              <div className="text-xs text-muted-foreground">
                Created: {formatDate(availability.created_at)}
              </div>
              <div className="text-xs text-muted-foreground">
                Last Updated: {formatDate(availability.updated_at)}
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button onClick={onClose} variant="outline">
            Close
          </Button>
          {availability && (
            <Button
              disabled={loading}
              onClick={handleDelete}
              variant="destructive"
            >
              <TrashIcon className="h-4 w-4 mr-2" />
              {loading ? "Deleting..." : "Delete"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
