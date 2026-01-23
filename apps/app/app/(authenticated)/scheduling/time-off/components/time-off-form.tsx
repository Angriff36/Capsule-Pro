"use client";

import { Button } from "@repo/design-system/components/ui/button";
import { Checkbox } from "@repo/design-system/components/ui/checkbox";
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
import { AlertTriangle, Info, Loader2Icon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import type {
  CreateTimeOffRequestInput,
  TimeOffType,
} from "@/app/app/api/staff/time-off/types";
import { createTimeOffRequest, getEmployees, timeOffTypes } from "../actions";

interface TimeOffRequest {
  id?: string;
  employeeId?: string;
  startDate?: string;
  endDate?: string;
  reason?: string;
  requestType?: TimeOffType;
}

interface TimeOffFormProps {
  request?: TimeOffRequest | null;
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
}

export function TimeOffForm({
  request,
  onSuccess,
  onCancel,
}: TimeOffFormProps) {
  const router = useRouter();
  const isEditing = Boolean(request?.id);

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [checkingConflicts, setCheckingConflicts] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    employeeId: request?.employeeId || "",
    startDate: request?.startDate || "",
    endDate: request?.endDate || "",
    partialDay: false,
    startTime: "",
    endTime: "",
    reason: request?.reason || "",
    requestType: request?.requestType || "VACATION",
    requestAnyway: false,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [conflicts, setConflicts] = useState<{
    hasShiftConflicts: boolean;
    hasTimeOffConflicts: boolean;
    conflictingShifts?: Array<{
      id: string;
      shift_start: Date;
      shift_end: Date;
    }>;
    conflictingTimeOff?: Array<{
      id: string;
      start_date: Date;
      end_date: Date;
    }>;
  }>({
    hasShiftConflicts: false,
    hasTimeOffConflicts: false,
  });

  // Calculate duration
  const calculateDuration = () => {
    if (!(formData.startDate && formData.endDate)) return 0;

    const start = new Date(formData.startDate);
    const end = new Date(formData.endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

    // Account for partial days
    if (formData.partialDay && formData.startTime && formData.endTime) {
      const startDateTime = new Date(
        `${formData.startDate}T${formData.startTime}`
      );
      const endDateTime = new Date(`${formData.endDate}T${formData.endTime}`);
      const partialDiff = endDateTime.getTime() - startDateTime.getTime();
      const partialHours = partialDiff / (1000 * 60 * 60);
      return partialHours / 8; // Convert to business days (8 hours per day)
    }

    return diffDays;
  };

  const duration = calculateDuration();

  // Load initial data
  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const data = await getEmployees();
        setEmployees(data.employees || []);
      } catch (error) {
        toast.error("Failed to load employees", {
          description: error instanceof Error ? error.message : "Unknown error",
        });
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Check for conflicts when dates change
  const checkConflicts = async () => {
    if (formData.employeeId && formData.startDate && formData.endDate) {
      setCheckingConflicts(true);
      try {
        // This is a simplified implementation - in a real app, you'd call
        // a server action to check for actual conflicts
        // For now, we'll simulate the check
        const hasConflicts = Math.random() > 0.8; // 20% chance of conflict for demo

        setConflicts({
          hasShiftConflicts: hasConflicts,
          hasTimeOffConflicts: hasConflicts,
          conflictingShifts: hasConflicts
            ? [
                {
                  id: "shift1",
                  shift_start: new Date(formData.startDate),
                  shift_end: new Date(formData.endDate),
                },
              ]
            : undefined,
          conflictingTimeOff: hasConflicts
            ? [
                {
                  id: "request1",
                  start_date: new Date(formData.startDate),
                  end_date: new Date(formData.endDate),
                },
              ]
            : undefined,
        });
      } catch (error) {
        console.error("Failed to check conflicts:", error);
      } finally {
        setCheckingConflicts(false);
      }
    }
  };

  useEffect(() => {
    if (formData.employeeId && formData.startDate && formData.endDate) {
      const timeoutId = setTimeout(checkConflicts, 500);
      return () => clearTimeout(timeoutId);
    }
  }, [formData.employeeId, formData.startDate, formData.endDate]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    // Required fields
    if (!formData.employeeId) newErrors.employeeId = "Employee is required";
    if (!formData.startDate) newErrors.startDate = "Start date is required";
    if (!formData.endDate) newErrors.endDate = "End date is required";
    if (!formData.requestType)
      newErrors.requestType = "Request type is required";

    // Date validation
    if (formData.startDate && formData.endDate) {
      const startDate = new Date(formData.startDate);
      const endDate = new Date(formData.endDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (startDate < today) {
        newErrors.startDate = "Cannot select past dates";
      }
      if (endDate < startDate) {
        newErrors.endDate = "End date must be after start date";
      }
    }

    // Time validation for partial days
    if (
      formData.partialDay &&
      formData.startTime &&
      formData.endTime &&
      formData.startTime >= formData.endTime
    ) {
      newErrors.endTime = "End time must be after start time";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    if (!validateForm()) {
      return;
    }

    // Check conflicts and show warning if any
    if (
      (conflicts.hasShiftConflicts || conflicts.hasTimeOffConflicts) &&
      !formData.requestAnyway
    ) {
      return; // Don't submit if there are conflicts and user hasn't clicked "Request Anyway"
    }

    setSubmitting(true);

    try {
      // Create form data for server action
      const submitData: CreateTimeOffRequestInput = {
        employeeId: formData.employeeId,
        startDate: formData.startDate,
        endDate: formData.endDate,
        requestType: formData.requestType as TimeOffType,
      };

      // Add reason if provided
      if (formData.reason.trim()) {
        submitData.reason = formData.reason.trim();
      }

      const result = await createTimeOffRequest(submitData);
      toast.success(
        `Time-off request created successfully for ${duration} ${duration === 1 ? "day" : "days"}`
      );

      onSuccess?.();
      router.refresh();
    } catch (error) {
      toast.error("Failed to create time-off request", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setSubmitting(false);
    }
  };

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
              {employees.map((employee) => (
                <SelectItem key={employee.id} value={employee.id}>
                  {employee.first_name} {employee.last_name} ({employee.role})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.employeeId && (
            <p className="text-sm text-destructive">{errors.employeeId}</p>
          )}
        </div>

        {/* Request Type */}
        <div className="flex flex-col gap-2">
          <Label htmlFor="requestType">Request Type *</Label>
          <Select
            onValueChange={(value) =>
              setFormData({ ...formData, requestType: value as TimeOffType })
            }
            value={formData.requestType}
          >
            <SelectTrigger id="requestType">
              <SelectValue placeholder="Select request type" />
            </SelectTrigger>
            <SelectContent>
              {timeOffTypes.map((type) => (
                <SelectItem key={type} value={type}>
                  {type
                    .replace(/_/g, " ")
                    .replace(/\b\w/g, (l) => l.toUpperCase())}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.requestType && (
            <p className="text-sm text-destructive">{errors.requestType}</p>
          )}
        </div>

        {/* Start Date */}
        <div className="flex flex-col gap-2">
          <Label htmlFor="startDate">Start Date *</Label>
          <Input
            id="startDate"
            min={new Date().toISOString().split("T")[0]}
            onChange={(e) => {
              setFormData({ ...formData, startDate: e.target.value });
              if (
                conflicts.hasShiftConflicts ||
                conflicts.hasTimeOffConflicts
              ) {
                checkConflicts();
              }
            }}
            type="date"
            value={formData.startDate}
          />
          {errors.startDate && (
            <p className="text-sm text-destructive">{errors.startDate}</p>
          )}
        </div>

        {/* End Date */}
        <div className="flex flex-col gap-2">
          <Label htmlFor="endDate">End Date *</Label>
          <Input
            id="endDate"
            min={formData.startDate}
            onChange={(e) => {
              setFormData({ ...formData, endDate: e.target.value });
              if (
                conflicts.hasShiftConflicts ||
                conflicts.hasTimeOffConflicts
              ) {
                checkConflicts();
              }
            }}
            type="date"
            value={formData.endDate}
          />
          {errors.endDate && (
            <p className="text-sm text-destructive">{errors.endDate}</p>
          )}
        </div>

        {/* Duration Display */}
        <div className="flex flex-col gap-2">
          <Label>Duration</Label>
          <div className="text-sm text-muted-foreground bg-muted px-3 py-2 rounded-md">
            {duration > 0
              ? `${duration} ${duration === 1 ? "business day" : "business days"}`
              : "Select dates to calculate"}
          </div>
        </div>

        {/* Partial Day Toggle */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <Checkbox
              checked={formData.partialDay}
              id="partialDay"
              onCheckedChange={(checked) =>
                setFormData({ ...formData, partialDay: !!checked })
              }
            />
            <Label htmlFor="partialDay">Partial Day</Label>
          </div>
          <p className="text-xs text-muted-foreground">
            Enable if you need to specify exact hours for the day
          </p>
        </div>

        {/* Start Time (shown if partial day is enabled) */}
        {formData.partialDay && (
          <div className="flex flex-col gap-2">
            <Label htmlFor="startTime">Start Time *</Label>
            <Input
              id="startTime"
              onChange={(e) =>
                setFormData({ ...formData, startTime: e.target.value })
              }
              type="time"
              value={formData.startTime}
            />
          </div>
        )}

        {/* End Time (shown if partial day is enabled) */}
        {formData.partialDay && (
          <div className="flex flex-col gap-2">
            <Label htmlFor="endTime">End Time *</Label>
            <Input
              id="endTime"
              onChange={(e) =>
                setFormData({ ...formData, endTime: e.target.value })
              }
              type="time"
              value={formData.endTime}
            />
            {errors.endTime && (
              <p className="text-sm text-destructive">{errors.endTime}</p>
            )}
          </div>
        )}

        {/* Reason */}
        <div className="flex flex-col gap-2 md:col-span-2">
          <Label htmlFor="reason">Reason</Label>
          <Textarea
            id="reason"
            onChange={(e) =>
              setFormData({ ...formData, reason: e.target.value })
            }
            placeholder="Optional: Provide a brief reason for your time-off request..."
            rows={3}
            value={formData.reason}
          />
        </div>
      </div>

      {/* Conflict Detection Warnings */}
      {checkingConflicts && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2Icon className="h-4 w-4 animate-spin" />
          Checking for conflicts...
        </div>
      )}

      {(conflicts.hasShiftConflicts || conflicts.hasTimeOffConflicts) && (
        <div className="rounded-lg border border-orange-200 bg-orange-50 p-4">
          <div className="flex gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-600" />
            <div className="flex-1">
              <h4 className="font-semibold text-orange-900">
                Potential Conflicts Detected
              </h4>
              <p className="text-sm text-orange-800 mt-1">
                {conflicts.hasShiftConflicts &&
                  "This employee has scheduled shifts during the requested period."}
                {conflicts.hasTimeOffConflicts &&
                  "This employee has overlapping time-off requests."}
              </p>

              {conflicts.conflictingShifts && (
                <div className="mt-2 text-xs text-orange-700">
                  <strong>Conflicting Shifts:</strong>
                  {conflicts.conflictingShifts.map((shift) => (
                    <div key={shift.id}>
                      {shift.shift_start.toLocaleDateString()} -{" "}
                      {shift.shift_end.toLocaleDateString()}
                    </div>
                  ))}
                </div>
              )}

              {conflicts.conflictingTimeOff && (
                <div className="mt-2 text-xs text-orange-700">
                  <strong>Conflicting Time-Off:</strong>
                  {conflicts.conflictingTimeOff.map((request) => (
                    <div key={request.id}>
                      {request.start_date.toLocaleDateString()} -{" "}
                      {request.end_date.toLocaleDateString()}
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-3 flex items-center gap-2">
                <Checkbox
                  checked={formData.requestAnyway}
                  id="requestAnyway"
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, requestAnyway: !!checked })
                  }
                />
                <Label
                  className="text-sm text-orange-900"
                  htmlFor="requestAnyway"
                >
                  Request Anyway (supervisor approval required)
                </Label>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Information Banner */}
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
        <div className="flex gap-2">
          <Info className="h-5 w-5 text-blue-600" />
          <div className="flex-1">
            <h4 className="font-semibold text-blue-900">Request Processing</h4>
            <p className="text-sm text-blue-800 mt-1">
              Time-off requests require manager approval. You'll receive
              notifications via email when your request is reviewed.
            </p>
            {duration > 0 && (
              <p className="text-sm text-blue-800 mt-2">
                <strong>Total request duration:</strong> {duration}{" "}
                {duration === 1 ? "business day" : "business days"}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3">
        {onCancel && (
          <Button onClick={onCancel} type="button" variant="outline">
            Cancel
          </Button>
        )}
        <Button disabled={submitting || checkingConflicts} type="submit">
          {submitting && <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />}
          {isEditing ? "Update Request" : "Submit Request"}
        </Button>
      </div>
    </form>
  );
}
