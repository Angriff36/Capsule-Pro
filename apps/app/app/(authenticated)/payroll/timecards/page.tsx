"use client";

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@repo/design-system/components/ui/avatar";
import { Badge } from "@repo/design-system/components/ui/badge";
import { Button } from "@repo/design-system/components/ui/button";
import { Card, CardContent } from "@repo/design-system/components/ui/card";
import { Input } from "@repo/design-system/components/ui/input";
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
import { Separator } from "@repo/design-system/components/ui/separator";
import {
  AlertTriangleIcon,
  CalendarIcon,
  CheckCircleIcon,
  CheckIcon,
  ClockIcon,
  EditIcon,
  FlagIcon,
  Loader2Icon,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import TimecardDetailModal from "./timecard-detail-modal";

type TimeEntry = {
  id: string;
  employee_id: string;
  employee_first_name: string | null;
  employee_last_name: string | null;
  employee_email: string;
  employee_role: string;
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
  exception_type: string | null;
  hourly_rate: number | null;
  total_cost: number | null;
  created_at: Date;
  updated_at: Date;
};

type PaginationInfo = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

function formatCurrency(value: number | null) {
  if (value === null) {
    return "N/A";
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);
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

      const response = await fetch(`/api/timecards?${params.toString()}`);

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

      toast.success("Timecard approved");
      fetchTimecards();
    } catch (error) {
      console.error("Error approving timecard:", error);
      toast.error("Failed to approve timecard");
    } finally {
      setActionLoading(false);
    }
  };

  const handleFlagException = async (
    entryId: string,
    exceptionType: string,
    notes: string
  ) => {
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

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-semibold text-2xl text-foreground">Timecards</h1>
          <p className="text-muted-foreground text-sm">
            Review and approve employee time entries
          </p>
        </div>
      </div>

      <Separator />

      <section>
        <h2 className="font-medium text-sm text-muted-foreground mb-4">
          Filters
        </h2>
        <Card className="bg-card/60">
          <CardContent className="p-4">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex-1 min-w-[200px]">
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

              <Input
                className="w-[160px]"
                onChange={(e) => setStartDate(e.target.value)}
                type="date"
                value={startDate}
              />

              <Input
                className="w-[160px]"
                onChange={(e) => setEndDate(e.target.value)}
                type="date"
                value={endDate}
              />
            </div>
          </CardContent>
        </Card>
      </section>

      {loading ? (
        <Card className="p-8 text-center">
          <Loader2Icon className="mx-auto h-8 w-8 animate-spin text-muted-foreground" />
        </Card>
      ) : timeEntries.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground text-lg">
            No time entries found for selected criteria
          </p>
        </Card>
      ) : (
        <>
          <section>
            <h2 className="font-medium text-sm text-muted-foreground mb-4">
              Timecards ({pagination.total})
            </h2>
            <Card>
              <CardContent className="p-0">
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
                                  entry.employee_first_name,
                                  entry.employee_last_name
                                )}
                                src={`${entry.employee_first_name?.[0]}${entry.employee_last_name?.[0]}`}
                              />
                              <AvatarFallback>
                                {getEmployeeName(
                                  entry.employee_first_name,
                                  entry.employee_last_name
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
                                  entry.employee_first_name,
                                  entry.employee_last_name
                                )}
                              </div>
                              <div className="text-muted-foreground text-xs">
                                {entry.employee_role}
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
                            <div className="text-muted-foreground text-xs mt-1">
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
                              size="icon"
                              variant="ghost"
                            >
                              <EditIcon className="size-4" />
                            </Button>
                            <Button
                              className="h-8 w-8 text-orange-600 hover:text-orange-700"
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
            </CardContent>
          </Card>

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
      </>
      )}

      {selectedTimeEntry && (
        <TimecardDetailModal
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
