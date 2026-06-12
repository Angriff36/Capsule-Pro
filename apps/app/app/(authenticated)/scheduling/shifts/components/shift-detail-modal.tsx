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
import { Badge } from "@repo/design-system/components/ui/badge";
import { Button } from "@repo/design-system/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@repo/design-system/components/ui/dialog";
import {
  ClockIcon,
  Loader2Icon,
  MapPinIcon,
  PencilIcon,
  Trash2Icon,
  UserIcon,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { deleteShift } from "../actions";
import { ShiftForm } from "./shift-form";

interface Shift {
  created_at: Date;
  employeeEmail: string;
  employeeFirstName: string | null;
  employeeId: string;
  employeeLastName: string | null;
  employeeRole: string;
  id: string;
  location_id: string;
  location_name: string;
  notes: string | null;
  role_during_shift: string | null;
  schedule_id: string;
  shift_end: Date;
  shift_start: Date;
  updated_at: Date;
}

interface ShiftDetailModalProps {
  onClose: () => void;
  onDelete?: () => void;
  open: boolean;
  shift: Shift | null;
}

export function ShiftDetailModal({
  open,
  onClose,
  shift,
  onDelete,
}: ShiftDetailModalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  if (!shift) {
    return null;
  }

  const requestDelete = () => {
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
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
      setDeleteDialogOpen(false);
    }
  };

  const formatDate = (date: Date) =>
    date.toLocaleDateString("en-US", {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
    });

  const formatTime = (date: Date) =>
    date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });

  const calculateDuration = (start: Date, end: Date) => {
    const diffMs = end.getTime() - start.getTime();
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  if (isEditing) {
    return (
      <Dialog onOpenChange={onClose} open={open}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Shift</DialogTitle>
            <DialogDescription>
              Update shift details for {shift.employeeFirstName}{" "}
              {shift.employeeLastName}
            </DialogDescription>
          </DialogHeader>
          <ShiftForm
            onCancel={() => setIsEditing(false)}
            onSuccess={() => {
              setIsEditing(false);
              onDelete?.();
              onClose();
            }}
            shift={{
              id: shift.id,
              schedule_id: shift.schedule_id,
              employeeId: shift.employeeId,
              location_id: shift.location_id,
              shift_start: shift.shift_start.toISOString(),
              shift_end: shift.shift_end.toISOString(),
              role_during_shift: shift.role_during_shift,
              notes: shift.notes,
            }}
          />
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog onOpenChange={onClose} open={open}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Shift Details</DialogTitle>
          <DialogDescription>
            {shift.employeeFirstName} {shift.employeeLastName} -{" "}
            {formatDate(shift.shift_start)}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-6">
          {/* Employee Info */}
          <div className="flex items-start gap-4 rounded-lg border bg-muted/30 p-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <UserIcon className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-lg">
                {shift.employeeFirstName} {shift.employeeLastName}
              </h3>
              <p className="text-muted-foreground text-sm">
                {shift.employeeEmail}
              </p>
              <div className="mt-2 flex gap-2">
                <Badge variant="secondary">{shift.employeeRole}</Badge>
                {shift.role_during_shift && (
                  <Badge variant="outline">
                    Role: {shift.role_during_shift}
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {/* Time & Location */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="flex items-start gap-3 rounded-lg border p-4">
              <ClockIcon className="mt-0.5 h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-muted-foreground text-sm">Time</p>
                <p className="font-medium">{formatDate(shift.shift_start)}</p>
                <p className="text-sm">
                  {formatTime(shift.shift_start)} -{" "}
                  {formatTime(shift.shift_end)}
                </p>
                <p className="mt-1 text-muted-foreground text-xs">
                  Duration:{" "}
                  {calculateDuration(shift.shift_start, shift.shift_end)}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-lg border p-4">
              <MapPinIcon className="mt-0.5 h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-muted-foreground text-sm">Location</p>
                <p className="font-medium">{shift.location_name}</p>
              </div>
            </div>
          </div>

          {/* Notes */}
          {shift.notes && (
            <div className="rounded-lg border bg-muted/30 p-4">
              <p className="mb-1 text-muted-foreground text-sm">Notes</p>
              <p className="text-sm">{shift.notes}</p>
            </div>
          )}

          {/* Metadata */}
          <div className="grid gap-4 text-muted-foreground text-sm">
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
          <div className="flex justify-end gap-3 border-t pt-4">
            <Button onClick={() => setIsEditing(true)} variant="outline">
              <PencilIcon className="mr-2 h-4 w-4" />
              Edit
            </Button>
            <Button
              disabled={isDeleting}
              onClick={requestDelete}
              variant="destructive"
            >
              {isDeleting && (
                <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
              )}
              <Trash2Icon className="mr-2 h-4 w-4" />
              Delete
            </Button>
          </div>
        </div>

        <AlertDialog
          onOpenChange={(open) => {
            if (!open) {
              setDeleteDialogOpen(false);
            }
          }}
          open={deleteDialogOpen}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Shift</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this shift? This action cannot
                be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDelete}>
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </DialogContent>
    </Dialog>
  );
}
