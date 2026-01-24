"use client";

Object.defineProperty(exports, "__esModule", { value: true });
exports.AvailabilityDetailModal = AvailabilityDetailModal;
const button_1 = require("@repo/design-system/components/ui/button");
const dialog_1 = require("@repo/design-system/components/ui/dialog");
const lucide_react_1 = require("lucide-react");
const react_1 = require("react");
const sonner_1 = require("sonner");
const actions_1 = require("../actions");
function AvailabilityDetailModal({ open, onClose, onDelete, availability }) {
  const [loading, setLoading] = (0, react_1.useState)(false);
  const handleDelete = async () => {
    if (!availability) return;
    setLoading(true);
    try {
      await (0, actions_1.deleteAvailability)(availability.id);
      sonner_1.toast.success("Availability deleted successfully");
      onDelete();
      onClose();
    } catch (error) {
      sonner_1.toast.error(
        "Failed to delete availability",
        error instanceof Error
          ? { description: error.message }
          : { description: "Unknown error occurred" }
      );
    } finally {
      setLoading(false);
    }
  };
  const formatDate = (date) => {
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };
  const formatTime = (timeString) => {
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
    <dialog_1.Dialog onOpenChange={onClose} open={open}>
      <dialog_1.DialogContent className="sm:max-w-[600px]">
        <dialog_1.DialogHeader>
          <dialog_1.DialogTitle className="flex items-center gap-2">
            <lucide_react_1.CalendarIcon className="h-5 w-5" />
            Availability Details
          </dialog_1.DialogTitle>
          <dialog_1.DialogDescription>
            Detailed information about this availability entry
          </dialog_1.DialogDescription>
        </dialog_1.DialogHeader>

        {availability && (
          <div className="space-y-4">
            {/* Basic Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <lucide_react_1.UserIcon className="h-4 w-4" />
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
                  <lucide_react_1.CalendarIcon className="h-4 w-4" />
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
                  <lucide_react_1.ClockIcon className="h-4 w-4" />
                  Start Time
                </div>
                <div className="font-medium">
                  {formatTime(availability.start_time)}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <lucide_react_1.ClockIcon className="h-4 w-4" />
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
                  <lucide_react_1.InfoIcon className="h-4 w-4" />
                  Status
                </div>
                <div className="font-medium">
                  {availability.is_available ? "Available" : "Unavailable"}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <lucide_react_1.CalendarIcon className="h-4 w-4" />
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
                <lucide_react_1.CalendarIcon className="h-4 w-4" />
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

        <dialog_1.DialogFooter>
          <button_1.Button onClick={onClose} variant="outline">
            Close
          </button_1.Button>
          {availability && (
            <button_1.Button
              disabled={loading}
              onClick={handleDelete}
              variant="destructive"
            >
              <lucide_react_1.TrashIcon className="h-4 w-4 mr-2" />
              {loading ? "Deleting..." : "Delete"}
            </button_1.Button>
          )}
        </dialog_1.DialogFooter>
      </dialog_1.DialogContent>
    </dialog_1.Dialog>
  );
}
