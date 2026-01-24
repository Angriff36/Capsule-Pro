"use client";

Object.defineProperty(exports, "__esModule", { value: true });
exports.AvailabilityForm = AvailabilityForm;
const button_1 = require("@repo/design-system/components/ui/button");
const input_1 = require("@repo/design-system/components/ui/input");
const label_1 = require("@repo/design-system/components/ui/label");
const select_1 = require("@repo/design-system/components/ui/select");
const react_1 = require("react");
const sonner_1 = require("sonner");
const actions_1 = require("../actions");
function AvailabilityForm({
  availability,
  employeeOptions = [],
  locationOptions = [],
  onCancel,
  onSuccess,
}) {
  const [formData, setFormData] = (0, react_1.useState)({
    employeeId: availability?.employee_id || "",
    dayOfWeek: availability?.day_of_week?.toString() || "",
    startTime: availability?.start_time || "",
    endTime: availability?.end_time || "",
    isAvailable: availability?.is_available?.toString() || "true",
    effectiveFrom: availability?.effective_from
      ? new Date(availability.effective_from).toISOString().slice(0, 16)
      : "",
    effectiveUntil: availability?.effective_until
      ? new Date(availability.effective_until).toISOString().slice(0, 16)
      : "",
  });
  const [loading, setLoading] = (0, react_1.useState)(false);
  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    try {
      const form = new FormData();
      form.append("employeeId", formData.employeeId);
      form.append("dayOfWeek", formData.dayOfWeek);
      form.append("startTime", formData.startTime);
      form.append("endTime", formData.endTime);
      form.append("isAvailable", formData.isAvailable);
      form.append("effectiveFrom", formData.effectiveFrom);
      if (formData.effectiveUntil) {
        form.append("effectiveUntil", formData.effectiveUntil);
      }
      if (availability) {
        await (0, actions_1.updateAvailability)(availability.id, form);
        sonner_1.toast.success("Availability updated successfully");
      } else {
        await (0, actions_1.createAvailability)(form);
        sonner_1.toast.success("Availability created successfully");
      }
      onSuccess();
    } catch (error) {
      sonner_1.toast.error(
        "Failed to save availability",
        error instanceof Error
          ? { description: error.message }
          : { description: "Unknown error occurred" }
      );
    } finally {
      setLoading(false);
    }
  };
  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };
  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label_1.Label htmlFor="employeeId">Employee</label_1.Label>
          <select_1.Select
            onValueChange={(value) => handleInputChange("employeeId", value)}
            required
            value={formData.employeeId}
          >
            <select_1.SelectTrigger>
              <select_1.SelectValue placeholder="Select employee" />
            </select_1.SelectTrigger>
            <select_1.SelectContent>
              {employeeOptions.map((emp) => (
                <select_1.SelectItem key={emp.id} value={emp.id}>
                  {emp.first_name} {emp.last_name} ({emp.email})
                </select_1.SelectItem>
              ))}
            </select_1.SelectContent>
          </select_1.Select>
        </div>

        <div className="space-y-2">
          <label_1.Label htmlFor="dayOfWeek">Day of Week</label_1.Label>
          <select_1.Select
            onValueChange={(value) => handleInputChange("dayOfWeek", value)}
            required
            value={formData.dayOfWeek}
          >
            <select_1.SelectTrigger>
              <select_1.SelectValue placeholder="Select day" />
            </select_1.SelectTrigger>
            <select_1.SelectContent>
              <select_1.SelectItem value="0">Sunday</select_1.SelectItem>
              <select_1.SelectItem value="1">Monday</select_1.SelectItem>
              <select_1.SelectItem value="2">Tuesday</select_1.SelectItem>
              <select_1.SelectItem value="3">Wednesday</select_1.SelectItem>
              <select_1.SelectItem value="4">Thursday</select_1.SelectItem>
              <select_1.SelectItem value="5">Friday</select_1.SelectItem>
              <select_1.SelectItem value="6">Saturday</select_1.SelectItem>
            </select_1.SelectContent>
          </select_1.Select>
        </div>

        <div className="space-y-2">
          <label_1.Label htmlFor="startTime">Start Time</label_1.Label>
          <input_1.Input
            id="startTime"
            onChange={(e) => handleInputChange("startTime", e.target.value)}
            required
            type="time"
            value={formData.startTime}
          />
        </div>

        <div className="space-y-2">
          <label_1.Label htmlFor="endTime">End Time</label_1.Label>
          <input_1.Input
            id="endTime"
            onChange={(e) => handleInputChange("endTime", e.target.value)}
            required
            type="time"
            value={formData.endTime}
          />
        </div>

        <div className="space-y-2">
          <label_1.Label htmlFor="isAvailable">Status</label_1.Label>
          <select_1.Select
            onValueChange={(value) => handleInputChange("isAvailable", value)}
            required
            value={formData.isAvailable}
          >
            <select_1.SelectTrigger>
              <select_1.SelectValue placeholder="Select status" />
            </select_1.SelectTrigger>
            <select_1.SelectContent>
              <select_1.SelectItem value="true">Available</select_1.SelectItem>
              <select_1.SelectItem value="false">
                Unavailable
              </select_1.SelectItem>
            </select_1.SelectContent>
          </select_1.Select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label_1.Label htmlFor="effectiveFrom">Effective From</label_1.Label>
          <input_1.Input
            id="effectiveFrom"
            onChange={(e) => handleInputChange("effectiveFrom", e.target.value)}
            required
            type="date"
            value={formData.effectiveFrom}
          />
        </div>

        <div className="space-y-2">
          <label_1.Label htmlFor="effectiveUntil">
            Effective Until
          </label_1.Label>
          <input_1.Input
            id="effectiveUntil"
            onChange={(e) =>
              handleInputChange("effectiveUntil", e.target.value)
            }
            type="date"
            value={formData.effectiveUntil}
          />
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <button_1.Button onClick={onCancel} type="button" variant="outline">
          Cancel
        </button_1.Button>
        <button_1.Button disabled={loading} type="submit">
          {loading
            ? "Saving..."
            : availability
              ? "Update Availability"
              : "Create Availability"}
        </button_1.Button>
      </div>
    </form>
  );
}
