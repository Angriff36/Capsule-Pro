"use client";

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
  Table,
  TableBody,
  TableCell,
  TableRow,
} from "@repo/design-system/components/ui/table";
import {
  AlertTriangleIcon,
  CalendarIcon,
  CheckCircleIcon,
  ClockIcon,
  DollarSignIcon,
  MapPinIcon,
} from "lucide-react";
import { toast } from "sonner";

interface TimeEntry {
  id: string;
  employee_id: string;
  employee_first_name: string | null;
  employee_last_name: string | null;
  employee_email: string;
  employee_role: string;
  employee_number: string | null;
  location_id: string | null;
  location_name: string | null;
  shift_id: string | null;
  shift_start: Date | null;
  shift_end: Date | null;
  clock_in: Date;
  clock_out: Date | null;
  break_minutes: number;
  notes: string | null;
  approved_by: string | null;
  approved_at: Date | null;
  approver_first_name: string | null;
  approver_last_name: string | null;
  scheduled_hours: number | null;
  actual_hours: number | null;
  exception_type: string | null;
  hourly_rate: number | null;
  total_cost: number | null;
  created_at: Date;
  updated_at: Date;
}

interface TimecardDetailModalProps {
  timeEntry: TimeEntry | null;
  open: boolean;
  onClose: () => void;
  onApprove: () => void;
  onEditRequest: (
    reason: string,
    requestedChanges?: {
      requestedClockIn?: string;
      requestedClockOut?: string;
      requestedBreakMinutes?: number;
    }
  ) => void;
  onFlagException: (type: string, notes: string) => void;
}

function formatCurrency(value: number | null) {
  if (value === null) {
    return "N/A";
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);
}

