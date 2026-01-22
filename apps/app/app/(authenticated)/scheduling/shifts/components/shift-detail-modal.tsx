"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@repo/design-system/components/ui/dialog";
import { Button } from "@repo/design-system/components/ui/button";
import { Badge } from "@repo/design-system/components/ui/badge";
import { Loader2Icon, PencilIcon, Trash2Icon, UserIcon, MapPinIcon, ClockIcon } from "lucide-react";
import { toast } from "sonner";
import { deleteShift } from "../actions";
import { ShiftForm } from "./shift-form";

interface Shift {
  id: string;
  schedule_id: string;
  employee_id: string;
  employee_first_name: string | null;
  employee_last_name: string | null;
  employee_email: string;
  employee_role: string;
  location_id: string;
  location_name: string;
  shift_start: Date;
  shift_end: Date;
  role_during_shift: string | null;
  notes: string | null;
  created_at: Date;
  updated_at: Date;
}

interface ShiftDetailModalProps {
  open: boolean;
  onClose: () => void;
  shift: Shift | null;
  onDelete?: () => void;
}

export function ShiftDetailModal({ open, onClose, shift, onDelete }: ShiftDetailModalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  if (!shift) return null;

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this shift?")) return;

    setIsDeleting(true);
    try {
      await deleteShift(shift.id);
      toast.success("Shift deleted successfully");
      onDelete?.();
      onClose();
    } catch (error) {
      toast.error("Failed to delete shift", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsDeleting(false);
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

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const calculateDuration = (start: Date, end: Date) => {
    const diffMs = end.getTime() - start.getTime();
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  if (isEditing) {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Shift</DialogTitle>
            <DialogDescription>Update shift details for {shift.employee_first_name} {shift.employee_last_name}</DialogDescription>
          </DialogHeader>
          <ShiftForm
            shift={{
              id: shift.id,
              schedule_id: shift.schedule_id,
              employee_id: shift.employee_id,
              location_id: shift.location_id,
              shift_start: shift.shift_start.toISOString(),
              shift_end: shift.shift_end.toISOString(),
              role_during_shift: shift.role_during_shift,
              notes: shift.notes,
            }}
            onSuccess={() => {
              setIsEditing(false);
              onDelete?.();
              onClose();
            }}
            onCancel={() => setIsEditing(false)}
          />
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Shift Details</DialogTitle>
          <DialogDescription>
            {shift.employee_first_name} {shift.employee_last_name} - {formatDate(shift.shift_start)}
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
                {shift.employee_first_name} {shift.employee_last_name}
              </h3>
              <p className="text-sm text-muted-foreground">{shift.employee_email}</p>
              <div className="mt-2 flex gap-2">
                <Badge variant="secondary">{shift.employee_role}</Badge>
                {shift.role_during_shift && (
                  <Badge variant="outline">Role: {shift.role_during_shift}</Badge>
                )}
              </div>
            </div>
          </div>

          {/* Time & Location */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="flex items-start gap-3 p-4 border rounded-lg">
              <ClockIcon className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm text-muted-foreground">Time</p>
                <p className="font-medium">{formatDate(shift.shift_start)}</p>
                <p className="text-sm">
                  {formatTime(shift.shift_start)} - {formatTime(shift.shift_end)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Duration: {calculateDuration(shift.shift_start, shift.shift_end)}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 border rounded-lg">
              <MapPinIcon className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm text-muted-foreground">Location</p>
                <p className="font-medium">{shift.location_name}</p>
              </div>
            </div>
          </div>

          {/* Notes */}
          {shift.notes && (
            <div className="p-4 border rounded-lg bg-muted/30">
              <p className="text-sm text-muted-foreground mb-1">Notes</p>
              <p className="text-sm">{shift.notes}</p>
            </div>
          )}

          {/* Metadata */}
          <div className="grid gap-4 text-sm text-muted-foreground">
            <div className="flex justify-between">
              <span>Shift ID:</span>
              <span className="font-mono">{shift.id.slice(0, 8)}...</span>
            </div>
            <div className="flex justify-between">
              <span>Created:</span>
              <span>{new Date(shift.created_at).toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span>Last Updated:</span>
              <span>{new Date(shift.updated_at).toLocaleString()}</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => setIsEditing(true)}
            >
              <PencilIcon className="h-4 w-4 mr-2" />
              Edit
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting && <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />}
              <Trash2Icon className="h-4 w-4 mr-2" />
              Delete
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
