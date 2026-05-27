"use client";

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@repo/design-system/components/ui/avatar";
import { Badge } from "@repo/design-system/components/ui/badge";
import { Button } from "@repo/design-system/components/ui/button";
import { Card, CardContent } from "@repo/design-system/components/ui/card";
import {
  CommandBand,
  CommandBandActions,
  CommandBandBody,
  CommandBandHeader,
  CommandBandLede,
  DisplayHeading,
  MetricBand,
  MetricCell,
  MetricLabel,
  MetricValue,
  MonoLabel,
  OperationalColumn,
  PageCanvas,
  SectionHeader,
} from "@repo/design-system/components/blocks/page-shell";
import { DatePicker } from "@repo/design-system/components/ui/date-picker";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@repo/design-system/components/ui/dialog";
import { Input } from "@repo/design-system/components/ui/input";
import { Label } from "@repo/design-system/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/design-system/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/design-system/components/ui/table";
import { Textarea } from "@repo/design-system/components/ui/textarea";
import { formatCurrency as _formatCurrency } from "@repo/design-system/lib/format-currency";
import {
  AlertTriangleIcon,
  CalendarIcon,
  CheckCircleIcon,
  CheckIcon,
  ClockIcon,
  EditIcon,
  FlagIcon,
  Loader2Icon,
  ZapIcon,
} from "lucide-react";

const formatCurrency = (v: number | null) =>
  _formatCurrency(v, { nullDisplay: "N/A" });

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { apiFetch } from "@/app/lib/api";
import TimecardBulkActions from "./timecard-bulk-actions";
import TimecardDetailModal from "./timecard-detail-modal";

interface TimeEntry {
  id: string;
  employeeId: string;
  employeeFirstName: string | null;
  employeeLastName: string | null;
  employeeEmail: string;
  employeeRole: string;
  employee_number: string | null;
  location_id: string | null;
  location_name: string | null;
  shift_id: string | null;
  shift_start: Date | null;
  shift_end: Date | null;
  clock_in: Date;
  clock_out: Date | null;
  break_minutes: number;
  notes: string | null;
  approved_by: string | null;
  approved_at: Date | null;
  approver_first_name: string | null;
  approver_last_name: string | null;
  scheduled_hours: number | null;
  actual_hours: number | null;
  weekly_hours: number | null;
  exception_type: string | null;
  is_overtime: boolean | null;
  hourly_rate: number | null;
  total_cost: number | null;
  created_at: Date;
  updated_at: Date;
}

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