function formatHours(value: number | null) {
  if (value === null) {
    return "N/A";
  }
  const hours = Math.floor(value);
  const minutes = Math.round((value - hours) * 60);
  return `${hours}h ${minutes}m`;
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function formatTime(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(date);
}

function getEmployeeName(firstName: string | null, lastName: string | null) {
  return [firstName, lastName].filter(Boolean).join(" ") || "Unknown";
}

export default function TimecardDetailModal({
  timeEntry,
  open,
  onClose,
  onApprove,
  onEditRequest,
  onFlagException,
}: TimecardDetailModalProps) {
  if (!timeEntry) {
    return null;
  }

  const isApproved = timeEntry.approved_at !== null;
  const isPending = timeEntry.clock_out !== null && !isApproved;
  const isOpen = timeEntry.clock_out === null;

  return (
    <Dialog onOpenChange={onClose} open={open}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Timecard Details</DialogTitle>
          <DialogDescription>
            Review time entry details and take action
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <h3 className="mb-2 font-semibold">Employee Information</h3>
              <Table>
                <TableBody>
                  <TableRow>
                    <TableCell className="font-medium">Name</TableCell>
                    <TableCell>
                      {getEmployeeName(
                        timeEntry.employee_first_name,
                        timeEntry.employee_last_name
                      )}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Email</TableCell>
                    <TableCell>{timeEntry.employee_email}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Role</TableCell>
                    <TableCell>{timeEntry.employee_role}</TableCell>
                  </TableRow>
                  {timeEntry.employee_number && (
                    <TableRow>
                      <TableCell className="font-medium">Employee #</TableCell>
                      <TableCell>{timeEntry.employee_number}</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            <div>
              <h3 className="mb-2 font-semibold">Time Details</h3>
              <Table>
                <TableBody>
                  <TableRow>
                    <TableCell className="font-medium">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      Date
                    </TableCell>
                    <TableCell>{formatDate(timeEntry.clock_in)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">
                      <ClockIcon className="mr-2 h-4 w-4" />
                      Clock In
                    </TableCell>
                    <TableCell>{formatTime(timeEntry.clock_in)}</TableCell>
                  </TableRow>
                  {timeEntry.clock_out && (
                    <TableRow>
                      <TableCell className="font-medium">
                        <ClockIcon className="mr-2 h-4 w-4" />
                        Clock Out
                      </TableCell>
                      <TableCell>{formatTime(timeEntry.clock_out)}</TableCell>
                    </TableRow>
                  )}
                  {timeEntry.break_minutes > 0 && (
                    <TableRow>
                      <TableCell className="font-medium">
                        Break Duration
                      </TableCell>
                      <TableCell>{timeEntry.break_minutes} minutes</TableCell>
                    </TableRow>
                  )}
                  {timeEntry.shift_start && timeEntry.shift_end && (
                    <TableRow>
                      <TableCell className="font-medium">
                        Scheduled Time
                      </TableCell>
                      <TableCell>
                        {formatTime(timeEntry.shift_start)} -{" "}
                        {formatTime(timeEntry.shift_end)}
                      </TableCell>
                    </TableRow>
                  )}
                  <TableRow>
                    <TableCell className="font-medium">Actual Hours</TableCell>
                    <TableCell>{formatHours(timeEntry.actual_hours)}</TableCell>
                  </TableRow>
                  {timeEntry.scheduled_hours && (
                    <TableRow>
                      <TableCell className="font-medium">
                        Scheduled Hours
                      </TableCell>
                      <TableCell>
                        {formatHours(timeEntry.scheduled_hours)}
                      </TableCell>
                    </TableRow>
                  )}
                  {timeEntry.location_name && (
                    <TableRow>
                      <TableCell className="font-medium">
                        <MapPinIcon className="mr-2 h-4 w-4" />
                        Location
                      </TableCell>
                      <TableCell>{timeEntry.location_name}</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

          <div>
            <h3 className="mb-2 font-semibold">Cost & Approval</h3>
            <Table>
              <TableBody>
                <TableRow>
                  <TableCell className="font-medium">
                    <DollarSignIcon className="mr-2 h-4 w-4" />
                    Hourly Rate
                  </TableCell>
                  <TableCell>{formatCurrency(timeEntry.hourly_rate)}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Total Cost</TableCell>
                  <TableCell>{formatCurrency(timeEntry.total_cost)}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Status</TableCell>
                  <TableCell>
                    {isApproved ? (
                      <Badge
                        className="flex items-center gap-1"
                        variant="secondary"
                      >
                        <CheckCircleIcon className="h-3 w-3" />
                        Approved
                      </Badge>
                    ) : isOpen ? (
                      <Badge variant="default">
                        <ClockIcon className="h-3 w-3" />
                        Open
                      </Badge>
                    ) : (
                      <Badge variant="outline">Pending</Badge>
                    )}
                  </TableCell>
                </TableRow>
                {timeEntry.approver_first_name && (
                  <TableRow>
                    <TableCell className="font-medium">Approved By</TableCell>
                    <TableCell>
                      {timeEntry.approver_first_name}{" "}
                      {timeEntry.approver_last_name?.[0]}
                    </TableCell>
                  </TableRow>
                )}
                {timeEntry.approved_at && (
                  <TableRow>
                    <TableCell className="font-medium">Approved At</TableCell>
                    <TableCell>
                      {new Intl.DateTimeFormat("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                        hour12: true,
                      }).format(timeEntry.approved_at)}
                    </TableCell>
                  </TableRow>
                )}
                {timeEntry.exception_type && (
                  <TableRow>
                    <TableCell className="font-medium">
                      <AlertTriangleIcon className="mr-2 h-4 w-4 text-orange-600" />
                      Exception
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {timeEntry.exception_type
                          .split("_")
                          .map(
                            (word) =>
                              word.charAt(0).toUpperCase() + word.slice(1)
                          )
                          .join(" ")}
                      </Badge>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
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
                <Button
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
                </Button>
                <Button
                  onClick={() => {
                    const reason = prompt("Enter edit request reason:");
                    if (reason) {
                      onEditRequest(reason);
                    }
                  }}
                  variant="outline"
                >
                  Request Edit
                </Button>
                <Button onClick={onApprove}>Approve</Button>
              </>
            )}
            {isOpen && (
              <Button
                onClick={() => {
                  toast.info("Clock out functionality to be implemented");
                }}
                variant="outline"
              >
                Clock Out
              </Button>
            )}
            {isApproved && (
              <Button onClick={onClose} variant="outline">
                Close
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
