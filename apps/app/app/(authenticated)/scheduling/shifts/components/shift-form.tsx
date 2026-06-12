"use client";

import { Button } from "@repo/design-system/components/ui/button";
import { DateTimePicker } from "@repo/design-system/components/ui/date-time-picker";
import { Input } from "@repo/design-system/components/ui/input";
import { Label } from "@repo/design-system/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/design-system/components/ui/select";
import { Textarea } from "@repo/design-system/components/ui/textarea";
import { Loader2Icon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { apiFetch } from "@/app/lib/api";
import {
  staffShiftsCreateCommand,
  staffShiftsUpdateCommand,
} from "@/app/lib/routes";
import {
  getAvailableEmployees,
  getEmployees,
  getEvents,
  getLocations,
  getSchedules,
} from "../actions";

interface Shift {
  employeeId?: string;
  id?: string;
  location_id?: string;
  notes?: string | null;
  role_during_shift?: string | null;
  schedule_id?: string;
  shift_end?: string;
  shift_start?: string;
}

interface ShiftFormProps {
  onCancel?: () => void;
  onSuccess?: () => void;
  scheduleId?: string;
  shift?: Shift | null;
}

interface Employee {
  email: string;
  first_name: string | null;
  hasConflictingShift?: boolean;
  id: string;
  is_active: boolean;
  last_name: string | null;
  role: string;
}

interface Location {
  id: string;
  name: string;
}

interface Schedule {
  id: string;
  schedule_date: Date;
  status: string;
}

interface Event {
  eventDate: Date;
  eventType: string;
  id: string;
  status: string;
  title: string;
}

const formatDateTimeLocal = (dateStr: string | undefined) => {
  if (!dateStr) {
    return "";
  }
  const date = new Date(dateStr);
  // Format: YYYY-MM-DDTHH:mm
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

export function ShiftForm({
  shift,
  scheduleId,
  onSuccess,
  onCancel,
}: ShiftFormProps) {
  const router = useRouter();
  const isEditing = Boolean(shift?.id);

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [availableEmployees, setAvailableEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkingAvailability, setCheckingAvailability] = useState(false);
  const [showAllEmployees, setShowAllEmployees] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    scheduleId: shift?.schedule_id || scheduleId || "",
    employeeId: shift?.employeeId || "",
    locationId: shift?.location_id || "",
    eventId: "",
    shiftStart: formatDateTimeLocal(shift?.shift_start),
    shiftEnd: formatDateTimeLocal(shift?.shift_end),
    roleDuringShift: shift?.role_during_shift || "",
    notes: shift?.notes || "",
    allowOverlap: false,
    ignoreAvailabilityWarning: false,
  });
  const [availabilityWarning, setAvailabilityWarning] = useState<string | null>(
    null
  );

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Load initial data
  useEffect(() => {
    async function loadData() {
      setLoading(true);
      const [employeesResult, locationsResult, schedulesResult, eventsResult] =
        await Promise.allSettled([
          getEmployees(),
          getLocations(),
          getSchedules(),
          getEvents(),
        ]);

      const failed: string[] = [];

      if (employeesResult.status === "fulfilled") {
        setEmployees(employeesResult.value.employees || []);
      } else {
        console.error("Failed to load employees:", employeesResult.reason);
        failed.push("employees");
      }

      if (locationsResult.status === "fulfilled") {
        setLocations(locationsResult.value.locations || []);
      } else {
        console.error("Failed to load locations:", locationsResult.reason);
        failed.push("locations");
      }

      if (schedulesResult.status === "fulfilled") {
        setSchedules(schedulesResult.value.schedules || []);
      } else {
        console.error("Failed to load schedules:", schedulesResult.reason);
        failed.push("schedules");
      }

      if (eventsResult.status === "fulfilled") {
        setEvents(eventsResult.value.events || []);
      } else {
        console.error("Failed to load events:", eventsResult.reason);
        failed.push("events");
      }

      if (failed.length > 0) {
        toast.error(`Failed to load: ${failed.join(", ")}`, {
          description: "Some dropdown options may be unavailable.",
        });
      }

      setLoading(false);
    }
    loadData();
  }, []);

  // Check available employees when times change
  useEffect(() => {
    // Clear availability warning when inputs change (user is adjusting the shift)
    setAvailabilityWarning(null);
    setFormData((prev) => ({ ...prev, ignoreAvailabilityWarning: false }));

    async function checkAvailability() {
      if (formData.shiftStart && formData.shiftEnd && formData.locationId) {
        setCheckingAvailability(true);
        try {
          const data = await getAvailableEmployees({
            shiftStart: new Date(formData.shiftStart).toISOString(),
            shiftEnd: new Date(formData.shiftEnd).toISOString(),
            excludeShiftId: shift?.id,
            locationId: formData.locationId,
          });
          setAvailableEmployees(data.employees || []);
        } catch (error) {
          console.error("Failed to check availability:", error);
        } finally {
          setCheckingAvailability(false);
        }
      }
    }
    checkAvailability();
  }, [formData.shiftStart, formData.shiftEnd, formData.locationId, shift?.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    // Basic validation
    const newErrors: Record<string, string> = {};
    if (!formData.scheduleId) {
      newErrors.scheduleId = "Schedule is required";
    }
    if (!formData.employeeId) {
      newErrors.employeeId = "Employee is required";
    }
    if (!formData.locationId) {
      newErrors.locationId = "Location is required";
    }
    if (!formData.shiftStart) {
      newErrors.shiftStart = "Start time is required";
    }
    if (!formData.shiftEnd) {
      newErrors.shiftEnd = "End time is required";
    }
    if (
      formData.shiftStart &&
      formData.shiftEnd &&
      new Date(formData.shiftStart) >= new Date(formData.shiftEnd)
    ) {
      newErrors.shiftEnd = "End time must be after start time";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    // Build JSON payload for validated API route
    const payload = {
      scheduleId: formData.scheduleId,
      employeeId: formData.employeeId,
      locationId: formData.locationId,
      eventId: formData.eventId || undefined,
      shiftStart: new Date(formData.shiftStart).getTime(),
      shiftEnd: new Date(formData.shiftEnd).getTime(),
      roleDuringShift: formData.roleDuringShift || undefined,
      notes: formData.notes || undefined,
      allowOverlap: formData.allowOverlap || undefined,
      ignoreAvailabilityWarning:
        formData.ignoreAvailabilityWarning || undefined,
    };

    try {
      const url =
        isEditing && shift?.id
          ? staffShiftsUpdateCommand()
          : staffShiftsCreateCommand();

      // Governed ScheduleShift create/update via the singular manifest dispatcher.
      const response = await apiFetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          isEditing && shift?.id ? { ...payload, id: shift.id } : payload
        ),
      });

      if (response.ok) {
        const result = await response.json();

        // Check for availability warning in response
        const availabilityWarn = result.warnings?.find(
          (w: { code?: string; message?: string } | string) =>
            typeof w === "object" && w.code === "availability_warning"
        );
        if (availabilityWarn && typeof availabilityWarn === "object") {
          setAvailabilityWarning(
            availabilityWarn.message ||
              "Employee may not be available for this shift."
          );
        } else {
          setAvailabilityWarning(null);
        }

        // Show success with any warnings
        if (result.warnings && result.warnings.length > 0) {
          const warningMessages = result.warnings.map(
            (w: { code?: string; message?: string } | string) =>
              typeof w === "object" ? w.message || w.code : w
          );
          toast.success(
            `Shift ${isEditing ? "updated" : "created"} with warnings`,
            {
              description: warningMessages.join(", "),
            }
          );
        } else {
          toast.success(
            `Shift ${isEditing ? "updated" : "created"} successfully`
          );
        }
      } else {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage =
          errorData.message ||
          errorData.error?.message ||
          `Failed to ${isEditing ? "update" : "create"} shift`;

        // Handle validation warnings (overtime, etc.)
        if (errorData.warnings && errorData.warnings.length > 0) {
          toast.warning("Shift created with warnings", {
            description: errorData.warnings.join(", "),
          });
        } else {
          throw new Error(errorMessage);
        }
      }

      onSuccess?.();
      router.refresh();
    } catch (error) {
      toast.error(`Failed to ${isEditing ? "update" : "create"} shift`, {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  const displayEmployees = showAllEmployees
    ? employees
    : availableEmployees.length > 0
      ? availableEmployees
      : employees;
  const hasConflicts = availableEmployees.some(
    (e) => e.id === formData.employeeId && e.hasConflictingShift
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2Icon className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <form className="flex flex-col gap-6" onSubmit={handleSubmit}>
      <div className="grid gap-6 md:grid-cols-2">
        {/* Schedule */}
        <div className="flex flex-col gap-2">
          <Label htmlFor="scheduleId">Schedule *</Label>
          <Select
            disabled={!!scheduleId}
            onValueChange={(value) =>
              setFormData({ ...formData, scheduleId: value })
            }
            value={formData.scheduleId}
          >
            <SelectTrigger id="scheduleId">
              <SelectValue placeholder="Select schedule" />
            </SelectTrigger>
            <SelectContent>
              {schedules.map((schedule) => (
                <SelectItem key={schedule.id} value={schedule.id}>
                  {new Date(schedule.schedule_date).toLocaleDateString()} (
                  {schedule.status})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.scheduleId && (
            <p className="text-destructive text-sm">{errors.scheduleId}</p>
          )}
        </div>

        {/* Event */}
        <div className="flex flex-col gap-2">
          <Label htmlFor="eventId">Event</Label>
          <Select
            onValueChange={(value) =>
              setFormData({ ...formData, eventId: value })
            }
            value={formData.eventId}
          >
            <SelectTrigger id="eventId">
              <SelectValue placeholder="Select event (optional)" />
            </SelectTrigger>
            <SelectContent>
              {events.map((event) => (
                <SelectItem key={event.id} value={event.id}>
                  {event.title}{" "}
                  {event.eventDate
                    ? `(${new Date(event.eventDate).toLocaleDateString()})`
                    : ""}{" "}
                  [{event.status}]
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Location */}
        <div className="flex flex-col gap-2">
          <Label htmlFor="locationId">Location *</Label>
          <Select
            onValueChange={(value) =>
              setFormData({ ...formData, locationId: value })
            }
            value={formData.locationId}
          >
            <SelectTrigger id="locationId">
              <SelectValue placeholder="Select location" />
            </SelectTrigger>
            <SelectContent>
              {locations.map((location) => (
                <SelectItem key={location.id} value={location.id}>
                  {location.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.locationId && (
            <p className="text-destructive text-sm">{errors.locationId}</p>
          )}
        </div>

        {/* Employee */}
        <div className="flex flex-col gap-2">
          <Label htmlFor="employeeId">Employee *</Label>
          <Select
            onValueChange={(value) =>
              setFormData({ ...formData, employeeId: value })
            }
            value={formData.employeeId}
          >
            <SelectTrigger id="employeeId">
              <SelectValue placeholder="Select employee" />
            </SelectTrigger>
            <SelectContent>
              {displayEmployees.map((employee) => {
                const isUnavailable =
                  availableEmployees.length > 0 &&
                  !availableEmployees.some((e) => e.id === employee.id);
                const hasConflict =
                  employee.id === formData.employeeId && hasConflicts;
                return (
                  <SelectItem
                    disabled={isUnavailable && !showAllEmployees}
                    key={employee.id}
                    value={employee.id}
                  >
                    {employee.first_name} {employee.last_name} ({employee.role})
                    {hasConflict && " ⚠️ Conflict"}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
          <div className="flex items-center gap-2">
            {errors.employeeId && (
              <p className="text-destructive text-sm">{errors.employeeId}</p>
            )}
            {hasConflicts && (
              <p className="text-orange-600 text-sm">
                This employee has a conflicting shift. Enable "Allow Overlap" to
                proceed.
              </p>
            )}
          </div>
          {availableEmployees.length > 0 &&
            availableEmployees.length < employees.length && (
              <button
                className="text-muted-foreground text-sm hover:text-foreground"
                onClick={() => setShowAllEmployees(!showAllEmployees)}
                type="button"
              >
                {showAllEmployees
                  ? "Show available only"
                  : `Show all employees (${employees.length} total)`}
              </button>
            )}
        </div>

        {/* Role During Shift */}
        <div className="flex flex-col gap-2">
          <Label htmlFor="roleDuringShift">Role During Shift</Label>
          <Input
            id="roleDuringShift"
            onChange={(e) =>
              setFormData({ ...formData, roleDuringShift: e.target.value })
            }
            placeholder="e.g., Line Cook, Server"
            value={formData.roleDuringShift}
          />
        </div>

        {/* Start Time */}
        <div className="flex flex-col gap-2">
          <Label htmlFor="shiftStart">Start Time *</Label>
          <DateTimePicker
            id="shiftStart"
            onChange={(e) =>
              setFormData({ ...formData, shiftStart: e.target.value })
            }
            value={formData.shiftStart}
          />
          {errors.shiftStart && (
            <p className="text-destructive text-sm">{errors.shiftStart}</p>
          )}
        </div>

        {/* End Time */}
        <div className="flex flex-col gap-2">
          <Label htmlFor="shiftEnd">End Time *</Label>
          <DateTimePicker
            id="shiftEnd"
            onChange={(e) =>
              setFormData({ ...formData, shiftEnd: e.target.value })
            }
            value={formData.shiftEnd}
          />
          {errors.shiftEnd && (
            <p className="text-destructive text-sm">{errors.shiftEnd}</p>
          )}
        </div>

        {/* Notes */}
        <div className="flex flex-col gap-2 md:col-span-2">
          <Label htmlFor="notes">Notes</Label>
          <Textarea
            id="notes"
            onChange={(e) =>
              setFormData({ ...formData, notes: e.target.value })
            }
            placeholder="Additional notes or instructions..."
            rows={3}
            value={formData.notes}
          />
        </div>

        {/* Allow Overlap */}
        {(hasConflicts || isEditing) && (
          <div className="flex flex-col gap-2 md:col-span-2">
            <label className="flex items-center gap-2">
              <input
                checked={formData.allowOverlap}
                className="h-4 w-4 rounded border-gray-300"
                onChange={(e) =>
                  setFormData({ ...formData, allowOverlap: e.target.checked })
                }
                type="checkbox"
              />
              <span className="text-sm">Allow overlapping shifts</span>
            </label>
          </div>
        )}

        {/* Availability Warning Override */}
        {availabilityWarning && (
          <div className="flex flex-col gap-2 rounded-md border border-orange-200 bg-orange-50 p-3 md:col-span-2">
            <p className="font-medium text-orange-800 text-sm">
              Availability Warning
            </p>
            <p className="text-orange-700 text-sm">{availabilityWarning}</p>
            <label className="flex items-center gap-2">
              <input
                checked={formData.ignoreAvailabilityWarning}
                className="h-4 w-4 rounded border-gray-300"
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    ignoreAvailabilityWarning: e.target.checked,
                  })
                }
                type="checkbox"
              />
              <span className="text-orange-700 text-sm">
                Override: schedule outside employee&apos;s availability window
              </span>
            </label>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3">
        {onCancel && (
          <Button onClick={onCancel} type="button" variant="outline">
            Cancel
          </Button>
        )}
        <Button disabled={checkingAvailability} type="submit">
          {checkingAvailability && (
            <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
          )}
          {isEditing ? "Update Shift" : "Create Shift"}
        </Button>
      </div>
    </form>
  );
}
