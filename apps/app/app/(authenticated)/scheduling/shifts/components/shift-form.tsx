"use client";

import { Button } from "@repo/design-system/components/ui/button";
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
import {
  createShift,
  getAvailableEmployees,
  getEmployees,
  getLocations,
  getSchedules,
  updateShift,
} from "../actions";

interface Shift {
  id?: string;
  schedule_id?: string;
  employee_id?: string;
  location_id?: string;
  shift_start?: string;
  shift_end?: string;
  role_during_shift?: string | null;
  notes?: string | null;
}

interface ShiftFormProps {
  shift?: Shift | null;
  scheduleId?: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

interface Employee {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
  role: string;
  is_active: boolean;
  hasConflictingShift?: boolean;
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

const formatDateTimeLocal = (dateStr: string | undefined) => {
  if (!dateStr) return "";
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
  const [availableEmployees, setAvailableEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkingAvailability, setCheckingAvailability] = useState(false);
  const [showAllEmployees, setShowAllEmployees] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    scheduleId: shift?.schedule_id || scheduleId || "",
    employeeId: shift?.employee_id || "",
    locationId: shift?.location_id || "",
    shiftStart: formatDateTimeLocal(shift?.shift_start),
    shiftEnd: formatDateTimeLocal(shift?.shift_end),
    roleDuringShift: shift?.role_during_shift || "",
    notes: shift?.notes || "",
    allowOverlap: false,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Load initial data
  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const [employeesData, locationsData, schedulesData] = await Promise.all(
          [getEmployees(), getLocations(), getSchedules()]
        );
        setEmployees(employeesData.employees || []);
        setLocations(locationsData.locations || []);
        setSchedules(schedulesData.schedules || []);
      } catch (error) {
        toast.error("Failed to load form data", {
          description: error instanceof Error ? error.message : "Unknown error",
        });
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Check available employees when times change
  useEffect(() => {
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
    if (!formData.scheduleId) newErrors.scheduleId = "Schedule is required";
    if (!formData.employeeId) newErrors.employeeId = "Employee is required";
    if (!formData.locationId) newErrors.locationId = "Location is required";
    if (!formData.shiftStart) newErrors.shiftStart = "Start time is required";
    if (!formData.shiftEnd) newErrors.shiftEnd = "End time is required";
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

    // Create FormData for server action
    const submitData = new FormData();
    submitData.append("scheduleId", formData.scheduleId);
    submitData.append("employeeId", formData.employeeId);
    submitData.append("locationId", formData.locationId);
    submitData.append(
      "shiftStart",
      new Date(formData.shiftStart).toISOString()
    );
    submitData.append("shiftEnd", new Date(formData.shiftEnd).toISOString());
    if (formData.roleDuringShift)
      submitData.append("roleDuringShift", formData.roleDuringShift);
    if (formData.notes) submitData.append("notes", formData.notes);
    if (formData.allowOverlap) submitData.append("allowOverlap", "true");

    try {
      if (isEditing && shift?.id) {
        await updateShift(shift.id, submitData);
        toast.success("Shift updated successfully");
      } else {
        await createShift(submitData);
        toast.success("Shift created successfully");
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
                  {schedule.schedule_date.toLocaleDateString()} (
                  {schedule.status})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.scheduleId && (
            <p className="text-sm text-destructive">{errors.scheduleId}</p>
          )}
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
            <p className="text-sm text-destructive">{errors.locationId}</p>
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
              <p className="text-sm text-destructive">{errors.employeeId}</p>
            )}
            {hasConflicts && (
              <p className="text-sm text-orange-600">
                This employee has a conflicting shift. Enable "Allow Overlap" to
                proceed.
              </p>
            )}
          </div>
          {availableEmployees.length > 0 &&
            availableEmployees.length < employees.length && (
              <button
                className="text-sm text-muted-foreground hover:text-foreground"
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
          <Input
            id="shiftStart"
            onChange={(e) =>
              setFormData({ ...formData, shiftStart: e.target.value })
            }
            type="datetime-local"
            value={formData.shiftStart}
          />
          {errors.shiftStart && (
            <p className="text-sm text-destructive">{errors.shiftStart}</p>
          )}
        </div>

        {/* End Time */}
        <div className="flex flex-col gap-2">
          <Label htmlFor="shiftEnd">End Time *</Label>
          <Input
            id="shiftEnd"
            onChange={(e) =>
              setFormData({ ...formData, shiftEnd: e.target.value })
            }
            type="datetime-local"
            value={formData.shiftEnd}
          />
          {errors.shiftEnd && (
            <p className="text-sm text-destructive">{errors.shiftEnd}</p>
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
