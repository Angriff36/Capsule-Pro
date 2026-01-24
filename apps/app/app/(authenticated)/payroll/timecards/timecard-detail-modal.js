"use client";

Object.defineProperty(exports, "__esModule", { value: true });
exports.default = TimecardDetailModal;
const badge_1 = require("@repo/design-system/components/ui/badge");
const button_1 = require("@repo/design-system/components/ui/button");
const dialog_1 = require("@repo/design-system/components/ui/dialog");
const table_1 = require("@repo/design-system/components/ui/table");
const lucide_react_1 = require("lucide-react");
const sonner_1 = require("sonner");
function formatCurrency(value) {
  if (value === null) return "N/A";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);
}
function formatHours(value) {
  if (value === null) return "N/A";
  const hours = Math.floor(value);
  const minutes = Math.round((value - hours) * 60);
  return `${hours}h ${minutes}m`;
}
function formatDate(date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(date);
}
function formatTime(date) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(date);
}
function getEmployeeName(firstName, lastName) {
  return [firstName, lastName].filter(Boolean).join(" ") || "Unknown";
}
function TimecardDetailModal({
  timeEntry,
  open,
  onClose,
  onApprove,
  onEditRequest,
  onFlagException,
}) {
  if (!timeEntry) return null;
  const isApproved = timeEntry.approved_at !== null;
  const isPending = timeEntry.clock_out !== null && !isApproved;
  const isOpen = timeEntry.clock_out === null;
  return (
    <dialog_1.Dialog onOpenChange={onClose} open={open}>
      <dialog_1.DialogContent className="max-w-2xl">
        <dialog_1.DialogHeader>
          <dialog_1.DialogTitle>Timecard Details</dialog_1.DialogTitle>
          <dialog_1.DialogDescription>
            Review time entry details and take action
          </dialog_1.DialogDescription>
        </dialog_1.DialogHeader>

        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <h3 className="mb-2 font-semibold">Employee Information</h3>
              <table_1.Table>
                <table_1.TableBody>
                  <table_1.TableRow>
                    <table_1.TableCell className="font-medium">
                      Name
                    </table_1.TableCell>
                    <table_1.TableCell>
                      {getEmployeeName(
                        timeEntry.employee_first_name,
                        timeEntry.employee_last_name
                      )}
                    </table_1.TableCell>
                  </table_1.TableRow>
                  <table_1.TableRow>
                    <table_1.TableCell className="font-medium">
                      Email
                    </table_1.TableCell>
                    <table_1.TableCell>
                      {timeEntry.employee_email}
                    </table_1.TableCell>
                  </table_1.TableRow>
                  <table_1.TableRow>
                    <table_1.TableCell className="font-medium">
                      Role
                    </table_1.TableCell>
                    <table_1.TableCell>
                      {timeEntry.employee_role}
                    </table_1.TableCell>
                  </table_1.TableRow>
                  {timeEntry.employee_number && (
                    <table_1.TableRow>
                      <table_1.TableCell className="font-medium">
                        Employee #
                      </table_1.TableCell>
                      <table_1.TableCell>
                        {timeEntry.employee_number}
                      </table_1.TableCell>
                    </table_1.TableRow>
                  )}
                </table_1.TableBody>
              </table_1.Table>
            </div>

            <div>
              <h3 className="mb-2 font-semibold">Time Details</h3>
              <table_1.Table>
                <table_1.TableBody>
                  <table_1.TableRow>
                    <table_1.TableCell className="font-medium">
                      <lucide_react_1.CalendarIcon className="mr-2 h-4 w-4" />
                      Date
                    </table_1.TableCell>
                    <table_1.TableCell>
                      {formatDate(timeEntry.clock_in)}
                    </table_1.TableCell>
                  </table_1.TableRow>
                  <table_1.TableRow>
                    <table_1.TableCell className="font-medium">
                      <lucide_react_1.ClockIcon className="mr-2 h-4 w-4" />
                      Clock In
                    </table_1.TableCell>
                    <table_1.TableCell>
                      {formatTime(timeEntry.clock_in)}
                    </table_1.TableCell>
                  </table_1.TableRow>
                  {timeEntry.clock_out && (
                    <table_1.TableRow>
                      <table_1.TableCell className="font-medium">
                        <lucide_react_1.ClockIcon className="mr-2 h-4 w-4" />
                        Clock Out
                      </table_1.TableCell>
                      <table_1.TableCell>
                        {formatTime(timeEntry.clock_out)}
                      </table_1.TableCell>
                    </table_1.TableRow>
                  )}
                  {timeEntry.break_minutes > 0 && (
                    <table_1.TableRow>
                      <table_1.TableCell className="font-medium">
                        Break Duration
                      </table_1.TableCell>
                      <table_1.TableCell>
                        {timeEntry.break_minutes} minutes
                      </table_1.TableCell>
                    </table_1.TableRow>
                  )}
                  {timeEntry.shift_start && timeEntry.shift_end && (
                    <table_1.TableRow>
                      <table_1.TableCell className="font-medium">
                        Scheduled Time
                      </table_1.TableCell>
                      <table_1.TableCell>
                        {formatTime(timeEntry.shift_start)} -{" "}
                        {formatTime(timeEntry.shift_end)}
                      </table_1.TableCell>
                    </table_1.TableRow>
                  )}
                  <table_1.TableRow>
                    <table_1.TableCell className="font-medium">
                      Actual Hours
                    </table_1.TableCell>
                    <table_1.TableCell>
                      {formatHours(timeEntry.actual_hours)}
                    </table_1.TableCell>
                  </table_1.TableRow>
                  {timeEntry.scheduled_hours && (
                    <table_1.TableRow>
                      <table_1.TableCell className="font-medium">
                        Scheduled Hours
                      </table_1.TableCell>
                      <table_1.TableCell>
                        {formatHours(timeEntry.scheduled_hours)}
                      </table_1.TableCell>
                    </table_1.TableRow>
                  )}
                  {timeEntry.location_name && (
                    <table_1.TableRow>
                      <table_1.TableCell className="font-medium">
                        <lucide_react_1.MapPinIcon className="mr-2 h-4 w-4" />
                        Location
                      </table_1.TableCell>
                      <table_1.TableCell>
                        {timeEntry.location_name}
                      </table_1.TableCell>
                    </table_1.TableRow>
                  )}
                </table_1.TableBody>
              </table_1.Table>
            </div>
          </div>

          <div>
            <h3 className="mb-2 font-semibold">Cost & Approval</h3>
            <table_1.Table>
              <table_1.TableBody>
                <table_1.TableRow>
                  <table_1.TableCell className="font-medium">
                    <lucide_react_1.DollarSignIcon className="mr-2 h-4 w-4" />
                    Hourly Rate
                  </table_1.TableCell>
                  <table_1.TableCell>
                    {formatCurrency(timeEntry.hourly_rate)}
                  </table_1.TableCell>
                </table_1.TableRow>
                <table_1.TableRow>
                  <table_1.TableCell className="font-medium">
                    Total Cost
                  </table_1.TableCell>
                  <table_1.TableCell>
                    {formatCurrency(timeEntry.total_cost)}
                  </table_1.TableCell>
                </table_1.TableRow>
                <table_1.TableRow>
                  <table_1.TableCell className="font-medium">
                    Status
                  </table_1.TableCell>
                  <table_1.TableCell>
                    {isApproved ? (
                      <badge_1.Badge
                        className="flex items-center gap-1"
                        variant="secondary"
                      >
                        <lucide_react_1.CheckCircleIcon className="h-3 w-3" />
                        Approved
                      </badge_1.Badge>
                    ) : isOpen ? (
                      <badge_1.Badge variant="default">
                        <lucide_react_1.ClockIcon className="h-3 w-3" />
                        Open
                      </badge_1.Badge>
                    ) : (
                      <badge_1.Badge variant="outline">Pending</badge_1.Badge>
                    )}
                  </table_1.TableCell>
                </table_1.TableRow>
                {timeEntry.approver_first_name && (
                  <table_1.TableRow>
                    <table_1.TableCell className="font-medium">
                      Approved By
                    </table_1.TableCell>
                    <table_1.TableCell>
                      {timeEntry.approver_first_name}{" "}
                      {timeEntry.approver_last_name?.[0]}
                    </table_1.TableCell>
                  </table_1.TableRow>
                )}
                {timeEntry.approved_at && (
                  <table_1.TableRow>
                    <table_1.TableCell className="font-medium">
                      Approved At
                    </table_1.TableCell>
                    <table_1.TableCell>
                      {new Intl.DateTimeFormat("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                        hour12: true,
                      }).format(timeEntry.approved_at)}
                    </table_1.TableCell>
                  </table_1.TableRow>
                )}
                {timeEntry.exception_type && (
                  <table_1.TableRow>
                    <table_1.TableCell className="font-medium">
                      <lucide_react_1.AlertTriangleIcon className="mr-2 h-4 w-4 text-orange-600" />
                      Exception
                    </table_1.TableCell>
                    <table_1.TableCell>
                      <badge_1.Badge variant="secondary">
                        {timeEntry.exception_type
                          .split("_")
                          .map(
                            (word) =>
                              word.charAt(0).toUpperCase() + word.slice(1)
                          )
                          .join(" ")}
                      </badge_1.Badge>
                    </table_1.TableCell>
                  </table_1.TableRow>
                )}
              </table_1.TableBody>
            </table_1.Table>
          </div>

          {timeEntry.notes && (
            <div>
              <h3 className="mb-2 font-semibold">Notes</h3>
              <div className="rounded-md bg-muted p-3 text-sm">
                {timeEntry.notes}
              </div>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 border-t pt-4">
            {isPending && (
              <>
                <button_1.Button
                  onClick={() => {
                    const notes = prompt("Enter exception notes:");
                    if (notes) {
                      const type = prompt(
                        "Enter exception type (missing_clock_out, late_arrival, excessive_break, other):"
                      );
                      if (type) {
                        onFlagException(type, notes);
                      }
                    }
                  }}
                  variant="outline"
                >
                  Flag Exception
                </button_1.Button>
                <button_1.Button
                  onClick={() => {
                    const reason = prompt("Enter edit request reason:");
                    if (reason) {
                      onEditRequest(reason);
                    }
                  }}
                  variant="outline"
                >
                  Request Edit
                </button_1.Button>
                <button_1.Button onClick={onApprove}>Approve</button_1.Button>
              </>
            )}
            {isOpen && (
              <button_1.Button
                onClick={() => {
                  sonner_1.toast.info(
                    "Clock out functionality to be implemented"
                  );
                }}
                variant="outline"
              >
                Clock Out
              </button_1.Button>
            )}
            {isApproved && (
              <button_1.Button onClick={onClose} variant="outline">
                Close
              </button_1.Button>
            )}
          </div>
        </div>
      </dialog_1.DialogContent>
    </dialog_1.Dialog>
  );
}
