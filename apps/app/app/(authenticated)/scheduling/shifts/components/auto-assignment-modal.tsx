"use client";

import {
  Alert,
  AlertDescription,
} from "@repo/design-system/components/ui/alert";
import { Button } from "@repo/design-system/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@repo/design-system/components/ui/dialog";
import { Separator } from "@repo/design-system/components/ui/separator";
import {
  AlertTriangleIcon,
  CheckIcon,
  Loader2Icon,
  RefreshCwIcon,
  UserCheckIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import {
  type AssignmentSuggestion,
  type AutoAssignmentResult,
  type AutoAssignRequest,
  autoAssignShift,
  getAssignmentSuggestions,
} from "../../../../lib/use-assignment";
import { AssignmentSuggestionCard } from "./assignment-suggestion-card";

interface AutoAssignmentModalProps {
  open: boolean;
  onClose: () => void;
  shiftId: string;
  shiftDetails?: {
    title?: string;
    startTime?: Date;
    endTime?: Date;
    locationName?: string;
    role?: string;
  };
}

export function AutoAssignmentModal({
  open,
  onClose,
  shiftId,
  shiftDetails,
}: AutoAssignmentModalProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [data, setData] = useState<AutoAssignmentResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedSuggestion, setSelectedSuggestion] =
    useState<AssignmentSuggestion | null>(null);
  const [_forceMode, setForceMode] = useState(false);

  const loadSuggestions = async () => {
    setLoading(true);
    setError(null);
    setSelectedSuggestion(null);
    setForceMode(false);

    try {
      const result = await getAssignmentSuggestions(shiftId);
      setData(result);
      if (result.bestMatch) {
        setSelectedSuggestion(result.bestMatch);
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to load suggestions";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open && shiftId) {
      loadSuggestions();
    }
  }, [open, shiftId, loadSuggestions]);

  const handleAssign = async (employeeId?: string, force = false) => {
    if (!shiftId) {
      return;
    }

    setAssigning(true);
    setError(null);

    try {
      const request: AutoAssignRequest = {
        employeeId: employeeId || selectedSuggestion?.employee.id,
        force,
      };

      const result = await autoAssignShift(shiftId, request);

      if (result.success) {
        toast.success("Shift assigned successfully!", {
          description: `${selectedSuggestion ? formatEmployeeName(selectedSuggestion.employee) : "Employee"} has been assigned to this shift.`,
        });
        router.refresh();
        onClose();
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to assign shift";
      setError(message);
      toast.error(message);
    } finally {
      setAssigning(false);
    }
  };

  const handleAutoAssignBest = () => {
    if (data?.canAutoAssign && data.bestMatch) {
      handleAssign(data.bestMatch.employee.id, false);
    }
  };

  const handleForceAssign = () => {
    if (selectedSuggestion) {
      handleAssign(selectedSuggestion.employee.id, true);
    }
  };

  const formatEmployeeName = (employee: {
    firstName: string | null;
    lastName: string | null;
    email: string;
  }): string => {
    const first = employee.firstName || "";
    const last = employee.lastName || "";
    if (first && last) {
      return `${first} ${last}`;
    }
    return first || last || employee.email;
  };

  const formatDateTime = (date: Date) => {
    return new Date(date).toLocaleString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const canAssign = selectedSuggestion || data?.bestMatch;
  const hasSuggestions = data && data.suggestions.length > 0;
  const noSuggestions = data && data.suggestions.length === 0;

  return (
    <Dialog onOpenChange={onClose} open={open}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserCheckIcon className="h-5 w-5" />
            Auto-Assignment Suggestions
          </DialogTitle>
          <DialogDescription>
            {shiftDetails && (
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm mt-2">
                {shiftDetails.title && (
                  <span>
                    <strong>{shiftDetails.title}</strong>
                  </span>
                )}
                {shiftDetails.startTime && (
                  <span>
                    {formatDateTime(shiftDetails.startTime)} -{" "}
                    {shiftDetails.endTime
                      ? new Date(shiftDetails.endTime).toLocaleTimeString(
                          "en-US",
                          { hour: "numeric", minute: "2-digit" }
                        )
                      : ""}
                  </span>
                )}
                {shiftDetails.locationName && (
                  <span>at {shiftDetails.locationName}</span>
                )}
                {shiftDetails.role && <span>Role: {shiftDetails.role}</span>}
              </div>
            )}
          </DialogDescription>
        </DialogHeader>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-8">
            <Loader2Icon className="h-8 w-8 animate-spin text-muted-foreground" />
            <span className="ml-2 text-muted-foreground">
              Finding best matches...
            </span>
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <Alert variant="destructive">
            <AlertTriangleIcon className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* No Suggestions State */}
        {noSuggestions && !loading && !error && (
          <Alert>
            <AlertTriangleIcon className="h-4 w-4" />
            <AlertDescription>
              No eligible employees found for this shift. This could be because:
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>No employees are available during this time</li>
                <li>Required skills don't match any employee profiles</li>
                <li>All eligible employees have conflicting shifts</li>
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {/* Suggestions List */}
        {hasSuggestions && !loading && (
          <>
            {/* Labor Budget Warning */}
            {data.laborBudgetWarning && (
              <Alert variant="destructive">
                <AlertTriangleIcon className="h-4 w-4" />
                <AlertDescription>{data.laborBudgetWarning}</AlertDescription>
              </Alert>
            )}

            {/* Quick Actions */}
            {data.canAutoAssign && data.bestMatch && (
              <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-700">
                <CheckIcon className="h-5 w-5 text-green-600" />
                <div className="flex-1">
                  <div className="font-medium text-green-900 dark:text-green-100">
                    High Confidence Match Available
                  </div>
                  <div className="text-sm text-green-700 dark:text-green-300">
                    {formatEmployeeName(data.bestMatch.employee)} is the best
                    fit with a score of {Math.round(data.bestMatch.score)}
                  </div>
                </div>
                <Button
                  className="bg-green-600 hover:bg-green-700"
                  disabled={assigning}
                  onClick={handleAutoAssignBest}
                >
                  {assigning ? (
                    <>
                      <Loader2Icon className="h-4 w-4 mr-2 animate-spin" />
                      Assigning...
                    </>
                  ) : (
                    <>
                      <UserCheckIcon className="h-4 w-4 mr-2" />
                      Auto-Assign
                    </>
                  )}
                </Button>
              </div>
            )}

            <Separator />

            {/* Suggestions Grid */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium">
                  {data.suggestions.length} Suggestion
                  {data.suggestions.length !== 1 ? "s" : ""}
                </h3>
                <Button
                  disabled={loading}
                  onClick={loadSuggestions}
                  size="sm"
                  variant="ghost"
                >
                  <RefreshCwIcon className="h-4 w-4 mr-2" />
                  Refresh
                </Button>
              </div>

              <div className="grid gap-3">
                {data.suggestions.map((suggestion) => (
                  <AssignmentSuggestionCard
                    isBestMatch={
                      data.bestMatch?.employee.id === suggestion.employee.id
                    }
                    key={suggestion.employee.id}
                    onSelect={() => setSelectedSuggestion(suggestion)}
                    selected={
                      selectedSuggestion?.employee.id === suggestion.employee.id
                    }
                    suggestion={suggestion}
                  />
                ))}
              </div>
            </div>

            <Separator />

            {/* Manual Assignment Actions */}
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                {selectedSuggestion ? (
                  <span>
                    Selected:{" "}
                    <strong>
                      {formatEmployeeName(selectedSuggestion.employee)}
                    </strong>
                    {selectedSuggestion.confidence === "low" &&
                      " (Low confidence - use Force Assign)"}
                  </span>
                ) : (
                  <span>Select an employee to assign</span>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  disabled={!canAssign || assigning}
                  onClick={handleForceAssign}
                  variant="outline"
                >
                  {assigning ? (
                    <>
                      <Loader2Icon className="h-4 w-4 mr-2 animate-spin" />
                      Assigning...
                    </>
                  ) : (
                    <>
                      <UserCheckIcon className="h-4 w-4 mr-2" />
                      Force Assign
                    </>
                  )}
                </Button>
                <Button
                  disabled={
                    !canAssign ||
                    assigning ||
                    selectedSuggestion?.confidence === "low"
                  }
                  onClick={() =>
                    selectedSuggestion &&
                    handleAssign(selectedSuggestion.employee.id, false)
                  }
                >
                  {assigning ? (
                    <>
                      <Loader2Icon className="h-4 w-4 mr-2 animate-spin" />
                      Assigning...
                    </>
                  ) : (
                    <>
                      <CheckIcon className="h-4 w-4 mr-2" />
                      Assign Selected
                    </>
                  )}
                </Button>
              </div>
            </div>

            {selectedSuggestion?.confidence === "low" && (
              <Alert>
                <AlertTriangleIcon className="h-4 w-4" />
                <AlertDescription>
                  This employee has a low confidence match score. Use "Force
                  Assign" to assign anyway, or select a different employee with
                  a higher match score.
                </AlertDescription>
              </Alert>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