function formatHours(value: number | null) {
  if (value === null) {
    return "N/A";
  }
  const hours = Math.floor(value);
  const minutes = Math.round((value - hours) * 60);
  return `${hours}h ${minutes}m`;
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function formatTime(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(date);
}

function getEmployeeName(firstName: string | null, lastName: string | null) {
  return [firstName, lastName].filter(Boolean).join(" ") || "Unknown";
}

function getExceptionBadge(exceptionType: string | null) {
  if (!exceptionType) {
    return null;
  }

  const colors: Record<string, "secondary" | "destructive"> = {
    missing_clock_out: "destructive",
    early_clock_in: "secondary",
    late_clock_out: "secondary",
    late_arrival: "destructive",
    excessive_break: "secondary",
  };

  const labels: Record<string, string> = {
    missing_clock_out: "Missing Clock Out",
    early_clock_in: "Early Clock In",
    late_clock_out: "Late Clock Out",
    late_arrival: "Late Arrival",
    excessive_break: "Excessive Break",
  };

  const variant = colors[exceptionType] || "secondary";
  const label = labels[exceptionType] || exceptionType;

  return (
    <Badge variant={variant}>
      <AlertTriangleIcon className="mr-1 h-3 w-3" />
      {label}
    </Badge>
  );
}

export default function TimecardsPage() {
  const router = useRouter();
  const _searchParams = useSearchParams() ?? new URLSearchParams();
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 1,
  });
  const [loading, setLoading] = useState(true);
  const [selectedEntries, setSelectedEntries] = useState<Set<string>>(
    new Set()
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("pending");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedTimeEntry, setSelectedTimeEntry] = useState<TimeEntry | null>(
    null
  );
  const [actionLoading, setActionLoading] = useState(false);
  const [generateLoading, setGenerateLoading] = useState(false);

  // Inline edit-request dialog state
  const [editRequestDialogOpen, setEditRequestDialogOpen] = useState(false);
  const [editRequestEntryId, setEditRequestEntryId] = useState<string | null>(
    null
  );
  const [editRequestReason, setEditRequestReason] = useState("");
  const [editRequestBulkIds, setEditRequestBulkIds] = useState<string[]>([]);

  // Inline flag-exception dialog state
  const [flagExceptionDialogOpen, setFlagExceptionDialogOpen] = useState(false);
  const [flagExceptionEntryId, setFlagExceptionEntryId] = useState<
    string | null
  >(null);
  const [flagExceptionType, setFlagExceptionType] = useState("");
  const [flagExceptionNotes, setFlagExceptionNotes] = useState("");
  const [flagExceptionBulkIds, setFlagExceptionBulkIds] = useState<string[]>([]);

  const fetchTimecards = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        status: statusFilter,
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
      });

      if (searchQuery) {
        params.set("employeeId", searchQuery);
      }
      if (startDate) {
        params.set("startDate", startDate);
      }
      if (endDate) {
        params.set("endDate", endDate);
      }

      const response = await apiFetch(`/api/timecards?${params.toString()}`);

      if (!response.ok) {
        throw new Error("Failed to fetch timecards");
      }

      const data = await response.json();
      setTimeEntries(data.timeEntries || []);
      setPagination(data.pagination || pagination);
    } catch (error) {
      console.error("Error fetching timecards:", error);
      toast.error("Failed to load timecards");
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
    pagination,
  ]);

  useEffect(() => {
    fetchTimecards();
  }, [fetchTimecards]);

  const handleApprove = async (entryId: string) => {
    setActionLoading(true);
    try {
      const response = await apiFetch("/api/timecards/bulk", {
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

      toast.success("Timecard approved");
      fetchTimecards();
    } catch (error) {
      console.error("Error approving timecard:", error);
      toast.error("Failed to approve timecard");
    } finally {
      setActionLoading(false);
    }
  };

  const handleBulkApprove = async () => {
    if (selectedEntries.size === 0) return;
    setActionLoading(true);
    try {
      const response = await apiFetch("/api/timecards/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          timeEntryIds: Array.from(selectedEntries),
          approve: true,
        }),
      });
      if (!response.ok) throw new Error("Failed to approve timecards");
      toast.success(`Approved ${selectedEntries.size} timecard(s)`);
      setSelectedEntries(new Set());
      fetchTimecards();
    } catch (error) {
      console.error("Error bulk approving:", error);
      toast.error("Failed to approve timecards");
    } finally {
      setActionLoading(false);
    }
  };

  const handleBulkReject = async () => {
    if (selectedEntries.size === 0) return;
    setActionLoading(true);
    try {
      const response = await apiFetch("/api/timecards/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          timeEntryIds: Array.from(selectedEntries),
          reject: true,
        }),
      });
      if (!response.ok) throw new Error("Failed to reject timecards");
      toast.success(`Rejected ${selectedEntries.size} timecard(s)`);
      setSelectedEntries(new Set());
      fetchTimecards();
    } catch (error) {
      console.error("Error bulk rejecting:", error);
      toast.error("Failed to reject timecards");
    } finally {
      setActionLoading(false);
    }
  };

  const handleBulkEditRequest = () => {
    if (selectedEntries.size === 0) return;
    setEditRequestBulkIds(Array.from(selectedEntries));
    setEditRequestEntryId(null);
    setEditRequestReason("");
    setEditRequestDialogOpen(true);
  };

  const handleBulkFlagExceptions = () => {
    if (selectedEntries.size === 0) return;
    setFlagExceptionBulkIds(Array.from(selectedEntries));
    setFlagExceptionEntryId(null);
    setFlagExceptionType("");
    setFlagExceptionNotes("");
    setFlagExceptionDialogOpen(true);
  };

  const handleFlagException = async (
    entryId: string,
    exceptionType: string,
    notes: string
  ) => {
    setActionLoading(true);
    try {
      const response = await apiFetch("/api/timecards/bulk", {
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

      toast.success("Exception flagged");
      fetchTimecards();
    } catch (error) {
      console.error("Error flagging exception:", error);
      toast.error("Failed to flag exception");
    } finally {
      setActionLoading(false);
    }
  };

  const handleEditRequest = async (
    entryId: string,
    reason: string,
    requestedChanges?: {
      requestedClockIn?: string;
      requestedClockOut?: string;
      requestedBreakMinutes?: number;
    }
  ): Promise<void> => {
    setActionLoading(true);
    try {
      const response = await apiFetch("/api/timecards/bulk", {
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

      toast.success("Edit request submitted");
      fetchTimecards();
    } catch (error) {
      console.error("Error requesting edit:", error);
      toast.error("Failed to request edit");
    } finally {
      setActionLoading(false);
    }
  };

  const openDetailModal = (entry: TimeEntry) => {
    setSelectedTimeEntry(entry);
    setDetailModalOpen(true);
  };

  const handleClockOut = async () => {
    if (!selectedTimeEntry) return;
    setActionLoading(true);
    try {
      const response = await apiFetch(
        `/api/timecards/${selectedTimeEntry.id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ clockOut: new Date().toISOString() }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to clock out");
      }

      toast.success("Clocked out successfully");
      setDetailModalOpen(false);
      setSelectedTimeEntry(null);
      fetchTimecards();
    } catch (error) {
      console.error("Error clocking out:", error);
      toast.error("Failed to clock out");
    } finally {
      setActionLoading(false);
    }
  };

  const toggleSelectEntry = (entryId: string) => {
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

  const handleStatusChange = (value: string) => {
    setStatusFilter(value);
    setPagination((prev) => ({ ...prev, page: 1 }));
    router.push(`/payroll/timecards?status=${value}`);
  };

  const handleSearch = (value: string) => {
    setSearchQuery(value);
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const handlePageChange = (newPage: number) => {
    setPagination((prev) => ({ ...prev, page: newPage }));
  };

  const handleGenerateFromSchedules = async () => {
    if (!(startDate && endDate)) {
      toast.error(
        "Set a date range first to generate timecards from schedules"
      );
      return;
    }
    setGenerateLoading(true);
    try {
      const response = await apiFetch("/api/payroll/timecards/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          periodStart: startDate,
          periodEnd: endDate,
          dryRun: false,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate timecards");
      }

      const data = await response.json();
      toast.success(
        `Generated ${data.created} timecard(s) from schedules (${data.skipped} already existed)`
      );
      if (data.overtimeShifts && data.overtimeShifts.length > 0) {
        toast.warning(
          `${data.overtimeShifts.length} shift(s) flagged as overtime`,
          { description: "Check the overtime column for details" }
        );
      }
      fetchTimecards();
    } catch (error) {
      console.error("Error generating from schedules:", error);
      toast.error("Failed to generate timecards from schedules");
    } finally {
      setGenerateLoading(false);
    }
  };

  return (
    <PageCanvas>
      <CommandBand>
        <CommandBandHeader>
          <div className="space-y-4">
            <MonoLabel tone="dark">Operations / Payroll</MonoLabel>
            <DisplayHeading size="md">Timecards</DisplayHeading>
            <CommandBandLede>Track, approve, and manage employee time entries.</CommandBandLede>
          </div>
          <CommandBandActions>
            <Button
              disabled={generateLoading || !startDate || !endDate}
              onClick={handleGenerateFromSchedules}
              size="sm"
              variant="on-dark"
            >
              {generateLoading ? (
                <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <CalendarIcon className="mr-2 h-4 w-4" />
              )}
              Generate from Schedules
            </Button>
          </CommandBandActions>
        </CommandBandHeader>
        <CommandBandBody>
          <MetricBand>
            <MetricCell>
              <MetricValue>{timeEntries.filter((e) => !e.approved_at && e.clock_out).length}</MetricValue>
              <MetricLabel>Pending</MetricLabel>
            </MetricCell>
            <MetricCell>
              <MetricValue>{timeEntries.filter((e) => e.approved_at).length}</MetricValue>
              <MetricLabel>Approved</MetricLabel>
            </MetricCell>
            <MetricCell>
              <MetricValue>{timeEntries.filter((e) => e.exception_type).length}</MetricValue>
              <MetricLabel>Exceptions</MetricLabel>
            </MetricCell>
            <MetricCell>
              <MetricValue>{timeEntries.filter((e) => e.is_overtime).length}</MetricValue>
              <MetricLabel>Overtime</MetricLabel>
            </MetricCell>
          </MetricBand>
        </CommandBandBody>
      </CommandBand>

      <OperationalColumn>
        <SectionHeader title="Filters" count={`${pagination.total} entries`} />
        <div className="rounded-[22px] border border-hairline bg-soft-stone p-6 sm:p-8">
          <div className="flex flex-wrap items-center gap-4">
            <div className="min-w-[200px] flex-1">
              <Input
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="Search employees..."
                value={searchQuery}
              />
            </div>

            <Select onValueChange={handleStatusChange} value={statusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pending Approval</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="open">Open Entries</SelectItem>
                <SelectItem value="all">All Entries</SelectItem>
              </SelectContent>
            </Select>

            <DatePicker
              className="w-[160px]"
              onChange={(e) => setStartDate(e.target.value)}
              value={startDate}
            />

            <DatePicker
              className="w-[160px]"
              onChange={(e) => setEndDate(e.target.value)}
              value={endDate}
            />
          </div>
        </div>

        <TimecardBulkActions
          loading={actionLoading}
          onBulkApprove={handleBulkApprove}
          onBulkEditRequest={handleBulkEditRequest}
          onBulkFlagExceptions={handleBulkFlagExceptions}
          onBulkReject={handleBulkReject}
          selectedCount={selectedEntries.size}
          totalEntries={pagination.total}
        />

        {loading ? (
          <div className="flex flex-1 items-center justify-center py-24">
            <Loader2Icon className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : timeEntries.length === 0 ? (
          <div className="rounded-[22px] border border-hairline bg-canvas p-8 text-center">
            <p className="text-lg text-muted-foreground">
              No time entries found for selected criteria
            </p>
          </div>
        ) : (
          <section>
            <div className="overflow-hidden rounded-[22px] border border-hairline bg-canvas">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[40px]">
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
                      </TableHead>
                      <TableHead>Employee</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Hours</TableHead>
                      <TableHead>Scheduled</TableHead>
                      <TableHead>Weekly</TableHead>
                      <TableHead>Break</TableHead>
                      <TableHead>Cost</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {timeEntries.map((entry) => (
                      <TableRow
                        className="cursor-pointer hover:bg-muted/50"
                        key={entry.id}
                        onClick={() => openDetailModal(entry)}
                      >
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <input
                            checked={selectedEntries.has(entry.id)}
                            onChange={() => toggleSelectEntry(entry.id)}
                            type="checkbox"
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarImage
                                alt={getEmployeeName(
                                  entry.employeeFirstName,
                                  entry.employeeLastName
                                )}
                                src={`${entry.employeeFirstName?.[0]}${entry.employeeLastName?.[0]}`}
                              />
                              <AvatarFallback>
                                {getEmployeeName(
                                  entry.employeeFirstName,
                                  entry.employeeLastName
                                )
                                  .split(" ")
                                  .map((n) => n[0])
                                  .join("")
                                  .toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-medium">
                                {getEmployeeName(
                                  entry.employeeFirstName,
                                  entry.employeeLastName
                                )}
                              </div>
                              <div className="text-muted-foreground text-xs">
                                {entry.employeeRole}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <CalendarIcon className="size-4 text-muted-foreground" />
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
                        </TableCell>
                        <TableCell>
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
                        </TableCell>
                        <TableCell>
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
                        </TableCell>
                        <TableCell>
                          {entry.weekly_hours !== null ? (
                            <div className="flex items-center gap-1.5">
                              <span
                                className={
                                  entry.is_overtime
                                    ? "font-medium text-orange-600"
                                    : ""
                                }
                              >
                                {formatHours(entry.weekly_hours)}
                              </span>
                              {entry.is_overtime && (
                                <Badge className="gap-1" variant="destructive">
                                  <ZapIcon className="h-3 w-3" />
                                  OT
                                </Badge>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-sm">
                              —
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          {getExceptionBadge(entry.exception_type)}
                        </TableCell>
                        <TableCell>
                          {formatCurrency(entry.total_cost)}
                        </TableCell>
                        <TableCell>
                          {entry.approved_at ? (
                            <Badge
                              className="flex items-center gap-1"
                              variant="secondary"
                            >
                              <CheckCircleIcon className="h-3 w-3" />
                              Approved
                            </Badge>
                          ) : entry.clock_out ? (
                            <Badge variant="outline">Pending</Badge>
                          ) : (
                            <Badge variant="default">
                              <ClockIcon className="h-3 w-3" />
                              Open
                            </Badge>
                          )}
                          {entry.approver_first_name && (
                            <div className="mt-1 text-muted-foreground text-xs">
                              by {entry.approver_first_name}{" "}
                              {entry.approver_last_name?.[0]}
                            </div>
                          )}
                        </TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center gap-1">
                            {!entry.approved_at && entry.clock_out && (
                              <Button
                                className="h-8 w-8 text-green-600 hover:text-green-700"
                                disabled={actionLoading}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleApprove(entry.id);
                                }}
                                size="icon"
                                variant="ghost"
                              >
                                <CheckIcon className="size-4" />
                              </Button>
                            )}
                            <Button
                              className="h-8 w-8 text-blue-600 hover:text-blue-700"
                              disabled={actionLoading}
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditRequestEntryId(entry.id);
                                setEditRequestBulkIds([]);
                                setEditRequestReason("");
                                setEditRequestDialogOpen(true);
                              }}
                              size="icon"
                              variant="ghost"
                            >
                              <EditIcon className="size-4" />
                            </Button>
                            <Button
                              className="h-8 w-8 text-orange-600 hover:text-orange-700"
                              disabled={actionLoading}
                              onClick={(e) => {
                                e.stopPropagation();
                                setFlagExceptionEntryId(entry.id);
                                setFlagExceptionBulkIds([]);
                                setFlagExceptionType("");
                                setFlagExceptionNotes("");
                                setFlagExceptionDialogOpen(true);
                              }}
                              size="icon"
                              variant="ghost"
                            >
                              <FlagIcon className="size-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <p className="text-muted-foreground text-sm">
                Showing {timeEntries.length} of {pagination.total} entries
              </p>
              <div className="flex items-center gap-2">
                <Button
                  disabled={pagination.page <= 1}
                  onClick={() => handlePageChange(pagination.page - 1)}
                  size="sm"
                  variant="outline"
                >
                  Previous
                </Button>
                <span className="text-sm">
                  Page {pagination.page} of {pagination.totalPages}
                </span>
                <Button
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() => handlePageChange(pagination.page + 1)}
                  size="sm"
                  variant="outline"
                >
                  Next
                </Button>
              </div>
            </div>
          </section>
        )}
      </OperationalColumn>

      {selectedTimeEntry && (
        <TimecardDetailModal
          onApprove={() => handleApprove(selectedTimeEntry.id)}
          onClockOut={handleClockOut}
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

      {/* Inline Edit Request Dialog */}
      <Dialog
        onOpenChange={(isOpen) => {
          if (!isOpen) setEditRequestDialogOpen(false);
        }}
        open={editRequestDialogOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editRequestBulkIds.length > 1
                ? `Request Edits (${editRequestBulkIds.length} entries)`
                : "Request Edit"}
            </DialogTitle>
            <DialogDescription>
              {editRequestBulkIds.length > 1
                ? "Provide a reason for requesting edits to the selected time entries"
                : "Provide a reason for requesting an edit to this time entry"}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="inline-edit-reason">Reason</Label>
            <Textarea
              className="mt-2"
              id="inline-edit-reason"
              onChange={(e) => setEditRequestReason(e.target.value)}
              placeholder="Explain why this timecard needs editing..."
              value={editRequestReason}
            />
          </div>
          <DialogFooter>
            <Button
              onClick={() => setEditRequestDialogOpen(false)}
              variant="outline"
            >
              Cancel
            </Button>
            <Button
              disabled={!editRequestReason.trim()}
              onClick={async () => {
                if (editRequestBulkIds.length > 0) {
                  setActionLoading(true);
                  try {
                    const response = await apiFetch("/api/timecards/bulk", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        timeEntryIds: editRequestBulkIds,
                        editRequests: editRequestBulkIds.map((id) => ({
                          timeEntryId: id,
                          reason: editRequestReason,
                        })),
                      }),
                    });
                    if (!response.ok) throw new Error("Failed to request edits");
                    toast.success(
                      `Edit requests submitted for ${editRequestBulkIds.length} timecard(s)`
                    );
                    setSelectedEntries(new Set());
                    fetchTimecards();
                  } catch (error) {
                    console.error("Error bulk requesting edits:", error);
                    toast.error("Failed to request edits");
                  } finally {
                    setActionLoading(false);
                  }
                } else if (editRequestEntryId) {
                  handleEditRequest(editRequestEntryId, editRequestReason);
                }
                setEditRequestDialogOpen(false);
                setEditRequestReason("");
                setEditRequestEntryId(null);
                setEditRequestBulkIds([]);
              }}
            >
              {editRequestBulkIds.length > 0
                ? `Submit ${editRequestBulkIds.length} Request${editRequestBulkIds.length > 1 ? "s" : ""}`
                : "Submit Request"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Inline Flag Exception Dialog */}
      <Dialog
        onOpenChange={(isOpen) => {
          if (!isOpen) setFlagExceptionDialogOpen(false);
        }}
        open={flagExceptionDialogOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {flagExceptionBulkIds.length > 1
                ? `Flag Exceptions (${flagExceptionBulkIds.length} entries)`
                : "Flag Exception"}
            </DialogTitle>
            <DialogDescription>
              {flagExceptionBulkIds.length > 1
                ? "Record an exception for the selected time entries"
                : "Record an exception for this time entry"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Exception Type</Label>
              <Select
                onValueChange={setFlagExceptionType}
                value={flagExceptionType}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select exception type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="missing_clock_out">
                    Missing Clock Out
                  </SelectItem>
                  <SelectItem value="late_arrival">Late Arrival</SelectItem>
                  <SelectItem value="excessive_break">
                    Excessive Break
                  </SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="inline-exception-notes">Notes</Label>
              <Textarea
                id="inline-exception-notes"
                onChange={(e) => setFlagExceptionNotes(e.target.value)}
                placeholder="Describe the exception..."
                value={flagExceptionNotes}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={() => setFlagExceptionDialogOpen(false)}
              variant="outline"
            >
              Cancel
            </Button>
            <Button
              disabled={!(flagExceptionType && flagExceptionNotes.trim())}
              onClick={async () => {
                if (flagExceptionBulkIds.length > 0) {
                  setActionLoading(true);
                  try {
                    const response = await apiFetch("/api/timecards/bulk", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        timeEntryIds: flagExceptionBulkIds,
                        flagExceptions: flagExceptionBulkIds.map((id) => ({
                          timeEntryId: id,
                          exceptionType: flagExceptionType,
                          notes: flagExceptionNotes,
                        })),
                      }),
                    });
                    if (!response.ok)
                      throw new Error("Failed to flag exceptions");
                    toast.success(
                      `Exceptions flagged for ${flagExceptionBulkIds.length} timecard(s)`
                    );
                    setSelectedEntries(new Set());
                    fetchTimecards();
                  } catch (error) {
                    console.error("Error bulk flagging exceptions:", error);
                    toast.error("Failed to flag exceptions");
                  } finally {
                    setActionLoading(false);
                  }
                } else if (flagExceptionEntryId) {
                  handleFlagException(
                    flagExceptionEntryId,
                    flagExceptionType,
                    flagExceptionNotes
                  );
                }
                setFlagExceptionDialogOpen(false);
                setFlagExceptionType("");
                setFlagExceptionNotes("");
                setFlagExceptionEntryId(null);
                setFlagExceptionBulkIds([]);
              }}
            >
              {flagExceptionBulkIds.length > 0
                ? `Flag ${flagExceptionBulkIds.length} Exception${flagExceptionBulkIds.length > 1 ? "s" : ""}`
                : "Flag Exception"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageCanvas>
  );
}
