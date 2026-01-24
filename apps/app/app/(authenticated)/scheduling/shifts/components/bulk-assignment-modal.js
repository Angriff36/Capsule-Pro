"use client";

Object.defineProperty(exports, "__esModule", { value: true });
exports.BulkAssignmentModal = BulkAssignmentModal;
const alert_1 = require("@repo/design-system/components/ui/alert");
const badge_1 = require("@repo/design-system/components/ui/badge");
const button_1 = require("@repo/design-system/components/ui/button");
const checkbox_1 = require("@repo/design-system/components/ui/checkbox");
const dialog_1 = require("@repo/design-system/components/ui/dialog");
const separator_1 = require("@repo/design-system/components/ui/separator");
const lucide_react_1 = require("lucide-react");
const navigation_1 = require("next/navigation");
const react_1 = require("react");
const sonner_1 = require("sonner");
const use_assignment_1 = require("../../../../lib/use-assignment");
const assignment_suggestion_card_1 = require("./assignment-suggestion-card");
function BulkAssignmentModal({ open, onClose, filters, shiftIds }) {
  const router = (0, navigation_1.useRouter)();
  const [loading, setLoading] = (0, react_1.useState)(false);
  const [assigning, setAssigning] = (0, react_1.useState)(false);
  const [data, setData] = (0, react_1.useState)(null);
  const [error, setError] = (0, react_1.useState)(null);
  const [selectedShifts, setSelectedShifts] = (0, react_1.useState)(new Set());
  const [expandedShifts, setExpandedShifts] = (0, react_1.useState)({});
  const [forceMode, setForceMode] = (0, react_1.useState)(false);
  const loadSuggestions = async () => {
    setLoading(true);
    setError(null);
    setSelectedShifts(new Set());
    setExpandedShifts({});
    setForceMode(false);
    try {
      let result;
      if (shiftIds && shiftIds.length > 0) {
        // Get suggestions for specific shifts
        result = await (0, use_assignment_1.getBulkAssignmentSuggestions)();
        // Filter results to only include requested shifts
        result = {
          ...result,
          results: result.results.filter((r) => shiftIds.includes(r.shiftId)),
        };
      } else {
        // Get suggestions based on filters
        result = await (0, use_assignment_1.getBulkAssignmentSuggestions)(
          filters
        );
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
      sonner_1.toast.error(message);
    } finally {
      setLoading(false);
    }
  };
  (0, react_1.useEffect)(() => {
    if (open) {
      loadSuggestions();
    }
  }, [open, loadSuggestions]);
  const handleAssign = async () => {
    if (selectedShifts.size === 0) {
      sonner_1.toast.error("Please select at least one shift to assign");
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
          .filter((item) => item.employeeId !== undefined) || [];
      // Assign each shift using Promise.all for parallel execution
      const assignPromises = shiftsToAssign.map((item) =>
        (0, use_assignment_1.autoAssignShift)(item.shiftId, {
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
        sonner_1.toast.success(
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
        sonner_1.toast.error(
          `${failureCount} shift${failureCount !== 1 ? "s" : ""} failed to assign`
        );
      }
      router.refresh();
      onClose();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to assign shifts";
      setError(message);
      sonner_1.toast.error(message);
    } finally {
      setAssigning(false);
    }
  };
  const handleSelectShift = (shiftId, checked) => {
    const newSelected = new Set(selectedShifts);
    if (checked) {
      newSelected.add(shiftId);
    } else {
      newSelected.delete(shiftId);
    }
    setSelectedShifts(newSelected);
  };
  const handleSelectAll = (checked) => {
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
  const toggleExpand = (shiftId) => {
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
  const formatEmployeeName = (employee) => {
    const first = employee.firstName || "";
    const last = employee.lastName || "";
    if (first && last) {
      return `${first} ${last}`;
    }
    return first || last || employee.email;
  };
  const _formatDateTime = (date) => {
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
    <dialog_1.Dialog onOpenChange={onClose} open={open}>
      <dialog_1.DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <dialog_1.DialogHeader>
          <dialog_1.DialogTitle className="flex items-center gap-2">
            <lucide_react_1.UserCheckIcon className="h-5 w-5" />
            Bulk Auto-Assignment
          </dialog_1.DialogTitle>
          <dialog_1.DialogDescription>
            Review and assign multiple open shifts at once
          </dialog_1.DialogDescription>
        </dialog_1.DialogHeader>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-8">
            <lucide_react_1.Loader2Icon className="h-8 w-8 animate-spin text-muted-foreground" />
            <span className="ml-2 text-muted-foreground">
              Analyzing shifts...
            </span>
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <alert_1.Alert variant="destructive">
            <lucide_react_1.AlertTriangleIcon className="h-4 w-4" />
            <alert_1.AlertDescription>{error}</alert_1.AlertDescription>
          </alert_1.Alert>
        )}

        {/* No Shifts State */}
        {hasData && data.results.length === 0 && !loading && !error && (
          <alert_1.Alert>
            <lucide_react_1.AlertTriangleIcon className="h-4 w-4" />
            <alert_1.AlertDescription>
              No open shifts found matching the criteria.
            </alert_1.AlertDescription>
          </alert_1.Alert>
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
              <button_1.Button
                disabled={loading}
                onClick={loadSuggestions}
                size="sm"
                variant="outline"
              >
                <lucide_react_1.RefreshCwIcon className="h-4 w-4 mr-2" />
                Refresh
              </button_1.Button>
            </div>

            <separator_1.Separator />

            {/* Controls */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <checkbox_1.Checkbox
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
                <button_1.Button
                  onClick={toggleExpandAll}
                  size="sm"
                  variant="outline"
                >
                  {Object.values(expandedShifts).every((v) => v)
                    ? "Collapse"
                    : "Expand"}{" "}
                  All
                </button_1.Button>
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
                      className={`p-3 flex items-center justify-between cursor-pointer hover:bg-muted/50 ${isSelected ? "bg-primary/5" : ""}`}
                      onClick={() => toggleExpand(result.shiftId)}
                    >
                      <div className="flex items-center gap-3">
                        {hasSuggestions && (
                          <checkbox_1.Checkbox
                            checked={isSelected}
                            onCheckedChange={(checked) =>
                              handleSelectShift(result.shiftId, !!checked)
                            }
                            onClick={(e) => e.stopPropagation()}
                          />
                        )}
                        <div className="flex items-center gap-2">
                          {isExpanded ? (
                            <lucide_react_1.ChevronDownIcon className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <lucide_react_1.ChevronRightIcon className="h-4 w-4 text-muted-foreground" />
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
                          <badge_1.Badge className="bg-green-100 text-green-800 border-green-200">
                            Auto-Ready
                          </badge_1.Badge>
                        )}
                        {result.laborBudgetWarning && (
                          <badge_1.Badge variant="destructive">
                            Budget Warning
                          </badge_1.Badge>
                        )}
                        {!hasSuggestions && (
                          <badge_1.Badge variant="outline">
                            No Matches
                          </badge_1.Badge>
                        )}
                      </div>
                    </div>

                    {/* Expanded Content */}
                    {isExpanded && (
                      <div className="p-3 border-t bg-muted/30">
                        {result.laborBudgetWarning && (
                          <alert_1.Alert className="mb-3" variant="destructive">
                            <lucide_react_1.AlertTriangleIcon className="h-4 w-4" />
                            <alert_1.AlertDescription>
                              {result.laborBudgetWarning}
                            </alert_1.AlertDescription>
                          </alert_1.Alert>
                        )}

                        {hasSuggestions ? (
                          <div className="space-y-3">
                            {result.suggestions.map((suggestion) => (
                              <assignment_suggestion_card_1.AssignmentSuggestionCard
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
                          <alert_1.Alert>
                            <lucide_react_1.AlertTriangleIcon className="h-4 w-4" />
                            <alert_1.AlertDescription>
                              No eligible employees found for this shift.
                            </alert_1.AlertDescription>
                          </alert_1.Alert>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <separator_1.Separator />

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
                <button_1.Button
                  disabled={assigning}
                  onClick={onClose}
                  variant="outline"
                >
                  Cancel
                </button_1.Button>
                <button_1.Button
                  className="min-w-[140px]"
                  disabled={!hasSelected || assigning}
                  onClick={handleAssign}
                >
                  {assigning ? (
                    <>
                      <lucide_react_1.Loader2Icon className="h-4 w-4 mr-2 animate-spin" />
                      Assigning...
                    </>
                  ) : (
                    <>
                      <lucide_react_1.UserCheckIcon className="h-4 w-4 mr-2" />
                      Assign Selected ({selectedShifts.size})
                    </>
                  )}
                </button_1.Button>
              </div>
            </div>
          </>
        )}
      </dialog_1.DialogContent>
    </dialog_1.Dialog>
  );
}
