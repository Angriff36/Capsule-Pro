"use client";

import {
  Alert,
  AlertDescription,
} from "@repo/design-system/components/ui/alert";
import { Badge } from "@repo/design-system/components/ui/badge";
import { Button } from "@repo/design-system/components/ui/button";
import { Checkbox } from "@repo/design-system/components/ui/checkbox";
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
  ChevronDownIcon,
  ChevronRightIcon,
  Loader2Icon,
  RefreshCwIcon,
  UserCheckIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import {
  autoAssignShift,
  type BulkAssignmentResponse,
  getBulkAssignmentSuggestions,
} from "../../../../lib/use-assignment";
import { AssignmentSuggestionCard } from "./assignment-suggestion-card";

type BulkAssignmentModalProps = {
  open: boolean;
  onClose: () => void;
  filters?: {
    scheduleId?: string;
    locationId?: string;
    startDate?: string;
    endDate?: string;
  };
  shiftIds?: string[];
};

type ExpandedShifts = {
  [shiftId: string]: boolean;
};

export function BulkAssignmentModal({
  open,
  onClose,
  filters,
  shiftIds,
}: BulkAssignmentModalProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [data, setData] = useState<BulkAssignmentResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedShifts, setSelectedShifts] = useState<Set<string>>(new Set());
  const [expandedShifts, setExpandedShifts] = useState<ExpandedShifts>({});
  const [forceMode, setForceMode] = useState(false);

  const loadSuggestions = async () => {
    setLoading(true);
    setError(null);
    setSelectedShifts(new Set());
    setExpandedShifts({});
    setForceMode(false);

    try {
      let result: BulkAssignmentResponse;

      if (shiftIds && shiftIds.length > 0) {
        // Get suggestions for specific shifts
        result = await getBulkAssignmentSuggestions();
        // Filter results to only include requested shifts
        result = {
          ...result,
          results: result.results.filter((r) => shiftIds.includes(r.shiftId)),
        };
      } else {
        // Get suggestions based on filters
        result = await getBulkAssignmentSuggestions(filters);
      }

      setData(result);

      // Auto-select shifts that can be auto-assigned
      const autoAssignable = result.results
        .filter((r) => r.canAutoAssign && r.bestMatch)
        .map((r) => r.shiftId);
      setSelectedShifts(new Set(autoAssignable));

      // Auto-expand first few shifts
      const firstFew = result.results.slice(0, 3).map((r) => r.shiftId);
      setExpandedShifts(
        firstFew.reduce((acc, id) => ({ ...acc, [id]: true }), {})
      );
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
    if (open) {
      loadSuggestions();
    }
  }, [open, loadSuggestions]);

  const handleAssign = async () => {
    if (selectedShifts.size === 0) {
      toast.error("Please select at least one shift to assign");
      return;
    }

    setAssigning(true);
    setError(null);

    try {
      const shiftsToAssign =
        data?.results
          .filter((r) => selectedShifts.has(r.shiftId))
          .map((r) => ({
            shiftId: r.shiftId,
            employeeId: r.bestMatch?.employee.id,
          }))
          .filter(
            (item): item is { shiftId: string; employeeId: string } =>
              item.employeeId !== undefined
          ) || [];

      // Assign each shift using Promise.all for parallel execution
      const assignPromises = shiftsToAssign.map((item) =>
        autoAssignShift(item.shiftId, {
          employeeId: item.employeeId,
          force: forceMode,
        })
      );

      const results = await Promise.allSettled(assignPromises);

      const successCount = results.filter(
        (r) => r.status === "fulfilled" && r.value.success
      ).length;
      const failureCount = results.length - successCount;

      if (successCount > 0) {
        toast.success(
          `Successfully assigned ${successCount} shift${successCount !== 1 ? "s" : ""}`,
          {
            description:
              failureCount > 0
                ? `${failureCount} shift${failureCount !== 1 ? "s" : ""} failed to assign`
                : undefined,
          }
        );
      }

      if (failureCount > 0) {
        toast.error(
          `${failureCount} shift${failureCount !== 1 ? "s" : ""} failed to assign`
        );
      }

      router.refresh();
      onClose();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to assign shifts";
      setError(message);
      toast.error(message);
    } finally {
      setAssigning(false);
    }
  };

  const handleSelectShift = (shiftId: string, checked: boolean) => {
    const newSelected = new Set(selectedShifts);
    if (checked) {
      newSelected.add(shiftId);
    } else {
      newSelected.delete(shiftId);
    }
    setSelectedShifts(newSelected);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      // Only select shifts that have suggestions
      const withSuggestions =
        data?.results
          .filter((r) => r.suggestions.length > 0)
          .map((r) => r.shiftId) || [];
      setSelectedShifts(new Set(withSuggestions));
    } else {
      setSelectedShifts(new Set());
    }
  };

  const toggleExpand = (shiftId: string) => {
    setExpandedShifts((prev) => ({
      ...prev,
      [shiftId]: !prev[shiftId],
    }));
  };

  const toggleExpandAll = () => {
    const allExpanded = Object.values(expandedShifts).every((v) => v);
    if (allExpanded) {
      setExpandedShifts({});
    } else {
      setExpandedShifts(
        (data?.results || []).reduce(
          (acc, r) => ({ ...acc, [r.shiftId]: true }),
          {}
        )
      );
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

  const _formatDateTime = (date: Date) => {
    return new Date(date).toLocaleString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const hasData = data && data.results.length > 0;
  const hasSelected = selectedShifts.size > 0;
  const allSelected = hasData
    ? data.results.every(
        (r) => r.suggestions.length === 0 || selectedShifts.has(r.shiftId)
      )
    : false;
  const _someSelected = hasData && selectedShifts.size > 0 && !allSelected;

  return (
    <Dialog onOpenChange={onClose} open={open}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserCheckIcon className="h-5 w-5" />
            Bulk Auto-Assignment
          </DialogTitle>
          <DialogDescription>
            Review and assign multiple open shifts at once
          </DialogDescription>
        </DialogHeader>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-8">
            <Loader2Icon className="h-8 w-8 animate-spin text-muted-foreground" />
            <span className="ml-2 text-muted-foreground">
              Analyzing shifts...
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

        {/* No Shifts State */}
        {hasData && data.results.length === 0 && !loading && !error && (
          <Alert>
            <AlertTriangleIcon className="h-4 w-4" />
            <AlertDescription>
              No open shifts found matching the criteria.
            </AlertDescription>
          </Alert>
        )}

        {/* Summary and Results */}
        {hasData && !loading && (
          <>
            {/* Summary */}
            <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
              <div className="flex gap-6">
                <div>
                  <div className="text-sm text-muted-foreground">
                    Total Shifts
                  </div>
                  <div className="text-2xl font-bold">{data.summary.total}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">
                    Auto-Assignable
                  </div>
                  <div className="text-2xl font-bold text-green-600">
                    {data.summary.canAutoAssign}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">
                    Has Suggestions
                  </div>
                  <div className="text-2xl font-bold text-yellow-600">
                    {data.summary.hasSuggestions}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">
                    No Suggestions
                  </div>
                  <div className="text-2xl font-bold text-red-600">
                    {data.summary.noSuggestions}
                  </div>
                </div>
              </div>
              <Button
                disabled={loading}
                onClick={loadSuggestions}
                size="sm"
                variant="outline"
              >
                <RefreshCwIcon className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>

            <Separator />

            {/* Controls */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={allSelected}
                  id="select-all"
                  onCheckedChange={handleSelectAll}
                />
                <label
                  className="text-sm font-medium cursor-pointer"
                  htmlFor="select-all"
                >
                  Select All with Suggestions
                </label>
                <span className="text-sm text-muted-foreground">
                  ({selectedShifts.size} selected)
                </span>
              </div>
              <div className="flex gap-2">
                <Button onClick={toggleExpandAll} size="sm" variant="outline">
                  {Object.values(expandedShifts).every((v) => v)
                    ? "Collapse"
                    : "Expand"}{" "}
                  All
                </Button>
              </div>
            </div>

            {/* Shift Results */}
            <div className="space-y-3">
              {data.results.map((result) => {
                const hasSuggestions = result.suggestions.length > 0;
                const isExpanded = expandedShifts[result.shiftId];
                const isSelected = selectedShifts.has(result.shiftId);
                const canAutoAssign = result.canAutoAssign && result.bestMatch;

                return (
                  <div
                    className="border rounded-lg overflow-hidden"
                    key={result.shiftId}
                  >
                    {/* Shift Header */}
                    <div
                      className={`p-3 flex items-center justify-between cursor-pointer hover:bg-muted/50 ${
                        isSelected ? "bg-primary/5" : ""
                      }`}
                      onClick={() => toggleExpand(result.shiftId)}
                    >
                      <div className="flex items-center gap-3">
                        {hasSuggestions && (
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={(checked) =>
                              handleSelectShift(result.shiftId, !!checked)
                            }
                            onClick={(e) => e.stopPropagation()}
                          />
                        )}
                        <div className="flex items-center gap-2">
                          {isExpanded ? (
                            <ChevronDownIcon className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <ChevronRightIcon className="h-4 w-4 text-muted-foreground" />
                          )}
                          <div>
                            <div className="font-medium">
                              Shift {result.shiftId.slice(0, 8)}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {canAutoAssign && result.bestMatch
                                ? `Best: ${formatEmployeeName(result.bestMatch.employee)} (${Math.round(result.bestMatch.score)})`
                                : hasSuggestions
                                  ? `${result.suggestions.length} suggestion${result.suggestions.length > 1 ? "s" : ""}`
                                  : "No eligible employees"}
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {canAutoAssign && (
                          <Badge className="bg-green-100 text-green-800 border-green-200">
                            Auto-Ready
                          </Badge>
                        )}
                        {result.laborBudgetWarning && (
                          <Badge variant="destructive">Budget Warning</Badge>
                        )}
                        {!hasSuggestions && (
                          <Badge variant="outline">No Matches</Badge>
                        )}
                      </div>
                    </div>

                    {/* Expanded Content */}
                    {isExpanded && (
                      <div className="p-3 border-t bg-muted/30">
                        {result.laborBudgetWarning && (
                          <Alert className="mb-3" variant="destructive">
                            <AlertTriangleIcon className="h-4 w-4" />
                            <AlertDescription>
                              {result.laborBudgetWarning}
                            </AlertDescription>
                          </Alert>
                        )}

                        {hasSuggestions ? (
                          <div className="space-y-3">
                            {result.suggestions.map((suggestion) => (
                              <AssignmentSuggestionCard
                                isBestMatch={
                                  result.bestMatch?.employee.id ===
                                  suggestion.employee.id
                                }
                                key={suggestion.employee.id}
                                onSelect={() => {
                                  setSelectedShifts(new Set([result.shiftId]));
                                }}
                                selected={
                                  isSelected &&
                                  result.bestMatch?.employee.id ===
                                    suggestion.employee.id
                                }
                                suggestion={suggestion}
                              />
                            ))}
                          </div>
                        ) : (
                          <Alert>
                            <AlertTriangleIcon className="h-4 w-4" />
                            <AlertDescription>
                              No eligible employees found for this shift.
                            </AlertDescription>
                          </Alert>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <Separator />

            {/* Actions */}
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                {hasSelected ? (
                  <span>
                    <strong>{selectedShifts.size}</strong> shift
                    {selectedShifts.size !== 1 ? "s" : ""} selected
                  </span>
                ) : (
                  <span>Select shifts to assign</span>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  disabled={assigning}
                  onClick={onClose}
                  variant="outline"
                >
                  Cancel
                </Button>
                <Button
                  className="min-w-[140px]"
                  disabled={!hasSelected || assigning}
                  onClick={handleAssign}
                >
                  {assigning ? (
                    <>
                      <Loader2Icon className="h-4 w-4 mr-2 animate-spin" />
                      Assigning...
                    </>
                  ) : (
                    <>
                      <UserCheckIcon className="h-4 w-4 mr-2" />
                      Assign Selected ({selectedShifts.size})
                    </>
                  )}
                </Button>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
