"use client";

Object.defineProperty(exports, "__esModule", { value: true });
exports.ShiftForm = ShiftForm;
const button_1 = require("@repo/design-system/components/ui/button");
const input_1 = require("@repo/design-system/components/ui/input");
const label_1 = require("@repo/design-system/components/ui/label");
const select_1 = require("@repo/design-system/components/ui/select");
const textarea_1 = require("@repo/design-system/components/ui/textarea");
const lucide_react_1 = require("lucide-react");
const navigation_1 = require("next/navigation");
const react_1 = require("react");
const sonner_1 = require("sonner");
const actions_1 = require("../actions");
const formatDateTimeLocal = (dateStr) => {
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
function ShiftForm({ shift, scheduleId, onSuccess, onCancel }) {
  const router = (0, navigation_1.useRouter)();
  const isEditing = Boolean(shift?.id);
  const [employees, setEmployees] = (0, react_1.useState)([]);
  const [locations, setLocations] = (0, react_1.useState)([]);
  const [schedules, setSchedules] = (0, react_1.useState)([]);
  const [availableEmployees, setAvailableEmployees] = (0, react_1.useState)([]);
  const [loading, setLoading] = (0, react_1.useState)(true);
  const [checkingAvailability, setCheckingAvailability] = (0, react_1.useState)(
    false
  );
  const [showAllEmployees, setShowAllEmployees] = (0, react_1.useState)(false);
  // Form state
  const [formData, setFormData] = (0, react_1.useState)({
    scheduleId: shift?.schedule_id || scheduleId || "",
    employeeId: shift?.employee_id || "",
    locationId: shift?.location_id || "",
    shiftStart: formatDateTimeLocal(shift?.shift_start),
    shiftEnd: formatDateTimeLocal(shift?.shift_end),
    roleDuringShift: shift?.role_during_shift || "",
    notes: shift?.notes || "",
    allowOverlap: false,
  });
  const [errors, setErrors] = (0, react_1.useState)({});
  // Load initial data
  (0, react_1.useEffect)(() => {
    async function loadData() {
      setLoading(true);
      try {
        const [employeesData, locationsData, schedulesData] = await Promise.all(
          [
            (0, actions_1.getEmployees)(),
            (0, actions_1.getLocations)(),
            (0, actions_1.getSchedules)(),
          ]
        );
        setEmployees(employeesData.employees || []);
        setLocations(locationsData.locations || []);
        setSchedules(schedulesData.schedules || []);
      } catch (error) {
        sonner_1.toast.error("Failed to load form data", {
          description: error instanceof Error ? error.message : "Unknown error",
        });
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);
  // Check available employees when times change
  (0, react_1.useEffect)(() => {
    async function checkAvailability() {
      if (formData.shiftStart && formData.shiftEnd && formData.locationId) {
        setCheckingAvailability(true);
        try {
          const data = await (0, actions_1.getAvailableEmployees)({
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
  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});
    // Basic validation
    const newErrors = {};
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
        await (0, actions_1.updateShift)(shift.id, submitData);
        sonner_1.toast.success("Shift updated successfully");
      } else {
        await (0, actions_1.createShift)(submitData);
        sonner_1.toast.success("Shift created successfully");
      }
      onSuccess?.();
      router.refresh();
    } catch (error) {
      sonner_1.toast.error(
        `Failed to ${isEditing ? "update" : "create"} shift`,
        {
          description: error instanceof Error ? error.message : "Unknown error",
        }
      );
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
        <lucide_react_1.Loader2Icon className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }
  return (
    <form className="flex flex-col gap-6" onSubmit={handleSubmit}>
      <div className="grid gap-6 md:grid-cols-2">
        {/* Schedule */}
        <div className="flex flex-col gap-2">
          <label_1.Label htmlFor="scheduleId">Schedule *</label_1.Label>
          <select_1.Select
            disabled={!!scheduleId}
            onValueChange={(value) =>
              setFormData({ ...formData, scheduleId: value })
            }
            value={formData.scheduleId}
          >
            <select_1.SelectTrigger id="scheduleId">
              <select_1.SelectValue placeholder="Select schedule" />
            </select_1.SelectTrigger>
            <select_1.SelectContent>
              {schedules.map((schedule) => (
                <select_1.SelectItem key={schedule.id} value={schedule.id}>
                  {schedule.schedule_date.toLocaleDateString()} (
                  {schedule.status})
                </select_1.SelectItem>
              ))}
            </select_1.SelectContent>
          </select_1.Select>
          {errors.scheduleId && (
            <p className="text-sm text-destructive">{errors.scheduleId}</p>
          )}
        </div>

        {/* Location */}
        <div className="flex flex-col gap-2">
          <label_1.Label htmlFor="locationId">Location *</label_1.Label>
          <select_1.Select
            onValueChange={(value) =>
              setFormData({ ...formData, locationId: value })
            }
            value={formData.locationId}
          >
            <select_1.SelectTrigger id="locationId">
              <select_1.SelectValue placeholder="Select location" />
            </select_1.SelectTrigger>
            <select_1.SelectContent>
              {locations.map((location) => (
                <select_1.SelectItem key={location.id} value={location.id}>
                  {location.name}
                </select_1.SelectItem>
              ))}
            </select_1.SelectContent>
          </select_1.Select>
          {errors.locationId && (
            <p className="text-sm text-destructive">{errors.locationId}</p>
          )}
        </div>

        {/* Employee */}
        <div className="flex flex-col gap-2">
          <label_1.Label htmlFor="employeeId">Employee *</label_1.Label>
          <select_1.Select
            onValueChange={(value) =>
              setFormData({ ...formData, employeeId: value })
            }
            value={formData.employeeId}
          >
            <select_1.SelectTrigger id="employeeId">
              <select_1.SelectValue placeholder="Select employee" />
            </select_1.SelectTrigger>
            <select_1.SelectContent>
              {displayEmployees.map((employee) => {
                const isUnavailable =
                  availableEmployees.length > 0 &&
                  !availableEmployees.some((e) => e.id === employee.id);
                const hasConflict =
                  employee.id === formData.employeeId && hasConflicts;
                return (
                  <select_1.SelectItem
                    disabled={isUnavailable && !showAllEmployees}
                    key={employee.id}
                    value={employee.id}
                  >
                    {employee.first_name} {employee.last_name} ({employee.role})
                    {hasConflict && " ⚠️ Conflict"}
                  </select_1.SelectItem>
                );
              })}
            </select_1.SelectContent>
          </select_1.Select>
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
          <label_1.Label htmlFor="roleDuringShift">
            Role During Shift
          </label_1.Label>
          <input_1.Input
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
          <label_1.Label htmlFor="shiftStart">Start Time *</label_1.Label>
          <input_1.Input
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
          <label_1.Label htmlFor="shiftEnd">End Time *</label_1.Label>
          <input_1.Input
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
          <label_1.Label htmlFor="notes">Notes</label_1.Label>
          <textarea_1.Textarea
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
          <button_1.Button onClick={onCancel} type="button" variant="outline">
            Cancel
          </button_1.Button>
        )}
        <button_1.Button disabled={checkingAvailability} type="submit">
          {checkingAvailability && (
            <lucide_react_1.Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
          )}
          {isEditing ? "Update Shift" : "Create Shift"}
        </button_1.Button>
      </div>
    </form>
  );
}
