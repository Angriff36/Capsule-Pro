"use client";

var __importDefault =
  (this && this.__importDefault) ||
  ((mod) => (mod && mod.__esModule ? mod : { default: mod }));
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = TimecardsPage;
const avatar_1 = require("@repo/design-system/components/ui/avatar");
const badge_1 = require("@repo/design-system/components/ui/badge");
const button_1 = require("@repo/design-system/components/ui/button");
const card_1 = require("@repo/design-system/components/ui/card");
const input_1 = require("@repo/design-system/components/ui/input");
const select_1 = require("@repo/design-system/components/ui/select");
const table_1 = require("@repo/design-system/components/ui/table");
const lucide_react_1 = require("lucide-react");
const navigation_1 = require("next/navigation");
const react_1 = require("react");
const sonner_1 = require("sonner");
const timecard_detail_modal_1 = __importDefault(
  require("./timecard-detail-modal")
);
function formatCurrency(value) {
  if (value === null) return "N/A";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);
}
function formatHours(value) {
  if (value === null) return "N/A";
  const hours = Math.floor(value);
  const minutes = Math.round((value - hours) * 60);
  return `${hours}h ${minutes}m`;
}
function formatDate(date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}
function formatTime(date) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(date);
}
function getEmployeeName(firstName, lastName) {
  return [firstName, lastName].filter(Boolean).join(" ") || "Unknown";
}
function getExceptionBadge(exceptionType) {
  if (!exceptionType) return null;
  const colors = {
    missing_clock_out: "destructive",
    early_clock_in: "secondary",
    late_clock_out: "secondary",
    late_arrival: "destructive",
    excessive_break: "secondary",
  };
  const labels = {
    missing_clock_out: "Missing Clock Out",
    early_clock_in: "Early Clock In",
    late_clock_out: "Late Clock Out",
    late_arrival: "Late Arrival",
    excessive_break: "Excessive Break",
  };
  const variant = colors[exceptionType] || "secondary";
  const label = labels[exceptionType] || exceptionType;
  return (
    <badge_1.Badge variant={variant}>
      <lucide_react_1.AlertTriangleIcon className="mr-1 h-3 w-3" />
      {label}
    </badge_1.Badge>
  );
}
function TimecardsPage() {
  const router = (0, navigation_1.useRouter)();
  const searchParams = (0, navigation_1.useSearchParams)();
  const [timeEntries, setTimeEntries] = (0, react_1.useState)([]);
  const [pagination, setPagination] = (0, react_1.useState)({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 1,
  });
  const [loading, setLoading] = (0, react_1.useState)(true);
  const [selectedEntries, setSelectedEntries] = (0, react_1.useState)(
    new Set()
  );
  const [searchQuery, setSearchQuery] = (0, react_1.useState)("");
  const [statusFilter, setStatusFilter] = (0, react_1.useState)("pending");
  const [startDate, setStartDate] = (0, react_1.useState)("");
  const [endDate, setEndDate] = (0, react_1.useState)("");
  const [detailModalOpen, setDetailModalOpen] = (0, react_1.useState)(false);
  const [selectedTimeEntry, setSelectedTimeEntry] = (0, react_1.useState)(null);
  const [actionLoading, setActionLoading] = (0, react_1.useState)(false);
  const fetchTimecards = (0, react_1.useCallback)(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        status: statusFilter,
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
      });
      if (searchQuery) params.set("employeeId", searchQuery);
      if (startDate) params.set("startDate", startDate);
      if (endDate) params.set("endDate", endDate);
      const response = await fetch(`/api/timecards?${params.toString()}`);
      if (!response.ok) {
        throw new Error("Failed to fetch timecards");
      }
      const data = await response.json();
      setTimeEntries(data.timeEntries || []);
      setPagination(data.pagination || pagination);
    } catch (error) {
      console.error("Error fetching timecards:", error);
      sonner_1.toast.error("Failed to load timecards");
    } finally {
      setLoading(false);
    }
  }, [
    statusFilter,
    pagination.page,
    pagination.limit,
    searchQuery,
    startDate,
    endDate,
  ]);
  (0, react_1.useEffect)(() => {
    fetchTimecards();
  }, [fetchTimecards]);
  const handleApprove = async (entryId) => {
    setActionLoading(true);
    try {
      const response = await fetch("/api/timecards/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          timeEntryIds: [entryId],
          approve: true,
        }),
      });
      if (!response.ok) {
        throw new Error("Failed to approve timecard");
      }
      sonner_1.toast.success("Timecard approved");
      fetchTimecards();
    } catch (error) {
      console.error("Error approving timecard:", error);
      sonner_1.toast.error("Failed to approve timecard");
    } finally {
      setActionLoading(false);
    }
  };
  const handleFlagException = async (entryId, exceptionType, notes) => {
    setActionLoading(true);
    try {
      const response = await fetch("/api/timecards/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          timeEntryIds: [entryId],
          flagExceptions: [
            {
              timeEntryId: entryId,
              exceptionType,
              notes,
            },
          ],
        }),
      });
      if (!response.ok) {
        throw new Error("Failed to flag exception");
      }
      sonner_1.toast.success("Exception flagged");
      fetchTimecards();
    } catch (error) {
      console.error("Error flagging exception:", error);
      sonner_1.toast.error("Failed to flag exception");
    } finally {
      setActionLoading(false);
    }
  };
  const handleEditRequest = async (entryId, reason, requestedChanges) => {
    setActionLoading(true);
    try {
      const response = await fetch("/api/timecards/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          timeEntryIds: [entryId],
          editRequests: [
            {
              timeEntryId: entryId,
              reason,
              ...requestedChanges,
            },
          ],
        }),
      });
      if (!response.ok) {
        throw new Error("Failed to request edit");
      }
      sonner_1.toast.success("Edit request submitted");
      fetchTimecards();
    } catch (error) {
      console.error("Error requesting edit:", error);
      sonner_1.toast.error("Failed to request edit");
    } finally {
      setActionLoading(false);
    }
  };
  const openDetailModal = (entry) => {
    setSelectedTimeEntry(entry);
    setDetailModalOpen(true);
  };
  const toggleSelectEntry = (entryId) => {
    setSelectedEntries((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(entryId)) {
        newSet.delete(entryId);
      } else {
        newSet.add(entryId);
      }
      return newSet;
    });
  };
  const handleStatusChange = (value) => {
    setStatusFilter(value);
    setPagination((prev) => ({ ...prev, page: 1 }));
    router.push(`/payroll/timecards?status=${value}`);
  };
  const handleSearch = (value) => {
    setSearchQuery(value);
    setPagination((prev) => ({ ...prev, page: 1 }));
  };
  const handlePageChange = (newPage) => {
    setPagination((prev) => ({ ...prev, page: newPage }));
  };
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-semibold text-2xl text-foreground">Timecards</h1>
          <p className="text-muted-foreground text-sm">
            Review and approve employee time entries
          </p>
        </div>
      </div>

      <card_1.Card className="bg-card/60">
        <card_1.CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex-1 min-w-[200px]">
              <input_1.Input
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="Search employees..."
                value={searchQuery}
              />
            </div>

            <select_1.Select
              onValueChange={handleStatusChange}
              value={statusFilter}
            >
              <select_1.SelectTrigger className="w-[180px]">
                <select_1.SelectValue />
              </select_1.SelectTrigger>
              <select_1.SelectContent>
                <select_1.SelectItem value="pending">
                  Pending Approval
                </select_1.SelectItem>
                <select_1.SelectItem value="approved">
                  Approved
                </select_1.SelectItem>
                <select_1.SelectItem value="open">
                  Open Entries
                </select_1.SelectItem>
                <select_1.SelectItem value="all">
                  All Entries
                </select_1.SelectItem>
              </select_1.SelectContent>
            </select_1.Select>

            <input_1.Input
              className="w-[160px]"
              onChange={(e) => setStartDate(e.target.value)}
              type="date"
              value={startDate}
            />

            <input_1.Input
              className="w-[160px]"
              onChange={(e) => setEndDate(e.target.value)}
              type="date"
              value={endDate}
            />
          </div>
        </card_1.CardContent>
      </card_1.Card>

      {loading ? (
        <card_1.Card className="p-8 text-center">
          <lucide_react_1.Loader2Icon className="mx-auto h-8 w-8 animate-spin text-muted-foreground" />
        </card_1.Card>
      ) : timeEntries.length === 0 ? (
        <card_1.Card className="p-8 text-center">
          <p className="text-muted-foreground text-lg">
            No time entries found for selected criteria
          </p>
        </card_1.Card>
      ) : (
        <>
          <card_1.Card>
            <card_1.CardContent className="p-0">
              <div className="overflow-x-auto">
                <table_1.Table>
                  <table_1.TableHeader>
                    <table_1.TableRow>
                      <table_1.TableHead className="w-[40px]">
                        <input
                          checked={selectedEntries.size === timeEntries.length}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedEntries(
                                new Set(timeEntries.map((e) => e.id))
                              );
                            } else {
                              setSelectedEntries(new Set());
                            }
                          }}
                          type="checkbox"
                        />
                      </table_1.TableHead>
                      <table_1.TableHead>Employee</table_1.TableHead>
                      <table_1.TableHead>Date</table_1.TableHead>
                      <table_1.TableHead>Hours</table_1.TableHead>
                      <table_1.TableHead>Scheduled</table_1.TableHead>
                      <table_1.TableHead>Break</table_1.TableHead>
                      <table_1.TableHead>Cost</table_1.TableHead>
                      <table_1.TableHead>Status</table_1.TableHead>
                      <table_1.TableHead>Actions</table_1.TableHead>
                    </table_1.TableRow>
                  </table_1.TableHeader>
                  <table_1.TableBody>
                    {timeEntries.map((entry) => (
                      <table_1.TableRow
                        className="cursor-pointer hover:bg-muted/50"
                        key={entry.id}
                        onClick={() => openDetailModal(entry)}
                      >
                        <table_1.TableCell onClick={(e) => e.stopPropagation()}>
                          <input
                            checked={selectedEntries.has(entry.id)}
                            onChange={() => toggleSelectEntry(entry.id)}
                            type="checkbox"
                          />
                        </table_1.TableCell>
                        <table_1.TableCell>
                          <div className="flex items-center gap-3">
                            <avatar_1.Avatar className="h-8 w-8">
                              <avatar_1.AvatarImage
                                alt={getEmployeeName(
                                  entry.employee_first_name,
                                  entry.employee_last_name
                                )}
                                src={`${entry.employee_first_name?.[0]}${entry.employee_last_name?.[0]}`}
                              />
                              <avatar_1.AvatarFallback>
                                {getEmployeeName(
                                  entry.employee_first_name,
                                  entry.employee_last_name
                                )
                                  .split(" ")
                                  .map((n) => n[0])
                                  .join("")
                                  .toUpperCase()}
                              </avatar_1.AvatarFallback>
                            </avatar_1.Avatar>
                            <div>
                              <div className="font-medium">
                                {getEmployeeName(
                                  entry.employee_first_name,
                                  entry.employee_last_name
                                )}
                              </div>
                              <div className="text-muted-foreground text-xs">
                                {entry.employee_role}
                              </div>
                            </div>
                          </div>
                        </table_1.TableCell>
                        <table_1.TableCell>
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <lucide_react_1.CalendarIcon className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium">
                                {formatDate(entry.clock_in)}
                              </span>
                            </div>
                            <div className="text-muted-foreground text-xs">
                              {formatTime(entry.clock_in)} -{" "}
                              {entry.clock_out
                                ? formatTime(entry.clock_out)
                                : "Open"}
                            </div>
                            {entry.location_name && (
                              <div className="text-muted-foreground text-xs">
                                {entry.location_name}
                              </div>
                            )}
                          </div>
                        </table_1.TableCell>
                        <table_1.TableCell>
                          <div className="space-y-1">
                            <div className="font-medium">
                              {formatHours(entry.actual_hours)}
                            </div>
                            {entry.break_minutes > 0 && (
                              <div className="text-muted-foreground text-xs">
                                {entry.break_minutes} min break
                              </div>
                            )}
                          </div>
                        </table_1.TableCell>
                        <table_1.TableCell>
                          {entry.scheduled_hours ? (
                            <div>
                              <div className="font-medium">
                                {formatHours(entry.scheduled_hours)}
                              </div>
                              {entry.shift_start && entry.shift_end && (
                                <div className="text-muted-foreground text-xs">
                                  {formatTime(entry.shift_start)} -{" "}
                                  {formatTime(entry.shift_end)}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-sm">
                              N/A
                            </span>
                          )}
                        </table_1.TableCell>
                        <table_1.TableCell>
                          {getExceptionBadge(entry.exception_type)}
                        </table_1.TableCell>
                        <table_1.TableCell>
                          {formatCurrency(entry.total_cost)}
                        </table_1.TableCell>
                        <table_1.TableCell>
                          {entry.approved_at ? (
                            <badge_1.Badge
                              className="flex items-center gap-1"
                              variant="secondary"
                            >
                              <lucide_react_1.CheckCircleIcon className="h-3 w-3" />
                              Approved
                            </badge_1.Badge>
                          ) : entry.clock_out ? (
                            <badge_1.Badge variant="outline">
                              Pending
                            </badge_1.Badge>
                          ) : (
                            <badge_1.Badge variant="default">
                              <lucide_react_1.ClockIcon className="h-3 w-3" />
                              Open
                            </badge_1.Badge>
                          )}
                          {entry.approver_first_name && (
                            <div className="text-muted-foreground text-xs mt-1">
                              by {entry.approver_first_name}{" "}
                              {entry.approver_last_name?.[0]}
                            </div>
                          )}
                        </table_1.TableCell>
                        <table_1.TableCell onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center gap-1">
                            {!entry.approved_at && entry.clock_out && (
                              <button_1.Button
                                className="h-8 w-8 text-green-600 hover:text-green-700"
                                disabled={actionLoading}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleApprove(entry.id);
                                }}
                                size="icon"
                                variant="ghost"
                              >
                                <lucide_react_1.CheckIcon className="h-4 w-4" />
                              </button_1.Button>
                            )}
                            <button_1.Button
                              className="h-8 w-8 text-blue-600 hover:text-blue-700"
                              size="icon"
                              variant="ghost"
                            >
                              <lucide_react_1.EditIcon className="h-4 w-4" />
                            </button_1.Button>
                            <button_1.Button
                              className="h-8 w-8 text-orange-600 hover:text-orange-700"
                              size="icon"
                              variant="ghost"
                            >
                              <lucide_react_1.FlagIcon className="h-4 w-4" />
                            </button_1.Button>
                          </div>
                        </table_1.TableCell>
                      </table_1.TableRow>
                    ))}
                  </table_1.TableBody>
                </table_1.Table>
              </div>
            </card_1.CardContent>
          </card_1.Card>

          <div className="flex items-center justify-between">
            <p className="text-muted-foreground text-sm">
              Showing {timeEntries.length} of {pagination.total} entries
            </p>
            <div className="flex items-center gap-2">
              <button_1.Button
                disabled={pagination.page <= 1}
                onClick={() => handlePageChange(pagination.page - 1)}
                size="sm"
                variant="outline"
              >
                Previous
              </button_1.Button>
              <span className="text-sm">
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <button_1.Button
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => handlePageChange(pagination.page + 1)}
                size="sm"
                variant="outline"
              >
                Next
              </button_1.Button>
            </div>
          </div>
        </>
      )}

      {selectedTimeEntry && (
        <timecard_detail_modal_1.default
          onApprove={() => handleApprove(selectedTimeEntry.id)}
          onClose={() => {
            setDetailModalOpen(false);
            setSelectedTimeEntry(null);
          }}
          onEditRequest={(reason, requestedChanges) =>
            handleEditRequest(selectedTimeEntry.id, reason, requestedChanges)
          }
          onFlagException={(type, notes) =>
            handleFlagException(selectedTimeEntry.id, type, notes)
          }
          open={detailModalOpen}
          timeEntry={selectedTimeEntry}
        />
      )}
    </div>
  );
}
