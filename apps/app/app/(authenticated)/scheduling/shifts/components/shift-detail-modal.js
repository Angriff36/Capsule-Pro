"use client";

Object.defineProperty(exports, "__esModule", { value: true });
exports.ShiftDetailModal = ShiftDetailModal;
const badge_1 = require("@repo/design-system/components/ui/badge");
const button_1 = require("@repo/design-system/components/ui/button");
const dialog_1 = require("@repo/design-system/components/ui/dialog");
const lucide_react_1 = require("lucide-react");
const react_1 = require("react");
const sonner_1 = require("sonner");
const actions_1 = require("../actions");
const shift_form_1 = require("./shift-form");
function ShiftDetailModal({ open, onClose, shift, onDelete }) {
  const [isEditing, setIsEditing] = (0, react_1.useState)(false);
  const [isDeleting, setIsDeleting] = (0, react_1.useState)(false);
  if (!shift) return null;
  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this shift?")) return;
    setIsDeleting(true);
    try {
      await (0, actions_1.deleteShift)(shift.id);
      sonner_1.toast.success("Shift deleted successfully");
      onDelete?.();
      onClose();
    } catch (error) {
      sonner_1.toast.error("Failed to delete shift", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsDeleting(false);
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
  const formatTime = (date) => {
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });
  };
  const calculateDuration = (start, end) => {
    const diffMs = end.getTime() - start.getTime();
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };
  if (isEditing) {
    return (
      <dialog_1.Dialog onOpenChange={onClose} open={open}>
        <dialog_1.DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <dialog_1.DialogHeader>
            <dialog_1.DialogTitle>Edit Shift</dialog_1.DialogTitle>
            <dialog_1.DialogDescription>
              Update shift details for {shift.employee_first_name}{" "}
              {shift.employee_last_name}
            </dialog_1.DialogDescription>
          </dialog_1.DialogHeader>
          <shift_form_1.ShiftForm
            onCancel={() => setIsEditing(false)}
            onSuccess={() => {
              setIsEditing(false);
              onDelete?.();
              onClose();
            }}
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
          />
        </dialog_1.DialogContent>
      </dialog_1.Dialog>
    );
  }
  return (
    <dialog_1.Dialog onOpenChange={onClose} open={open}>
      <dialog_1.DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <dialog_1.DialogHeader>
          <dialog_1.DialogTitle>Shift Details</dialog_1.DialogTitle>
          <dialog_1.DialogDescription>
            {shift.employee_first_name} {shift.employee_last_name} -{" "}
            {formatDate(shift.shift_start)}
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
                {shift.employee_first_name} {shift.employee_last_name}
              </h3>
              <p className="text-sm text-muted-foreground">
                {shift.employee_email}
              </p>
              <div className="mt-2 flex gap-2">
                <badge_1.Badge variant="secondary">
                  {shift.employee_role}
                </badge_1.Badge>
                {shift.role_during_shift && (
                  <badge_1.Badge variant="outline">
                    Role: {shift.role_during_shift}
                  </badge_1.Badge>
                )}
              </div>
            </div>
          </div>

          {/* Time & Location */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="flex items-start gap-3 p-4 border rounded-lg">
              <lucide_react_1.ClockIcon className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm text-muted-foreground">Time</p>
                <p className="font-medium">{formatDate(shift.shift_start)}</p>
                <p className="text-sm">
                  {formatTime(shift.shift_start)} -{" "}
                  {formatTime(shift.shift_end)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Duration:{" "}
                  {calculateDuration(shift.shift_start, shift.shift_end)}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 border rounded-lg">
              <lucide_react_1.MapPinIcon className="h-5 w-5 text-muted-foreground mt-0.5" />
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
            <button_1.Button
              onClick={() => setIsEditing(true)}
              variant="outline"
            >
              <lucide_react_1.PencilIcon className="h-4 w-4 mr-2" />
              Edit
            </button_1.Button>
            <button_1.Button
              disabled={isDeleting}
              onClick={handleDelete}
              variant="destructive"
            >
              {isDeleting && (
                <lucide_react_1.Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
              )}
              <lucide_react_1.Trash2Icon className="h-4 w-4 mr-2" />
              Delete
            </button_1.Button>
          </div>
        </div>
      </dialog_1.DialogContent>
    </dialog_1.Dialog>
  );
}
