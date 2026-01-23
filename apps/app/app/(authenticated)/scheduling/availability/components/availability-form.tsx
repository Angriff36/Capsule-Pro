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
import { useState } from "react";
import { toast } from "sonner";
import { createAvailability, updateAvailability } from "../actions";

interface AvailabilityFormProps {
  availability?: {
    id: string;
    employee_id: string;
    employee_first_name: string | null;
    employee_last_name: string | null;
    employee_email: string;
    employee_role: string;
    day_of_week: number;
    start_time: string;
    end_time: string;
    is_available: boolean;
    effective_from: Date;
    effective_until: Date | null;
    created_at: Date;
    updated_at: Date;
  };
  employeeOptions?: Array<{
    id: string;
    first_name: string | null;
    last_name: string | null;
    email: string;
    role: string;
  }>;
  onCancel: () => void;
  onSuccess: () => void;
}

export function AvailabilityForm({
  availability,
  employeeOptions = [],
  locationOptions = [],
  onCancel,
  onSuccess,
}: AvailabilityFormProps) {
  const [formData, setFormData] = useState({
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

  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
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
        await updateAvailability(availability.id, form);
        toast.success("Availability updated successfully");
      } else {
        await createAvailability(form);
        toast.success("Availability created successfully");
      }
      onSuccess();
    } catch (error) {
      toast.error(
        "Failed to save availability",
        error instanceof Error
          ? { description: error.message }
          : { description: "Unknown error occurred" }
      );
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="employeeId">Employee</Label>
          <Select
            onValueChange={(value) => handleInputChange("employeeId", value)}
            required
            value={formData.employeeId}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select employee" />
            </SelectTrigger>
            <SelectContent>
              {employeeOptions.map((emp) => (
                <SelectItem key={emp.id} value={emp.id}>
                  {emp.first_name} {emp.last_name} ({emp.email})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="dayOfWeek">Day of Week</Label>
          <Select
            onValueChange={(value) => handleInputChange("dayOfWeek", value)}
            required
            value={formData.dayOfWeek}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select day" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="0">Sunday</SelectItem>
              <SelectItem value="1">Monday</SelectItem>
              <SelectItem value="2">Tuesday</SelectItem>
              <SelectItem value="3">Wednesday</SelectItem>
              <SelectItem value="4">Thursday</SelectItem>
              <SelectItem value="5">Friday</SelectItem>
              <SelectItem value="6">Saturday</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="startTime">Start Time</Label>
          <Input
            id="startTime"
            onChange={(e) => handleInputChange("startTime", e.target.value)}
            required
            type="time"
            value={formData.startTime}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="endTime">End Time</Label>
          <Input
            id="endTime"
            onChange={(e) => handleInputChange("endTime", e.target.value)}
            required
            type="time"
            value={formData.endTime}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="isAvailable">Status</Label>
          <Select
            onValueChange={(value) => handleInputChange("isAvailable", value)}
            required
            value={formData.isAvailable}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="true">Available</SelectItem>
              <SelectItem value="false">Unavailable</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="effectiveFrom">Effective From</Label>
          <Input
            id="effectiveFrom"
            onChange={(e) => handleInputChange("effectiveFrom", e.target.value)}
            required
            type="date"
            value={formData.effectiveFrom}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="effectiveUntil">Effective Until</Label>
          <Input
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
        <Button onClick={onCancel} type="button" variant="outline">
          Cancel
        </Button>
        <Button disabled={loading} type="submit">
          {loading
            ? "Saving..."
            : availability
              ? "Update Availability"
              : "Create Availability"}
        </Button>
      </div>
    </form>
  );
}
